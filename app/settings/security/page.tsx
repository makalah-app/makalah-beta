'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, Save } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type StatusMessage = { type: 'success' | 'error'; text: string };

type PasswordFormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function SecurityPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, changePassword } = useAuth();

  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordVisibility, setPasswordVisibility] = useState({
    current: false,
    next: false,
    confirm: false
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth');
    }
  }, [isAuthenticated, isLoading, router]);

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      setStatusMessage({ type: 'error', text: 'Password baru minimal 6 karakter.' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setStatusMessage({ type: 'error', text: 'Konfirmasi password belum sama.' });
      return;
    }

    setIsSavingPassword(true);
    setStatusMessage(null);

    try {
      const success = await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      if (success) {
        setStatusMessage({ type: 'success', text: 'Password berhasil diperbarui.' });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setStatusMessage({ type: 'error', text: 'Tidak dapat mengubah password. Pastikan password lama benar.' });
      }
    } catch (error) {
      setStatusMessage({ type: 'error', text: 'Terjadi kesalahan saat mengubah password.' });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleResetPasswordForm = () => {
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setStatusMessage(null);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="text-sm text-muted-foreground">Memuat pengaturan keamanan...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Mengalihkan ke halaman masuk...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Lock className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Keamanan</h1>
          <p className="text-muted-foreground">Kelola password dan pengaturan keamanan akun</p>
        </div>
      </div>

      {statusMessage && (
        <Alert variant={statusMessage.type === 'success' ? 'default' : 'destructive'}>
          <AlertTitle>{statusMessage.type === 'success' ? 'Berhasil' : 'Terjadi Kesalahan'}</AlertTitle>
          <AlertDescription>{statusMessage.text}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ubah Password</CardTitle>
          <CardDescription>Perbarui password untuk menjaga keamanan akun Anda</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="current-password">Password Saat Ini</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="current-password"
                  type={passwordVisibility.current ? 'text' : 'password'}
                  placeholder="Masukkan password lama"
                  value={passwordForm.currentPassword}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                  className="pr-10 pl-9"
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisibility((prev) => ({ ...prev, current: !prev.current }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={passwordVisibility.current ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {passwordVisibility.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-password">Password Baru</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={passwordVisibility.next ? 'text' : 'password'}
                    placeholder="Password baru minimal 6 karakter"
                    value={passwordForm.newPassword}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                    className="pr-10 pl-9"
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordVisibility((prev) => ({ ...prev, next: !prev.next }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={passwordVisibility.next ? 'Sembunyikan password baru' : 'Tampilkan password baru'}
                  >
                    {passwordVisibility.next ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Konfirmasi Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={passwordVisibility.confirm ? 'text' : 'password'}
                    placeholder="Ulangi password baru"
                    value={passwordForm.confirmPassword}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                    className="pr-10 pl-9"
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordVisibility((prev) => ({ ...prev, confirm: !prev.confirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={passwordVisibility.confirm ? 'Sembunyikan konfirmasi password' : 'Tampilkan konfirmasi password'}
                  >
                    {passwordVisibility.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-2">
              <Button type="button" variant="outline" onClick={handleResetPasswordForm}>
                Reset Form
              </Button>
              <Button type="submit" disabled={isSavingPassword}>
                <Save className="mr-2 h-4 w-4" />
                {isSavingPassword ? 'Menyimpan...' : 'Simpan Password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
