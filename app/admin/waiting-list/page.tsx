"use client";

import { useEffect, useMemo, useState } from 'react';
import { AdminPanel } from '@/components/auth/AdminAccess';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface WaitlistItem {
  id: string;
  email: string;
  status: 'pending' | 'invited' | 'converted';
  created_at: string;
  invited_at: string | null;
  converted_at: string | null;
  source: string | null;
}

export default function AdminWaitingListPage() {
  return (
    <AdminPanel title="Waiting List" requiredPermissions={['admin.system']}> 
      <WaitingListTable />
    </AdminPanel>
  );
}

function WaitingListTable() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<WaitlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<WaitlistItem | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const isDeleteConfirmed = deleteTarget && deleteConfirmation.trim() === deleteTarget.email;

  const canFetch = useMemo(() => !!session?.accessToken, [session?.accessToken]);

  useEffect(() => {
    if (!canFetch) return;
    let abort = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
        if (search.trim()) qs.set('search', search.trim());
        const res = await fetch(`/api/admin/waiting-list?${qs.toString()}`, {
          headers: { Authorization: `Bearer ${session!.accessToken}` },
        });
        const data = await res.json();
        if (!abort) {
          if (res.ok && data?.success) {
            setItems(data.data || []);
            setTotalPages(data.totalPages || 1);
          } else {
            setError(data?.error?.message || 'Gagal memuat data');
          }
        }
      } catch (e) {
        if (!abort) setError('Gagal memuat data');
      } finally {
        if (!abort) setLoading(false);
      }
    }
    load();
    return () => { abort = true; };
  }, [canFetch, page, pageSize, search, session]);

  return (
    <>
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Cari email..."
          value={search}
          onChange={(e) => { setPage(1); setSearch(e.target.value); }}
          className="max-w-xs"
        />
        <Button variant="outline" onClick={() => setPage(1)}>Refresh</Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Memuat data...</div>
      ) : error ? (
        <div className="text-sm text-destructive">{error}</div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="p-2">Email</th>
                <th className="p-2">Status</th>
                <th className="p-2">Created</th>
                <th className="p-2">Invited</th>
                <th className="p-2 w-[80px] text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td className="p-3 text-muted-foreground" colSpan={5}>Tidak ada data</td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.id} className="border-t">
                    <td className="p-2">{it.email}</td>
                    <td className="p-2 capitalize">{it.status}</td>
                    <td className="p-2">{new Date(it.created_at).toLocaleString()}</td>
                    <td className="p-2">{it.invited_at ? new Date(it.invited_at).toLocaleString() : '-'}</td>
                    <td className="p-2">
                      <div className="flex items-center justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setDeleteTarget(it); setDeleteConfirmation(''); }}
                          disabled={actionId === it.id}
                          aria-label={`Hapus ${it.email}`}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">Halaman {page} dari {totalPages}</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Prev
          </Button>
          <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>

      {/* Delete confirmation dialog (tiru gaya Detail Users) */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => {
        if (!open) { setDeleteTarget(null); setDeleteConfirmation(''); }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus email dari waiting list?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini permanen dan akan menghapus entri dari database. Ketik ulang email untuk konfirmasi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteTarget && (
            <div className="space-y-3 py-2">
              <p className="rounded bg-muted px-3 py-2 text-sm">{deleteTarget.email}</p>
              <Input
                placeholder="Ketik ulang email untuk konfirmasi"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteTarget || !session?.accessToken) return;
                const target = deleteTarget;
                setActionId(target.id);
                try {
                  const res = await fetch(`/api/admin/waiting-list/${target.id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${session.accessToken}` },
                  });
                  const data = await res.json();
                  if (!res.ok || !data?.success) {
                    throw new Error(data?.error?.message || 'Gagal menghapus item');
                  }
                  toast({ title: 'Item dihapus', description: `${target.email} dihapus dari waiting list.` });
                  // Refresh list
                  setItems((prev) => prev.filter((x) => x.id !== target.id));
                } catch (err) {
                  toast({ variant: 'destructive', title: 'Gagal menghapus', description: err instanceof Error ? err.message : 'Terjadi kesalahan.' });
                } finally {
                  setActionId(null);
                  setDeleteTarget(null);
                  setDeleteConfirmation('');
                }
              }}
              disabled={!isDeleteConfirmed || (deleteTarget && actionId === deleteTarget.id)}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
