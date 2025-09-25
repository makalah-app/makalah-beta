/**
 * Dynamic AI Configuration - Database-Driven Provider Selection
 * 
 * This module reads the current provider configuration from database
 * and provides the correct primary/fallback models based on admin panel swaps.
 * 
 * Fixes the hardcoded model issue where chat always uses OpenAI regardless
 * of admin panel configuration.
 */

import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { perplexity, createPerplexity } from '@ai-sdk/perplexity';
import { supabaseAdmin } from '../database/supabase-client';
import type { ModelConfigRow, AdminSettingRow, SystemPromptRow } from '../types/database-types';

// ⚡ PERFORMANCE: In-memory cache with 5-minute TTL
const CONFIG_CACHE = {
  data: null as DynamicModelConfig | null,
  timestamp: 0,
  TTL: 5 * 60 * 1000 // 5 minutes
};

export interface DynamicModelConfig {
  primaryProvider: 'openai' | 'openrouter';
  fallbackProvider: 'openai' | 'openrouter';
  primaryModel: any; // AI SDK model instance
  fallbackModel: any; // AI SDK model instance
  primaryModelName: string; // Model identifier for identity
  fallbackModelName: string; // Fallback model identifier
  webSearchProvider: 'openai' | 'perplexity'; // Web search provider selection
  webSearchModel?: any; // Perplexity model instance for web search
  systemPrompt: string;
  config: {
    temperature: number;
    maxTokens: number;
    frequencyPenalty: number;
    presencePenalty: number;
  };
}

/**
 * Get dynamic model configuration based on current database state
 */
