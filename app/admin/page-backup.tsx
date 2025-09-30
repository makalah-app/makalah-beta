'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminAccess from '../../src/components/auth/AdminAccess';
import { useAuth } from '../../src/hooks/useAuth';
import { OPENROUTER_MODELS } from '../../src/lib/ai/model-registry';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { Brain, Cpu, Eye, EyeOff, History, Link, RefreshCw, RotateCcw, Save, Shield, Wifi, Loader2 } from 'lucide-react';

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

interface ConfigData {
  models: {
    primary: {
      provider: string;
      model: string;
      temperature: number;
      maxTokens: number;
      isActive: boolean;
    };
    fallback: {
      provider: string;
      model: string;
      temperature: number;
      maxTokens: number;
      isActive: boolean;
    };
  };
  prompts: {
    systemInstructions: {
      content: string;
      version: string;
      charCount: number;
      phase: string;
      priority: number;
    };
  };
  apiKeys: {
    openai?: { value: string; configured: boolean };
    openrouter?: { value: string; configured: boolean };
  };
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  recentUsers: number;
  inactiveUsers: number;
}

// Default prompt history (will be replaced by API data)
const defaultPromptHistory = [
  { version: "v2.1", date: "2025-01-26", description: "Current - Enhanced academic structure" },
  { version: "v2.0", date: "2025-01-20", description: "Added 7-phase methodology" },
  { version: "v1.5", date: "2025-01-15", description: "Improved Indonesian language support" },
  { version: "v1.0", date: "2025-01-10", description: "Initial system prompt" },
];

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


