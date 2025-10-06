'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminAccess from '../../../src/components/auth/AdminAccess';
import { useAuth } from '../../../src/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  appVersion: string;
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

  // Version edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editVersionValue, setEditVersionValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
        const primaryProvider = result.data.models?.primary?.provider || 'openai';

        // Fetch the appropriate system prompt based on active provider
        let activePromptCharCount = 0;
        let activePromptVersion = 'v2.1';

        if (primaryProvider === 'openrouter') {
          // Fetch OpenRouter system prompt
          try {
            const openrouterPromptResponse = await authenticatedFetch('/api/admin/openrouter-prompt');
            const openrouterPromptResult = await openrouterPromptResponse.json();

            if (openrouterPromptResult.success && openrouterPromptResult.data?.prompt) {
              activePromptCharCount = openrouterPromptResult.data.prompt.content?.length || 0;
              activePromptVersion = openrouterPromptResult.data.prompt.version || 'v1.0';
            }
          } catch (openrouterError) {
            console.warn('Failed to load OpenRouter prompt, using fallback:', openrouterError);
            activePromptCharCount = 0;
          }
        } else {
          // Use OpenAI system prompt (default from config endpoint)
          activePromptCharCount = result.data.prompts?.systemInstructions?.content?.length || 0;
          activePromptVersion = result.data.prompts?.systemInstructions?.version || 'v2.1';
        }

        // Extract config status from response
        setConfigStatus({
          primaryProvider: primaryProvider,
          primaryModel: result.data.models?.primary?.model || 'gpt-4o',
          primaryTemperature: result.data.models?.primary?.temperature || 0.3,
          primaryMaxTokens: result.data.models?.primary?.maxTokens || 12288,
          primaryTopP: result.data.models?.primary?.topP || 0.9,
          fallbackProvider: result.data.models?.fallback?.provider || 'openrouter',
          fallbackModel: result.data.models?.fallback?.model || 'google/gemini-2.5-flash',
          fallbackTemperature: result.data.models?.fallback?.temperature || 0.3,
          fallbackMaxTokens: result.data.models?.fallback?.maxTokens || 12288,
          fallbackTopP: result.data.models?.fallback?.topP || 0.9,
          promptCharCount: activePromptCharCount,
          promptVersion: activePromptVersion,
          appVersion: result.data.settings?.app_version || 'Beta 0.1'
        });

        console.log('\n========================================');
        console.log('📊 ADMIN STATUS - CONFIGURATION LOADED');
        console.log('========================================');
        console.log('🤖 Model yang sedang aktif:',
          primaryProvider.toUpperCase(),
          '·',
          result.data.models?.primary?.model
        );
        console.log('📄 System prompt yang berlaku:',
          primaryProvider === 'openrouter'
            ? '🟡 System Prompt OpenRouter (untuk Gemini)'
            : '🟢 System Prompt OpenAI (untuk GPT)'
        );
        console.log('📏 Prompt length:', activePromptCharCount, 'characters');
        console.log('🔖 Prompt version:', activePromptVersion);
        console.log('🔄 Fallback model:',
          result.data.models?.fallback?.provider?.toUpperCase(),
          '·',
          result.data.models?.fallback?.model
        );
        console.log('========================================\n');
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

  // Handle opening edit version dialog
  const handleEditVersion = () => {
    if (configStatus) {
      setEditVersionValue(configStatus.appVersion);
      setIsEditDialogOpen(true);
    }
  };

  // Handle saving new version
  const handleSaveVersion = async () => {
    if (!editVersionValue.trim()) {
      return;
    }

    try {
      setIsSaving(true);

      const response = await authenticatedFetch('/api/admin/config', {
        method: 'POST',
        body: JSON.stringify({
          appVersion: editVersionValue.trim()
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to update version');
      }

      // Update local state
      if (configStatus) {
        setConfigStatus({
          ...configStatus,
          appVersion: editVersionValue.trim()
        });
      }

      // Close dialog
      setIsEditDialogOpen(false);

      // Optionally reload config to ensure sync
      await loadConfigStatus();

    } catch (err) {
      console.error('Failed to save version:', err);
      setError(err instanceof Error ? err.message : 'Failed to update version');
    } finally {
      setIsSaving(false);
    }
  };

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
            {/* App Version - Full Width */}
            <div className="md:col-span-2 space-y-3 rounded-[3px] border border-border bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">App Version</p>
                  <p className="text-sm font-semibold text-foreground mt-2">
                    {configStatus.appVersion}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Versi aplikasi yang ditampilkan di header
                  </p>
                </div>
                <button
                  className="px-3 py-1.5 text-xs font-medium text-primary hover:text-primary/80 border border-primary hover:bg-primary/5 rounded-md transition-colors"
                  onClick={handleEditVersion}
                >
                  Edit
                </button>
              </div>
            </div>

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
              <p className="text-sm font-semibold text-foreground">
                {configStatus.primaryProvider === 'openai' ? '🟢 System Prompt OpenAI' : '🟡 System Prompt OpenRouter'}
              </p>
              <p className="text-xs text-muted-foreground">
                {configStatus.promptCharCount} karakter · Versi {configStatus.promptVersion}
              </p>
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

      {/* Edit Version Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit App Version</DialogTitle>
            <DialogDescription>
              Ubah versi aplikasi yang ditampilkan di header. Format: &quot;Beta 0.1&quot;, &quot;v1.0&quot;, dll.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label htmlFor="version" className="text-sm font-medium">
                Version
              </label>
              <Input
                id="version"
                value={editVersionValue}
                onChange={(e) => setEditVersionValue(e.target.value)}
                placeholder="Beta 0.1"
                maxLength={50}
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">
                Maksimal 50 karakter
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSaving}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSaveVersion}
              disabled={isSaving || !editVersionValue.trim()}
            >
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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