export async function getDynamicModelConfig(): Promise<DynamicModelConfig> {
  try {
    // ⚡ PERFORMANCE: Check cache first
    const now = Date.now();
    if (CONFIG_CACHE.data && (now - CONFIG_CACHE.timestamp) < CONFIG_CACHE.TTL) {
      console.log('[DynamicConfig] ⚡ Using cached configuration (TTL remaining:', Math.round((CONFIG_CACHE.TTL - (now - CONFIG_CACHE.timestamp)) / 1000), 's)');
      return CONFIG_CACHE.data;
    }

    console.log('[DynamicConfig] Loading current provider configuration from database...');

    // Get model configurations from model_configs table
    const { data: modelConfigs, error: modelError } = await supabaseAdmin
      .from('model_configs')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false }) as { data: ModelConfigRow[] | null; error: any };

    // Get API keys from admin_settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('admin_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'openai_api_key',
        'openrouter_api_key',
        'perplexity_api_key'
      ]) as { data: AdminSettingRow[] | null; error: any };

    if (modelError) {
      console.error('[DynamicConfig] Model configs error:', modelError);
    }

    if (settingsError) {
      console.error('[DynamicConfig] API keys error:', settingsError);
    }

    // Get system prompt
    const { data: promptData, error: promptError } = await supabaseAdmin
      .from('system_prompts')
      .select('content')
      .eq('is_active', true)
      .eq('phase', 'system_instructions')
      .order('priority_order')
      .limit(1)
      .maybeSingle() as { data: SystemPromptRow | null; error: any };

    if (promptError) {
      console.error('[DynamicConfig] Prompt error:', promptError);
    }

    // Get web search provider configuration
    const { data: webSearchConfig, error: webSearchError } = await supabaseAdmin
      .from('admin_settings')
      .select('setting_value')
      .eq('setting_key', 'web_search_provider')
      .maybeSingle() as { data: AdminSettingRow | null; error: any };

    if (webSearchError) {
      console.error('[DynamicConfig] Web search config error:', webSearchError);
    }

    const webSearchProvider: 'openai' | 'perplexity' = ((webSearchConfig && webSearchConfig.setting_value as 'openai' | 'perplexity') || 'openai') as 'openai' | 'perplexity';
    console.log('[DynamicConfig] Web search provider:', webSearchProvider);

    // Process API keys
    const apiKeysMap = new Map(
      settings?.map((s: AdminSettingRow) => [s.setting_key, s.setting_value]) || []
    );

    // Dynamic provider assignment based on timestamp (newest = primary, older = fallback)
    // Sort configs by created_at DESC to get most recent first
    let primaryConfig: ModelConfigRow | null = null;
    let fallbackConfig: ModelConfigRow | null = null;

    if (modelConfigs && modelConfigs.length > 0) {
      console.log('[DynamicConfig] DEBUG: Raw configs from database:', modelConfigs.map((c: ModelConfigRow) => ({
        id: c.id,
        provider: c.provider,
        model_name: c.model_name,
        created_at: c.created_at,
        is_default: c.is_default,
        is_active: c.is_active
      })));

      const sortedConfigs = [...modelConfigs].sort((a: ModelConfigRow, b: ModelConfigRow) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      console.log('[DynamicConfig] DEBUG: Sorted configs:', sortedConfigs.map((c: ModelConfigRow) => ({
        provider: c.provider,
        model_name: c.model_name,
        created_at: c.created_at,
        is_default: c.is_default
      })));

      primaryConfig = sortedConfigs[0];  // Most recent = Primary
      fallbackConfig = sortedConfigs[1] || null;  // Second most recent = Fallback
    } else {
      console.log('[DynamicConfig] DEBUG: No model configs found, using defaults');
    }

    const primaryProvider: 'openai' | 'openrouter' = primaryConfig?.provider || 'openai';
    const fallbackProvider: 'openai' | 'openrouter' = fallbackConfig?.provider || 'openrouter';

    console.log(`[DynamicConfig] Current provider order: Primary=${primaryProvider}, Fallback=${fallbackProvider}`);

    // Create provider instances with AI SDK v5 compliant patterns
    // FIX: Prioritize environment keys over potentially corrupted database keys
    const openaiKey = process.env.OPENAI_API_KEY || apiKeysMap.get('openai_api_key');
    const openrouterKey = process.env.OPENROUTER_API_KEY || apiKeysMap.get('openrouter_api_key');
    const perplexityKey = process.env.PERPLEXITY_API_KEY || apiKeysMap.get('perplexity_api_key');

    console.log(`[DynamicConfig] DEBUG: Creating providers - OpenAI key available: ${!!openaiKey}, OpenRouter key available: ${!!openrouterKey}, Perplexity key available: ${!!perplexityKey}`);
    
    // Create custom OpenAI provider with custom API key
    const customOpenAI = createOpenAI({
      apiKey: openaiKey,
    });

    console.log(`[DynamicConfig] DEBUG: Custom OpenAI provider created: ${typeof customOpenAI}`);

    const openrouterProviderInstance = createOpenRouter({
      apiKey: openrouterKey,
      baseURL: 'https://openrouter.ai/api/v1',
      headers: {
        'HTTP-Referer': 'https://makalah-ai.vercel.app',
        'X-Title': 'Makalah AI Academic Writing Platform',
      },
    });

    console.log(`[DynamicConfig] DEBUG: OpenRouter provider created: ${typeof openrouterProviderInstance}`);

    // Create Perplexity provider instance if needed for web search
    let webSearchModel;
    if (webSearchProvider === 'perplexity' && perplexityKey) {
      const perplexityProviderInstance = createPerplexity({
        apiKey: perplexityKey,
      });
      webSearchModel = perplexityProviderInstance('sonar-pro');
      console.log('[DynamicConfig] DEBUG: Perplexity web search model created');
    }

    // Create model instances with AI SDK v5 compliant patterns
    let primaryModel, fallbackModel;

    console.log(`[DynamicConfig] DEBUG: Creating models with provider=${primaryProvider}`);

    if (primaryProvider === 'openrouter') {
      const primaryModelName = primaryConfig?.model_name || 'google/gemini-2.5-flash';
      console.log(`[DynamicConfig] DEBUG: Creating OpenRouter primary model with: ${primaryModelName}`);
      primaryModel = openrouterProviderInstance.chat(primaryModelName);
      
      const fallbackModelName = fallbackConfig?.model_name || 'gpt-4o';
      console.log(`[DynamicConfig] DEBUG: Creating OpenAI fallback model with: ${fallbackModelName}`);
      fallbackModel = customOpenAI(fallbackModelName);
    } else {
      const primaryModelName = primaryConfig?.model_name || 'gpt-4o';
      console.log(`[DynamicConfig] DEBUG: Creating OpenAI primary model with: ${primaryModelName}`);
      primaryModel = customOpenAI(primaryModelName);
      
      const fallbackModelName = fallbackConfig?.model_name || 'google/gemini-2.5-flash';
      console.log(`[DynamicConfig] DEBUG: Creating OpenRouter fallback model with: ${fallbackModelName}`);
      fallbackModel = openrouterProviderInstance.chat(fallbackModelName);
    }

    console.log(`[DynamicConfig] DEBUG: Models created successfully - Primary: ${typeof primaryModel}, Fallback: ${typeof fallbackModel}`);

    // Get config values from the active primary model config
    const temperature = primaryConfig?.temperature || 0.1;
    const maxTokens = primaryConfig?.max_tokens || 8192;

    const config: DynamicModelConfig = {
      primaryProvider,
      fallbackProvider,
      primaryModel,
      fallbackModel,
      primaryModelName: primaryConfig?.model_name || 'gpt-4o',
      fallbackModelName: fallbackConfig?.model_name || 'google/gemini-2.5-flash',
      webSearchProvider,
      webSearchModel,
      systemPrompt: (promptData && promptData.content) || '',
      config: {
        temperature,
        maxTokens,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
      },
    };

    // AI SDK compliance: Warn when no system prompt available
    if (!promptData || !promptData.content) {
      console.warn('[DynamicConfig] ⚠️ No system prompt in database - using AI SDK defaults');
    }

    console.log(`[DynamicConfig] ✅ Configuration loaded successfully`);
    console.log(`[DynamicConfig] Primary: ${primaryProvider}, Fallback: ${fallbackProvider}`);

    // ⚡ PERFORMANCE: Cache the result
    CONFIG_CACHE.data = config;
    CONFIG_CACHE.timestamp = now;
    console.log('[DynamicConfig] ⚡ Configuration cached for', CONFIG_CACHE.TTL / 1000, 'seconds');

    return config;

  } catch (error) {
    console.error('[DynamicConfig] ❌ Failed to load dynamic configuration:', error);
    
    // Fallback to hardcoded config
    console.log('[DynamicConfig] 🔄 Using fallback configuration');
    
    try {
      // Debug API keys availability
      const openaiKey = process.env.OPENAI_API_KEY;
      const openrouterKey = process.env.OPENROUTER_API_KEY;
      
      console.log(`[DynamicConfig] FALLBACK: OpenAI key available: ${!!openaiKey}, length: ${openaiKey?.length || 0}`);
      console.log(`[DynamicConfig] FALLBACK: OpenRouter key available: ${!!openrouterKey}, length: ${openrouterKey?.length || 0}`);
      
      // Create providers with proper error handling
      const openaiProviderInstance = createOpenAI({
        apiKey: openaiKey,
      });
      console.log(`[DynamicConfig] FALLBACK: OpenAI provider created, type: ${typeof openaiProviderInstance}`);
      
      const openrouterProviderInstance = createOpenRouter({
        apiKey: openrouterKey,
        baseURL: 'https://openrouter.ai/api/v1',
        headers: {
          'HTTP-Referer': 'https://makalah-ai.vercel.app',
          'X-Title': 'Makalah AI Academic Writing Platform',
        },
      });
      console.log(`[DynamicConfig] FALLBACK: OpenRouter provider created, type: ${typeof openrouterProviderInstance}`);
      
      // Create models with debugging
      console.log(`[DynamicConfig] FALLBACK: Creating OpenAI primary model...`);
      const primaryModel = openaiProviderInstance('gpt-4o');
      console.log(`[DynamicConfig] FALLBACK: Primary model created, type: ${typeof primaryModel}`);
      
      console.log(`[DynamicConfig] FALLBACK: Creating OpenRouter fallback model...`);
      const fallbackModel = openrouterProviderInstance.chat('google/gemini-2.5-flash');
      console.log(`[DynamicConfig] FALLBACK: Fallback model created, type: ${typeof fallbackModel}`);

      return {
        primaryProvider: 'openai',
        fallbackProvider: 'openrouter',
        primaryModel,
        fallbackModel,
        primaryModelName: 'gpt-4o',
        fallbackModelName: 'google/gemini-2.5-flash',
        webSearchProvider: 'openai',
        webSearchModel: undefined,
        systemPrompt: '', // AI SDK compliance: empty string instead of undefined
        config: {
          temperature: 0.1,
          maxTokens: 8192,
          frequencyPenalty: 0.0,
          presencePenalty: 0.0,
        },
      };
      
    } catch (fallbackError) {
      console.error('[DynamicConfig] ❌ Fallback configuration also failed:', fallbackError);
      throw new Error(`Both dynamic and fallback configurations failed. Original: ${(error as Error).message}, Fallback: ${(fallbackError as Error).message}`);
    }
  }
}

/**
 * Get primary model based on current database configuration
 */
export async function getDynamicPrimaryModel() {
  const config = await getDynamicModelConfig();
  return config.primaryModel;
}

/**
 * Get fallback model based on current database configuration
 */
export async function getDynamicFallbackModel() {
  const config = await getDynamicModelConfig();
  return config.fallbackModel;
}

/**
 * Get system prompt from database
 */
export async function getDynamicSystemPrompt() {
  const config = await getDynamicModelConfig();
  return config.systemPrompt;
}

/**
 * ⚡ PERFORMANCE: Clear configuration cache (for admin updates)
 */
export function clearDynamicConfigCache() {
  CONFIG_CACHE.data = null;
  CONFIG_CACHE.timestamp = 0;
  console.log('[DynamicConfig] ⚡ Configuration cache cleared');
}