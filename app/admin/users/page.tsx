'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminAccess from '../../../src/components/auth/AdminAccess';
import { useAuth } from '../../../src/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Users } from 'lucide-react';

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  recentUsers: number;
  inactiveUsers: number;
}

function AdminUsersContent() {
  const { session, refreshToken } = useAuth();
  const router = useRouter();

  // State for user statistics
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Circuit breaker for token refresh
  const [refreshAttempts, setRefreshAttempts] = useState(0);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  const MAX_REFRESH_ATTEMPTS = 3;
  const REFRESH_COOLDOWN = 30000; // 30 seconds

  // Helper function for authenticated API calls with token refresh and retry
  const authenticatedFetch = useCallback(async (url: string, options: RequestInit = {}, retryCount = 0): Promise<Response> => {
    if (!session?.accessToken) {
      throw new Error('No authentication token available');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Handle 403 with retry logic (max 1 retry)
    if (response.status === 403 && retryCount === 0) {

      // Circuit breaker: Check if we're in cooldown period
      const now = Date.now();
      if (lastRefreshTime > 0 && (now - lastRefreshTime) < REFRESH_COOLDOWN) {
        const remainingTime = Math.ceil((REFRESH_COOLDOWN - (now - lastRefreshTime)) / 1000);
        throw new Error(`Token refresh rate limited. Please wait ${remainingTime} seconds before trying again.`);
      }

      // Circuit breaker: Check if we've exceeded max attempts
      if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
        setRefreshAttempts(0);
        setLastRefreshTime(now);
        throw new Error('Too many token refresh attempts. Please wait and try again.');
      }

      // Increment refresh attempts
      setRefreshAttempts(prev => prev + 1);
      setLastRefreshTime(now);

      const refreshed = await refreshToken();
      if (refreshed) {
        // Reset circuit breaker on successful refresh
        setRefreshAttempts(0);
        
        return authenticatedFetch(url, options, retryCount + 1);
      }
    }

    // Handle 429 rate limit errors (no retry to prevent further rate limiting)
    if (response.status === 429) {
      throw new Error('Rate limit reached. Please wait before trying again.');
    }

    return response;
  }, [session?.accessToken, refreshAttempts, lastRefreshTime, refreshToken]);

  const loadUserStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authenticatedFetch('/api/admin/users');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to load user statistics');
      }

      if (result.success && result.data?.statistics) {
        setUserStats(result.data.statistics);
        
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user statistics');
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch]);

  // Load user statistics on mount
  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    loadUserStats();
  }, [session?.accessToken, loadUserStats]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <p className="text-sm font-medium">Memuat statistik pengguna…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Statistik Pengguna</h1>
          <p className="text-muted-foreground">Monitor aktivitas dan pemakaian platform Makalah AI</p>
        </div>
      </div>

      {error && (
        <div className="rounded-[3px] border border-destructive bg-destructive/10 p-4">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-destructive">Error loading user statistics</div>
          </div>
          <div className="mt-1 text-sm text-destructive/80">{error}</div>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[3px] bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl">Statistik Pengguna</CardTitle>
              <CardDescription>Memantau pemakaian Makalah AI.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {userStats ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-[3px] border border-border bg-background p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Total pengguna</p>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-foreground">{userStats.totalUsers}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Semua pengguna terdaftar
                </p>
                <Button
                  type="button"
                  variant="link"
                  className="px-0 text-xs"
                  onClick={() => router.push('/admin/users/details?page=1&pageSize=50')}
                >
                  Lihat
                </Button>
              </div>
              <div className="rounded-[3px] border border-border bg-background p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Pengguna aktif</p>
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-foreground">{userStats.activeUsers}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Aktif dalam 30 hari terakhir
                </p>
                <Button
                  type="button"
                  variant="link"
                  className="px-0 text-xs"
                  onClick={() => router.push('/admin/users/details?page=1&pageSize=50&lastActiveSince=30d')}
                >
                  Lihat
                </Button>
              </div>
              <div className="rounded-[3px] border border-border bg-background p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Pengguna baru</p>
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-foreground">{userStats.recentUsers}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Bergabung dalam 7 hari terakhir
                </p>
                <Button
                  type="button"
                  variant="link"
                  className="px-0 text-xs"
                  onClick={() => router.push('/admin/users/details?page=1&pageSize=50&joinedSince=7d')}
                >
                  Lihat
                </Button>
              </div>
              <div className="rounded-[3px] border border-border bg-background p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Pengguna tidak aktif</p>
                  <div className="h-2 w-2 rounded-full bg-gray-500" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-foreground">{userStats.inactiveUsers}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tidak aktif lebih dari 30 hari
                </p>
                <Button
                  type="button"
                  variant="link"
                  className="px-0 text-xs"
                  onClick={() => router.push('/admin/users/details?page=1&pageSize=50&lastActiveBefore=30d')}
                >
                  Lihat
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 rounded-[3px] border border-dashed border-border bg-muted/20 p-8 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Mengumpulkan statistik pengguna…</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional User Insights */}
      {userStats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Insights</CardTitle>
            <CardDescription>Analisis data pengguna platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3 rounded-[3px] border border-border bg-muted/20 p-4">
                <p className="text-sm font-medium text-muted-foreground">Tingkat aktivitas</p>
                <p className="text-sm font-semibold text-foreground">
                  {userStats.totalUsers > 0 ? Math.round((userStats.activeUsers / userStats.totalUsers) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">
                  Dari total pengguna yang aktif dalam 30 hari terakhir
                </p>
              </div>
              <div className="space-y-3 rounded-[3px] border border-border bg-muted/20 p-4">
                <p className="text-sm font-medium text-muted-foreground">Pertumbuhan pengguna</p>
                <p className="text-sm font-semibold text-foreground">
                  {userStats.recentUsers} pengguna baru
                </p>
                <p className="text-xs text-muted-foreground">
                  Bergabung dalam seminggu terakhir
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <AdminAccess requiredPermissions={['admin.system']}>
      <AdminUsersContent />
    </AdminAccess>
  );
}
