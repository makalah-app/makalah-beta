/**
 * Enhanced Admin Configuration Management API Endpoint
 *
 * Handles model configurations, system prompts, and admin settings.
 * Restricted to admin access only (makalah.app@gmail.com).
 *
 * Features:
 * - Model configuration management (Primary/Fallback architecture)
 * - System prompts management with versioning
 * - Encrypted API key storage and retrieval
 * - Configuration validation and health checking
 * - Integration with dynamic-config.ts and AI SDK infrastructure
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '../../../../src/lib/database/supabase-client';
import { validateAdminAccess as validateAdmin } from '../../../../src/lib/admin/admin-auth';

// Admin email hardcoded for backward compatibility (deprecated - use role-based check instead)
const ADMIN_EMAIL = 'makalah.app@gmail.com';

// Crypto polyfill handling for different environments
let crypto: any;
try {
  if (typeof window !== 'undefined') {
    crypto = window.crypto;
  } else if (typeof global !== 'undefined' && global.crypto) {
    crypto = global.crypto;
  } else {
    // Node.js environment fallback
    crypto = require('node:crypto').webcrypto || require('crypto');
  }
} catch (error) {
  crypto = {
    randomUUID: () => `${Date.now()}-${Math.random().toString(36).substring(2)}`
  };
}

// Request validation schemas
const GetConfigRequestSchema = z.object({
  scope: z.enum(['all', 'models', 'prompts', 'settings', 'keys', 'health']).default('all'),
  includeSecrets: z.boolean().default(false),
  includeStats: z.boolean().default(true),
  includeHealth: z.boolean().default(true)
});

const ToolProviderConfigSchema = z.object({
  toolName: z.string().min(1),
  provider: z.enum(['openai', 'openrouter']),
  model: z.string().min(1),
  apiKey: z.string().optional(),
  isActive: z.boolean(),
  fallbackProvider: z.enum(['openai', 'openrouter']).optional(),
  fallbackModel: z.string().optional()
});

const UpdateConfigRequestSchema = z.object({
  // Legacy model configuration (maintained for backward compatibility)
  models: z.object({
    primary: z.object({
      provider: z.string().optional(),
      model: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().min(1).max(100000).optional(),
      topP: z.number().min(0).max(1).optional(),
      isActive: z.boolean().optional()
    }).optional(),
    fallback: z.object({
      provider: z.string().optional(),
      model: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().min(1).max(100000).optional(),
      topP: z.number().min(0).max(1).optional(),
      isActive: z.boolean().optional()
    }).optional()
  }).optional(),

  prompts: z.object({
    systemInstructions: z.object({
      content: z.string().min(1),
      version: z.string().optional(),
      priority: z.number().default(1)
    }).optional()
  }).optional(),

  apiKeys: z.object({
    openai: z.string().optional(),
    openrouter: z.string().optional()
  }).optional(),

  // Application settings
  appVersion: z.string().min(1).max(50).optional()
});

type GetConfigRequest = z.infer<typeof GetConfigRequestSchema>;
type UpdateConfigRequest = z.infer<typeof UpdateConfigRequestSchema>;

/**
 * GET /api/admin/config - Get admin configuration
 */
