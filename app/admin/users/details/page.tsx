'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import AdminAccess from '@/components/auth/AdminAccess';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RefreshCw, Search, ShieldAlert, UserMinus, X, ShieldCheck, ShieldOff, Ban, UserCheck, Trash2 } from 'lucide-react';

type StatusFilter = 'all' | 'active' | 'suspended';

interface ApiUserRow {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  user_profiles: {
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
  } | null;
}

interface ApiResponse {
  success: boolean;
  data: ApiUserRow[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

interface AdminUserRowView {
  id: string;
  email: string;
  role: string;
  status: 'active' | 'suspended';
  createdAt: string;
  lastLoginAt: string | null;
  name: string;
}

const PAGE_SIZE_OPTIONS = ['25', '50', '100'];
const JOINED_SINCE_OPTIONS = ['all', '7d', '30d'] as const;

function useQueryState() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const updateParams = useCallback((next: Record<string, string | null>, options?: { resetPage?: boolean }) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(next).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    if (options?.resetPage) {
      params.set('page', '1');
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  return { searchParams, updateParams };
}

function AdminUsersDetailsContent() {
  const { session, user: currentUser } = useAuth();
  const { toast } = useToast();
  const { searchParams, updateParams } = useQueryState();

  // Check if current user is superadmin
  const isSuperAdmin = currentUser?.role === 'superadmin';

  const page = Math.max(Number(searchParams.get('page') ?? '1'), 1);
  const pageSize = PAGE_SIZE_OPTIONS.includes(searchParams.get('pageSize') ?? '')
    ? Number(searchParams.get('pageSize'))
    : 50;
  const searchValue = searchParams.get('search') ?? '';
  const roleValue = searchParams.get('role') ?? 'all';
  const statusValueParam = searchParams.get('status');
  const statusValue: StatusFilter = statusValueParam === 'active' || statusValueParam === 'suspended' ? statusValueParam : 'all';
  const lastActiveSinceParam = searchParams.get('lastActiveSince');
  const lastActiveBeforeParam = searchParams.get('lastActiveBefore');
  const joinedSinceParam = searchParams.get('joinedSince') ?? 'all';

  const [users, setUsers] = useState<AdminUserRowView[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(searchValue);
  const [joinedSinceSelection, setJoinedSinceSelection] = useState(joinedSinceParam);
  const [customDate, setCustomDate] = useState(
    JOINED_SINCE_OPTIONS.includes(joinedSinceParam as typeof JOINED_SINCE_OPTIONS[number])
      ? ''
      : joinedSinceParam !== 'all'
        ? joinedSinceParam
        : ''
  );
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRowView | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const isDeleteConfirmed = deleteTarget && deleteConfirmation.trim() === deleteTarget.email;
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    title: string;
    description?: string;
  } | null>(null);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 6000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const fetchUsers = useCallback(async () => {
    if (!session?.accessToken) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (searchValue) {
        params.set('search', searchValue);
      }

      if (roleValue !== 'all') {
        params.set('role', roleValue);
      }

      if (statusValue !== 'all') {
        params.set('status', statusValue);
      }

      if (joinedSinceParam && joinedSinceParam !== 'all') {
        params.set('joinedSince', joinedSinceParam);
      }

      if (lastActiveSinceParam) {
        params.set('lastActiveSince', lastActiveSinceParam);
      }

      if (lastActiveBeforeParam) {
        params.set('lastActiveBefore', lastActiveBeforeParam);
      }

      if (lastActiveSinceParam) {
        params.set('lastActiveSince', lastActiveSinceParam);
      }

      const response = await fetch(`/api/admin/users/details?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });

      const result: ApiResponse | { success: false; error?: { message?: string } } = await response.json();

      if (!response.ok || !('success' in result) || !result.success) {
        throw new Error(result && 'error' in result ? (result.error?.message || 'Gagal mengambil data pengguna') : 'Gagal mengambil data pengguna');
      }

      const formattedUsers = result.data.map<AdminUserRowView>((user) => {
        const profileFirst = user.user_profiles?.first_name ?? '';
        const profileLast = user.user_profiles?.last_name ?? '';
        const combinedProfileName = [profileFirst, profileLast].filter(Boolean).join(' ').trim();
        const fallbackName = user.user_profiles?.display_name || user.email.split('@')[0] || user.email;
        return {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.is_active ? 'active' : 'suspended',
          createdAt: user.created_at,
          lastLoginAt: user.last_login_at,
          name: combinedProfileName || fallbackName,
        };
      });

      setUsers(formattedUsers);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengambil data pengguna');
    } finally {
      setLoading(false);
    }
  }, [joinedSinceParam, lastActiveSinceParam, lastActiveBeforeParam, page, pageSize, roleValue, searchValue, session?.accessToken, statusValue]);

  useEffect(() => {
    setSearchInput(searchValue);
  }, [searchValue]);

  useEffect(() => {
    const isPreset = JOINED_SINCE_OPTIONS.includes(joinedSinceParam as typeof JOINED_SINCE_OPTIONS[number]);
    if (joinedSinceParam === 'all') {
      setJoinedSinceSelection('all');
      setCustomDate('');
      return;
    }

    if (isPreset) {
      setJoinedSinceSelection(joinedSinceParam);
      setCustomDate('');
      return;
    }

    setJoinedSinceSelection('custom');
    setCustomDate(joinedSinceParam);
  }, [joinedSinceParam]);

  useEffect(() => {
    if (lastActiveSinceParam || lastActiveBeforeParam) {
      setJoinedSinceSelection('all');
      setCustomDate('');
    }
  }, [lastActiveSinceParam, lastActiveBeforeParam]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput === searchValue) {
        return;
      }

      updateParams({ search: searchInput || null }, { resetPage: true });
    }, 300);

    return () => clearTimeout(handler);
  }, [searchInput, searchValue, updateParams]);

  const roleOptions = useMemo(() => {
    const set = new Set<string>();
    users.forEach((user) => {
      if (user.role) {
        set.add(user.role);
      }
    });
    if (roleValue !== 'all') {
      set.add(roleValue);
    }
    return Array.from(set);
  }, [roleValue, users]);

  const handleStatusChange = (next: StatusFilter) => {
    const value = next === 'all' ? null : next;
    setJoinedSinceSelection('all');
    setCustomDate('');
    updateParams({ status: value, lastActiveSince: null, lastActiveBefore: null }, { resetPage: true });
  };

  const handleRoleChange = (value: string) => {
    updateParams({ role: value === 'all' ? null : value }, { resetPage: true });
  };

  const handleJoinedSinceChange = (value: string) => {
    setJoinedSinceSelection(value);
    if (value === 'all') {
      setCustomDate('');
      updateParams({ joinedSince: null, lastActiveSince: null, lastActiveBefore: null }, { resetPage: true });
      return;
    }

    if (value === 'custom') {
      return;
    }

    setCustomDate('');
    updateParams({ joinedSince: value, lastActiveSince: null, lastActiveBefore: null }, { resetPage: true });
  };

  const handleCustomDateChange = (value: string) => {
    setCustomDate(value);
    setJoinedSinceSelection(value ? 'custom' : 'all');
    updateParams({ joinedSince: value || null, lastActiveSince: null, lastActiveBefore: null }, { resetPage: true });
  };

  const handlePageChange = (nextPage: number) => {
    const clamped = Math.min(Math.max(nextPage, 1), totalPages);
    updateParams({ page: clamped.toString() });
  };

  const handlePageSizeChange = (value: string) => {
    updateParams({ pageSize: value, page: '1' });
  };

  const refreshData = async () => {
    await fetchUsers();
  };

  const handleToggleStatus = async (user: AdminUserRowView) => {
    if (!session?.accessToken) {
      return;
    }

    setActionUserId(user.id);
    try {
      const action = user.status === 'active' ? 'suspend' : 'activate';
      const response = await fetch(`/api/admin/users/${user.id}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ action }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Gagal memperbarui status pengguna');
      }

      toast({
        title: 'Status diperbarui',
        description: action === 'suspend' ? 'Pengguna disuspend.' : 'Pengguna diaktifkan.',
      });

      await refreshData();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Gagal memperbarui status',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan.',
      });
    } finally {
      setActionUserId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !session?.accessToken) {
      return;
    }

    const { id: targetId, email: targetEmail } = deleteTarget;
    setActionUserId(targetId);

    try {
      const response = await fetch(`/api/admin/users/${targetId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Gagal menghapus pengguna');
      }

      toast({
        title: 'Pengguna dihapus',
        description: `${targetEmail} berhasil dihapus.`,
      });

      setFeedback({
        type: 'success',
        title: 'Pengguna dihapus',
        description: `${targetEmail} berhasil dihapus dari sistem.`,
      });

      await refreshData();
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : 'Terjadi kesalahan.';
      const normalizedMessage = /admin/i.test(rawMessage)
        ? 'Akun admin tidak bisa dihapus.'
        : rawMessage;

      toast({
        variant: 'destructive',
        title: 'Gagal menghapus pengguna',
        description: normalizedMessage,
      });
      setFeedback({
        type: 'error',
        title: 'Penghapusan gagal',
        description: normalizedMessage,
      });
    } finally {
      setActionUserId(null);
      setDeleteTarget(null);
      setDeleteConfirmation('');
    }
  };

  const handlePromoteToAdmin = async (user: AdminUserRowView) => {
    if (!session?.accessToken || !isSuperAdmin) {
      toast({
        variant: 'destructive',
        title: 'Akses ditolak',
        description: 'Hanya superadmin yang dapat mempromosikan pengguna ke admin.',
      });
      return;
    }

    setActionUserId(user.id);
    try {
      const response = await fetch('/api/admin/users/promote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ userId: user.id }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Gagal mempromosikan pengguna');
      }

      toast({
        title: 'Berhasil dipromosikan',
        description: `${user.email} sekarang adalah admin.`,
      });

      setFeedback({
        type: 'success',
        title: 'Promosi berhasil',
        description: `${user.email} telah dipromosikan menjadi admin.`,
      });

      await refreshData();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Gagal mempromosikan',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan.',
      });
      setFeedback({
        type: 'error',
        title: 'Promosi gagal',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan.',
      });
    } finally {
      setActionUserId(null);
    }
  };

  const handleDemoteToUser = async (user: AdminUserRowView) => {
    if (!session?.accessToken || !isSuperAdmin) {
      toast({
        variant: 'destructive',
        title: 'Akses ditolak',
        description: 'Hanya superadmin yang dapat menurunkan admin ke pengguna.',
      });
      return;
    }

    setActionUserId(user.id);
    try {
      const response = await fetch('/api/admin/users/demote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ userId: user.id }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Gagal menurunkan admin');
      }

      toast({
        title: 'Berhasil diturunkan',
        description: `${user.email} sekarang adalah pengguna biasa.`,
      });

      setFeedback({
        type: 'success',
        title: 'Demotion berhasil',
        description: `${user.email} telah diturunkan menjadi pengguna biasa.`,
      });

      await refreshData();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Gagal menurunkan',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan.',
      });
      setFeedback({
        type: 'error',
        title: 'Demotion gagal',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan.',
      });
    } finally {
      setActionUserId(null);
    }
  };

  const firstItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, total);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Detail Pengguna</h1>
          <p className="text-sm text-muted-foreground">
            Kelola status akun, cari pengguna, dan lakukan suspend atau penghapusan permanen.
          </p>
        </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter</CardTitle>
          <CardDescription>Pencarian cepat berdasarkan status, role, dan periode bergabung.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {feedback && (
            <Alert
              variant={feedback.type === 'success' ? 'default' : 'destructive'}
              className="relative pr-12"
            >
              <div className="flex flex-col gap-1 text-white">
                <AlertTitle>{feedback.title}</AlertTitle>
                {feedback.description && (
                  <AlertDescription className="text-white/90">
                    {feedback.description}
                  </AlertDescription>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-6 w-6 text-white/80 hover:text-white"
                onClick={() => setFeedback(null)}
                aria-label="Tutup notifikasi"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </Alert>
          )}

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="search-input">Pencarian</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-input"
                  placeholder="Cari email atau nama"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex flex-wrap gap-2">
                {(['all', 'active', 'suspended'] as const).map((item) => (
                  <Button
                    key={item}
                    type="button"
                    size="sm"
                    variant={statusValue === item ? 'secondary' : 'outline'}
                    onClick={() => handleStatusChange(item)}
                  >
                    {item === 'all' ? 'Semua' : item === 'active' ? 'Aktif' : 'Suspended'}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-select">Role</Label>
              <Select value={roleValue} onValueChange={handleRoleChange}>
                <SelectTrigger id="role-select" className="capitalize">
                  <SelectValue placeholder="Pilih role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua role</SelectItem>
                  {roleOptions.map((role) => (
                    <SelectItem key={role} value={role} className="capitalize">
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Joined Since</Label>
              <div className="flex flex-wrap gap-2">
                {JOINED_SINCE_OPTIONS.map((option) => (
                  <Button
                    key={option}
                    type="button"
                    size="sm"
                    variant={joinedSinceSelection === option ? 'secondary' : 'outline'}
                    onClick={() => handleJoinedSinceChange(option)}
                  >
                    {option === 'all' ? 'Semua' : option === '7d' ? '7 hari' : '30 hari'}
                  </Button>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant={joinedSinceSelection === 'custom' ? 'secondary' : 'outline'}
                  onClick={() => handleJoinedSinceChange('custom')}
                >
                  Custom
                </Button>
              </div>
              {joinedSinceSelection === 'custom' && (
                <Input
                  type="date"
                  value={customDate}
                  onChange={(event) => handleCustomDateChange(event.target.value)}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daftar Pengguna</CardTitle>
          <CardDescription>
            Menampilkan {firstItem}-{lastItem} dari {total} pengguna.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-start gap-3 rounded border border-destructive bg-destructive/10 p-4 text-sm">
              <ShieldAlert className="mt-0.5 h-4 w-4 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Gagal memuat data</p>
                <p className="text-destructive/80">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-3 md:hidden">
            {loading ? (
              <div className="flex items-center justify-center gap-2 rounded border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Memuat pengguna…</span>
              </div>
            ) : users.length === 0 ? (
              <div className="rounded border border-dashed border-border p-6 text-sm text-muted-foreground">
                Tidak ada pengguna untuk filter saat ini.
              </div>
            ) : (
              users.map((user) => (
                <div key={user.id} className="space-y-2 rounded border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm">{user.email}</p>
                      <p className="text-xs text-muted-foreground">{user.name}</p>
                    </div>
                    <Badge variant={user.status === 'active' ? 'default' : 'outline'} className={cn('capitalize', user.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'text-muted-foreground')}>
                      {user.status === 'active' ? 'Aktif' : 'Suspended'}
                    </Badge>
                  </div>
                  <div className="grid gap-1 text-xs text-muted-foreground">
                    <span>Role: {user.role}</span>
                    <span>Bergabung: {new Date(user.createdAt).toLocaleDateString('id-ID')}</span>
                    <span>Aktivitas terakhir: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('id-ID') : 'Belum pernah'}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                    {!(user.id === currentUser?.id && isSuperAdmin) && user.role !== 'superadmin' && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={actionUserId === user.id}
                            onClick={() => handleToggleStatus(user)}
                          >
                            {user.status === 'active' ? (
                              <Ban className="h-3.5 w-3.5" />
                            ) : (
                              <UserCheck className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{user.status === 'active' ? 'Suspend' : 'Activate'}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {isSuperAdmin && user.role === 'user' && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={actionUserId === user.id}
                            onClick={() => handlePromoteToAdmin(user)}
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Promote to Admin</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {isSuperAdmin && user.role === 'admin' && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={actionUserId === user.id}
                            onClick={() => handleDemoteToUser(user)}
                          >
                            <ShieldOff className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Demote to User</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {!(user.id === currentUser?.id && isSuperAdmin) && user.role !== 'superadmin' && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={actionUserId === user.id}
                            onClick={() => {
                              setDeleteTarget(user);
                              setDeleteConfirmation('');
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Hapus</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[900px] table-fixed border-collapse text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="w-[5%] px-3 py-2 font-semibold text-center">No.</th>
                  <th className="w-[22%] px-3 py-2 font-semibold">Email</th>
                  <th className="w-[16%] px-3 py-2 font-semibold">Nama</th>
                  <th className="w-[10%] px-3 py-2 font-semibold">Role</th>
                  <th className="w-[9%] px-3 py-2 font-semibold">Status</th>
                  <th className="w-[12%] px-3 py-2 font-semibold">Bergabung</th>
                  <th className="w-[14%] px-3 py-2 font-semibold">Aktivitas Terakhir</th>
                  <th className="w-[16%] px-3 py-2 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Memuat pengguna…</span>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                      Tidak ada pengguna untuk filter saat ini.
                    </td>
                  </tr>
                ) : (
                  users.map((user, index) => {
                    const rowNumber = firstItem + index;
                    return (
                      <tr key={user.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-3 text-center text-xs text-muted-foreground">
                          {rowNumber}
                        </td>
                        <td className="truncate px-3 py-3">
                          <div className="font-medium text-foreground">{user.email}</div>
                        </td>
                        <td className="truncate px-3 py-3">
                          {user.name}
                        </td>
                        <td className="truncate px-3 py-3 capitalize">{user.role}</td>
                        <td className="px-3 py-3">
                          <Badge variant={user.status === 'active' ? 'default' : 'outline'} className={cn('capitalize', user.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'text-muted-foreground')}>
                            {user.status === 'active' ? 'Aktif' : 'Suspended'}
                          </Badge>
                        </td>
                        <td className="truncate px-3 py-3 text-xs text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString('id-ID')}
                        </td>
                        <td className="truncate px-3 py-3 text-xs text-muted-foreground">
                          {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('id-ID') : 'Belum pernah' }
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {!(user.id === currentUser?.id && isSuperAdmin) && user.role !== 'superadmin' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={actionUserId === user.id}
                                    onClick={() => handleToggleStatus(user)}
                                  >
                                    {user.status === 'active' ? (
                                      <Ban className="h-3.5 w-3.5" />
                                    ) : (
                                      <UserCheck className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{user.status === 'active' ? 'Suspend' : 'Activate'}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {isSuperAdmin && user.role === 'user' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    disabled={actionUserId === user.id}
                                    onClick={() => handlePromoteToAdmin(user)}
                                  >
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Promote to Admin</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {isSuperAdmin && user.role === 'admin' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={actionUserId === user.id}
                                    onClick={() => handleDemoteToUser(user)}
                                  >
                                    <ShieldOff className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Demote to User</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {!(user.id === currentUser?.id && isSuperAdmin) && user.role !== 'superadmin' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    disabled={actionUserId === user.id}
                                    onClick={() => {
                                      setDeleteTarget(user);
                                      setDeleteConfirmation('');
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Hapus</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Baris per halaman:</span>
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-[90px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">
                Halaman {page} dari {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => handlePageChange(page - 1)} disabled={page <= 1}>
                  Prev
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages}>
                  Next
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => {
        if (!open) {
          setDeleteTarget(null);
          setDeleteConfirmation('');
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus pengguna?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini permanen dan akan menghapus akun dari Supabase Auth serta tabel publik.
              Ketik email pengguna untuk konfirmasi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteTarget && (
            <div className="space-y-2">
              <p className="rounded bg-muted px-3 py-2 text-sm">{deleteTarget.email}</p>
              <Input
                autoFocus
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                placeholder="Tulis email lengkap untuk konfirmasi"
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Batal</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={!isDeleteConfirmed || actionUserId === deleteTarget?.id}
            >
              <UserMinus className="mr-2 h-4 w-4" />
              Hapus pengguna
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </TooltipProvider>
  );
}

export default function AdminUsersDetailsPage() {
  return (
    <AdminAccess requiredPermissions={['admin.system']}>
      <AdminUsersDetailsContent />
    </AdminAccess>
  );
}
