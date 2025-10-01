'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminAccess from '../../../src/components/auth/AdminAccess';
import { useAuth } from '../../../src/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Cpu, History, RefreshCw, Save, Loader2, Zap, Check, Copy, Database } from 'lucide-react';
import DatabasePrompts from '@/components/admin/DatabasePrompts';

// Default system prompt as per specifications
const DEFAULT_SYSTEM_PROMPT = `You are Makalah AI, an Academic Research Agent specialized in Bahasa Indonesia academic paper development through a structured 7-phase research methodology.

## 7-PHASE ACADEMIC METHODOLOGY:
1. **Topic Clarification & Research Planning**
   - Interactive dialogue to refine topic and research scope
   - Web search for emerging trends and research gaps
   - Methodology approach definition

2. **Literature Research & Data Collection**
   - Comprehensive literature search via web search
   - Academic source prioritization (sinta, garuda, repositories)
   - Research gap identification and synthesis

3. **Framework Analysis & Structure Planning**
   - Transform literature themes into logical framework
   - Interactive outline development
   - Structural flow optimization

4. **Content Development & Draft Writing**
   - Collaborative content development
   - Academic writing standards adherence
   - Research framework consistency

5. **Citation Synthesis & Reference Management**
   - Citation integration with draft content
   - DOI verification and bibliography
   - Reference style consistency

6. **Review & Quality Assurance**
   - Comprehensive deliverable review
   - Academic standards verification
   - Cross-phase consistency check

7. **Finalization & Submission Preparation**
   - Final formatting and validation
   - Submission checklist completion
   - Publication readiness assessment

## BAHASA INDONESIA PROTOCOL:
- ALWAYS communicate in Bahasa Indonesia
- Adapt to user's language style (formal/informal)
- Technical terms remain in original language
- Academic outputs use formal Indonesian

## HITL APPROVAL MECHANISM:
- Use EXACT pattern: "Konfirmasi: Apakah Anda setuju dengan hasil fase [N]?"
- Wait for user approval: setuju, ya, ok, lanjut, oke
- Execute complete_phase_X tool after approval
- No auto-advance between phases

## WEB SEARCH PRIORITIZATION:
1. Indonesian databases: sinta.kemdikbud.go.id, garuda, repository
2. International: ieee.org, jstor.org, springer.com
3. University repositories: .edu, .ac.id domains

## TOOLS AVAILABLE:
- complete_phase_1 through complete_phase_7
- web_search for research needs

Always maintain academic integrity with evidence-based research, proper citations, and collaborative workflow progression.`;

// Default prompt history (will be replaced by API data)
const defaultPromptHistory = [
  { version: "v2.1", date: "2025-01-26", description: "Current - Enhanced academic structure" },
  { version: "v2.0", date: "2025-01-20", description: "Added 7-phase methodology" },
  { version: "v1.5", date: "2025-01-15", description: "Improved Indonesian language support" },
  { version: "v1.0", date: "2025-01-10", description: "Initial system prompt" },
];