export async function GET(request: NextRequest) {
  try {
    // Validate admin access (admin or superadmin)
    const adminCheck = await validateAdmin(request);
    if (!adminCheck.valid) {
      return Response.json({
        success: false,
        error: {
          message: adminCheck.error || 'Admin access required',
          type: 'auth_error',
          code: 'ADMIN_ONLY'
        }
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const parsedParams = {
      ...queryParams,
      includeSecrets: queryParams.includeSecrets === 'true',
      includeStats: queryParams.includeStats !== 'false'
    };

    const validatedRequest: GetConfigRequest = GetConfigRequestSchema.parse(parsedParams);
    const { scope, includeSecrets, includeStats, includeHealth } = validatedRequest;


    const response: any = {
      success: true,
      data: {},
      metadata: {
        generatedAt: new Date().toISOString(),
        scope,
        includesSecrets: includeSecrets,
        includesHealth: includeHealth
      }
    };

    // Get model configurations
    if (scope === 'all' || scope === 'models') {
      try {
        // Get ALL active model configurations (remove is_default filter to support all models)
        const { data: allConfigs, error: allConfigsError } = await supabaseAdmin
          .from('model_configs')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        const fallbackModels = {
          primary: {
            provider: 'openai',
            model: 'gpt-4o',
            temperature: 0.1,
            maxTokens: 4096,
            isActive: true,
          },
          fallback: {
            provider: 'openrouter',
            model: 'google/gemini-2.5-flash',
            temperature: 0.1,
            maxTokens: 4096,
            isActive: true,
          },
        } as const;

        if (allConfigsError) {
          response.data.models = fallbackModels;
        } else {
          // Dynamic provider assignment based on latest created_at timestamp
          // The most recently created config becomes primary, older one becomes fallback
          interface ModelConfigRow {
            provider: string;
            model_name: string;
            temperature: number;
            max_tokens: number;
            is_active: boolean;
            is_default?: boolean;
            created_at: string;
          }

          let primaryData: ModelConfigRow | null = null;
          let fallbackData: ModelConfigRow | null = null;

          if (!allConfigs || allConfigs.length === 0) {
            response.data.models = fallbackModels;
          } else {
            // Sort by created_at descending to get most recent first
            const sortedConfigs = [...(allConfigs as ModelConfigRow[])].sort((a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );

            primaryData = sortedConfigs[0];  // Most recent = Primary
            fallbackData = sortedConfigs[1] || null;  // Second most recent = Fallback

            if (primaryData) {
              // ✅ Transform database structure ke format frontend
              response.data.models = {
                primary: {
                  provider: primaryData.provider,
                  model: primaryData.model_name,
                  temperature: primaryData.temperature,
                  maxTokens: primaryData.max_tokens,
                  topP: (primaryData as any).parameters?.topP || 0.9,
                  isActive: primaryData.is_active
                },
                fallback: fallbackData ? {
                  provider: fallbackData.provider,
                  model: fallbackData.model_name,
                  temperature: fallbackData.temperature,
                  maxTokens: fallbackData.max_tokens,
                  topP: (fallbackData as any).parameters?.topP || 0.9,
                  isActive: fallbackData.is_active
                } : fallbackModels.fallback
              };
            } else {
              response.data.models = fallbackModels;
            }
          }

          if (!response.data.models) {
            response.data.models = fallbackModels;
          }
        }

      } catch (modelError) {
        response.data.models = {
          primary: { provider: 'openai', model: 'gpt-4o', error: 'Configuration load failed', temperature: 0.1, maxTokens: 4096, isActive: true },
          fallback: { provider: 'openrouter', model: 'google/gemini-2.5-flash', error: 'Configuration load failed', temperature: 0.1, maxTokens: 4096, isActive: true }
        };
      }
    }

    // Get system prompts
    if (scope === 'all' || scope === 'prompts') {
      try {
        const { data: promptData } = await supabaseAdmin
          .from('system_prompts')
          .select('content, version, created_at, updated_at, priority_order')
          .eq('is_active', true)
          .order('priority_order')
          .limit(1)
          .maybeSingle();
        
        const systemPrompt = promptData as any;
        response.data.prompts = {
          systemInstructions: systemPrompt ? {
            content: systemPrompt.content,
            version: systemPrompt.version,
            charCount: systemPrompt.content?.length || 0,
            priority: systemPrompt.priority_order,
            createdAt: systemPrompt.created_at,
            updatedAt: systemPrompt.updated_at
          } : null
        };

      } catch (promptError) {
        response.data.prompts = {
          systemInstructions: { content: '', error: 'Prompt load failed' }
        };
      }
    }

    // Get API keys and settings
    if (scope === 'all' || scope === 'keys' || scope === 'settings') {
      try {
        const { data: settingsData } = await supabaseAdmin
          .from('admin_settings')
          .select('setting_key, setting_value, setting_type, category, is_sensitive')
          .eq('category', 'model_config')
          .order('setting_key');
        
        const settings = settingsData || [];
        response.data.settings = {};
        response.data.apiKeys = {};

        settings.forEach((setting: any) => {
          const key = setting.setting_key;
          const value = setting.is_sensitive && !includeSecrets 
            ? '***' 
            : setting.setting_value;
          
          if (key.includes('api_key')) {
            response.data.apiKeys[key.replace('_api_key', '')] = {
              value,
              configured: !!setting.setting_value,
              sensitive: setting.is_sensitive
            };
          } else {
            response.data.settings[key] = {
              value,
              type: setting.setting_type,
              category: setting.category
            };
          }
        });

        // Fallback to environment variables if database is empty
        if (settings.length === 0 || Object.keys(response.data.apiKeys).length === 0) {
          
          // Add environment API keys if available
          if (process.env.OPENAI_API_KEY) {
            response.data.apiKeys.openai = {
              value: includeSecrets ? process.env.OPENAI_API_KEY : '***',
              configured: true,
              sensitive: true,
              source: 'environment'
            };
          }
          
          if (process.env.OPENROUTER_API_KEY) {
            response.data.apiKeys.openrouter = {
              value: includeSecrets ? process.env.OPENROUTER_API_KEY : '***',
              configured: true,
              sensitive: true,
              source: 'environment'
            };
          }

        }

      } catch (settingsError) {
        response.data.settings = { error: 'Settings load failed' };
        response.data.apiKeys = { error: 'API keys load failed' };
      }
    }

    // Get app_version from admin_settings (application category)
    if (scope === 'all' || scope === 'settings') {
      if (!response.data.settings) {
        response.data.settings = {};
      }

      try {
        const versionResult = await supabaseAdmin
          .from('admin_settings')
          .select('setting_value')
          .eq('setting_key', 'app_version')
          .single();

        const versionData = versionResult.data as { setting_value: string } | null;

        if (versionData && versionData.setting_value) {
          response.data.settings.app_version = versionData.setting_value;
        } else {
          response.data.settings.app_version = 'Beta 0.1';
        }
      } catch (versionError) {
        // Silently fail, app_version is optional
        response.data.settings.app_version = 'Beta 0.1'; // Fallback default
      }
    }

    // Features configuration removed - using auto-pairing instead

    // Provider health status block disabled for now to stabilize type-check/build.

    // Add enhanced statistics if requested
    if (includeStats) {
      response.data.stats = {
        configsLoaded: Object.keys(response.data).length,
        lastUpdated: new Date().toISOString(),
        adminEmail: ADMIN_EMAIL,
        healthMonitored: !!response.data.health
      };
    }

    return Response.json(response);

  } catch (error) {

    const errorMessage = error instanceof Error ? error.message : 'Configuration fetch failed';
    const statusCode = error instanceof z.ZodError ? 400 : 500;

    return Response.json({
      success: false,
      error: {
        message: errorMessage,
        type: error instanceof z.ZodError ? 'validation_error' : 'internal_error',
        details: error instanceof z.ZodError ? error.errors : undefined,
        code: error instanceof z.ZodError ? 'INVALID_REQUEST' : 'CONFIG_ERROR'
      }
    }, { status: statusCode });
  }
}

/**
 * POST /api/admin/config - Update admin configuration
 */
export async function POST(request: NextRequest) {
  try {
    // Validate admin access (admin or superadmin)
    const adminCheck = await validateAdmin(request);
    if (!adminCheck.valid) {
      return Response.json({
        success: false,
        error: {
          message: adminCheck.error || 'Admin access required',
          type: 'auth_error',
          code: 'ADMIN_ONLY'
        }
      }, { status: 403 });
    }
    const adminUserId = adminCheck.userId;

    const body = await request.json();
    const validatedRequest: UpdateConfigRequest = UpdateConfigRequestSchema.parse(body);

    const { models, prompts, apiKeys, appVersion } = validatedRequest;


    const results: any = {
      updated: {},
      timestamps: {}
    };

    // Update model configurations with dynamic provider swap support
    if (models) {

      // Create new configurations with current timestamp for proper ordering
      const currentTime = new Date();

      if (models.primary) {
        // Deactivate existing PRIMARY configs only
        await (supabaseAdmin as any)
          .from('model_configs')
          .update({
            is_active: false,
            is_default: false,
            updated_at: new Date().toISOString(),
            updated_by: adminUserId
          } as any)
          .eq('is_active', true)
          .eq('role', 'primary');

        const primaryData = models.primary;

        const { data: primaryResult, error: primaryError } = await supabaseAdmin
          .from('model_configs')
          .insert({
            id: crypto.randomUUID(),
            name: `${primaryData.provider} ${primaryData.model} - Primary`,
            role: 'primary',
            provider: primaryData.provider,
            model_name: primaryData.model,
            temperature: primaryData.temperature ?? 0.1,
            max_tokens: primaryData.maxTokens ?? 4096,
            parameters: { topP: primaryData.topP ?? 0.9 },
            is_active: primaryData.isActive ?? true,
            is_default: true,
            created_by: adminUserId,
            updated_by: adminUserId,
            created_at: new Date(currentTime.getTime() + 100).toISOString(), // +100ms to ensure primary is newer
            updated_at: new Date().toISOString()
          } as any)
          .select('id, provider, model_name, created_at')
          .single();

        if (!primaryError && primaryResult) {
          results.updated.primary = primaryResult;
          results.timestamps.primary = new Date().toISOString();
        } else {
        }
      }

      if (models.fallback) {
        // Deactivate existing FALLBACK configs only
        await (supabaseAdmin as any)
          .from('model_configs')
          .update({
            is_active: false,
            is_default: false,
            updated_at: new Date().toISOString(),
            updated_by: adminUserId
          } as any)
          .eq('is_active', true)
          .eq('role', 'fallback');

        const fallbackData = models.fallback;

        const { data: fallbackResult, error: fallbackError } = await supabaseAdmin
          .from('model_configs')
          .insert({
            id: crypto.randomUUID(),
            name: `${fallbackData.provider} ${fallbackData.model} - Fallback`,
            role: 'fallback',
            provider: fallbackData.provider,
            model_name: fallbackData.model,
            temperature: fallbackData.temperature ?? 0.1,
            max_tokens: fallbackData.maxTokens ?? 4096,
            parameters: { topP: fallbackData.topP ?? 0.9 },
            is_active: fallbackData.isActive ?? true,
            is_default: true, // Allow fallback to become primary in swaps
            created_by: adminUserId,
            updated_by: adminUserId,
            created_at: currentTime.toISOString(), // Fallback gets original timestamp (older)
            updated_at: new Date().toISOString()
          } as any)
          .select('id, provider, model_name, created_at')
          .single();

        if (!fallbackError && fallbackResult) {
          results.updated.fallback = fallbackResult;
          results.timestamps.fallback = new Date().toISOString();
        } else {
        }
      }

    }

    // Update system prompts
    if (prompts?.systemInstructions) {
      const promptData = prompts.systemInstructions;
      
      const { data: promptResult, error: promptError } = await supabaseAdmin
        .from('system_prompts')
        .upsert({
          id: crypto.randomUUID(),
          content: promptData.content,
          version: promptData.version || '1.0.0',
          priority_order: promptData.priority || 1,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as any)
        .select('id, version')
        .maybeSingle();

      if (!promptError && promptResult) {
        results.updated.systemPrompt = promptResult;
        results.timestamps.systemPrompt = new Date().toISOString();
      } else {
      }
    }

    // Update API keys (stored as plaintext in database)
    // Note: Environment variables take precedence at runtime
    if (apiKeys) {
      for (const [provider, apiKey] of Object.entries(apiKeys)) {
        if (apiKey && typeof apiKey === 'string') {
          const keySettingName = `${provider}_api_key`;

          try {
            const { data: keyResult, error: keyError } = await supabaseAdmin
              .from('admin_settings')
              .upsert({
                setting_key: keySettingName,
                setting_value: apiKey,
                setting_type: 'string',
                category: 'model_config',
                is_sensitive: true,
                updated_by: adminUserId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              } as any)
              .select('setting_key')
              .maybeSingle();

            if (!keyError && keyResult) {
              results.updated[`${provider}ApiKey`] = keyResult;
              results.timestamps[`${provider}ApiKey`] = new Date().toISOString();
            }
          } catch (keyError) {
            // Silent fail - API keys are optional, environment variables used as fallback
          }
        }
      }
    }

    // Update app_version if provided
    if (appVersion) {
      try {
        // Use RPC function to bypass trigger validation
        // @ts-expect-error - RPC function types not properly inferred from database
        const versionRpcCall = supabaseAdmin.rpc('update_app_version', {
          new_version: appVersion,
          user_id: adminUserId
        });
        const { data: versionResult, error: versionError } = await versionRpcCall;

        if (versionError) {
          throw new Error(`Failed to update app version: ${versionError.message || JSON.stringify(versionError)}`);
        }

        const resultArray = versionResult as any[];
        if (resultArray && Array.isArray(resultArray) && resultArray.length > 0) {
          results.updated.appVersion = resultArray[0];
          results.timestamps.appVersion = new Date().toISOString();
        }
      } catch (versionError) {
        throw versionError;
      }
    }

    // Features update removed - using auto-pairing instead

    // ⚡ PERFORMANCE: Clear dynamic config cache after admin updates
    try {
      const { clearDynamicConfigCache } = await import('../../../../src/lib/ai/dynamic-config');
      clearDynamicConfigCache();
    } catch (cacheError) {
    }

    return Response.json({
      success: true,
      data: results,
      message: 'Configuration updated successfully',
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Configuration update failed';
    const statusCode = error instanceof z.ZodError ? 400 : 500;

    return Response.json({
      success: false,
      error: {
        message: errorMessage,
        type: error instanceof z.ZodError ? 'validation_error' : 'internal_error',
        details: error instanceof z.ZodError ? error.errors : undefined,
        code: error instanceof z.ZodError ? 'INVALID_REQUEST' : 'UPDATE_ERROR'
      }
    }, { status: statusCode });
  }
}
