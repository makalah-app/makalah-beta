'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminAccess from '../../../src/components/auth/AdminAccess';
import { useAuth } from '../../../src/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, RefreshCw } from 'lucide-react';

interface ConfigStatus {
  primaryProvider: string;
  primaryModel: string;
  primaryTemperature: number;
  primaryMaxTokens: number;
  primaryTopP: number;
  fallbackProvider: string;
  fallbackModel: string;
  fallbackTemperature: number;
  fallbackMaxTokens: number;
  fallbackTopP: number;
  promptCharCount: number;
  promptVersion: string;
}

function AdminStatusContent() {
  const { session, refreshToken } = useAuth();

  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
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
      console.log('[authenticatedFetch] Got 403, attempting token refresh...');

      // Circuit breaker: Check if we're in cooldown period
      const now = Date.now();
      if (lastRefreshTime > 0 && (now - lastRefreshTime) < REFRESH_COOLDOWN) {
        const remainingTime = Math.ceil((REFRESH_COOLDOWN - (now - lastRefreshTime)) / 1000);
        console.warn(`[authenticatedFetch] 403 refresh in cooldown. Wait ${remainingTime} seconds.`);
        throw new Error(`Token refresh rate limited. Please wait ${remainingTime} seconds before trying again.`);
      }

      // Circuit breaker: Check if we've exceeded max attempts
      if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
        console.warn('[authenticatedFetch] Max 403 refresh attempts exceeded');
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
        console.log('[authenticatedFetch] 403 token refresh successful, circuit breaker reset');
        return authenticatedFetch(url, options, retryCount + 1);
      }
    }

    // Handle 429 rate limit errors (no retry to prevent further rate limiting)
    if (response.status === 429) {
      console.warn('[authenticatedFetch] Rate limit reached, stopping retry attempts');
      throw new Error('Rate limit reached. Please wait before trying again.');
    }

    return response;
  }, [session?.accessToken, refreshAttempts, lastRefreshTime, refreshToken]);

  const loadConfigStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authenticatedFetch('/api/admin/config');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to load configuration');
      }

      if (result.success && result.data) {
        // Extract config status from response
        setConfigStatus({
          primaryProvider: result.data.models?.primary?.provider || 'openai',
          primaryModel: result.data.models?.primary?.model || 'gpt-4o',
          primaryTemperature: result.data.models?.primary?.temperature || 0.3,
          primaryMaxTokens: result.data.models?.primary?.maxTokens || 12288,
          primaryTopP: result.data.models?.primary?.topP || 0.9,
          fallbackProvider: result.data.models?.fallback?.provider || 'openrouter',
          fallbackModel: result.data.models?.fallback?.model || 'google/gemini-2.5-flash',
          fallbackTemperature: result.data.models?.fallback?.temperature || 0.3,
          fallbackMaxTokens: result.data.models?.fallback?.maxTokens || 12288,
          fallbackTopP: result.data.models?.fallback?.topP || 0.9,
          promptCharCount: result.data.prompts?.systemInstructions?.content?.length || 0,
          promptVersion: result.data.prompts?.systemInstructions?.version || 'v2.1'
        });

        console.log('✅ Status configuration loaded successfully:', {
          primaryProvider: result.data.models?.primary?.provider,
          fallbackProvider: result.data.models?.fallback?.provider,
          promptVersion: result.data.prompts?.systemInstructions?.version
        });
      }
    } catch (err) {
      console.error('Failed to load config status:', err);
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch]);

  // Load configuration data on mount
  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    loadConfigStatus();
  }, [session?.accessToken, loadConfigStatus]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Status Konfigurasi</h1>
            <p className="text-muted-foreground">
              <RefreshCw className="inline h-4 w-4 animate-spin mr-2" />
              Memuat informasi konfigurasi...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !configStatus) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Status Konfigurasi</h1>
            <p className="text-muted-foreground">
              {error || 'Gagal memuat konfigurasi'}
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                {error || 'Tidak dapat memuat konfigurasi sistem'}
              </p>
              <button
                onClick={loadConfigStatus}
                className="text-sm text-primary hover:underline"
              >
                Coba lagi
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Status Konfigurasi</h1>
          <p className="text-muted-foreground">Ringkasan setup yang sedang aktif</p>
        </div>
      </div>

      {/* Status Overview Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ringkasan Konfigurasi</CardTitle>
          <CardDescription>Setup aktif untuk Makalah AI platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Primary Model */}
            <div className="space-y-3 rounded-[3px] border border-border bg-muted/20 p-4">
              <p className="text-sm font-medium text-muted-foreground">Model aktif</p>
              <p className="text-sm font-semibold text-foreground">
                {configStatus.primaryProvider === 'openai' ? 'OpenAI' : 'OpenRouter'} · {configStatus.primaryModel}
              </p>
              <p className="text-xs text-muted-foreground">
                Temperature {configStatus.primaryTemperature} · Max Tokens {configStatus.primaryMaxTokens} · Top P {configStatus.primaryTopP}
              </p>
            </div>

            {/* Fallback Model */}
            <div className="space-y-3 rounded-[3px] border border-border bg-muted/20 p-4">
              <p className="text-sm font-medium text-muted-foreground">Model fallback</p>
              <p className="text-sm font-semibold text-foreground">
                {configStatus.fallbackProvider === 'openai' ? 'OpenAI' : 'OpenRouter'} · {configStatus.fallbackModel}
              </p>
              <p className="text-xs text-muted-foreground">
                Temperature {configStatus.fallbackTemperature} · Max Tokens {configStatus.fallbackMaxTokens} · Top P {configStatus.fallbackTopP}
              </p>
            </div>

            {/* System Prompt */}
            <div className="space-y-3 rounded-[3px] border border-border bg-muted/20 p-4">
              <p className="text-sm font-medium text-muted-foreground">System prompt</p>
              <p className="text-sm font-semibold text-foreground">{configStatus.promptCharCount} karakter</p>
              <p className="text-xs text-muted-foreground">Versi {configStatus.promptVersion}</p>
            </div>

            {/* Web Search */}
            <div className="space-y-3 rounded-[3px] border border-border bg-muted/20 p-4">
              <p className="text-sm font-medium text-muted-foreground">Web search</p>
              <p className="text-sm font-semibold text-foreground">
                {configStatus.primaryProvider === 'openai' ? 'OpenAI Native' : 'OpenRouter :online'}
              </p>
              <p className="text-xs text-muted-foreground">
                Auto-paired dengan {configStatus.primaryProvider === 'openai' ? 'OpenAI' : 'OpenRouter'} models
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>Akses cepat ke pengaturan utama</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-center justify-between p-3 rounded-[3px] border border-border">
              <div>
                <p className="text-sm font-medium">Model Configuration</p>
                <p className="text-xs text-muted-foreground">Atur provider dan parameters</p>
              </div>
              <Badge variant="secondary">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-[3px] border border-border">
              <div>
                <p className="text-sm font-medium">System Prompt</p>
                <p className="text-xs text-muted-foreground">Edit instruksi AI</p>
              </div>
              <Badge variant="secondary">v{configStatus.promptVersion}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminStatusPage() {
  return (
    <AdminAccess requiredPermissions={['admin.system']}>
      <AdminStatusContent />
    </AdminAccess>
  );
}