function AdminPromptContent() {
  const { session, refreshToken } = useAuth();

  // Form state
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [promptVersion, setPromptVersion] = useState("v2.1");

  // Enhanced prompt management state
  const [promptHistory, setPromptHistory] = useState<any[]>([]);
  const [originalPrompt, setOriginalPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [promptValidation, setPromptValidation] = useState<{ valid: boolean; issues: string[] } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);


  // Fallback prompt management state
  const [fallbackPrompt, setFallbackPrompt] = useState<any | null>(null);
  const [fallbackContent, setFallbackContent] = useState('');
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [fallbackSaving, setFallbackSaving] = useState(false);
  const [fallbackSuccess, setFallbackSuccess] = useState(false);

  // Provider state
  const [primaryProvider, setPrimaryProvider] = useState<'openai' | 'openrouter'>('openai');
  const [currentModelName, setCurrentModelName] = useState<string>('');
  const [providerStatusLoading, setProviderStatusLoading] = useState(false);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPromptHistory, setShowPromptHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('system-prompt');

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

  const loadPromptData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authenticatedFetch('/api/admin/prompts');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to load prompt data');
      }

      if (result.success && result.data) {
        // Load current prompt
        if (result.data.current) {
          setSystemPrompt(result.data.current.content || DEFAULT_SYSTEM_PROMPT);
          setPromptVersion(result.data.current.version || 'v2.1');
          setOriginalPrompt(result.data.current.content || DEFAULT_SYSTEM_PROMPT);
        }

        // Load prompt history
        if (result.data.history && result.data.history.length > 0) {
          setPromptHistory(result.data.history);
        } else {
          setPromptHistory(defaultPromptHistory);
        }

        console.log('✅ Prompt data loaded:', {
          currentVersion: result.data.current?.version,
          historyCount: result.data.history?.length || 0
        });
      }

    } catch (err) {
      console.error('Error loading prompt data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load prompt data');
      // Use defaults on error
      setPromptHistory(defaultPromptHistory);
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch]);


  // Load fallback prompt
  const loadFallbackPrompt = useCallback(async () => {
    if (!session?.accessToken) return;

    try {
      setFallbackLoading(true);
      setError(null);

      const response = await authenticatedFetch('/api/admin/openrouter-prompt');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to load fallback prompt');
      }

      if (result.success && result.data.prompt) {
        setFallbackPrompt(result.data.prompt);
        setFallbackContent(result.data.prompt.content || '');
        console.log('✅ Fallback prompt loaded');
      } else {
        // No fallback prompt - use default
        setFallbackContent(DEFAULT_SYSTEM_PROMPT);
        console.log('ℹ️ No fallback prompt found, using default');
      }
    } catch (err) {
      console.error('Error loading fallback prompt:', err);
      setError(err instanceof Error ? err.message : 'Failed to load fallback prompt');
      setFallbackContent(DEFAULT_SYSTEM_PROMPT);
    } finally {
      setFallbackLoading(false);
    }
  }, [session?.accessToken, authenticatedFetch]);

  // Save fallback prompt
  const saveFallbackPrompt = async () => {
    if (!session?.accessToken || !fallbackContent) return;

    try {
      setFallbackSaving(true);
      setError(null);

      const response = await authenticatedFetch('/api/admin/openrouter-prompt', {
        method: 'PUT',
        body: JSON.stringify({
          content: fallbackContent,
          version: fallbackPrompt?.version || 'v1.0',
          description: 'OpenRouter system prompt for Gemini models'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to save fallback prompt');
      }

      if (result.success) {
        setFallbackPrompt(result.data.prompt);
        setFallbackSuccess(true);
        setTimeout(() => setFallbackSuccess(false), 3000);
        console.log('✅ Fallback prompt saved');
      }
    } catch (err) {
      console.error('Error saving fallback prompt:', err);
      setError(err instanceof Error ? err.message : 'Failed to save fallback prompt');
    } finally {
      setFallbackSaving(false);
    }
  };

  // Load provider status
  const loadProviderStatus = useCallback(async () => {
    if (!session?.accessToken) return;

    try {
      setProviderStatusLoading(true);

      // Get current model config to determine primary provider
      const configResponse = await authenticatedFetch('/api/admin/config');
      const configResult = await configResponse.json();

      // ✅ FIX: API returns models as object {primary, fallback}, not array
      if (configResult.success && configResult.data?.models?.primary) {
        const currentProvider = configResult.data.models.primary.provider;
        const currentModel = configResult.data.models.primary.model;

        setPrimaryProvider(currentProvider);

        // Format model name for badge display
        if (currentProvider === 'openai') {
          // Show exact OpenAI model name (e.g., "gpt-4o", "gpt-4o-mini")
          setCurrentModelName(currentModel || 'GPT-4o');
        } else {
          // For OpenRouter Gemini, show generic "Gemini 2.5" (could be Flash or Pro)
          setCurrentModelName('Gemini 2.5');
        }

        console.log('✅ Primary provider loaded:', currentProvider, '- Model:', currentModel);
      }
    } catch (err) {
      console.error('Error loading provider status:', err);
      setPrimaryProvider('openai'); // fallback
      setCurrentModelName('GPT-4o'); // fallback
    } finally {
      setProviderStatusLoading(false);
    }
  }, [session?.accessToken, authenticatedFetch]);

  // Academic content validation function
  const validateAcademicContent = (content: string): { valid: boolean; issues: string[] } => {
    const issues: string[] = [];

    // Check for 7-phase methodology keywords
    const phaseKeywords = ['klarifikasi', 'riset', 'kerangka', 'pengembangan', 'sintesis', 'review', 'finalisasi'];
    const foundPhases = phaseKeywords.filter(keyword =>
      content.toLowerCase().includes(keyword)
    ).length;

    if (foundPhases < 3) {
      issues.push('Prompt tidak mengandung cukup referensi ke metodologi 7-fase');
    }

    // Check for Indonesian academic keywords
    const academicKeywords = ['akademik', 'penelitian', 'analisis', 'makalah', 'ilmiah'];
    const foundAcademic = academicKeywords.filter(keyword =>
      content.toLowerCase().includes(keyword)
    ).length;

    if (foundAcademic < 2) {
      issues.push('Prompt kurang mengandung terminologi akademik Indonesia');
    }

    // Check for Indonesian language indicators
    const indonesianIndicators = ['anda', 'yang', 'dan', 'dengan', 'untuk', 'dalam'];
    const foundIndonesian = indonesianIndicators.filter(word =>
      content.toLowerCase().includes(word)
    ).length;

    if (foundIndonesian < 4) {
      issues.push('Prompt mungkin tidak menggunakan bahasa Indonesia yang memadai');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  };

  // Real-time validation when prompt changes
  useEffect(() => {
    if (systemPrompt && systemPrompt !== DEFAULT_SYSTEM_PROMPT) {
      const validation = validateAcademicContent(systemPrompt);
      setPromptValidation(validation);
    } else {
      setPromptValidation(null);
    }
  }, [systemPrompt]);

  // Load prompt data on mount
  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    loadPromptData();
    loadFallbackPrompt();
    loadProviderStatus();
  }, [session?.accessToken, loadPromptData, loadFallbackPrompt, loadProviderStatus]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSaveSuccess(false);

      // Check if prompt has changed
      if (systemPrompt === originalPrompt) {
        setError('System prompt is already up to date');
        setSaving(false);
        return;
      }

      const promptUpdateData = {
        content: systemPrompt,
        version: String(promptVersion || 'v2.1'),
        changeReason: 'Admin dashboard update'
      };

      console.log('🔄 Saving system prompt:', {
        contentLength: promptUpdateData.content?.length,
        version: promptUpdateData.version
      });

      const promptResponse = await authenticatedFetch('/api/admin/prompts', {
        method: 'POST',
        body: JSON.stringify(promptUpdateData),
      });

      const promptResult = await promptResponse.json();

      if (!promptResponse.ok) {
        throw new Error(promptResult.error?.message || 'Failed to save system prompt');
      }

      if (promptResult.success && promptResult.data?.prompt) {
        // Update local state with fresh data from server
        const freshContent = promptResult.data.prompt.content;
        setSystemPrompt(freshContent);
        setPromptVersion(promptResult.data.version);
        setOriginalPrompt(freshContent);
        setHasUnsavedChanges(false);  // Clear unsaved changes flag

        // Reload prompt data to get updated history
        await loadPromptData();
      }

      setSaveSuccess(true);

      // Hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);

    } catch (err) {
      console.error('Error saving system prompt:', err);
      setError(err instanceof Error ? err.message : 'Failed to save system prompt');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setError(null);

      // Try to save DEFAULT_SYSTEM_PROMPT to database
      try {
        const saveResponse = await authenticatedFetch('/api/admin/prompts', {
          method: 'POST',
          body: JSON.stringify({
            content: DEFAULT_SYSTEM_PROMPT,
            version: 'v2.1',
            changeReason: 'Reset to default fallback prompt'
          })
        });

        if (saveResponse.ok) {
          const saveResult = await saveResponse.json();
          if (saveResult.success) {
            // Update UI with saved data
            setSystemPrompt(saveResult.data.prompt.content);
            setPromptVersion(saveResult.data.version);
            setOriginalPrompt(saveResult.data.prompt.content);
            await loadPromptData();
          }
        }
      } catch (saveError) {
        console.warn('Could not save to database, using local fallback:', saveError);
        // Fallback to local state only
        setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
        setPromptVersion('v2.1-local');
        setOriginalPrompt(DEFAULT_SYSTEM_PROMPT);
      }

      setError(null);
      setSaveSuccess(false);
      setPromptValidation(null);

    } catch (err) {
      console.error('Error resetting prompt:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset prompt');

      // Ultimate fallback
      setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
      setPromptVersion('v2.1-fallback');
      setOriginalPrompt(DEFAULT_SYSTEM_PROMPT);
    }
  };

  const promptCharCount = systemPrompt.length;

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <p className="text-sm font-medium">Memuat system prompt…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Cpu className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">System Prompt Management</h1>
          <p className="text-muted-foreground">Atur instruksi dasar untuk OpenAI dan OpenRouter Gemini workflows</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {typeof error === 'string' ? error : JSON.stringify(error)}
          </AlertDescription>
        </Alert>
      )}

      {saveSuccess && (
        <Alert>
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>Operation completed successfully!</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="system-prompt" className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            System Prompt OpenAI
            {primaryProvider === 'openai' && (
              <Badge variant="default" className="ml-1 bg-green-600 hover:bg-green-700 text-white">
                Active ({currentModelName || 'GPT-4o'})
              </Badge>
            )}
            {hasUnsavedChanges && (
              <Badge variant="destructive" className="ml-2 text-xs">
                Unsaved
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="fallback" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            System Prompt OpenRouter
            {primaryProvider === 'openrouter' && (
              <Badge variant="default" className="ml-1 bg-green-600 hover:bg-green-700 text-white">
                Active (Gemini 2.5)
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Database Prompts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="system-prompt" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[3px] bg-primary/10 text-primary">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-xl">System Prompt OpenAI</CardTitle>
                    <CardDescription>System prompt untuk OpenAI models (GPT-4o, GPT-4o-mini). Aktif saat primary provider = OpenAI.</CardDescription>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {hasUnsavedChanges && (
                    <Badge variant="destructive" className="text-xs font-medium">
                      Unsaved Changes
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs font-medium">
                    {promptCharCount} karakter
                  </Badge>
                  <Badge variant="outline" className="text-xs font-medium">
                    Versi {promptVersion}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPromptHistory((prev) => !prev)}
                  >
                    <History className="mr-2 h-4 w-4" />
                    {showPromptHistory ? 'Sembunyikan riwayat' : 'Lihat riwayat'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showPromptHistory && (
                <div className="rounded-[3px] border border-dashed border-border bg-muted/20 p-4">
                  <p className="text-sm font-medium text-muted-foreground">Riwayat versi prompt</p>
                  <div className="mt-3 space-y-2">
                    {(promptHistory.length ? promptHistory : defaultPromptHistory).map((item) => (
                      <div
                        key={item.version}
                        className="flex flex-col gap-1 rounded-[3px] border border-transparent bg-background px-3 py-2 transition-colors hover:border-border"
                      >
                        <div className="flex items-center justify-between text-sm font-medium text-foreground">
                          <span>{item.version}</span>
                          <span className="text-xs text-muted-foreground">{item.date}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{item.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="system-prompt">Instruksi sistem</Label>
                <Textarea
                  id="system-prompt"
                  value={systemPrompt}
                  onChange={(event) => {
                    setSystemPrompt(event.target.value);
                    setHasUnsavedChanges(event.target.value !== originalPrompt);
                  }}
                  rows={20}
                  className="font-mono text-sm"
                  placeholder="Masukkan system prompt untuk AI agent…"
                />
                <p className="text-xs text-muted-foreground">
                  Prompt ini menjadi referensi utama bagi agent saat memandu 7 fase penulisan.
                </p>
              </div>

              {/* Alert: Kapan OpenAI Prompt Aktif */}
              <Alert>
                <Cpu className="h-4 w-4" />
                <AlertTitle>Kapan System Prompt OpenAI Aktif?</AlertTitle>
                <AlertDescription>
                  System prompt ini otomatis digunakan saat:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Primary provider di Konfigurasi Model = <strong>OpenAI</strong></li>
                    <li>Model aktif: GPT-4o, GPT-4o-mini, atau model OpenAI lainnya</li>
                  </ul>
                  Prompt ini dioptimasi khusus untuk GPT models dengan kemampuan native web search.
                </AlertDescription>
              </Alert>
              {promptValidation && !promptValidation.valid && (
                <Alert variant="default">
                  <AlertTitle>Perlu penyesuaian</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc space-y-1 pl-4">
                      {promptValidation.issues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="pt-6 border-t border-border">
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="text-xs"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reset to default
                  </Button>

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
                        Save Prompt
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fallback" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[3px] bg-primary/10 text-primary">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-xl">System Prompt OpenRouter</CardTitle>
                    <CardDescription>System prompt untuk OpenRouter Gemini models (2.5 Flash & Pro). Aktif saat primary provider = OpenRouter.</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {fallbackLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fallback-content">Fallback Prompt Content</Label>
                    <Textarea
                      id="fallback-content"
                      value={fallbackContent}
                      onChange={(e) => setFallbackContent(e.target.value)}
                      className="min-h-[400px] font-mono text-sm"
                      placeholder="Enter fallback system prompt..."
                    />
                    <p className="text-xs text-muted-foreground">
                      {fallbackContent.length} characters (min: 100, max: 50,000)
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      onClick={saveFallbackPrompt}
                      disabled={fallbackSaving || fallbackContent.length < 100}
                      className="flex items-center gap-2"
                    >
                      {fallbackSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : fallbackSuccess ? (
                        <>
                          <Check className="h-4 w-4" />
                          Saved
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save Fallback Prompt
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setFallbackContent(systemPrompt)}
                      disabled={fallbackSaving}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy from System Prompt
                    </Button>
                  </div>

                  <Alert>
                    <Zap className="h-4 w-4" />
                    <AlertTitle>Kapan System Prompt OpenRouter Aktif?</AlertTitle>
                    <AlertDescription>
                      System prompt ini otomatis digunakan saat:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Primary provider di Konfigurasi Model = <strong>OpenRouter</strong></li>
                        <li>Model aktif: Gemini 2.5 Flash, Gemini 2.5 Pro, atau model OpenRouter lainnya</li>
                        <li>Admin swap provider dari OpenAI ke OpenRouter</li>
                      </ul>
                      Prompt ini dioptimasi khusus untuk Gemini models dengan web search via <code>:online</code> suffix.
                    </AlertDescription>
                  </Alert>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="database" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[3px] bg-primary/10 text-primary">
                    <Database className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-xl">Database Management</CardTitle>
                    <CardDescription>View and manage all system prompts stored in Supabase database.</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DatabasePrompts
                session={session}
                authenticatedFetch={authenticatedFetch}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AdminPromptPage() {
  return (
    <AdminAccess requiredPermissions={['admin.system']}>
      <AdminPromptContent />
    </AdminAccess>
  );
}