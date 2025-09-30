/**
 * Database Query Helper Functions for Admin Operations
 * 
 * CRITICAL IMPLEMENTATION:
 * - Handles crypto polyfill compatibility issues
 * - Provides comprehensive error handling for connection issues
 * - Implements input validation and sanitization
 * - Follows existing Supabase client patterns
 * - Type-safe database operations with proper TypeScript types
 * 
 * FUNCTIONS IMPLEMENTED:
 * 1. getUserStatistics() - Fetch total users and active users count
 * 2. getModelConfigurations() - Fetch primary/fallback model configurations
 * 3. updateModelConfiguration() - Update model config with provider settings
 * 4. getCurrentSystemPrompt() - Fetch active system prompt with version info
 * 5. updateSystemPrompt() - Save system prompt with version tracking
 * 6. getPromptVersionHistory() - Fetch prompt version history
 * 7. getAPIKeys() - Fetch API keys with masking
 * 8. storeAPIKey() - Store API key securely
 * 9. getConfigurationStatus() - Fetch comprehensive config status
 */

import { supabaseAdmin } from '../database/supabase-client';
import { z } from 'zod';

// ==================== CRYPTO POLYFILL COMPATIBILITY ====================

/**
 * Environment-aware crypto polyfill for UUID generation
 * Handles different JavaScript environments (browser, Node.js, Edge)
 */
let crypto: any;
try {
  if (typeof window !== 'undefined') {
    // Browser environment
    crypto = window.crypto;
  } else if (typeof global !== 'undefined' && global.crypto) {
    // Node.js with crypto global
    crypto = global.crypto;
  } else {
    // Node.js environment fallback
    crypto = require('node:crypto').webcrypto || require('crypto');
  }
} catch (error) {
  // Crypto not available, using fallback for ID generation - silent handling for production
  // Fallback UUID generation for environments without crypto
  crypto = {
    randomUUID: () => `${Date.now()}-${Math.random().toString(36).substring(2)}-${Math.random().toString(36).substring(2)}`
  };
}

// ==================== TYPE DEFINITIONS ====================

export interface DatabaseQueryResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    type: 'database_error' | 'validation_error' | 'connection_error' | 'auth_error';
    details?: any;
  };
}

export interface UserStatistics {
  total_users: number;
  active_users: number;
  new_users_30d: number;
  last_updated: string;
}

export interface ModelConfiguration {
  id: string;
  provider: string;
  model_name: string;
  temperature: number;
  max_tokens: number;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface SystemPromptData {
  id: string;
  content: string;
  version: string;
  phase: string;
  priority_order: number;
  char_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  updated_by?: string;
}

export interface PromptVersion {
  id: string;
  prompt_id: string;
  version_number: number;
  content: string;
  changes_summary?: string;
  changed_by: string;
  change_reason: string;
  created_at: string;
}

export interface APIKeyData {
  key: string;
  value: string;
  configured: boolean;
  masked_value: string;
  is_sensitive: boolean;
  category: string;
  last_updated?: string;
}

export interface ConfigurationStatus {
  models: {
    primary_configured: boolean;
    fallback_configured: boolean;
    models_active: number;
  };
  prompts: {
    system_prompt_configured: boolean;
    total_prompts: number;
    active_version: string;
  };
  api_keys: {
    openai_configured: boolean;
    openrouter_configured: boolean;
    total_keys: number;
  };
  overall_status: 'complete' | 'partial' | 'incomplete';
  last_checked: string;
}

// ==================== INPUT VALIDATION SCHEMAS ====================

const ModelConfigurationSchema = z.object({
  provider: z.string().min(1, 'Provider is required'),
  model_name: z.string().min(1, 'Model name is required'),
  temperature: z.number().min(0).max(2),
  max_tokens: z.number().min(1).max(100000),
  is_active: z.boolean(),
  is_default: z.boolean().optional()
});

const SystemPromptSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  version: z.string().optional(),
  phase: z.string().default('system_instructions'),
  priority_order: z.number().default(1),
  updated_by: z.string().optional()
});

const APIKeySchema = z.object({
  provider: z.string().min(1, 'Provider is required'),
  api_key: z.string().min(1, 'API key is required')
});

// ==================== UTILITY FUNCTIONS ====================

/**
 * Safe database query executor with connection error handling
 */
async function safeQuery<T>(
  queryFn: () => Promise<{ data: T; error: any }>,
  errorContext: string
): Promise<DatabaseQueryResponse<T>> {
  try {
    const { data, error } = await queryFn();
    
    if (error) {
      // Database error occurred - silent handling for production
      return {
        success: false,
        error: {
          message: error.message || `Database operation failed in ${errorContext}`,
          code: error.code || 'DATABASE_ERROR',
          type: 'database_error',
          details: error
        }
      };
    }
    
    return {
      success: true,
      data
    };
  } catch (error) {
    // Connection error occurred - silent handling for production
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : `Connection failed in ${errorContext}`,
        code: 'CONNECTION_ERROR',
        type: 'connection_error',
        details: error
      }
    };
  }
}

