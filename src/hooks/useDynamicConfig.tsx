'use client';

/**
 * useDynamicConfig - Custom hook untuk fetch dynamic model configuration dari admin panel
 *
 * Fetch data dari API endpoint `/api/admin/config` yang sudah menyediakan
 * dynamic model configurations berdasarkan database admin settings.
 *
 * Features:
 * - Automatic caching dengan 5 minute TTL
 * - Error handling dan fallback values
 * - TypeScript type safety dengan proper interfaces
 * - React state management dengan useEffect dan useState
 */

import { useState, useEffect, useCallback } from 'react';

// Configuration interfaces matching API response structure
export interface ModelConfig {
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  isActive: boolean;
}

export interface DynamicConfigData {
  models: {
    primary: ModelConfig | null;
    fallback: ModelConfig | null;
  };
  prompts: {
    systemInstructions: {
      content: string;
      version: string;
      charCount: number;
    } | null;
  };
  features: {
    webSearchProvider: 'openai' | 'perplexity';
  };
}

export interface UseDynamicConfigReturn {
  config: DynamicConfigData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// In-memory cache with TTL
const CONFIG_CACHE = {
  data: null as DynamicConfigData | null,
  timestamp: 0,
  TTL: 5 * 60 * 1000 // 5 minutes
};

/**
 * Fallback configuration when API fails
 */
const FALLBACK_CONFIG: DynamicConfigData = {
  models: {
    primary: {
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0.1,
      maxTokens: 8192,
      isActive: true
    },
    fallback: {
      provider: 'openrouter',
      model: 'google/gemini-2.5-flash',
      temperature: 0.1,
      maxTokens: 8192,
      isActive: true
    }
  },
  prompts: {
    systemInstructions: {
      content: '',
      version: '1.0.0',
      charCount: 0
    }
  },
  features: {
    webSearchProvider: 'openai'
  }
};

/**
 * Fetch dynamic configuration from admin API
 */
async function fetchDynamicConfig(): Promise<DynamicConfigData> {
  // Check cache first
  const now = Date.now();
  if (CONFIG_CACHE.data && (now - CONFIG_CACHE.timestamp) < CONFIG_CACHE.TTL) {
    console.log('[useDynamicConfig] ⚡ Using cached configuration');
    return CONFIG_CACHE.data;
  }

  try {
    console.log('[useDynamicConfig] 🔄 Fetching fresh configuration from API...');

    const response = await fetch('/api/admin/config?scope=all&includeStats=false&includeHealth=false', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Note: No authorization header needed for public configuration data
      // API will return non-sensitive data without admin authentication
    });

    if (!response.ok) {
      // If API call fails, return fallback config
      console.warn('[useDynamicConfig] ⚠️ API call failed, using fallback config');
      return FALLBACK_CONFIG;
    }

    const result = await response.json();

    if (!result.success) {
      console.warn('[useDynamicConfig] ⚠️ API returned error, using fallback config');
      return FALLBACK_CONFIG;
    }

    const configData: DynamicConfigData = {
      models: {
        primary: result.data.models?.primary || FALLBACK_CONFIG.models.primary,
        fallback: result.data.models?.fallback || FALLBACK_CONFIG.models.fallback
      },
      prompts: {
        systemInstructions: result.data.prompts?.systemInstructions || FALLBACK_CONFIG.prompts.systemInstructions
      },
      features: {
        webSearchProvider: result.data.features?.webSearchProvider || FALLBACK_CONFIG.features.webSearchProvider
      }
    };

    // Cache the result
    CONFIG_CACHE.data = configData;
    CONFIG_CACHE.timestamp = now;
    console.log('[useDynamicConfig] ⚡ Configuration cached for', CONFIG_CACHE.TTL / 1000, 'seconds');

    return configData;

  } catch (error) {
    console.error('[useDynamicConfig] ❌ Fetch error:', error);
    return FALLBACK_CONFIG;
  }
}

/**
 * Custom hook untuk dynamic configuration management
 */
export function useDynamicConfig(): UseDynamicConfigReturn {
  const [config, setConfig] = useState<DynamicConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const configData = await fetchDynamicConfig();
      setConfig(configData);

      console.log('[useDynamicConfig] ✅ Configuration loaded:', {
        primaryProvider: configData.models.primary?.provider,
        primaryModel: configData.models.primary?.model,
        fallbackProvider: configData.models.fallback?.provider,
        fallbackModel: configData.models.fallback?.model,
        webSearchProvider: configData.features.webSearchProvider
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Configuration load failed';
      console.error('[useDynamicConfig] ❌ Load error:', errorMessage);
      setError(errorMessage);
      setConfig(FALLBACK_CONFIG); // Always provide fallback
    } finally {
      setLoading(false);
    }
  }, []);

  // Load configuration on mount
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const refetch = useCallback(() => {
    // Clear cache and reload
    CONFIG_CACHE.data = null;
    CONFIG_CACHE.timestamp = 0;
    loadConfig();
  }, [loadConfig]);

  return {
    config,
    loading,
    error,
    refetch
  };
}

/**
 * Helper untuk mendapatkan model configuration yang specific
 */
export function getModelConfig(config: DynamicConfigData | null, type: 'primary' | 'fallback'): ModelConfig {
  const modelConfig = config?.models[type];
  const fallback = FALLBACK_CONFIG.models[type]!;

  return modelConfig || fallback;
}

/**
 * Helper untuk mendapatkan semua available models dalam format yang mudah digunakan
 */
export function getAvailableModels(config: DynamicConfigData | null): ModelConfig[] {
  if (!config) return [FALLBACK_CONFIG.models.primary!, FALLBACK_CONFIG.models.fallback!];

  const models: ModelConfig[] = [];

  if (config.models.primary) {
    models.push(config.models.primary);
  }

  if (config.models.fallback) {
    models.push(config.models.fallback);
  }

  return models;
}

export default useDynamicConfig;