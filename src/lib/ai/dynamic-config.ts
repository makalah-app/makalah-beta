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
import { selectPromptForUser } from './prompt-cohort';

// ⚡ PERFORMANCE: In-memory cache with 30-second TTL
const CONFIG_CACHE = {
  data: null as DynamicModelConfig | null,
  timestamp: 0,
  TTL: 30 * 1000 // 30 seconds (optimized from 5 minutes)
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
 * Generate emergency fallback system prompt with error context
 */
function generateEmergencyFallback(reason: 'empty_content' | 'database_error', errorDetails?: string): string {
  const errorContext = reason === 'database_error'
    ? `Database Error: ${errorDetails || 'Unknown error'}`
    : 'Database query succeeded but returned empty/null content';

  return `You are Moka, an AI research assistant for academic paper writing.

⚠️ SYSTEM NOTICE: Failed to load primary system prompt from database.

This is a fallback prompt with minimal instructions. The system is operating in degraded mode.

**Issue:** Unable to retrieve active system prompt from database.
**Error Details:** ${errorContext}

**Administrator Actions Required:**
1. Check database connection to Supabase
2. Verify system_prompts or openrouter_system_prompts table contains active prompt (is_active = true)
3. Upload system prompt via: Admin Dashboard → Database Prompts → Add Prompt

**Current Fallback Capabilities:**
- Basic conversation in Indonesian (Jakarta style: gue-lu)
- Academic-writing-only assistance (every exchange must drive toward a publishable manuscript)
- Reduced functionality until primary prompt is restored

**Technical Details:**
- Expected Source: system_prompts (OpenAI) or openrouter_system_prompts (OpenRouter) table
- Actual Source: Emergency fallback (hardcoded)
- Recovery: Upload new prompt or activate existing prompt

---

### Emergency Behavior Contract (while primary prompt is unavailable)
- Scope: You MUST refuse any task that does not clearly advance an academic manuscript (e.g., poetry, casual chat, coding help, jokes). Warmly decline, restate the “paper-only” scope, and suggest a paper-focused alternative.
- Workflow: Encourage the user to define topic, research questions, outline, drafting, revision, and formatting steps that lead to a formal Indonesian academic paper.
- Evidence: Prefer verifiable sources; if web search is unavailable, admit the limitation and work with provided information while urging verification.
- Citations: Use inline markdown citations and provide a References list whenever external facts are mentioned.
- Tone: Friendly but focused Jakarta-style conversation; academic outputs remain formal Indonesian.
- Structure: Reply with acknowledgement → main analysis → references → next steps (or refusal plus redirection if off-scope).

Contact system administrator to restore full AI capabilities.`;
}

/**
 * Get dynamic model configuration based on current database state
 *
 * @param userId - Optional user ID for cohort-based prompt selection (A/B testing)
 */
export async function getDynamicModelConfig(userId?: string): Promise<DynamicModelConfig> {
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
      // Model configs error - handled by fallback logic
    }

    if (settingsError) {
      // API keys error - handled by fallback logic
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
    }

    // Get system prompt based on provider (simple 2-source logic)
    let systemPromptContent = '';
    let promptSource: 'openrouter_system_prompts' | 'openai_system_prompts' | 'none' = 'none';

    const primaryProvider: 'openai' | 'openrouter' = primaryConfig?.provider || 'openai';

    if (primaryProvider === 'openrouter') {
      // OpenRouter uses openrouter_system_prompts table (optimized for Gemini models)
      const { data: openrouterPrompt, error: openrouterError } = await supabaseAdmin
        .from('openrouter_system_prompts')
        .select('content')
        .eq('is_active', true)
        .maybeSingle() as { data: { content: string } | null; error: any };

      if (openrouterPrompt?.content && !openrouterError) {
        systemPromptContent = openrouterPrompt.content;
        promptSource = 'openrouter_system_prompts';
      } else if (openrouterError) {
        // OpenRouter prompt error - will use emergency fallback
      } else {
        // No active OpenRouter prompt found - will use emergency fallback
      }
    } else {
      // OpenAI uses openai_system_prompts (logical name, table still "system_prompts")
      // ✅ A/B TESTING: Query ALL active prompts with cohort_percentage
      const { data: openaiPrompts, error: openaiError } = await supabaseAdmin
        .from('system_prompts')
        .select('id, content, cohort_percentage, priority_order, version')
        .eq('is_active', true)
        .order('priority_order') as { data: Array<{
          id: string;
          content: string;
          cohort_percentage: number;
          priority_order: number;
          version: number;
        }> | null; error: any };

      if (openaiPrompts && openaiPrompts.length > 0 && !openaiError) {
        // ✅ COHORT SELECTION: Use userId for deterministic assignment
        if (userId && openaiPrompts.length > 1) {
          // Multi-prompt A/B testing mode
          const selectedContent = selectPromptForUser(userId, openaiPrompts);
          systemPromptContent = selectedContent || openaiPrompts[0].content;
          console.log(`[Dynamic Config] Selected prompt via cohort assignment for user ${userId.substring(0, 8)}`);
        } else {
          // Single prompt mode (backward compatible)
          systemPromptContent = openaiPrompts[0].content;
          console.log('[Dynamic Config] Using single active prompt (backward compatible mode)');
        }
        promptSource = 'openai_system_prompts';
      } else if (openaiError) {
        // OpenAI prompt error - will use emergency fallback
      } else {
        // No active OpenAI prompt found in database - will use emergency fallback
      }
    }

    const fallbackProvider: 'openai' | 'openrouter' = fallbackConfig?.provider || 'openrouter';

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
    // ✅ OpenRouter models use :online suffix for automatic built-in web search
    let primaryModel, fallbackModel;

    if (primaryProvider === 'openrouter') {
      const baseModelName = primaryConfig?.model_name || 'google/gemini-2.5-flash';
      // ✅ Add :online suffix for automatic web search (OpenRouter built-in feature)
      const primaryModelName = baseModelName.includes(':online') ? baseModelName : `${baseModelName}:online`;
      primaryModel = openrouterProviderInstance.chat(primaryModelName);

      const fallbackModelName = fallbackConfig?.model_name || 'gpt-4o';
      fallbackModel = customOpenAI(fallbackModelName);
    } else {
      const primaryModelName = primaryConfig?.model_name || 'gpt-4o';
      primaryModel = customOpenAI(primaryModelName);

      const baseFallbackName = fallbackConfig?.model_name || 'google/gemini-2.5-flash';
      // ✅ Add :online suffix for fallback OpenRouter models too
      const fallbackModelName = baseFallbackName.includes(':online') ? baseFallbackName : `${baseFallbackName}:online`;
      fallbackModel = openrouterProviderInstance.chat(fallbackModelName);
    }

    // Get config values from the active primary model config
    const temperature = primaryConfig?.temperature || 0.3;
    const maxTokens = primaryConfig?.max_tokens || 12288;
    const topP = primaryConfig?.parameters?.topP ?? 0.9; // Use nullish coalescing to allow 0 value

    const config: DynamicModelConfig = {
      primaryProvider,
      fallbackProvider,
      primaryModel,
      fallbackModel,
      primaryModelName: primaryProvider === 'openrouter'
        ? primaryConfig?.model_name || 'google/gemini-2.5-flash'
        : primaryConfig?.model_name || 'gpt-4o',
      fallbackModelName: fallbackProvider === 'openrouter'
        ? fallbackConfig?.model_name || 'google/gemini-2.5-flash'
        : fallbackConfig?.model_name || 'gpt-4o',
      systemPrompt: systemPromptContent || generateEmergencyFallback('empty_content'),
      config: {
        temperature,
        maxTokens,
        topP,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
      },
    };

    // AI SDK compliance: System prompt fallback handled by emergency mode
    if (!systemPromptContent) {
      // EMERGENCY FALLBACK: No system prompt found in database - using emergency mode
    }

    // ⚡ PERFORMANCE: Cache the result
    CONFIG_CACHE.data = config;
    CONFIG_CACHE.timestamp = now;

    return config;

  } catch (error) {
    // Failed to load dynamic configuration - using fallback config

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
      const fallbackModel = openrouterProviderInstance.chat('google/gemini-2.5-flash');

      // ⚠️ EMERGENCY FALLBACK PROMPT when database fails
      const dbError = error instanceof Error ? error.message : 'Unknown database connection error';
      const emergencyPrompt = generateEmergencyFallback('database_error', dbError);

      return {
        primaryProvider: 'openai',
        fallbackProvider: 'openrouter',
        primaryModel,
        fallbackModel,
        primaryModelName: 'gpt-4o',
        fallbackModelName: 'google/gemini-2.5-flash',
        systemPrompt: emergencyPrompt,
        config: {
          temperature: 0.3,
          maxTokens: 12288,
          topP: 0.9,
          frequencyPenalty: 0.0,
          presencePenalty: 0.0,
        },
      };
      
    } catch (fallbackError) {
      // Fallback configuration also failed - throwing error
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
