'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Building2, RefreshCcw, Save } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type StatusMessage = { type: 'success' | 'error'; text: string };

type ProfileFormState = {
  firstName: string;
  lastName: string;
  email: string;
  institution: string;
  predikat?: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, updateProfile } = useAuth();

  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    firstName: '',
    lastName: '',
    email: '',
    institution: '',
    predikat: undefined
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (user) {
      // ✅ CRITICAL FIX: Use name parsing yang KONSISTEN
      // user.name = first name, user.fullName = first + last
      // Jangan parse dari fullName lagi karena menyebabkan inkonsistensi
      setProfileForm({
        firstName: user.name || '',                    // ✅ user.name = first name
        lastName: user.fullName?.replace(user.name || '', '').trim() || '', // ✅ Extract last name
        email: user.email || '',
        institution: user.institution || '',
        predikat: user.predikat || undefined
      });
    }
  }, [user]);

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    setIsSavingProfile(true);
    setStatusMessage(null);

    try {
      const fullName = `${(profileForm.firstName || '').trim()}${profileForm.lastName ? ' ' + profileForm.lastName.trim() : ''}`.trim();
      const success = await updateProfile({
        fullName,
        institution: profileForm.institution,
        predikat: profileForm.predikat,
        // Provide explicit split for DB compliance
        firstName: profileForm.firstName.trim(),
        lastName: (profileForm.lastName || profileForm.firstName).trim(),
      } as any);

      if (success) {
        setStatusMessage({ type: 'success', text: 'Profil berhasil diperbarui.' });
        setIsEditingProfile(false);
      } else {
        setStatusMessage({ type: 'error', text: 'Gagal memperbarui profil. Coba lagi sebentar.' });
      }
    } catch (error) {
      setStatusMessage({ type: 'error', text: 'Terjadi kesalahan saat menyimpan profil.' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="text-sm text-muted-foreground">Memuat profil...</p>
        </div>
      </div>
    );
  }

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
        <User className="h-6 w-6 text-primary mt-1" />
        <div>
          <h1 className="text-2xl font-semibold leading-none">Profil Pengguna</h1>
          <p className="text-muted-foreground">Kelola identitas dan afiliasi institusi Anda</p>
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
          <CardTitle className="text-lg">Informasi Pribadi</CardTitle>
          <CardDescription>Data diri dan afiliasi institusi</CardDescription>
        </CardHeader>
        <CardContent>
          {!isEditingProfile ? (
            <div className="space-y-5">
              <div className="rounded border border-border bg-card/40 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10 text-primary">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-base font-medium text-foreground">{`${profileForm.firstName || ''}${profileForm.lastName ? ' ' + profileForm.lastName : ''}`.trim() || 'Tanpa nama'}</span>
                    <span className="text-sm text-muted-foreground">{profileForm.email}</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded border border-dashed border-border/60 bg-muted/30 p-3">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Predikat</span>
                  <div className="mt-2 flex items-start gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">{profileForm.predikat || 'Belum diatur'}</span>
                  </div>
                </div>
                <div className="rounded border border-dashed border-border/60 bg-muted/30 p-3">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Institusi</span>
                  <div className="mt-2 flex items-start gap-2">
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nama Depan</Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="firstName"
                      placeholder="Nama depan"
                      value={profileForm.firstName}
                      onChange={(event) => setProfileForm((prev) => ({ ...prev, firstName: event.target.value }))}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nama Belakang</Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="lastName"
                      placeholder="Nama belakang"
                      value={profileForm.lastName}
                      onChange={(event) => setProfileForm((prev) => ({ ...prev, lastName: event.target.value }))}
                      className="pl-9"
                    />
                  </div>
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
                <Label htmlFor="predikat">Predikat (Opsional)</Label>
                <Select
                  value={profileForm.predikat || 'tidak-ada'}
                  onValueChange={(value) => setProfileForm((prev) => ({ ...prev, predikat: value === 'tidak-ada' ? undefined : value }))}
                >
                  <SelectTrigger id="predikat">
                    <SelectValue placeholder="Pilih predikat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tidak-ada">Tidak ada</SelectItem>
                    <SelectItem value="Mahasiswa">Mahasiswa</SelectItem>
                    <SelectItem value="Peneliti">Peneliti</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Predikat akademik Anda (tidak memengaruhi akses sistem)
                </p>
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
                      // ✅ CRITICAL FIX: Gunakan name parsing yang KONSISTEN
                      // Sama seperti di useEffect, gunakan mapping yang benar
                      setProfileForm({
                        firstName: user.name || '',                    // ✅ user.name = first name
                        lastName: user.fullName?.replace(user.name || '', '').trim() || '', // ✅ Extract last name
                        email: user.email || '',
                        institution: user.institution || '',
                        predikat: user.predikat || undefined
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
    </div>
  );
}
