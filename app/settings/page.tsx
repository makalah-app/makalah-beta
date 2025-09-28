'use client';

import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Mail, User, Building2, Shield, Eye, EyeOff, Lock, Save, RefreshCcw, MonitorSmartphone, Palette } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/theme/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

type ThemeChoice = 'light' | 'dark';
type StatusMessage = { type: 'success' | 'error'; text: string };

type ProfileFormState = {
  fullName: string;
  email: string;
  institution: string;
};

type PasswordFormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, updateProfile, changePassword, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    fullName: '',
    email: '',
    institution: ''
  });
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
  const [selectedTheme, setSelectedTheme] = useState<ThemeChoice>('dark');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (user) {
      setProfileForm({
        fullName: user.fullName || user.name || '',
        email: user.email || '',
        institution: user.institution || ''
      });
    }
  }, [user]);

  useEffect(() => {
    if (theme === 'light' || theme === 'dark') {
      setSelectedTheme(theme);
    } else {
      setSelectedTheme('dark');
    }
  }, [theme]);

  const roleLabel = useMemo(() => {
    switch (user?.role) {
      case 'admin':
        return 'Administrator';
      case 'researcher':
        return 'Peneliti';
      case 'student':
        return 'Mahasiswa';
      default:
        return 'Pengguna';
    }
  }, [user?.role]);

  const accountTier = useMemo(() => {
    if (!user) return 'Standard';
    if (user.role === 'admin') return 'Akses Administrator';
    if (user.role === 'researcher') return 'Akses Peneliti';
    return 'Akses Dasar';
  }, [user]);

  const isDarkMode = selectedTheme === 'dark';
  const activeThemeLabel = isDarkMode ? 'gelap' : 'terang';

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    setIsSavingProfile(true);
    setStatusMessage(null);

    try {
      const success = await updateProfile({
        fullName: profileForm.fullName,
        institution: profileForm.institution
      });

      if (success) {
        setStatusMessage({ type: 'success', text: 'Profil berhasil diperbarui.' });
        setIsEditingProfile(false);
      } else {
        setStatusMessage({ type: 'error', text: 'Gagal memperbarui profil. Coba lagi sebentar.' });
      }
    } catch (error) {
      console.error('Profile update error:', error);
      setStatusMessage({ type: 'error', text: 'Terjadi kesalahan saat menyimpan profil.' });
    } finally {
      setIsSavingProfile(false);
    }
  };

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
      console.error('Password update error:', error);
      setStatusMessage({ type: 'error', text: 'Terjadi kesalahan saat mengubah password.' });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      router.push('/auth');
    } catch (error) {
      console.error('Logout error:', error);
      setStatusMessage({ type: 'error', text: 'Gagal keluar dari akun. Coba ulangi.' });
    }
  };

  const handleResetPasswordForm = () => {
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setStatusMessage(null);
  };

  const handleThemeChange = (value: ThemeChoice) => {
    setSelectedTheme(value);
    setTheme(value);
  };


  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="text-sm text-muted-foreground">Memuat pengaturan akun...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Mengalihkan ke halaman masuk...</p>
      </div>
    );
  }

  return (
    <div className="bg-background">
      <div className="mx-auto w-full max-w-6xl px-6 pb-16 pt-12">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Pengaturan</span>
          <h1 className="text-3xl font-semibold text-foreground">Profil &amp; Preferensi Akun</h1>
          <p className="text-sm text-muted-foreground">
            Kelola identitas, keamanan, serta preferensi tampilan untuk pengalaman menulis paling nyaman.
          </p>
        </div>

        {statusMessage && (
          <Alert className="mt-8" variant={statusMessage.type === 'success' ? 'default' : 'destructive'}>
            <AlertTitle>{statusMessage.type === 'success' ? 'Berhasil' : 'Terjadi Kesalahan'}</AlertTitle>
            <AlertDescription>{statusMessage.text}</AlertDescription>
          </Alert>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[3fr_2fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader className="space-y-1">
                <CardTitle className="text-xl">Profil Pengguna</CardTitle>
              </CardHeader>
              <CardContent>
                {!isEditingProfile ? (
                  <div className="space-y-5">
                    <div className="rounded-[3px] border border-border bg-card/40 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-[3px] bg-primary/10 text-primary">
                          <User className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-base font-medium text-foreground">{profileForm.fullName || 'Tanpa nama'}</span>
                          <span className="text-sm text-muted-foreground">{profileForm.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[3px] border border-dashed border-border/60 bg-muted/30 p-3">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Peran</span>
                        <div className="mt-2 flex items-center gap-2">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">{roleLabel}</span>
                        </div>
                      </div>
                      <div className="rounded-[3px] border border-dashed border-border/60 bg-muted/30 p-3">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Institusi</span>
                        <div className="mt-2 flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">{profileForm.institution || 'Belum diatur'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={() => setIsEditingProfile(true)} variant="secondary">
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Perbarui Profil
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleProfileSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Nama Lengkap</Label>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="fullName"
                          placeholder="Masukkan nama lengkap"
                          value={profileForm.fullName}
                          onChange={(event) => setProfileForm((prev) => ({ ...prev, fullName: event.target.value }))}
                          className="pl-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="email" value={profileForm.email} disabled className="pl-9" />
                      </div>
                      <p className="text-xs text-muted-foreground">Email hanya bisa diubah lewat tim dukungan.</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="institution">Institusi</Label>
                      <div className="relative">
                        <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="institution"
                          placeholder="Nama institusi atau universitas"
                          value={profileForm.institution}
                          onChange={(event) => setProfileForm((prev) => ({ ...prev, institution: event.target.value }))}
                          className="pl-9"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setIsEditingProfile(false);
                          setStatusMessage(null);
                          if (user) {
                            setProfileForm({
                              fullName: user.fullName || user.name || '',
                              email: user.email || '',
                              institution: user.institution || ''
                            });
                          }
                        }}
                      >
                        Batal
                      </Button>
                      <Button type="submit" disabled={isSavingProfile}>
                        <Save className="mr-2 h-4 w-4" />
                        {isSavingProfile ? 'Menyimpan...' : 'Simpan Perubahan'}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="space-y-1">
                <CardTitle className="text-xl">Keamanan &amp; Password</CardTitle>
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

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">Ringkasan Akun</CardTitle>
                  </div>
                  <Badge variant={user.isVerified ? 'default' : 'secondary'}>
                    {user.isVerified ? 'Terverifikasi' : 'Belum verifikasi'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-[3px] border border-border/70 bg-card/50 px-3 py-2">
                  <span className="text-sm text-muted-foreground">Tipe Akses</span>
                  <span className="text-sm font-medium text-foreground">{accountTier}</span>
                </div>
                <div className="flex items-center justify-between rounded-[3px] border border-border/70 bg-card/50 px-3 py-2">
                  <span className="text-sm text-muted-foreground">Peran Sistem</span>
                  <span className="text-sm font-medium text-foreground">{roleLabel}</span>
                </div>
                <div className="flex items-center justify-between rounded-[3px] border border-border/70 bg-card/50 px-3 py-2">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="text-sm font-medium text-foreground">{profileForm.email}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Preferensi Tampilan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between rounded-[3px] border border-border/70 bg-card/50 px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-foreground">Mode gelap</span>
                    <span className="text-xs text-muted-foreground">
                      Aktifkan untuk fokus malam atau matikan untuk tampilan terang.
                    </span>
                  </div>
                  <Switch
                    checked={isDarkMode}
                    onCheckedChange={(checked) => {
                      const nextTheme: ThemeChoice = checked ? 'dark' : 'light';
                      setSelectedTheme(nextTheme);
                      setTheme(nextTheme);
                    }}
                    aria-label={isDarkMode ? 'Ubah ke mode terang' : 'Ubah ke mode gelap'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="theme-select" className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    Mode Warna
                  </Label>
                  <Select value={selectedTheme} onValueChange={(value) => handleThemeChange(value as ThemeChoice)}>
                    <SelectTrigger id="theme-select" className="w-full">
                      <SelectValue placeholder="Pilih tema" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Tema Terang</SelectItem>
                      <SelectItem value="dark">Tema Gelap</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-[3px] border border-dashed border-border/60 bg-muted/30 px-3 py-2">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">Tema aktif</span>
                      <span className="text-xs text-muted-foreground">
                        {`Sedang memakai mode ${activeThemeLabel}.`}
                      </span>
                    </div>
                    <MonitorSmartphone className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Zona Risiko</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  type="button"
                  onClick={handleSignOut}
                  variant="destructive"
                  className="w-full"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Keluar dari Akun
                </Button>
                <p className="text-xs text-muted-foreground">
                  Jika mengalami kendala akses, hubungi tim dukungan melalui menu bantuan di halaman utama.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
