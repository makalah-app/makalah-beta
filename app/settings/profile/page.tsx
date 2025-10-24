'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Building2, RefreshCcw, Save } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useProfileFormState } from '@/hooks/useProfileFormState';
import { getPredikatLabel, type PredikatFormValue } from '@/lib/utils/predikat-helpers';
import { prepareSubmissionData } from '@/lib/utils/form-validation';
import { handleProfileError } from '@/lib/utils/error-handler';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const MESSAGES = {
  SUCCESS: 'Profil berhasil diperbarui.',
  LOADING: 'Memuat profil...',
  REDIRECTING: 'Mengalihkan ke halaman masuk...'
} as const;

type StatusMessage = { type: 'success' | 'error'; text: string };

// ✅ ProfileFormState is now imported from useProfileFormState hook

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, updateProfile } = useAuth();

  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  // ✅ FIXED: Use isolated form state management
  const {
    formState: profileForm,
    updateFormField,
    hasUnsavedChanges,
    resetToUserState,
    syncWithUserState
  } = useProfileFormState({
    autoSave: false,
    validateOnChange: true
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth');
    }
  }, [isAuthenticated, isLoading, router]);

  // Handle redirect countdown for session errors
  useEffect(() => {
    if (redirectCountdown !== null && redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setRedirectCountdown(redirectCountdown - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (redirectCountdown === 0) {
      router.replace('/auth');
    }
  }, [redirectCountdown, router]);

  // ✅ REMOVED: Dangerous useEffect([user]) that was causing form resets
  // Form state is now managed by useProfileFormState hook with smart synchronization

  // Handle navigation away from page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        const message = 'Anda memiliki perubahan yang belum disimpan. Apakah Anda yakin ingin meninggalkan halaman?';
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    setIsSavingProfile(true);
    setStatusMessage(null);
    setRedirectCountdown(null);

    try {
      // Validate and prepare data before submission
      const submissionData = prepareSubmissionData(profileForm);

      const success = await updateProfile(submissionData);

      if (success) {
        setStatusMessage({ type: 'success', text: MESSAGES.SUCCESS });
        setIsEditingProfile(false);
        // ✅ FIXED: Sync hook state after successful save
        syncWithUserState();
      } else {
        // Handle case where updateProfile returns false without throwing error
        const errorInfo = handleProfileError(
          new Error('Profile update failed without specific error'),
          'Profile Update - Silent Failure'
        );
        setStatusMessage(errorInfo.statusMessage);

        if (errorInfo.shouldRedirect && errorInfo.redirectPath) {
          setRedirectCountdown(3);
        }
      }
    } catch (error) {
      // Enhanced error handling with specific user feedback
      const errorInfo = handleProfileError(error, 'Profile Update');
      setStatusMessage(errorInfo.statusMessage);

      if (errorInfo.shouldRedirect && errorInfo.redirectPath) {
        setRedirectCountdown(3);
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="text-sm text-muted-foreground">{MESSAGES.LOADING}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">{MESSAGES.REDIRECTING}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start gap-3">
        <User className="h-6 w-6 text-primary mt-1" />
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold leading-none">Profil Pengguna</h1>
            {hasUnsavedChanges && (
              <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-full text-xs">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
                Perubahan belum disimpan
              </div>
            )}
          </div>
          <p className="text-muted-foreground">Kelola identitas dan afiliasi institusi Anda</p>
        </div>
      </div>

      {statusMessage && (
        <Alert variant={statusMessage.type === 'success' ? 'default' : 'destructive'}>
          <AlertTitle>
            {statusMessage.type === 'success' ? '✅ Berhasil' :
             redirectCountdown !== null ? '⚠️ Sesi Berakhir' : '❌ Terjadi Kesalahan'}
          </AlertTitle>
          <AlertDescription>
            <div className="space-y-1">
              <p>{statusMessage.text}</p>
              {redirectCountdown !== null && (
                <p className="text-sm">
                  Mengalihkan ke halaman login dalam {redirectCountdown} detik...
                </p>
              )}
            </div>
          </AlertDescription>
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
                    <span className="text-sm text-foreground">{getPredikatLabel(profileForm.predikat)}</span>
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
                      onChange={(event) => updateFormField('firstName', event.target.value)}
                      className="pl-9"
                      maxLength={100}
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
                      onChange={(event) => updateFormField('lastName', event.target.value)}
                      className="pl-9"
                      maxLength={100}
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
                  value={profileForm.predikat}
                  onValueChange={(value) => updateFormField('predikat', value)}
                >
                  <SelectTrigger id="predikat">
                    <SelectValue placeholder="Pilih predikat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Tidak ada</SelectItem>
                    <SelectItem value="MAHASISWA">Mahasiswa</SelectItem>
                    <SelectItem value="PENELITI">Peneliti</SelectItem>
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
                    onChange={(event) => updateFormField('institution', event.target.value)}
                    className="pl-9"
                    maxLength={255}
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
                    // ✅ FIXED: Use safe reset from hook instead of dangerous direct state reset
                    resetToUserState();
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
