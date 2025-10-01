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
  systemPrompt: string;
  config: {
    temperature: number;
    maxTokens: number;
    topP: number;
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
      return CONFIG_CACHE.data;
    }

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
        'openrouter_api_key'
      ]) as { data: AdminSettingRow[] | null; error: any };

    if (modelError) {
      console.error('[DynamicConfig] Model configs error:', modelError);
    }

    if (settingsError) {
      console.error('[DynamicConfig] API keys error:', settingsError);
    }

    // Process API keys
    const apiKeysMap = new Map(
      settings?.map((s: AdminSettingRow) => [s.setting_key, s.setting_value]) || []
    );

    // Dynamic provider assignment based on timestamp (newest = primary, older = fallback)
    // Sort configs by created_at DESC to get most recent first
    let primaryConfig: ModelConfigRow | null = null;
    let fallbackConfig: ModelConfigRow | null = null;

    if (modelConfigs && modelConfigs.length > 0) {
      const sortedConfigs = [...modelConfigs].sort((a: ModelConfigRow, b: ModelConfigRow) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      primaryConfig = sortedConfigs[0];  // Most recent = Primary
      fallbackConfig = sortedConfigs[1] || null;  // Second most recent = Fallback

      console.log('[DynamicConfig] 📌 Model configs loaded:', {
        primary: primaryConfig?.model_name || 'none',
        fallback: fallbackConfig?.model_name || 'none'
      });
    }

    // Get system prompt - check for model-specific template first, fallback to system prompt
    let systemPromptContent = '';

    // Step 1: Try to get model-specific template for primary model
    if (primaryConfig?.model_name) {
      const { data: templateData, error: templateError } = await supabaseAdmin
        .from('model_prompt_templates')
        .select('template_content')
        .eq('model_slug', primaryConfig.model_name)
        .eq('is_active', true)
        .maybeSingle() as { data: { template_content: string } | null; error: any };

      if (templateData?.template_content && !templateError) {
        systemPromptContent = templateData.template_content;
        console.log('[DynamicConfig] ✅ Using model-specific template for:', primaryConfig.model_name);
        console.log('[DynamicConfig] 📝 Model template preview:', systemPromptContent.substring(0, 100) + '...');
      } else if (templateError) {
        console.warn('[DynamicConfig] Template error for model:', primaryConfig.model_name, templateError);
      } else {
        console.log('[DynamicConfig] 🔍 No model-specific template found for:', primaryConfig.model_name);
      }
    }

    // Step 2: Fallback to general system prompt if no model-specific template
    if (!systemPromptContent) {
      const { data: promptData, error: promptError } = await supabaseAdmin
        .from('system_prompts')
        .select('content')
        .eq('is_active', true)
        .eq('phase', 'system_instructions')
        .order('priority_order')
        .limit(1)
        .maybeSingle() as { data: SystemPromptRow | null; error: any };

      if (promptData?.content && !promptError) {
        systemPromptContent = promptData.content;
        console.log('[DynamicConfig] ✅ Using general system prompt (no model-specific template found)');
        // Log first 100 chars of prompt for debugging
        console.log('[DynamicConfig] 📝 System prompt preview:', systemPromptContent.substring(0, 100) + '...');
      } else if (promptError) {
        console.error('[DynamicConfig] System prompt error:', promptError);
      } else {
        console.warn('[DynamicConfig] ⚠️ No active system prompt found in database');
      }
    }

    const primaryProvider: 'openai' | 'openrouter' = primaryConfig?.provider || 'openai';
    const fallbackProvider: 'openai' | 'openrouter' = fallbackConfig?.provider || 'openrouter';

    console.log('[DynamicConfig] 🔄 Provider configuration:', {
      primaryProvider,
      fallbackProvider,
      webSearch: primaryProvider === 'openai' ? 'OpenAI Native' : 'OpenRouter :online suffix'
    });

    // Create provider instances with AI SDK v5 compliant patterns
    // FIX: Prioritize environment keys over potentially corrupted database keys
    const openaiKey = process.env.OPENAI_API_KEY || apiKeysMap.get('openai_api_key');
    const openrouterKey = process.env.OPENROUTER_API_KEY || apiKeysMap.get('openrouter_api_key');
    
    // Create custom OpenAI provider with custom API key
    const customOpenAI = createOpenAI({
      apiKey: openaiKey,
    });

    const openrouterProviderInstance = createOpenRouter({
      apiKey: openrouterKey,
      baseURL: 'https://openrouter.ai/api/v1',
      headers: {
        'HTTP-Referer': 'https://makalah-ai.vercel.app',
        'X-Title': 'Makalah AI Academic Writing Platform',
      },
    });

    // Create model instances with AI SDK v5 compliant patterns
    // ✅ OpenRouter models use :online suffix for web search
    let primaryModel, fallbackModel;

    if (primaryProvider === 'openrouter') {
      const baseModelName = primaryConfig?.model_name || 'google/gemini-2.5-flash';
      // ✅ Add :online suffix for web search capability
      const primaryModelName = `${baseModelName}:online`;
      primaryModel = openrouterProviderInstance.chat(primaryModelName);
      console.log('[DynamicConfig] ✅ OpenRouter model with web search:', primaryModelName);

      const fallbackModelName = fallbackConfig?.model_name || 'gpt-4o';
      fallbackModel = customOpenAI(fallbackModelName);
    } else {
      const primaryModelName = primaryConfig?.model_name || 'gpt-4o';
      primaryModel = customOpenAI(primaryModelName);

      const baseFallbackName = fallbackConfig?.model_name || 'google/gemini-2.5-flash';
      // ✅ Add :online suffix for fallback OpenRouter model too
      const fallbackModelName = `${baseFallbackName}:online`;
      fallbackModel = openrouterProviderInstance.chat(fallbackModelName);
    }

    // Get config values from the active primary model config
    const temperature = primaryConfig?.temperature || 0.3;
    const maxTokens = primaryConfig?.max_tokens || 12288;
    const topP = primaryConfig?.parameters?.topP || 0.9;

    const config: DynamicModelConfig = {
      primaryProvider,
      fallbackProvider,
      primaryModel,
      fallbackModel,
      primaryModelName: primaryProvider === 'openrouter'
        ? `${primaryConfig?.model_name || 'google/gemini-2.5-flash'}:online`
        : primaryConfig?.model_name || 'gpt-4o',
      fallbackModelName: fallbackProvider === 'openrouter'
        ? `${fallbackConfig?.model_name || 'google/gemini-2.5-flash'}:online`
        : fallbackConfig?.model_name || 'gpt-4o',
      systemPrompt: systemPromptContent || '',
      config: {
        temperature,
        maxTokens,
        topP,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
      },
    };

    // AI SDK compliance: Warn when no system prompt available
    if (!systemPromptContent) {
      console.warn('[DynamicConfig] ⚠️ No system prompt or template found - using AI SDK defaults');
    } else {
      console.log('[DynamicConfig] ✅ Final system prompt loaded, length:', systemPromptContent.length, 'chars');
      // Check if it's Moka or Makalah AI
      const isUsingMoka = systemPromptContent.includes('You are Moka');
      const isUsingMakalah = systemPromptContent.includes('You are Makalah AI');
      console.log('[DynamicConfig] 🤖 AI Identity:', {
        isMoka: isUsingMoka,
        isMakalahAI: isUsingMakalah,
        preview: systemPromptContent.substring(0, 50) + '...'
      });
    }

    // ⚡ PERFORMANCE: Cache the result
    CONFIG_CACHE.data = config;
    CONFIG_CACHE.timestamp = now;

    return config;

  } catch (error) {
    console.error('[DynamicConfig] ❌ Failed to load dynamic configuration:', error);
    
    // Fallback to hardcoded config
    try {
      // Debug API keys availability
      const openaiKey = process.env.OPENAI_API_KEY;
      const openrouterKey = process.env.OPENROUTER_API_KEY;
      
      // Create providers with proper error handling
      const openaiProviderInstance = createOpenAI({
        apiKey: openaiKey,
      });

      const openrouterProviderInstance = createOpenRouter({
        apiKey: openrouterKey,
        baseURL: 'https://openrouter.ai/api/v1',
        headers: {
          'HTTP-Referer': 'https://makalah-ai.vercel.app',
          'X-Title': 'Makalah AI Academic Writing Platform',
        },
      });

      // Create models
      const primaryModel = openaiProviderInstance('gpt-4o');
      const fallbackModel = openrouterProviderInstance.chat('google/gemini-2.5-flash:online');

      return {
        primaryProvider: 'openai',
        fallbackProvider: 'openrouter',
        primaryModel,
        fallbackModel,
        primaryModelName: 'gpt-4o',
        fallbackModelName: 'google/gemini-2.5-flash:online',
        systemPrompt: '', // AI SDK compliance: empty string instead of undefined
        config: {
          temperature: 0.3,
          maxTokens: 12288,
          topP: 0.9,
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
}