function AdminDashboardContent() {
  const { session, refreshToken, isTokenExpired } = useAuth(); // Get auth session and refresh utilities
  
  // State for configuration data
  const [configData, setConfigData] = useState<ConfigData | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  
  // Form state
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [openrouterApiKey, setOpenrouterApiKey] = useState("");
  // SEPARATED state variables for Primary and Fallback models
  const [primaryOpenaiVersion, setPrimaryOpenaiVersion] = useState("gpt-4o");
  const [primaryOpenrouterVersion, setPrimaryOpenrouterVersion] = useState("google/gemini-2.5-flash");
  const [fallbackOpenaiVersion, setFallbackOpenaiVersion] = useState("gpt-4o");
  const [fallbackOpenrouterVersion, setFallbackOpenrouterVersion] = useState("google/gemini-2.5-flash");
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [promptVersion, setPromptVersion] = useState("v2.1");
  
  // Enhanced prompt management state
  const [promptHistory, setPromptHistory] = useState<any[]>([]);
  const [originalPrompt, setOriginalPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [promptValidation, setPromptValidation] = useState<{ valid: boolean; issues: string[] } | null>(null);
  
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

  const [initialFetchDone, setInitialFetchDone] = useState(false);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showPromptHistory, setShowPromptHistory] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Separate save states for each section
  const [savingModels, setSavingModels] = useState(false);
  const [saveModelsSuccess, setSaveModelsSuccess] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  const [savingPrompt, setSavingPrompt] = useState(false);
  const [savePromptSuccess, setSavePromptSuccess] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);

  // Circuit breaker for token refresh
  const [refreshAttempts, setRefreshAttempts] = useState(0);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  const MAX_REFRESH_ATTEMPTS = 3;
  const REFRESH_COOLDOWN = 30000; // 30 seconds
  
  // API Key visibility state (admin security feature)
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showOpenrouterKey, setShowOpenrouterKey] = useState(false);
  
  // Dynamic Provider State (for proper swap functionality)
  const [primaryProvider, setPrimaryProvider] = useState<'openai' | 'openrouter'>('openai');
  const [fallbackProvider, setFallbackProvider] = useState<'openai' | 'openrouter'>('openrouter');

  // Perplexity API Key State (backup configuration)
  const [perplexityApiKey, setPerplexityApiKey] = useState('');
  const [showPerplexityKey, setShowPerplexityKey] = useState(false);

  // Simplified configuration state (removed hybrid complexity)

  // Helper function for authenticated API calls with token refresh and retry
  const authenticatedFetch = useCallback(async (url: string, options: RequestInit = {}, retryCount = 0): Promise<Response> => {
    if (!session?.accessToken) {
      throw new Error('No authentication token available');
    }

    // DISABLED: Proactive token expiry check (was causing infinite refresh loop)
    // Only refresh token on actual 401/403 errors from server

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

  const loadConfigData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authenticatedFetch('/api/admin/config?includeSecrets=true');
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to load configuration');
      }
      
      if (result.success && result.data) {
        setConfigData(result.data);
        
        // ✅ FIX: Initialize provider states based on loaded database configuration
        const primaryProviderFromDB = result.data.models?.primary?.provider;
        const fallbackProviderFromDB = result.data.models?.fallback?.provider;
        
        if (primaryProviderFromDB) {
          setPrimaryProvider(primaryProviderFromDB as 'openai' | 'openrouter');
        }
        if (fallbackProviderFromDB) {
          setFallbackProvider(fallbackProviderFromDB as 'openai' | 'openrouter');
        }
        
        // ✅ FIX: Separate UI state management untuk avoid conflicts
        // Load primary model configuration
        if (result.data.models?.primary) {
          const primaryModel = result.data.models.primary.model;
          const primaryProvider = result.data.models.primary.provider;
          
          console.log('🔄 Loading PRIMARY config:', {
            provider: primaryProvider,
            model: primaryModel,
            temperature: result.data.models.primary.temperature,
            maxTokens: result.data.models.primary.maxTokens
          });
          
          setPrimaryTemperature(result.data.models.primary.temperature || 0.3);
          setPrimaryMaxTokens(result.data.models.primary.maxTokens || 12288);
          setPrimaryTopP(result.data.models.primary.topP || 0.9);
        }
        
        // Load fallback model configuration
        if (result.data.models?.fallback) {
          const fallbackModel = result.data.models.fallback.model;
          const fallbackProvider = result.data.models.fallback.provider;
          
          console.log('🔄 Loading FALLBACK config:', {
            provider: fallbackProvider,
            model: fallbackModel,
            temperature: result.data.models.fallback.temperature,
            maxTokens: result.data.models.fallback.maxTokens
          });
          
          setFallbackTemperature(result.data.models.fallback.temperature || 0.3);
          setFallbackMaxTokens(result.data.models.fallback.maxTokens || 12288);
          setFallbackTopP(result.data.models.fallback.topP || 0.9);
        }
        
        // ✅ FIX: Set UI dropdown values based on CURRENT provider assignment
        // This ensures dropdown shows correct model regardless of provider switching
        console.log('🔄 Setting dropdown values based on provider assignment:', {
          primaryProvider: primaryProviderFromDB,
          fallbackProvider: fallbackProviderFromDB,
          primaryModel: result.data.models?.primary?.model,
          fallbackModel: result.data.models?.fallback?.model
        });
        
        // Load PRIMARY models based on primary provider
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
        
        if (result.data.prompts?.systemInstructions) {
          setSystemPrompt(result.data.prompts.systemInstructions.content || DEFAULT_SYSTEM_PROMPT);
          setPromptVersion(result.data.prompts.systemInstructions.version || 'v2.1');
        }
        
        if (result.data.apiKeys?.openai) {
          setOpenaiApiKey(result.data.apiKeys.openai.value || '');
        }
        
        if (result.data.apiKeys?.openrouter) {
          setOpenrouterApiKey(result.data.apiKeys.openrouter.value || '');
        }

        if (result.data.apiKeys?.perplexity) {
          setPerplexityApiKey(result.data.apiKeys.perplexity.value || '');
        }

        console.log('✅ Configuration loaded with auto-pairing:', {
          primaryProvider: primaryProviderFromDB,
          fallbackProvider: fallbackProviderFromDB,
          primaryModel: result.data.models?.primary?.model,
          fallbackModel: result.data.models?.fallback?.model,
          autoWebSearch: `${primaryProviderFromDB} → ${primaryProviderFromDB === 'openai' ? 'OpenAI Native' : 'Perplexity Sonar'}`
        });
      }
      
    } catch (err) {
      console.error('Error loading config data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch]);

  const loadUserStats = useCallback(async () => {
    try {
      const response = await authenticatedFetch('/api/admin/users');
      const result = await response.json();
      
      if (response.ok && result.success && result.data?.statistics) {
        setUserStats(result.data.statistics);
      }
    } catch (err) {
      console.error('Error loading user stats:', err);
    }
  }, [authenticatedFetch]);

  const loadPromptData = useCallback(async () => {
    try {
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
    }
  }, [authenticatedFetch]);

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

  // Health check function for real-time status monitoring
  const performHealthCheck = useCallback(async () => {
    setHealthChecking(true);
    const checkTime = new Date().toISOString();
    
    try {
      // Check primary provider (OpenAI)
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

      // Check fallback provider (OpenRouter)  
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
      console.error('Health check failed:', error);
      
      setModelStatus(prev => ({
        primary: { ...prev.primary, status: 'error', error: 'Health check failed', lastChecked: checkTime },
        fallback: { ...prev.fallback, status: 'error', error: 'Health check failed', lastChecked: checkTime }
      }));
    } finally {
      setHealthChecking(false);
    }
  }, [fallbackOpenaiVersion, fallbackOpenrouterVersion, openaiApiKey, openrouterApiKey, primaryOpenaiVersion, primaryOpenrouterVersion, primaryProvider]);

  // Load configuration data sequentially to prevent rate limiting
  useEffect(() => {
    if (!session?.accessToken) {
      setInitialFetchDone(false);
      return;
    }

    if (initialFetchDone) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await loadConfigData();
        if (cancelled) return;
        await loadUserStats();
        if (cancelled) return;
        await loadPromptData();
        if (!cancelled) {
          setInitialFetchDone(true);
        }
      } catch (error) {
        console.error('[AdminDashboard] Sequential data loading failed:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.accessToken, loadConfigData, loadPromptData, loadUserStats, initialFetchDone]);

  // Set up periodic token refresh to prevent expiry
  useEffect(() => {
    if (!session?.accessToken) return;

    const refreshInterval = setInterval(async () => {
      if (isTokenExpired(10)) {
        console.log('[Admin] Proactive token refresh triggered');
        try {
          await refreshToken();
        } catch (error) {
          console.error('[Admin] Proactive refresh failed:', error);
        }
      }
    }, 30 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [session?.accessToken, isTokenExpired, refreshToken]);

  // Run health check after config data is loaded
  useEffect(() => {
    if (configData && !loading) {
      performHealthCheck();
    }
  }, [configData, loading, performHealthCheck]);

  // Auto-refresh health check every 5 minutes
  useEffect(() => {
    const healthCheckInterval = setInterval(() => {
      performHealthCheck();
    }, 5 * 60 * 1000);

    return () => clearInterval(healthCheckInterval);
  }, [performHealthCheck]);

  const handleSwapModels = async () => {
    console.log('🔄 Starting provider swap...');

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
        isActive: true,
      };

      const swapUpdateData = {
        models: {
          primary: swappedPrimaryConfig,
          fallback: swappedFallbackConfig,
        },
      };

      const configResponse = await authenticatedFetch('/api/admin/config', {
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
      console.error('❌ Auto-save after swap failed:', swapError);
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
      
      // ✅ FIX: Use dynamic provider states for correct database mapping
      // Map UI state to database configuration based on current provider assignment
      const primaryConfig = {
        provider: primaryProvider,
        model: primaryProvider === 'openai' ? primaryOpenaiVersion : primaryOpenrouterVersion,
        temperature: primaryTemperature,
        maxTokens: primaryMaxTokens,
        isActive: true
      };
      
      const fallbackConfig = {
        provider: fallbackProvider,
        model: fallbackProvider === 'openai' ? fallbackOpenaiVersion : fallbackOpenrouterVersion,  
        temperature: fallbackTemperature,
        maxTokens: fallbackMaxTokens,
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
          openrouter: openrouterApiKey.trim() || undefined,
          perplexity: perplexityApiKey.trim() || undefined
        }
      };
      
      console.log('🔄 Saving configuration with dynamic provider mapping:', {
        primaryProvider,
        fallbackProvider,
        primaryModel: primaryConfig.model,
        fallbackModel: fallbackConfig.model
      });
      
      // Save models and API keys first
      const configResponse = await authenticatedFetch('/api/admin/config', {
        method: 'POST',
        body: JSON.stringify(modelUpdateData),
      });
      
      const configResult = await configResponse.json();
      
      if (!configResponse.ok) {
        throw new Error(configResult.error?.message || 'Failed to save model configuration');
      }
      
      // Debug system prompt comparison
      console.log('🔍 System prompt comparison debug:', {
        systemPromptLength: systemPrompt?.length,
        originalPromptLength: originalPrompt?.length,
        systemPromptPreview: systemPrompt?.substring(0, 100) + '...',
        originalPromptPreview: originalPrompt?.substring(0, 100) + '...',
        areEqual: systemPrompt === originalPrompt,
        trimmedEqual: systemPrompt?.trim() === originalPrompt?.trim(),
        bothDefined: !!systemPrompt && !!originalPrompt
      });

      // Save system prompt separately if it has changed
      if (systemPrompt !== originalPrompt) {
        const promptUpdateData = {
          content: systemPrompt,
          version: String(promptVersion || 'v2.1'), // Convert to string to match backend schema
          changeReason: 'Admin dashboard update'
        };
        
        console.log('🔍 Sending prompt update data:', {
          content: promptUpdateData.content?.length + ' characters',
          version: promptUpdateData.version,
          changeReason: promptUpdateData.changeReason,
          fullContent: promptUpdateData.content?.substring(0, 100) + '...'
        });
        
        const promptResponse = await authenticatedFetch('/api/admin/prompts', {
          method: 'POST',
          body: JSON.stringify(promptUpdateData),
        });
        
        const promptResult = await promptResponse.json();
        
        if (!promptResponse.ok) {
          console.error('❌ Prompt save failed:', {
            status: promptResponse.status,
            statusText: promptResponse.statusText,
            error: promptResult.error,
            fullResult: promptResult
          });
          throw new Error(promptResult.error?.message || 'Failed to save system prompt');
        }
        
        if (promptResult.success && promptResult.data?.prompt) {
          // Update local state with FRESH data from server
          const freshContent = promptResult.data.prompt.content;
          setSystemPrompt(freshContent);
          setPromptVersion(promptResult.data.version);
          setOriginalPrompt(freshContent);

          // Reload prompt data to get updated history
          await loadPromptData();
        }
      }
      
      setSaveSuccess(true);
      // Reload configuration to show updated data
      await loadConfigData();
      
      // Hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
      
    } catch (err) {
      console.error('Error saving configuration:', err);
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  // Save Model Configuration Only
  const handleSaveModels = async () => {
    try {
      setSavingModels(true);
      setModelsError(null);
      setSaveModelsSuccess(false);

      // Map UI state to database configuration
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

      // Save model configurations and API keys
      const modelUpdateData = {
        models: {
          primary: primaryConfig,
          fallback: fallbackConfig
        },
        apiKeys: {
          openai: openaiApiKey.trim() || undefined,
          openrouter: openrouterApiKey.trim() || undefined,
          perplexity: perplexityApiKey.trim() || undefined
        }
      };

      console.log('🔄 Saving model configuration:', {
        primaryProvider,
        fallbackProvider,
        primaryModel: primaryConfig.model,
        fallbackModel: fallbackConfig.model
      });

      const configResponse = await authenticatedFetch('/api/admin/config', {
        method: 'POST',
        body: JSON.stringify(modelUpdateData),
      });

      const configResult = await configResponse.json();

      if (!configResponse.ok) {
        throw new Error(configResult.error?.message || 'Failed to save model configuration');
      }

      setSaveModelsSuccess(true);
      await loadConfigData();

      // Hide success message after 3 seconds
      setTimeout(() => setSaveModelsSuccess(false), 3000);

    } catch (err) {
      console.error('Error saving model configuration:', err);
      setModelsError(err instanceof Error ? err.message : 'Failed to save model configuration');
    } finally {
      setSavingModels(false);
    }
  };

  // Save System Prompt Only
  const handleSavePrompt = async () => {
    try {
      setSavingPrompt(true);
      setPromptError(null);
      setSavePromptSuccess(false);

      // Check if prompt has changed
      if (systemPrompt === originalPrompt) {
        setPromptError('No changes detected in system prompt');
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

        // Reload prompt data to get updated history
        await loadPromptData();
      }

      setSavePromptSuccess(true);

      // Hide success message after 3 seconds
      setTimeout(() => setSavePromptSuccess(false), 3000);

    } catch (err) {
      console.error('Error saving system prompt:', err);
      setPromptError(err instanceof Error ? err.message : 'Failed to save system prompt');
    } finally {
      setSavingPrompt(false);
    }
  };

  const handleReset = async () => {
    try {
      setResetting(true);
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

      // Reset all form values to defaults
      setOpenaiApiKey('');
      setOpenrouterApiKey('');
      setPrimaryOpenaiVersion('gpt-4o');
      setPrimaryOpenrouterVersion('google/gemini-2.5-flash');
      setFallbackOpenaiVersion('gpt-4o');
      setFallbackOpenrouterVersion('google/gemini-2.5-flash');

      // Reset enhanced parameters
      setPrimaryTemperature(0.3);
      setPrimaryMaxTokens(12288);
      setPrimaryTopP(0.9);
      setFallbackTemperature(0.3);
      setFallbackMaxTokens(12288);
      setFallbackTopP(0.9);

      // Reset status indicators
      setModelStatus({
        primary: { status: 'offline' },
        fallback: { status: 'offline' }
      });

      setError(null);
      setSaveSuccess(false);
      setPromptValidation(null);

    } catch (err) {
      console.error('Error resetting configuration:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset configuration');

      // Ultimate fallback
      setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
      setPromptVersion('v2.1-fallback');
      setOriginalPrompt(DEFAULT_SYSTEM_PROMPT);
    } finally {
      setTimeout(() => setResetting(false), 800);
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

  const promptCharCount = systemPrompt.length;

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
          <p className="text-sm font-medium">Memuat konfigurasi admin…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="py-10">
        <div className="w-full max-w-5xl mx-auto space-y-6">
          <Card className="border-border">
          <CardHeader className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Shield className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-3xl font-semibold text-foreground">Admin Panel</CardTitle>
                <CardDescription>
                  Kelola konfigurasi model AI, system prompt, dan provider pencarian untuk platform Makalah AI.
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <Badge variant="outline" className="text-xs font-medium">
                Versi prompt: {promptVersion}
              </Badge>
              {lastHealthCheckLabel && (
                <Badge variant="secondary" className="text-xs font-medium">
                  Cek kesehatan terakhir {lastHealthCheckLabel}
                </Badge>
              )}
            </div>
          </CardHeader>
        </Card>

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
            <AlertDescription>Perubahan terbaru sudah aktif.</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status Konfigurasi</CardTitle>
            <CardDescription>Ringkasan setup yang sedang aktif.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3 rounded-md border border-border bg-muted/20 p-4">
                <p className="text-sm font-medium text-muted-foreground">Model aktif</p>
                <p className="text-sm font-semibold text-foreground">
                  {isPrimaryOpenAI ? 'OpenAI' : 'OpenRouter'} ·{' '}
                  {isPrimaryOpenAI ? primaryOpenaiVersion : primaryOpenrouterVersion}
                </p>
                <p className="text-xs text-muted-foreground">
                  Temperature {primaryTemperature} · Max Tokens {primaryMaxTokens} · Top P {primaryTopP}
                </p>
              </div>
              <div className="space-y-3 rounded-md border border-border bg-muted/20 p-4">
                <p className="text-sm font-medium text-muted-foreground">Model fallback</p>
                <p className="text-sm font-semibold text-foreground">
                  {isFallbackOpenAI ? 'OpenAI' : 'OpenRouter'} ·{' '}
                  {isFallbackOpenAI ? fallbackOpenaiVersion : fallbackOpenrouterVersion}
                </p>
                <p className="text-xs text-muted-foreground">
                  Temperature {fallbackTemperature} · Max Tokens {fallbackMaxTokens} · Top P {fallbackTopP}
                </p>
              </div>
              <div className="space-y-3 rounded-md border border-border bg-muted/20 p-4">
                <p className="text-sm font-medium text-muted-foreground">System prompt</p>
                <p className="text-sm font-semibold text-foreground">{promptCharCount} karakter</p>
                <p className="text-xs text-muted-foreground">Versi {promptVersion}</p>
              </div>
              <div className="space-y-3 rounded-md border border-border bg-muted/20 p-4">
                <p className="text-sm font-medium text-muted-foreground">Web search</p>
                <p className="text-sm font-semibold text-foreground">
                  {primaryProvider === 'openai' ? 'OpenAI Native' : 'Perplexity Sonar Pro'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Auto-paired dengan {primaryProvider === 'openai' ? 'OpenAI' : 'OpenRouter'} models
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
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
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
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
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
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
                  <div className={`rounded-md border border-border bg-muted/20 p-4 ${primaryProvider === 'openai' ? 'ring-2 ring-primary/30' : ''}`}>
                    <p className="text-sm font-medium text-primary">OpenAI Models</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-2">Auto-paired dengan OpenAI Native WebSearch</p>
                    <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                      <li>GPT-4o, GPT-4o-mini</li>
                      <li>Integrasi native dengan pencarian web</li>
                      <li>Tidak perlu API tambahan</li>
                    </ul>
                  </div>
                  <div className={`rounded-md border border-border bg-muted/20 p-4 ${primaryProvider === 'openrouter' ? 'ring-2 ring-primary/30' : ''}`}>
                    <p className="text-sm font-medium text-primary">OpenRouter Models</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-2">Auto-paired dengan Perplexity Sonar Pro</p>
                    <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                      <li>Gemini 2.5 Flash, Claude, dll</li>
                      <li>Pencarian akademik dengan sitasi</li>
                      <li>Backup API key tersedia di Advanced</li>
                    </ul>
                  </div>
                </div>
                <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
                  <p className="text-xs font-medium text-primary mb-1">Current Active Pairing:</p>
                  <p className="text-sm font-semibold">
                    {primaryProvider === 'openai' ? 'OpenAI Models → OpenAI Native WebSearch' : 'OpenRouter Models → Perplexity Sonar Pro'}
                  </p>
                </div>

                {/* Perplexity API Key - Backup Configuration */}
                <div className="space-y-2 pt-2 border-t">
                  <Label htmlFor="perplexity-key" className="text-xs font-medium text-muted-foreground">
                    Perplexity API Key (Backup)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="perplexity-key"
                      type={showPerplexityKey ? 'text' : 'password'}
                      value={perplexityApiKey}
                      onChange={(event) => setPerplexityApiKey(event.target.value)}
                      placeholder="pplx-... (optional backup)"
                      className="font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowPerplexityKey((prev) => !prev)}
                    >
                      {showPerplexityKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    API key cadangan untuk Perplexity. Environment key akan digunakan sebagai prioritas utama.
                  </p>
                </div>
              </div>
            </div>

            {/* Save Models Button */}
            <div className="pt-6 border-t border-border">
              <div className="flex justify-end gap-3">
                {modelsError && (
                  <Alert variant="destructive" className="flex-1">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{modelsError}</AlertDescription>
                  </Alert>
                )}

                {saveModelsSuccess && (
                  <Alert className="flex-1">
                    <AlertTitle>Success</AlertTitle>
                    <AlertDescription>Model configuration saved successfully!</AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleSaveModels}
                  disabled={savingModels}
                  className="min-w-[120px]"
                >
                  {savingModels ? (
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

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Cpu className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-xl">System Prompt</CardTitle>
                  <CardDescription>Tetapkan instruksi dasar untuk Makalah AI.</CardDescription>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-xs font-medium">
                  {promptCharCount} karakter
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
              <div className="rounded-md border border-dashed border-border bg-muted/20 p-4">
                <p className="text-sm font-medium text-muted-foreground">Riwayat versi prompt</p>
                <div className="mt-3 space-y-2">
                  {(promptHistory.length ? promptHistory : defaultPromptHistory).map((item) => (
                    <div
                      key={item.version}
                      className="flex flex-col gap-1 rounded-md border border-transparent bg-background px-3 py-2 transition-colors hover:border-border"
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
                onChange={(event) => setSystemPrompt(event.target.value)}
                rows={16}
                className="font-mono text-sm"
                placeholder="Masukkan system prompt untuk AI agent…"
              />
              <p className="text-xs text-muted-foreground">
                Prompt ini menjadi referensi utama bagi agent saat memandu 7 fase penulisan.
              </p>
            </div>
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

            {/* Save System Prompt Button */}
            <div className="pt-6 border-t border-border">
              <div className="flex justify-end gap-3">
                {promptError && (
                  <Alert variant="destructive" className="flex-1">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{promptError}</AlertDescription>
                  </Alert>
                )}

                {savePromptSuccess && (
                  <Alert className="flex-1">
                    <AlertTitle>Success</AlertTitle>
                    <AlertDescription>System prompt saved successfully!</AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleSavePrompt}
                  disabled={savingPrompt}
                  className="min-w-[120px]"
                >
                  {savingPrompt ? (
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

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Statistik Pengguna</CardTitle>
            <CardDescription>Memantau pemakaian Makalah AI.</CardDescription>
          </CardHeader>
          <CardContent>
            {userStats ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-md border border-border bg-background p-4">
                  <p className="text-xs text-muted-foreground">Total pengguna</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{userStats.totalUsers}</p>
                </div>
                <div className="rounded-md border border-border bg-background p-4">
                  <p className="text-xs text-muted-foreground">Pengguna aktif (30 hari)</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{userStats.activeUsers}</p>
                </div>
                <div className="rounded-md border border-border bg-background p-4">
                  <p className="text-xs text-muted-foreground">Pengguna baru (7 hari)</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{userStats.recentUsers}</p>
                </div>
                <div className="rounded-md border border-border bg-background p-4">
                  <p className="text-xs text-muted-foreground">Pengguna tidak aktif</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{userStats.inactiveUsers}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/20 p-8 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Mengumpulkan statistik pengguna…</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
  );
}

export default function AdminPage() {
  return (
    <AdminAccess requiredPermissions={['admin.system']}>
      <AdminDashboardContent />
    </AdminAccess>
  );
}
