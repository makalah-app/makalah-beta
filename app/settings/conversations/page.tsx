'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CheckedState } from '@radix-ui/react-checkbox';
import { useRouter } from 'next/navigation';
import { MessageSquare, Trash2, RefreshCw, AlertCircle } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ViewConversationDialog } from '@/components/conversations/ViewConversationDialog';

const PAGE_SIZE = 25; // Fixed pagination size

interface ConversationItem {
  id: string;
  title: string;
  messageCount: number;
  lastActivity: string;
  archived?: boolean;
  metadata?: any;
}

interface ApiResponse {
  conversations: ConversationItem[];
  metadata: {
    total: number;
    hasMore: boolean;
    userId: string;
    includeArchived: boolean;
    timestamp: number;
  };
}

export default function ConversationsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  // State management
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    single: string | null;
    bulk: boolean;
  }>({ single: null, bulk: false });
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewDialog, setViewDialog] = useState<{
    open: boolean;
    conversationId: string | null;
    title: string;
  }>({ open: false, conversationId: null, title: '' });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth');
    }
  }, [isAuthenticated, isLoading, router, user?.id]);

  // Fetch conversations from API
  const fetchConversations = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const offset = (page - 1) * PAGE_SIZE;
      const params = new URLSearchParams({
        userId: user.id,
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });

      const response = await fetch(`/api/conversations?${params.toString()}`);
      const result: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error('Gagal memuat daftar percakapan');
      }

      // Server-side pagination - use API results directly
      setConversations(result.conversations);
      setTotal(result.metadata.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }, [user?.id, page]);

  useEffect(() => {
    if (user?.id) {
      fetchConversations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, page]);

  // Selection handlers
  const handleSelectAll = (checked: CheckedState) => {
    // Hanya set semua saat benar-benar checked === true
    if (checked === true) {
      setSelected(new Set(conversations.map((c) => c.id)));
    } else {
      setSelected(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selected);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelected(newSelected);
  };

  // Delete handlers
  const handleDeleteSingle = async (id: string) => {
    if (!user?.id) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/conversations/${id}?permanent=true`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Gagal menghapus percakapan');
      }

      toast({
        title: 'Percakapan dihapus',
        description: 'Percakapan berhasil dihapus secara permanen.',
      });

      // Notify chat sidebar for real-time sync
      window.postMessage({
        type: 'conversations-deleted',
        conversationIds: [id],
        timestamp: Date.now()
      }, '*');

      // Refresh list
      await fetchConversations();

      // If page becomes empty, go to previous page
      if (conversations.length === 1 && page > 1) {
        setPage(p => p - 1);
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Gagal menghapus',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
      });
    } finally {
      setIsDeleting(false);
      setDeleteTarget({ single: null, bulk: false });
    }
  };

  const handleDeleteBulk = async () => {
    if (!user?.id || selected.size === 0) return;

    setIsDeleting(true);
    const conversationIds = Array.from(selected);

    try {
      const response = await fetch('/api/conversations/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationIds,
          userId: user.id,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Gagal menghapus percakapan');
      }

      toast({
        title: 'Percakapan dihapus',
        description: `${result.deleted} percakapan berhasil dihapus.`,
      });

      // Notify chat sidebar for real-time sync
      window.postMessage({
        type: 'conversations-deleted',
        conversationIds: result.conversationIds,
        timestamp: Date.now()
      }, '*');

      // Clear selection and refresh
      setSelected(new Set());
      await fetchConversations();

      // If page becomes empty, go to previous page
      if (conversations.length === selected.size && page > 1) {
        setPage(p => p - 1);
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Gagal menghapus',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
      });
    } finally {
      setIsDeleting(false);
      setDeleteTarget({ single: null, bulk: false });
    }
  };

  // Pagination handlers
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const firstItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastItem = Math.min(page * PAGE_SIZE, total);

  const handlePageChange = (nextPage: number) => {
    const clamped = Math.min(Math.max(nextPage, 1), totalPages);
    setPage(clamped);
    setSelected(new Set()); // Clear selection on page change
  };

  // Format date helpers
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="text-sm text-muted-foreground">Memuat log percakapan...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Mengalihkan ke halaman masuk...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start gap-3">
        <MessageSquare className="h-6 w-6 text-primary mt-1 shrink-0" />
        <div>
          <h1 className="text-2xl font-semibold">Log Percakapan</h1>
          <p className="text-muted-foreground">
            Kelola riwayat percakapan akademik Anda
          </p>
        </div>
      </div>

      {/* Bulk Action Bar - diletakkan tepat di bawah subheader halaman */}
      {selected.size > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between p-4">
            <span className="text-sm font-medium">{selected.size} percakapan dipilih</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteTarget({ single: null, bulk: true })}
              disabled={isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Hapus yang dipilih
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Divider dihapus: garis tebal akan ditempatkan tepat di bawah header tabel */}

      {/* Main Table Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Daftar Percakapan</CardTitle>
              <CardDescription>
                Menampilkan {firstItem}-{lastItem} dari {total} percakapan
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchConversations()}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Gagal memuat data</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <div className="rounded-[3px] overflow-hidden">
              <table className="ui-table-balanced w-full min-w-[900px] table-fixed border-collapse text-sm">
                <thead className="text-left">
                  <tr>
                    <th className="w-12 h-12 px-3 py-0 align-middle text-left bg-[oklch(0.145_0_0)] text-primary-foreground">
                      {(() => {
                        const headerChecked: CheckedState =
                          conversations.length === 0
                            ? false
                            : selected.size === conversations.length
                            ? true
                            : selected.size > 0
                            ? 'indeterminate'
                            : false;
                        return (
                          <Checkbox
                            checked={headerChecked}
                            onCheckedChange={handleSelectAll}
                            aria-label="Pilih semua percakapan"
                            className="border-primary-foreground data-[state=checked]:bg-primary-foreground data-[state=checked]:text-background"
                          />
                        );
                      })()}
                    </th>
                    <th className="w-12 h-12 px-3 py-0 align-middle font-semibold text-center bg-[oklch(0.145_0_0)] text-primary-foreground">No.</th>
                    <th className="w-[40%] h-12 px-3 py-0 align-middle font-semibold bg-[oklch(0.145_0_0)] text-primary-foreground">Judul Percakapan</th>
                    <th className="w-[12%] h-12 px-3 py-0 align-middle font-semibold text-center bg-[oklch(0.145_0_0)] text-primary-foreground">Jumlah Pesan</th>
                    <th className="w-[18%] h-12 px-3 py-0 align-middle font-semibold bg-[oklch(0.145_0_0)] text-primary-foreground">Dibuat</th>
                    <th className="w-[15%] h-12 px-3 py-0 align-middle font-semibold bg-[oklch(0.145_0_0)] text-primary-foreground">Aktivitas Terakhir</th>
                    <th className="w-16 h-12 pl-3 pr-3 py-0 align-middle font-semibold text-right bg-[oklch(0.145_0_0)] text-primary-foreground">
                      <div className="inline-block w-9 text-left">Aksi</div>
                    </th>
                  </tr>
                </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Memuat percakapan...</span>
                      </div>
                    </td>
                  </tr>
                ) : conversations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                      Belum ada percakapan. Mulai chat baru untuk memulai!
                    </td>
                  </tr>
                ) : (
                  conversations.map((conv, idx) => {
                    const rowNumber = firstItem + idx;
                    return (
                      <tr
                        key={conv.id}
                        className={cn(
                          "ui-list-row border-b border-border last:border-0",
                          selected.has(conv.id) && "ui-list-row--selected"
                        )}
                      >
                        <td className="w-12 h-12 px-3 py-0 align-middle text-left">
                          <Checkbox
                            checked={selected.has(conv.id)}
                            onCheckedChange={(checked) =>
                              handleSelectOne(conv.id, checked as boolean)
                            }
                            aria-label={`Pilih ${conv.title}`}
                          />
                        </td>
                        <td className="h-12 px-3 py-0 align-middle text-center text-xs text-muted-foreground">
                          {rowNumber}
                        </td>
                        <td className="h-12 px-3 py-0 align-middle font-medium">
                          <button
                            onClick={() =>
                              setViewDialog({
                                open: true,
                                conversationId: conv.id,
                                title: conv.title || 'Untitled Chat',
                              })
                            }
                            className="truncate text-left hover:underline hover:text-primary transition-colors w-full cursor-pointer"
                          >
                            {conv.title || 'Untitled Chat'}
                          </button>
                        </td>
                        <td className="h-12 px-3 py-0 align-middle text-center">
                          {conv.messageCount}
                        </td>
                        <td className="h-12 px-3 py-0 align-middle text-xs text-muted-foreground">
                          {formatDate(conv.metadata?.created_at || conv.lastActivity)}
                        </td>
                        <td className="h-12 px-3 py-0 align-middle text-xs text-muted-foreground">
                          {formatDateTime(conv.lastActivity)}
                        </td>
                        <td className="w-16 h-12 pl-3 pr-3 py-0 align-middle text-right">
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => setDeleteTarget({ single: conv.id, bulk: false })}
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {loading ? (
              <div className="flex items-center justify-center gap-2 rounded-md border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Memuat percakapan...</span>
              </div>
            ) : conversations.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground text-center">
                Belum ada percakapan. Mulai chat baru untuk memulai!
              </div>
            ) : (
              conversations.map((conv) => (
                <Card
                  key={conv.id}
                  className={cn(
                    "ui-list-row",
                    selected.has(conv.id) && "ui-list-row--selected"
                  )}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <Checkbox
                          checked={selected.has(conv.id)}
                          onCheckedChange={(checked) =>
                            handleSelectOne(conv.id, checked as boolean)
                          }
                          aria-label={`Pilih ${conv.title}`}
                        />
                        <div className="flex-1">
                          <button
                            onClick={() =>
                              setViewDialog({
                                open: true,
                                conversationId: conv.id,
                                title: conv.title || 'Untitled Chat',
                              })
                            }
                            className="font-medium text-sm truncate text-left hover:underline hover:text-primary transition-colors w-full cursor-pointer"
                          >
                            {conv.title || 'Untitled Chat'}
                          </button>
                          <p className="text-xs text-muted-foreground">
                            {conv.messageCount} pesan
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteTarget({ single: conv.id, bulk: false })}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Dibuat: {formatDate(conv.metadata?.created_at || conv.lastActivity)}</p>
                      <p>Terakhir: {formatDateTime(conv.lastActivity)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Pagination */}
          {total > 0 && (
            <div className="flex items-center justify-center gap-2 pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1 || loading}
              >
                Prev
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                Halaman {page} dari {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages || loading}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteTarget.single !== null || deleteTarget.bulk}
        onOpenChange={(open) => !open && setDeleteTarget({ single: null, bulk: false })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget.bulk
                ? `Hapus ${selected.size} percakapan?`
                : 'Hapus percakapan?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini permanen dan tidak dapat dibatalkan.
              Semua pesan dalam percakapan akan dihapus dari database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={deleteTarget.bulk ? handleDeleteBulk : () => handleDeleteSingle(deleteTarget.single!)}
              disabled={isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? 'Menghapus...' : 'Hapus Permanen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Conversation Dialog */}
      <ViewConversationDialog
        conversationId={viewDialog.conversationId}
        conversationTitle={viewDialog.title}
        open={viewDialog.open}
        onOpenChange={(open) =>
          setViewDialog((prev) => ({ ...prev, open }))
        }
      />
    </div>
  );
}
