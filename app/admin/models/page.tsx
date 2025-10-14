'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminAccess from '../../../src/components/auth/AdminAccess';
import { useAuth } from '../../../src/hooks/useAuth';
import { OPENROUTER_MODELS } from '../../../src/lib/ai/model-registry';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { Brain, Eye, EyeOff, Link, RefreshCw, RotateCcw, Save, Loader2 } from 'lucide-react';

// Predefined model arrays as per task specifications
const openaiVersions = [
  { value: "gpt-4o", label: "GPT-4o (Latest)" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
];

// OpenRouter models (source of truth)
const openrouterVersions = OPENROUTER_MODELS;

// Default parameter values (research-based optimal settings)
const DEFAULT_TEMPERATURE = 0.3;  // Tool execution optimal
const DEFAULT_MAX_TOKENS = 12288;  // Academic paper optimal
const DEFAULT_TOP_P = 0.9;         // Creative-factual balance

interface ConfigData {
  models: {
    primary: {
      provider: string;
      model: string;
      temperature: number;
      maxTokens: number;
      topP: number;
      isActive: boolean;
    };
    fallback: {
      provider: string;
      model: string;
      temperature: number;
      maxTokens: number;
      topP: number;
      isActive: boolean;
    };
  };
  apiKeys: {
    openai?: { value: string; configured: boolean };
    openrouter?: { value: string; configured: boolean };
  };
}

type ModelStatusVariant = 'online' | 'offline' | 'testing' | 'error';

const STATUS_LABEL: Record<ModelStatusVariant, string> = {
  online: 'Online',
  offline: 'Offline',
  testing: 'Pengujian',
  error: 'Gangguan',
};

const STATUS_BADGE_CLASS: Record<ModelStatusVariant, string> = {
  online: 'border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400',
  offline: 'border-muted-foreground/40 bg-muted text-muted-foreground',
  testing: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  error: 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400',
};

const formatStatusBadge = (status: ModelStatusVariant) => STATUS_BADGE_CLASS[status];

function AdminModelsContent() {
  const { session, refreshToken } = useAuth();

  // State for configuration data
  const [configData, setConfigData] = useState<ConfigData | null>(null);

  // Form state
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [openrouterApiKey, setOpenrouterApiKey] = useState("");

  // SEPARATED state variables for Primary and Fallback models
  const [primaryOpenaiVersion, setPrimaryOpenaiVersion] = useState("gpt-4o");
  const [primaryOpenrouterVersion, setPrimaryOpenrouterVersion] = useState("google/gemini-2.5-flash");
  const [fallbackOpenaiVersion, setFallbackOpenaiVersion] = useState("gpt-4o");
  const [fallbackOpenrouterVersion, setFallbackOpenrouterVersion] = useState("google/gemini-2.5-flash");

  // Enhanced model configuration state
  const [primaryTemperature, setPrimaryTemperature] = useState(0.3);
  const [primaryMaxTokens, setPrimaryMaxTokens] = useState(12288);
  const [primaryTopP, setPrimaryTopP] = useState(0.9);
  const [fallbackTemperature, setFallbackTemperature] = useState(0.3);
  const [fallbackMaxTokens, setFallbackMaxTokens] = useState(12288);
  const [fallbackTopP, setFallbackTopP] = useState(0.9);

  // Real-time status state
  const [modelStatus, setModelStatus] = useState<{
    primary: { status: 'online' | 'offline' | 'testing' | 'error'; responseTime?: number; lastChecked?: string; error?: string };
    fallback: { status: 'online' | 'offline' | 'testing' | 'error'; responseTime?: number; lastChecked?: string; error?: string };
  }>({
    primary: { status: 'offline' },
    fallback: { status: 'offline' }
  });

  // Health check state
  const [healthChecking, setHealthChecking] = useState(false);
  const [lastHealthCheck, setLastHealthCheck] = useState<string | null>(null);
  // Runtime telemetry (emergency fallback)
  const [emergencyFallbackActive, setEmergencyFallbackActive] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState<string | null>(null);
  const [emergencyError, setEmergencyError] = useState<string | undefined>(undefined);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API Key visibility state (admin security feature)
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showOpenrouterKey, setShowOpenrouterKey] = useState(false);

  // Dynamic Provider State (for proper swap functionality)
  const [primaryProvider, setPrimaryProvider] = useState<'openai' | 'openrouter'>('openai');
  const [fallbackProvider, setFallbackProvider] = useState<'openai' | 'openrouter'>('openrouter');

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

  const loadConfigData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authenticatedFetch('/api/admin/config?includeSecrets=true&bypassCache=true');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to load configuration');
      }

      if (result.success && result.data) {
        setConfigData(result.data);
        // Runtime telemetry
        if (result.data.runtime) {
          setEmergencyFallbackActive(!!result.data.runtime.emergency_fallback_active);
          setEmergencyReason(result.data.runtime.emergency_fallback_reason ?? null);
          setEmergencyError(result.data.runtime.emergency_error);
        } else {
          setEmergencyFallbackActive(false);
          setEmergencyReason(null);
          setEmergencyError(undefined);
        }

        // Initialize provider states based on loaded database configuration
        const primaryProviderFromDB = result.data.models?.primary?.provider;
        const fallbackProviderFromDB = result.data.models?.fallback?.provider;

        if (primaryProviderFromDB) {
          setPrimaryProvider(primaryProviderFromDB as 'openai' | 'openrouter');
        }
        if (fallbackProviderFromDB) {
          setFallbackProvider(fallbackProviderFromDB as 'openai' | 'openrouter');
        }

        // Load primary model configuration
        if (result.data.models?.primary) {
          setPrimaryTemperature(result.data.models.primary.temperature || 0.3);
          setPrimaryMaxTokens(result.data.models.primary.maxTokens || 12288);
          setPrimaryTopP(result.data.models.primary.topP || 0.9);
        }

        // Load fallback model configuration
        if (result.data.models?.fallback) {
          setFallbackTemperature(result.data.models.fallback.temperature || 0.3);
          setFallbackMaxTokens(result.data.models.fallback.maxTokens || 12288);
          setFallbackTopP(result.data.models.fallback.topP || 0.9);
        }

        // Set UI dropdown values based on CURRENT provider assignment
        if (primaryProviderFromDB === 'openai') {
          setPrimaryOpenaiVersion(result.data.models?.primary?.model || 'gpt-4o');
          setPrimaryOpenrouterVersion('google/gemini-2.5-flash'); // Default for unused
        } else if (primaryProviderFromDB === 'openrouter') {
          setPrimaryOpenrouterVersion(result.data.models?.primary?.model || 'google/gemini-2.5-flash');
          setPrimaryOpenaiVersion('gpt-4o'); // Default for unused
        }

        // Load FALLBACK models based on fallback provider
        if (fallbackProviderFromDB === 'openai') {
          setFallbackOpenaiVersion(result.data.models?.fallback?.model || 'gpt-4o');
          setFallbackOpenrouterVersion('google/gemini-2.5-flash'); // Default for unused
        } else if (fallbackProviderFromDB === 'openrouter') {
          setFallbackOpenrouterVersion(result.data.models?.fallback?.model || 'google/gemini-2.5-flash');
          setFallbackOpenaiVersion('gpt-4o'); // Default for unused
        }

        if (result.data.apiKeys?.openai) {
          setOpenaiApiKey(result.data.apiKeys.openai.value || '');
        }

        if (result.data.apiKeys?.openrouter) {
          setOpenrouterApiKey(result.data.apiKeys.openrouter.value || '');
        }

      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch]);

  // Health check function for real-time status monitoring
  const performHealthCheck = useCallback(async () => {
    setHealthChecking(true);
    const checkTime = new Date().toISOString();

    try {
      // Check primary provider
      setModelStatus(prev => ({ ...prev, primary: { ...prev.primary, status: 'testing' } }));

      const primaryStartTime = Date.now();
      const primaryResponse = await fetch('/api/admin/health/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: primaryProvider === 'openai' ? primaryOpenaiVersion : fallbackOpenaiVersion,
          apiKey: openaiApiKey || 'test-key'
        })
      });
      const primaryResult = await primaryResponse.json();
      const primaryResponseTime = Date.now() - primaryStartTime;

      setModelStatus(prev => ({
        ...prev,
        primary: {
          status: primaryResult.success ? 'online' : 'error',
          responseTime: primaryResponseTime,
          lastChecked: checkTime,
          error: primaryResult.success ? undefined : primaryResult.error
        }
      }));

      // Check fallback provider
      setModelStatus(prev => ({ ...prev, fallback: { ...prev.fallback, status: 'testing' } }));

      const fallbackStartTime = Date.now();
      const fallbackResponse = await fetch('/api/admin/health/openrouter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: primaryProvider === 'openrouter' ? primaryOpenrouterVersion : fallbackOpenrouterVersion,
          apiKey: openrouterApiKey || 'test-key'
        })
      });
      const fallbackResult = await fallbackResponse.json();
      const fallbackResponseTime = Date.now() - fallbackStartTime;

      setModelStatus(prev => ({
        ...prev,
        fallback: {
          status: fallbackResult.success ? 'online' : 'error',
          responseTime: fallbackResponseTime,
          lastChecked: checkTime,
          error: fallbackResult.success ? undefined : fallbackResult.error
        }
      }));

      setLastHealthCheck(checkTime);

    } catch (error) {
      setModelStatus(prev => ({
        primary: { ...prev.primary, status: 'error', error: 'Health check failed', lastChecked: checkTime },
        fallback: { ...prev.fallback, status: 'error', error: 'Health check failed', lastChecked: checkTime }
      }));
    } finally {
      setHealthChecking(false);
    }
  }, [fallbackOpenaiVersion, fallbackOpenrouterVersion, openaiApiKey, openrouterApiKey, primaryOpenaiVersion, primaryOpenrouterVersion, primaryProvider]);

  // Load configuration data on mount
  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    loadConfigData();
  }, [session?.accessToken, loadConfigData]);

  // Run health check after config data is loaded
  useEffect(() => {
    if (configData && !loading) {
      performHealthCheck();
    }
  }, [configData, loading, performHealthCheck]);

  const handleSwapModels = async () => {

    const currentPrimary = {
      provider: primaryProvider,
      openaiVersion: primaryOpenaiVersion,
      openrouterVersion: primaryOpenrouterVersion,
      temperature: primaryTemperature,
      maxTokens: primaryMaxTokens,
      topP: primaryTopP,
    };

    const currentFallback = {
      provider: fallbackProvider,
      openaiVersion: fallbackOpenaiVersion,
      openrouterVersion: fallbackOpenrouterVersion,
      temperature: fallbackTemperature,
      maxTokens: fallbackMaxTokens,
      topP: fallbackTopP,
    };

    setPrimaryOpenaiVersion(currentFallback.openaiVersion);
    setPrimaryOpenrouterVersion(currentFallback.openrouterVersion);
    setPrimaryTemperature(currentFallback.temperature);
    setPrimaryMaxTokens(currentFallback.maxTokens);
    setPrimaryTopP(currentFallback.topP);

    setFallbackOpenaiVersion(currentPrimary.openaiVersion);
    setFallbackOpenrouterVersion(currentPrimary.openrouterVersion);
    setFallbackTemperature(currentPrimary.temperature);
    setFallbackMaxTokens(currentPrimary.maxTokens);
    setFallbackTopP(currentPrimary.topP);

    setPrimaryProvider(currentFallback.provider);
    setFallbackProvider(currentPrimary.provider);

    try {
      setSaving(true);

      const swappedPrimaryConfig = {
        provider: currentFallback.provider,
        model:
          currentFallback.provider === 'openai'
            ? currentFallback.openaiVersion
            : currentFallback.openrouterVersion,
        temperature: currentFallback.temperature,
        maxTokens: currentFallback.maxTokens,
        topP: currentFallback.topP,
        isActive: true,
      };

      const swappedFallbackConfig = {
        provider: currentPrimary.provider,
        model:
          currentPrimary.provider === 'openai'
            ? currentPrimary.openaiVersion
            : currentPrimary.openrouterVersion,
        temperature: currentPrimary.temperature,
        maxTokens: currentPrimary.maxTokens,
        topP: currentPrimary.topP,
        isActive: true,
      };

      const swapUpdateData = {
        models: {
          primary: swappedPrimaryConfig,
          fallback: swappedFallbackConfig,
        },
      };

      const configResponse = await authenticatedFetch('/api/admin/config?bypassCache=true', {
        method: 'POST',
        body: JSON.stringify(swapUpdateData),
      });

      const configResult = await configResponse.json();

      if (configResponse.ok && configResult.success) {
        setSaveSuccess(true);
        await loadConfigData();
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        throw new Error(configResult.error?.message || 'Auto-save failed');
      }
    } catch (swapError) {
      setError('Swap berhasil, tetapi auto-save gagal. Silakan klik "Simpan Konfigurasi" secara manual.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSaveSuccess(false);

      // Map UI state to database configuration based on current provider assignment
      const primaryConfig = {
        provider: primaryProvider,
        model: primaryProvider === 'openai' ? primaryOpenaiVersion : primaryOpenrouterVersion,
        temperature: primaryTemperature,
        maxTokens: primaryMaxTokens,
        topP: primaryTopP,
        isActive: true
      };

      const fallbackConfig = {
        provider: fallbackProvider,
        model: fallbackProvider === 'openai' ? fallbackOpenaiVersion : fallbackOpenrouterVersion,
        temperature: fallbackTemperature,
        maxTokens: fallbackMaxTokens,
        topP: fallbackTopP,
        isActive: true
      };

      // Save model configurations with correct provider mapping
      const modelUpdateData = {
        models: {
          primary: primaryConfig,
          fallback: fallbackConfig
        },
        apiKeys: {
          openai: openaiApiKey.trim() || undefined,
          openrouter: openrouterApiKey.trim() || undefined
        }
      };

      const configResponse = await authenticatedFetch('/api/admin/config?bypassCache=true', {
        method: 'POST',
        body: JSON.stringify(modelUpdateData),
      });

      const configResult = await configResponse.json();

      if (!configResponse.ok) {
        throw new Error(configResult.error?.message || 'Failed to save model configuration');
      }

      setSaveSuccess(true);
      // Reload configuration to show updated data
      await loadConfigData();

      // Hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  // Reset parameters to default values
  const resetPrimaryToDefaults = () => {
    setPrimaryTemperature(DEFAULT_TEMPERATURE);
    setPrimaryMaxTokens(DEFAULT_MAX_TOKENS);
    setPrimaryTopP(DEFAULT_TOP_P);
  };

  const resetFallbackToDefaults = () => {
    setFallbackTemperature(DEFAULT_TEMPERATURE);
    setFallbackMaxTokens(DEFAULT_MAX_TOKENS);
    setFallbackTopP(DEFAULT_TOP_P);
  };

  const lastHealthCheckLabel = lastHealthCheck
    ? new Date(lastHealthCheck).toLocaleString('id-ID')
    : null;

  const isPrimaryOpenAI = primaryProvider === 'openai';
  const isFallbackOpenAI = fallbackProvider === 'openai';
  const primaryApiKey = isPrimaryOpenAI ? openaiApiKey : openrouterApiKey;
  const fallbackApiKey = isFallbackOpenAI ? openaiApiKey : openrouterApiKey;
  const primaryKeyVisible = isPrimaryOpenAI ? showOpenaiKey : showOpenrouterKey;
  const fallbackKeyVisible = isFallbackOpenAI ? showOpenaiKey : showOpenrouterKey;
  const primaryModelOptions = isPrimaryOpenAI ? openaiVersions : openrouterVersions;
  const fallbackModelOptions = isFallbackOpenAI ? openaiVersions : openrouterVersions;

  const handlePrimaryKeyChange = (value: string) => {
    if (isPrimaryOpenAI) {
      setOpenaiApiKey(value);
    } else {
      setOpenrouterApiKey(value);
    }
  };

  const handleFallbackKeyChange = (value: string) => {
    if (isFallbackOpenAI) {
      setOpenaiApiKey(value);
    } else {
      setOpenrouterApiKey(value);
    }
  };

  const togglePrimaryKeyVisibility = () => {
    if (isPrimaryOpenAI) {
      setShowOpenaiKey((prev) => !prev);
    } else {
      setShowOpenrouterKey((prev) => !prev);
    }
  };

  const toggleFallbackKeyVisibility = () => {
    if (isFallbackOpenAI) {
      setShowOpenaiKey((prev) => !prev);
    } else {
      setShowOpenrouterKey((prev) => !prev);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <p className="text-sm font-medium">Memuat konfigurasi model…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start gap-3">
        <Brain className="h-6 w-6 text-primary mt-1" />
        <div>
          <h1 className="text-2xl font-semibold">Konfigurasi Model</h1>
          <p className="text-muted-foreground">Atur provider dan parameter model LLM untuk AI akademik</p>
        </div>
      </div>

      {emergencyFallbackActive && (
        <Alert variant="destructive">
          <AlertTitle>Emergency Fallback Aktif</AlertTitle>
          <AlertDescription>
            Sistem lagi pakai degraded system prompt.
            {emergencyReason && (
              <>
                {' '}Alasan: <span className="font-mono">{emergencyReason}</span>
              </>
            )}
            {emergencyError && (
              <>
                {' '}• Error: <span className="font-mono">{emergencyError}</span>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Kendala konfigurasi</AlertTitle>
          <AlertDescription>
            {typeof error === 'string' ? error : JSON.stringify(error)}
          </AlertDescription>
        </Alert>
      )}

      {saveSuccess && (
        <Alert>
          <AlertTitle>Konfigurasi tersimpan</AlertTitle>
          <AlertDescription>Perubahan model configuration sudah aktif.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10 text-primary shrink-0">
                <Brain className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-xl">Konfigurasi Model LLM</CardTitle>
                <CardDescription>Atur provider utama dan fallback untuk generasi konten.</CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={performHealthCheck}
                disabled={healthChecking}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${healthChecking ? 'animate-spin' : ''}`} />
                {healthChecking ? 'Memeriksa...' : 'Cek kesehatan'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSwapModels}
                disabled={saving}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Tukar provider
              </Button>
              {lastHealthCheckLabel && (
                <Badge variant="secondary" className="text-xs font-medium">
                  Cek terakhir {lastHealthCheckLabel}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Primary Model Card */}
            <Card className="border-border">
              <CardHeader className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">Model Utama</CardTitle>
                    <CardDescription>
                      {isPrimaryOpenAI ? 'Model utama via OpenAI' : 'Model utama via OpenRouter'}
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className={`border ${formatStatusBadge(modelStatus.primary.status)}`}
                  >
                    {STATUS_LABEL[modelStatus.primary.status]}
                    {modelStatus.primary.responseTime ? ` • ${modelStatus.primary.responseTime}ms` : ''}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Provider</Label>
                  <Select
                    value={primaryProvider}
                    onValueChange={(value) => setPrimaryProvider(value as 'openai' | 'openrouter')}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Pilih provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="openrouter">OpenRouter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primary-api-key">API Key</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="primary-api-key"
                      type={primaryKeyVisible ? 'text' : 'password'}
                      value={primaryApiKey}
                      onChange={(event) => handlePrimaryKeyChange(event.target.value)}
                      placeholder={isPrimaryOpenAI ? 'sk-proj-...' : 'sk-or-...'}
                      className="font-mono"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={togglePrimaryKeyVisibility}>
                      {primaryKeyVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Model</Label>
                  <Select
                    value={isPrimaryOpenAI ? primaryOpenaiVersion : primaryOpenrouterVersion}
                    onValueChange={(value) =>
                      isPrimaryOpenAI
                        ? setPrimaryOpenaiVersion(value)
                        : setPrimaryOpenrouterVersion(value)
                    }
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Pilih model" />
                    </SelectTrigger>
                    <SelectContent>
                      {primaryModelOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-6 md:grid-cols-3">
                  {/* Temperature Slider */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-medium text-muted-foreground">Temperature</Label>
                      <span className="text-xs font-mono text-foreground bg-muted px-2 py-1 rounded">{primaryTemperature}</span>
                    </div>
                    <Slider
                      value={[primaryTemperature]}
                      onValueChange={([value]) => setPrimaryTemperature(value)}
                      min={0.1}
                      max={1.0}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0.1</span>
                      <span>1.0</span>
                    </div>
                  </div>

                  {/* Max Tokens Slider */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-medium text-muted-foreground">Max Tokens</Label>
                      <span className="text-xs font-mono text-foreground bg-muted px-2 py-1 rounded">{primaryMaxTokens}</span>
                    </div>
                    <Slider
                      value={[primaryMaxTokens]}
                      onValueChange={([value]) => setPrimaryMaxTokens(value)}
                      min={1000}
                      max={16384}
                      step={256}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1K</span>
                      <span>16K</span>
                    </div>
                  </div>

                  {/* Top P Slider */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-medium text-muted-foreground">Top P</Label>
                      <span className="text-xs font-mono text-foreground bg-muted px-2 py-1 rounded">{primaryTopP}</span>
                    </div>
                    <Slider
                      value={[primaryTopP]}
                      onValueChange={([value]) => setPrimaryTopP(value)}
                      min={0.1}
                      max={0.95}
                      step={0.05}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0.1</span>
                      <span>0.95</span>
                    </div>
                  </div>
                </div>

                {/* Reset to Defaults Button */}
                <div className="pt-4 border-t border-border">
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetPrimaryToDefaults}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Reset to defaults
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fallback Model Card */}
            <Card className="border-border">
              <CardHeader className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">Model Fallback</CardTitle>
                    <CardDescription>
                      {isFallbackOpenAI ? 'Fallback via OpenAI' : 'Fallback via OpenRouter'}
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className={`border ${formatStatusBadge(modelStatus.fallback.status)}`}
                  >
                    {STATUS_LABEL[modelStatus.fallback.status]}
                    {modelStatus.fallback.responseTime ? ` • ${modelStatus.fallback.responseTime}ms` : ''}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Provider</Label>
                  <Select
                    value={fallbackProvider}
                    onValueChange={(value) => setFallbackProvider(value as 'openai' | 'openrouter')}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Pilih provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="openrouter">OpenRouter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fallback-api-key">API Key</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="fallback-api-key"
                      type={fallbackKeyVisible ? 'text' : 'password'}
                      value={fallbackApiKey}
                      onChange={(event) => handleFallbackKeyChange(event.target.value)}
                      placeholder={isFallbackOpenAI ? 'sk-proj-...' : 'sk-or-...'}
                      className="font-mono"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={toggleFallbackKeyVisibility}>
                      {fallbackKeyVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Model</Label>
                  <Select
                    value={isFallbackOpenAI ? fallbackOpenaiVersion : fallbackOpenrouterVersion}
                    onValueChange={(value) =>
                      isFallbackOpenAI
                        ? setFallbackOpenaiVersion(value)
                        : setFallbackOpenrouterVersion(value)
                    }
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Pilih model" />
                    </SelectTrigger>
                    <SelectContent>
                      {fallbackModelOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-6 md:grid-cols-3">
                  {/* Temperature Slider */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-medium text-muted-foreground">Temperature</Label>
                      <span className="text-xs font-mono text-foreground bg-muted px-2 py-1 rounded">{fallbackTemperature}</span>
                    </div>
                    <Slider
                      value={[fallbackTemperature]}
                      onValueChange={([value]) => setFallbackTemperature(value)}
                      min={0.1}
                      max={1.0}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0.1</span>
                      <span>1.0</span>
                    </div>
                  </div>

                  {/* Max Tokens Slider */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-medium text-muted-foreground">Max Tokens</Label>
                      <span className="text-xs font-mono text-foreground bg-muted px-2 py-1 rounded">{fallbackMaxTokens}</span>
                    </div>
                    <Slider
                      value={[fallbackMaxTokens]}
                      onValueChange={([value]) => setFallbackMaxTokens(value)}
                      min={1000}
                      max={16384}
                      step={256}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1K</span>
                      <span>16K</span>
                    </div>
                  </div>

                  {/* Top P Slider */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-medium text-muted-foreground">Top P</Label>
                      <span className="text-xs font-mono text-foreground bg-muted px-2 py-1 rounded">{fallbackTopP}</span>
                    </div>
                    <Slider
                      value={[fallbackTopP]}
                      onValueChange={([value]) => setFallbackTopP(value)}
                      min={0.1}
                      max={0.95}
                      step={0.05}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0.1</span>
                      <span>0.95</span>
                    </div>
                  </div>
                </div>

                {/* Reset to Defaults Button */}
                <div className="pt-4 border-t border-border">
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetFallbackToDefaults}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Reset to defaults
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Auto-Pairing Status - Integrated */}
          <div className="pt-6 border-t border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-primary">
                  <Link className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-semibold">Auto-Pairing Status</h4>
                  <p className="text-sm text-muted-foreground">Provider otomatis terpasang berdasarkan model yang dipilih.</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs font-medium capitalize">
                Otomatis
              </Badge>
            </div>

            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className={`rounded border border-border bg-muted/20 p-4 ${primaryProvider === 'openai' ? 'ring-2 ring-primary/30' : ''}`}>
                  <p className="text-sm font-medium text-primary">OpenAI Models</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-2">Native web search via OpenAI Responses API</p>
                  <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                    <li>GPT-4o, GPT-4o-mini</li>
                    <li>Built-in webSearchPreview tool</li>
                    <li>Tidak perlu API tambahan</li>
                  </ul>
                </div>
                <div className={`rounded border border-border bg-muted/20 p-4 ${primaryProvider === 'openrouter' ? 'ring-2 ring-primary/30' : ''}`}>
                  <p className="text-sm font-medium text-primary">OpenRouter Models</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-2">Automatic web search via :online suffix</p>
                  <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                    <li>Gemini 2.5 Flash, Claude, dll</li>
                    <li>Model name + :online untuk web search</li>
                    <li>Built-in grounding dan citations</li>
                  </ul>
                </div>
              </div>
              <div className="rounded border border-primary/20 bg-primary/5 p-3">
                <p className="text-xs font-medium text-primary mb-1">Current Active Web Search:</p>
                <p className="text-sm font-semibold">
                  {primaryProvider === 'openai' ? 'OpenAI → Native WebSearch (Responses API)' : 'OpenRouter → :online suffix (built-in)'}
                </p>
              </div>

            </div>
          </div>

          {/* Save Button */}
          <div className="pt-6 border-t border-border">
            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="min-w-[140px]"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Models
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminModelsPage() {
  return (
    <AdminAccess requiredPermissions={['admin.system']}>
      <AdminModelsContent />
    </AdminAccess>
  );
}
