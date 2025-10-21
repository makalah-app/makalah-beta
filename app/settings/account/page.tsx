'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, LogOut } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function AccountPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth');
    }
  }, [isAuthenticated, isLoading, router]);

  const roleLabel = useMemo(() => {
    switch (user?.role) {
      case 'superadmin':
        return 'Superadmin';
      case 'admin':
        return 'Administrator';
      case 'user':
        return 'Pengguna';
      default:
        return 'Tamu';
    }
  }, [user?.role]);

  const accountTier = useMemo(() => {
    if (!user) return 'Akses Standar';
    if (user.role === 'superadmin') return 'Akses Superadmin';
    if (user.role === 'admin') return 'Akses Administrator';
    if (user.role === 'user') return 'Akses Pengguna';
    return 'Akses Tamu';
  }, [user]);

  const handleSignOut = async () => {
    try {
      await logout();
      router.push('/auth');
    } catch (error) {
      // Error handled by logout function
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="text-sm text-muted-foreground">Memuat informasi akun...</p>
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
        <Shield className="h-6 w-6 text-primary mt-1" />
        <div>
          <h1 className="text-2xl font-semibold leading-none">Info Akun</h1>
          <p className="text-muted-foreground">Informasi akun dan pengaturan lanjutan</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">Ringkasan Akun</CardTitle>
            </div>
            <Badge variant={user.isVerified ? 'default' : 'secondary'}>
              {user.isVerified ? 'Terverifikasi' : 'Belum verifikasi'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded border border-border/70 bg-card/50 px-3 py-2">
            <span className="text-sm text-muted-foreground">Tipe Akses</span>
            <span className="text-sm font-medium text-foreground">{accountTier}</span>
          </div>
          <div className="flex items-center justify-between rounded border border-border/70 bg-card/50 px-3 py-2">
            <span className="text-sm text-muted-foreground">Peran Sistem</span>
            <span className="text-sm font-medium text-foreground">{roleLabel}</span>
          </div>
          <div className="flex items-center justify-between rounded border border-border/70 bg-card/50 px-3 py-2">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-medium text-foreground">{user.email}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Zona Risiko</CardTitle>
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
  );
}