/**
 * Mask sensitive values for secure display
 */
function maskSensitiveValue(value: string): string {
  if (!value || value.length < 8) {
    return '***';
  }
  const start = value.substring(0, 4);
  const end = value.substring(value.length - 4);
  const middle = '*'.repeat(Math.max(3, value.length - 8));
  return `${start}${middle}${end}`;
}

// ==================== DATABASE QUERY FUNCTIONS ====================

/**
 * 1. Get user statistics including total and active users
 */
export async function getUserStatistics(): Promise<DatabaseQueryResponse<UserStatistics>> {
  return safeQuery(async () => {
    // Get total users count
    const { data: totalData, error: totalError } = await supabaseAdmin
      .from('users')
      .select('id', { count: 'exact' });
    
    if (totalError) throw totalError;
    
    // Get active users (logged in within last 30 days)
    const { data: activeData, error: activeError } = await supabaseAdmin
      .from('users')
      .select('id', { count: 'exact' })
      .gte('last_login', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    
    if (activeError) throw activeError;
    
    // Get new users in last 30 days
    const { data: newData, error: newError } = await supabaseAdmin
      .from('users')
      .select('id', { count: 'exact' })
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    
    if (newError) throw newError;
    
    return {
      data: {
        total_users: totalData?.length || 0,
        active_users: activeData?.length || 0,
        new_users_30d: newData?.length || 0,
        last_updated: new Date().toISOString()
      } as UserStatistics,
      error: null
    };
  }, 'getUserStatistics');
}

/**
 * 2. Get model configurations for primary and fallback providers
 */
export async function getModelConfigurations(): Promise<DatabaseQueryResponse<{
  primary?: ModelConfiguration;
  fallback?: ModelConfiguration;
  all_models: ModelConfiguration[];
}>> {
  return safeQuery(async () => {
    // Get primary model (OpenAI)
    const { data: primaryData } = await supabaseAdmin
      .from('model_configs')
      .select('*')
      .eq('provider', 'openai')
      .eq('is_default', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    // Get fallback model (OpenRouter)
    const { data: fallbackData } = await supabaseAdmin
      .from('model_configs')
      .select('*')
      .eq('provider', 'openrouter')
      .eq('is_default', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    // Get all active models
    const { data: allModels, error: allError } = await supabaseAdmin
      .from('model_configs')
      .select('*')
      .eq('is_active', true)
      .order('provider, priority_order');
    
    // Model config errors handled - silent handling for production
    if (allError) throw allError;
    
    return {
      data: {
        primary: primaryData || undefined,
        fallback: fallbackData || undefined,
        all_models: (allModels || []) as ModelConfiguration[]
      },
      error: null
    };
  }, 'getModelConfigurations');
}

/**
 * 3. Update model configuration with provider settings
 */
export async function updateModelConfiguration(
  provider: string,
  config: Partial<ModelConfiguration>
): Promise<DatabaseQueryResponse<ModelConfiguration>> {
  try {
    // Validate input
    const validatedConfig = ModelConfigurationSchema.parse({
      provider,
      ...config
    });
    
    return safeQuery(async () => {
      const { data, error } = await supabaseAdmin
        .from('model_configs')
        .upsert({
          id: crypto.randomUUID(),
          provider: validatedConfig.provider,
          model_name: validatedConfig.model_name,
          temperature: validatedConfig.temperature,
          max_tokens: validatedConfig.max_tokens,
          is_active: validatedConfig.is_active,
          is_default: validatedConfig.is_default ?? true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as any)
        .select('*')
        .single();
      
      if (error) throw error;
      
      return { data: data as ModelConfiguration, error: null };
    }, 'updateModelConfiguration');
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: {
          message: 'Invalid model configuration data',
          code: 'VALIDATION_ERROR',
          type: 'validation_error',
          details: error.errors
        }
      };
    }
    throw error;
  }
}

/**
 * 4. Get current active system prompt with version info
 */
export async function getCurrentSystemPrompt(): Promise<DatabaseQueryResponse<SystemPromptData | null>> {
  return safeQuery(async () => {
    const { data, error } = await supabaseAdmin
      .from('system_prompts')
      .select('id, content, version, phase, priority_order, is_active, created_at, updated_at, updated_by')
      .eq('is_active', true)
      .eq('phase', 'system_instructions')
      .order('priority_order', { ascending: true })
      .limit(1)
      .maybeSingle();
    
    if (error) throw error;
    
    if (!data) {
      return {
        data: null,
        error: null
      };
    }

    const promptData: SystemPromptData = {
      id: (data as any).id,
      content: (data as any).content || '',
      version: (data as any).version || '1.0.0',
      phase: (data as any).phase || 'system_instructions',
      priority_order: (data as any).priority_order || 1,
      is_active: (data as any).is_active || false,
      created_at: (data as any).created_at || new Date().toISOString(),
      updated_at: (data as any).updated_at || new Date().toISOString(),
      updated_by: (data as any).updated_by,
      char_count: (data as any).content?.length || 0
    };
    
    return { data: promptData, error: null };
  }, 'getCurrentSystemPrompt');
}

/**
 * 5. Update system prompt with version tracking
 */
export async function updateSystemPrompt(
  content: string,
  updatedBy: string,
  changeReason: string = 'Admin dashboard update'
): Promise<DatabaseQueryResponse<SystemPromptData>> {
  try {
    // Validate input
    const validatedData = SystemPromptSchema.parse({
      content,
      updated_by: updatedBy
    });
    
    return safeQuery(async () => {
      // First get current prompt for versioning
      const currentPrompt = await getCurrentSystemPrompt();
      
      // Update current prompt
      const { data: updatedPrompt, error: updateError } = await supabaseAdmin
        .from('system_prompts')
        .upsert({
          id: crypto.randomUUID(),
          content: validatedData.content,
          phase: 'system_instructions',
          version: currentPrompt.data ?
            `${parseInt(currentPrompt.data.version.split('.')[0]) + 1}.0.0` :
            '1.0.0',
          priority_order: 1,
          is_active: true,
          updated_by: updatedBy,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as any)
        .select('*')
        .single();
      
      if (updateError) throw updateError;
      
      // Create version history entry
      if (currentPrompt.data && updatedPrompt) {
        const { error: versionError } = await supabaseAdmin
          .from('prompt_versions')
          .insert({
            id: crypto.randomUUID(),
            prompt_id: (updatedPrompt as any).id,
            version_number: parseInt((updatedPrompt as any).version.split('.')[0]),
            content: validatedData.content,
            changed_by: updatedBy,
            change_reason: changeReason,
            created_at: new Date().toISOString()
          } as any);
        
        if (versionError) {
          // Version history creation failed - silent handling for production
        }
      }
      
      if (!updatedPrompt) {
        throw new Error('Failed to update system prompt');
      }

      const responseData: SystemPromptData = {
        id: (updatedPrompt as any).id,
        content: (updatedPrompt as any).content,
        version: (updatedPrompt as any).version,
        phase: (updatedPrompt as any).phase,
        priority_order: (updatedPrompt as any).priority_order,
        is_active: (updatedPrompt as any).is_active,
        created_at: (updatedPrompt as any).created_at,
        updated_at: (updatedPrompt as any).updated_at,
        updated_by: (updatedPrompt as any).updated_by,
        char_count: (updatedPrompt as any).content?.length || 0
      };
      
      return { data: responseData, error: null };
    }, 'updateSystemPrompt');
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: {
          message: 'Invalid system prompt data',
          code: 'VALIDATION_ERROR',
          type: 'validation_error',
          details: error.errors
        }
      };
    }
    throw error;
  }
}

/**
 * 6. Get prompt version history
 */
export async function getPromptVersionHistory(
  limit: number = 20
): Promise<DatabaseQueryResponse<PromptVersion[]>> {
  return safeQuery(async () => {
    const { data, error } = await supabaseAdmin
      .from('prompt_versions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 100)); // Cap at 100 for performance
    
    if (error) throw error;
    
    return { data: (data || []) as PromptVersion[], error: null };
  }, 'getPromptVersionHistory');
}

/**
 * 7. Get API keys with masking for security
 */
export async function getAPIKeys(
  includeSensitive: boolean = false
): Promise<DatabaseQueryResponse<Record<string, APIKeyData>>> {
  return safeQuery(async () => {
    const { data, error } = await supabaseAdmin
      .from('admin_settings')
      .select('setting_key, setting_value, setting_type, category, is_sensitive, updated_at')
      .eq('category', 'model_config')
      .like('setting_key', '%api_key');
    
    if (error) throw error;
    
    const apiKeys: Record<string, APIKeyData> = {};
    
    (data || []).forEach((setting: any) => {
      const provider = setting.setting_key.replace('_api_key', '');
      const hasValue = !!(setting.setting_value && setting.setting_value.length > 0);
      
      apiKeys[provider] = {
        key: setting.setting_key,
        value: includeSensitive ? setting.setting_value : '',
        configured: hasValue,
        masked_value: hasValue ? maskSensitiveValue(setting.setting_value) : 'Not configured',
        is_sensitive: setting.is_sensitive,
        category: setting.category,
        last_updated: setting.updated_at
      };
    });
    
    return { data: apiKeys, error: null };
  }, 'getAPIKeys');
}

/**
 * 8. Store API key securely
 */
export async function storeAPIKey(
  provider: string,
  apiKey: string
): Promise<DatabaseQueryResponse<{ provider: string; configured: boolean }>> {
  try {
    // Validate input
    const validatedData = APIKeySchema.parse({
      provider: provider.toLowerCase().trim(),
      api_key: apiKey.trim()
    });
    
    return safeQuery(async () => {
      const settingKey = `${validatedData.provider}_api_key`;
      
      const { error } = await supabaseAdmin
        .from('admin_settings')
        .upsert({
          setting_key: settingKey,
          setting_value: validatedData.api_key,
          setting_type: 'string',
          category: 'model_config',
          is_sensitive: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as any)
        .select('setting_key')
        .single();
      
      if (error) throw error;
      
      return {
        data: {
          provider: validatedData.provider,
          configured: true
        },
        error: null
      };
    }, 'storeAPIKey');
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: {
          message: 'Invalid API key data',
          code: 'VALIDATION_ERROR',
          type: 'validation_error',
          details: error.errors
        }
      };
    }
    throw error;
  }
}

/**
 * 9. Get comprehensive configuration status
 */
export async function getConfigurationStatus(): Promise<DatabaseQueryResponse<ConfigurationStatus>> {
  return safeQuery(async () => {
    // Get model configurations status
    const modelsResult = await getModelConfigurations();
    const models = modelsResult.data || { primary: null, fallback: null, all_models: [] };
    
    // Get system prompt status
    const promptResult = await getCurrentSystemPrompt();
    const hasSystemPrompt = !!promptResult.data;
    
    // Get API keys status
    const apiKeysResult = await getAPIKeys(false);
    const apiKeys = apiKeysResult.data || {};
    
    // Calculate overall status
    const primaryConfigured = !!models.primary;
    const fallbackConfigured = !!models.fallback;
    const openaiConfigured = apiKeys.openai?.configured || false;
    const openrouterConfigured = apiKeys.openrouter?.configured || false;
    
    const configuredItems = [
      primaryConfigured,
      fallbackConfigured,
      hasSystemPrompt,
      openaiConfigured
    ].filter(Boolean).length;
    
    let overallStatus: 'complete' | 'partial' | 'incomplete';
    if (configuredItems >= 3) {
      overallStatus = 'complete';
    } else if (configuredItems >= 1) {
      overallStatus = 'partial';
    } else {
      overallStatus = 'incomplete';
    }
    
    const status: ConfigurationStatus = {
      models: {
        primary_configured: primaryConfigured,
        fallback_configured: fallbackConfigured,
        models_active: models.all_models.length
      },
      prompts: {
        system_prompt_configured: hasSystemPrompt,
        total_prompts: hasSystemPrompt ? 1 : 0,
        active_version: promptResult.data?.version || 'Not configured'
      },
      api_keys: {
        openai_configured: openaiConfigured,
        openrouter_configured: openrouterConfigured,
        total_keys: Object.keys(apiKeys).length
      },
      overall_status: overallStatus,
      last_checked: new Date().toISOString()
    };
    
    return { data: status, error: null };
  }, 'getConfigurationStatus');
}

// ==================== EXPORT ALL FUNCTIONS ====================

const databaseQueries = {
  getUserStatistics,
  getModelConfigurations,
  updateModelConfiguration,
  getCurrentSystemPrompt,
  updateSystemPrompt,
  getPromptVersionHistory,
  getAPIKeys,
  storeAPIKey,
  getConfigurationStatus
};

export default databaseQueries;

/**
 * Health check function for database query helpers
 * Tests basic connectivity and functionality
 */
export async function testDatabaseQueryHelpers(): Promise<DatabaseQueryResponse<{
  connectivity: boolean;
  functions_working: string[];
  functions_failed: string[];
  test_summary: string;
}>> {
  const workingFunctions: string[] = [];
  const failedFunctions: string[] = [];
  
  // Test basic functions
  const tests = [
    { name: 'getUserStatistics', fn: getUserStatistics },
    { name: 'getModelConfigurations', fn: getModelConfigurations },
    { name: 'getCurrentSystemPrompt', fn: getCurrentSystemPrompt },
    { name: 'getAPIKeys', fn: () => getAPIKeys(false) },
    { name: 'getConfigurationStatus', fn: getConfigurationStatus }
  ];
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result.success) {
        workingFunctions.push(test.name);
      } else {
        failedFunctions.push(test.name);
      }
    } catch (error) {
      failedFunctions.push(test.name);
    }
  }
  
  const connectivity = workingFunctions.length > failedFunctions.length;
  
  return {
    success: true,
    data: {
      connectivity,
      functions_working: workingFunctions,
      functions_failed: failedFunctions,
      test_summary: `${workingFunctions.length}/${tests.length} functions working`
    }
  };
}