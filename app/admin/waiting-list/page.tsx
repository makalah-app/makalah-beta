"use client";

import { useEffect, useMemo, useState } from 'react';
import { AdminPanel } from '@/components/auth/AdminAccess';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState('');

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
        <div className="flex-1" />
        <Button
          variant="destructive"
          disabled={selectedIds.size === 0}
          onClick={() => { setBulkOpen(true); setBulkConfirm(''); }}
        >
          Hapus Terpilih ({selectedIds.size})
        </Button>
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
                <th className="p-2 w-[36px]">
                  <Checkbox
                    checked={items.length > 0 && selectedIds.size === items.length}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedIds(new Set(items.map((x) => x.id)));
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
                    aria-label="Pilih semua"
                  />
                </th>
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
                  <td className="p-3 text-muted-foreground" colSpan={6}>Tidak ada data</td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.id} className="border-t">
                    <td className="p-2">
                      <Checkbox
                        checked={selectedIds.has(it.id)}
                        onCheckedChange={(checked) => {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (checked) next.add(it.id); else next.delete(it.id);
                            return next;
                          });
                        }}
                        aria-label={`Pilih ${it.email}`}
                      />
                    </td>
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

      {/* Bulk delete confirmation */}
      <AlertDialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {selectedIds.size} item dari waiting list?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini permanen dan akan menghapus entri dari database. Ketik <b>HAPUS</b> untuk konfirmasi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="Ketik HAPUS untuk konfirmasi"
              value={bulkConfirm}
              onChange={(e) => setBulkConfirm(e.target.value)}
            />
            <div className="rounded bg-muted px-3 py-2 text-xs max-h-28 overflow-auto">
              {[...selectedIds].map((id) => items.find((x) => x.id === id)?.email).filter(Boolean).join(', ')}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkConfirm.trim().toUpperCase() !== 'HAPUS' || selectedIds.size === 0}
              onClick={async () => {
                if (!session?.accessToken || selectedIds.size === 0) return;
                const ids = [...selectedIds];
                try {
                  const res = await fetch('/api/admin/waiting-list/bulk-delete', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${session.accessToken}`,
                    },
                    body: JSON.stringify({ ids }),
                  });
                  const data = await res.json();
                  if (!res.ok || !data?.success) {
                    throw new Error(data?.error?.message || 'Gagal menghapus item');
                  }
                  toast({ title: 'Item dihapus', description: `${ids.length} item dihapus dari waiting list.` });
                  setItems((prev) => prev.filter((x) => !selectedIds.has(x.id)));
                  setSelectedIds(new Set());
                  setBulkOpen(false);
                  setBulkConfirm('');
                } catch (err) {
                  toast({ variant: 'destructive', title: 'Gagal menghapus', description: err instanceof Error ? err.message : 'Terjadi kesalahan.' });
                }
              }}
            >
              Hapus Terpilih
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
