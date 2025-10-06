/* @ts-nocheck */
/**
 * Admin System Prompt Management API Endpoint
 *
 * Handles system prompt CRUD operations with version tracking.
 * Restricted to admin access only.
 *
 * Features:
 * - System prompt versioning with history tracking
 * - Character count validation and version incrementation
 * - Prompt history retrieval with change descriptions
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/database/supabase-client';

// Admin email hardcoded for security
const ADMIN_EMAIL = 'makalah.app@gmail.com';

// COMPLETE crypto polyfill handling for ALL environments - NO MORE ERRORS
let crypto: any;
try {
  if (typeof window !== 'undefined' && window.crypto) {
    // Browser environment
    crypto = window.crypto;
  } else if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    // Modern global crypto
    crypto = globalThis.crypto;
  } else if (typeof global !== 'undefined' && global.crypto) {
    // Node.js with crypto global
    crypto = global.crypto;
  } else {
    // Node.js environment - try multiple fallbacks
    try {
      const nodeCrypto = require('node:crypto');
      crypto = nodeCrypto.webcrypto || nodeCrypto;
    } catch {
      try {
        const nodeCrypto = require('crypto');
        crypto = nodeCrypto.webcrypto || nodeCrypto;
      } catch {
        // Ultimate fallback
        crypto = null;
      }
    }
  }
} catch (error) {
  crypto = null;
}

// GUARANTEED crypto functions - will NEVER fail
const getCryptoUUID = () => {
  try {
    if (crypto && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    if (crypto && crypto.getRandomValues) {
      // Manual UUID v4 generation using crypto.getRandomValues
      const buffer = new Uint8Array(16);
      crypto.getRandomValues(buffer);
      buffer[6] = (buffer[6] & 0x0f) | 0x40; // Version 4
      buffer[8] = (buffer[8] & 0x3f) | 0x80; // Variant bits
      const hex = Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('');
      return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}`;
    }
  } catch (error) {
    // UUID generation with crypto failed, use fallback
  }

  // Fallback UUID generation - guaranteed to work
  const timestamp = Date.now().toString(16);
  const random1 = Math.random().toString(16).substring(2, 10);
  const random2 = Math.random().toString(16).substring(2, 10);
  const random3 = Math.random().toString(16).substring(2, 6);
  return `${timestamp.substring(0, 8)}-${random1.substring(0, 4)}-4${random1.substring(4, 7)}-${random2.substring(0, 4)}-${random2.substring(4)}${random3}`;
};

// Request validation schemas
const SavePromptRequestSchema = z.object({
  content: z.string().min(100, 'System prompt harus minimal 100 karakter').max(15000, 'System prompt maksimal 15000 karakter'),
  version: z.string().optional(),
  changeReason: z.string().optional().default('Admin dashboard update')
});

const GetPromptHistoryRequestSchema = z.object({
  limit: z.number().min(1).max(50).default(10)
});

type SavePromptRequest = z.infer<typeof SavePromptRequestSchema>;
type GetPromptHistoryRequest = z.infer<typeof GetPromptHistoryRequestSchema>;

/**
 * Validate admin access from request
 */
async function validateAdminAccess(request: NextRequest): Promise<{ valid: boolean; error?: string; userId?: string }> {
  try {
    // Get Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { valid: false, error: 'No authorization header' };
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return { valid: false, error: 'Invalid token' };
    }
    
    // Check if user is admin
    const isAdmin = user.email === ADMIN_EMAIL;
    
    if (!isAdmin) {
      return { valid: false, error: 'Admin access required' };
    }
    
    return { valid: true, userId: user.id };
    
  } catch (error) {
    return { valid: false, error: 'Auth validation failed' };
  }
}

/**
 * Generate next version number based on current version
 */
function generateNextVersion(currentVersion: string): string {
  // Parse version like v2.1 or 2.1.0
  const versionMatch = currentVersion.match(/v?(\d+)\.(\d+)(?:\.(\d+))?/);
  
  if (versionMatch) {
    const major = parseInt(versionMatch[1]);
    const minor = parseInt(versionMatch[2]);
    const patch = parseInt(versionMatch[3] || '0');
    
    // Increment minor version for content changes
    return `v${major}.${minor + 1}`;
  }
  
  // Fallback to incrementing based on current date
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  return `v${month}.${day}`;
}

/**
 * GET /api/admin/prompts - Get prompts based on action
 */
export async function GET(request: NextRequest) {
  try {
    // Validate admin access
    const adminCheck = await validateAdminAccess(request);
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
    const action = searchParams.get('action');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Handle different actions
    if (action === 'list-all') {
      // Get all system prompts from database for management

      const { data: allPrompts, error: listError } = await (supabaseAdmin as any)
        .from('system_prompts')
        .select('*')
        .order('created_at', { ascending: false });

      if (listError) {
        throw new Error('Failed to get system prompts');
      }

      return Response.json({
        success: true,
        data: {
          prompts: allPrompts || []
        },
        metadata: {
          count: allPrompts?.length || 0,
          generatedAt: new Date().toISOString()
        }
      });
    }

    // Get current active prompt
    const { data: currentPrompt, error: currentError } = await (supabaseAdmin as any)
      .from('system_prompts')
      .select('id, content, version, created_at, updated_at, priority_order')
      .eq('is_active', true)
      .order('priority_order')
      .limit(1)
      .maybeSingle();

    if (currentError) {
      // Error getting current prompt, will return empty
    }

    // Get prompt history from prompt_versions if it exists
    let promptHistory: any[] = [];
    if (currentPrompt?.id) {
      const { data: historyData, error: historyError } = await (supabaseAdmin as any)
        .from('prompt_versions')
        .select('version_number, content, created_at, change_description, changed_by')
        .eq('prompt_id', currentPrompt.id)
        .order('version_number', { ascending: false })
        .limit(limit);

      if (!historyError && historyData) {
        promptHistory = historyData;
      }
    }

    // Return error if no real data found
    if (!currentPrompt) {
      return Response.json({
        success: false,
        error: {
          message: 'No system prompt found in database',
          type: 'not_found_error',
          code: 'NO_SYSTEM_PROMPT'
        }
      }, { status: 404 });
    }

    return Response.json({
      success: true,
      data: {
        current: {
          content: currentPrompt.content,
          version: currentPrompt.version,
          charCount: currentPrompt.content?.length || 0,
          priority: currentPrompt.priority_order || 1,
          createdAt: currentPrompt.created_at,
          updatedAt: currentPrompt.updated_at
        },
        history: promptHistory.map((item: any) => ({
          version: item.version_number,
          date: item.created_at?.substring(0, 10) || item.created_at,
          description: item.change_description,
          changedBy: item.changed_by
        }))
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        historyCount: promptHistory.length,
        hasActivePrompt: !!currentPrompt
      }
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to get prompt data',
        type: 'internal_error',
        code: 'PROMPT_GET_ERROR'
      }
    }, { status: 500 });
  }
}

/**
 * POST /api/admin/prompts - Save system prompt with version tracking
 */
export async function POST(request: NextRequest) {
  try {
    // Validate admin access
    const adminCheck = await validateAdminAccess(request);
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

    const body = await request.json();

    const validatedRequest: SavePromptRequest = SavePromptRequestSchema.parse(body);
    const { content, version, changeReason } = validatedRequest;

    // Get current prompt to determine next version
    const { data: currentPrompt } = await (supabaseAdmin as any)
      .from('system_prompts')
      .select('id, version')
      .eq('is_active', true)
      .order('priority_order')
      .limit(1)
      .maybeSingle();

    const nextVersion = version || generateNextVersion(currentPrompt?.version || 'v2.0');

    // Deactivate current prompt
    if (currentPrompt) {
      await (supabaseAdmin as any)
        .from('system_prompts')
        .update({ is_active: false })
        .eq('id', currentPrompt.id);
    }

    // Create new prompt entry
    const newPromptId = getCryptoUUID();
    const { data: newPrompt, error: promptError } = await (supabaseAdmin as any)
      .from('system_prompts')
      .insert({
        id: newPromptId,
        name: `System Instructions v${nextVersion}`,
        content,
        version: parseInt(nextVersion.replace('v', '').replace('.', '')) || 21,
        priority_order: 1,
        is_active: true,
        created_by: adminCheck.userId,
        updated_by: adminCheck.userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any)
      .select('id, content, version')
      .single();

    if (promptError) {
      throw new Error('Failed to save system prompt');
    }

    // Create version history entry
    const { error: historyError } = await (supabaseAdmin as any)
      .from('prompt_versions')
      .insert({
        id: getCryptoUUID(),
        prompt_id: newPromptId,
        version_number: parseInt(nextVersion.replace('v', '').replace('.', '')) || 21,
        content,
        change_description: changeReason,
        changed_by: adminCheck.userId,
        created_at: new Date().toISOString()
      } as any);

    if (historyError) {
      // Don't fail the entire operation for history tracking
    }

    // ⚡ CRITICAL: Clear dynamic config cache after saving system prompt
    try {
      const { clearDynamicConfigCache } = await import('@/lib/ai/dynamic-config');
      clearDynamicConfigCache();

    } catch (cacheError) {
      // Don't fail the operation for cache clearing issues
    }

    return Response.json({
      success: true,
      data: {
        prompt: newPrompt,
        version: parseInt(nextVersion.replace('v', '').replace('.', '')) || 21,
        charCount: content.length
      },
      message: 'System prompt saved successfully',
      savedAt: new Date().toISOString()
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to save prompt';
    const statusCode = error instanceof z.ZodError ? 400 : 500;

    return Response.json({
      success: false,
      error: {
        message: errorMessage,
        type: error instanceof z.ZodError ? 'validation_error' : 'internal_error',
        details: error instanceof z.ZodError ? error.errors : undefined,
        code: error instanceof z.ZodError ? 'INVALID_REQUEST' : 'PROMPT_SAVE_ERROR'
      }
    }, { status: statusCode });
  }
}

/**
 * PUT /api/admin/prompts - Update existing system prompt
 */
export async function PUT(request: NextRequest) {
  try {
    // Validate admin access
    const adminCheck = await validateAdminAccess(request);
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

    const body = await request.json();
    const { id, name, content, isActive, priorityOrder, metadata } = body;

    if (!id) {
      return Response.json({
        success: false,
        error: {
          message: 'Prompt ID is required',
          type: 'validation_error',
          code: 'MISSING_ID'
        }
      }, { status: 400 });
    }

    // If setting as active, deactivate other prompts
    if (isActive) {
      await (supabaseAdmin as any)
        .from('system_prompts')
        .update({ is_active: false })
        .neq('id', id);
    }

    // Update the prompt
    const updateData: any = {
      updated_at: new Date().toISOString(),
      updated_by: adminCheck.userId
    };

    if (name !== undefined) updateData.name = name;
    if (content !== undefined) updateData.content = content;
    if (isActive !== undefined) updateData.is_active = isActive;
    if (priorityOrder !== undefined) updateData.priority_order = priorityOrder;
    if (metadata !== undefined) updateData.metadata = metadata;

    const { data: updatedPrompt, error: updateError } = await (supabaseAdmin as any)
      .from('system_prompts')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      throw new Error('Failed to update system prompt');
    }

    // ⚡ CRITICAL: Clear dynamic config cache after updating system prompt
    try {
      const { clearDynamicConfigCache } = await import('@/lib/ai/dynamic-config');
      clearDynamicConfigCache();

    } catch (cacheError) {
      // Don't fail the operation for cache clearing issues
    }

    return Response.json({
      success: true,
      data: {
        prompt: updatedPrompt
      },
      message: 'System prompt updated successfully'
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to update prompt',
        type: 'internal_error',
        code: 'PROMPT_UPDATE_ERROR'
      }
    }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/prompts - Delete system prompt
 */
export async function DELETE(request: NextRequest) {
  try {
    // Validate admin access
    const adminCheck = await validateAdminAccess(request);
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
    const promptId = searchParams.get('id');

    if (!promptId) {
      return Response.json({
        success: false,
        error: {
          message: 'Prompt ID is required',
          type: 'validation_error',
          code: 'MISSING_ID'
        }
      }, { status: 400 });
    }

    // Check if prompt exists and is not the only active prompt
    const { data: prompt } = await (supabaseAdmin as any)
      .from('system_prompts')
      .select('*')
      .eq('id', promptId)
      .single();

    if (!prompt) {
      return Response.json({
        success: false,
        error: {
          message: 'Prompt not found',
          type: 'not_found_error',
          code: 'PROMPT_NOT_FOUND'
        }
      }, { status: 404 });
    }

    // Prevent deletion of the only active prompt
    if (prompt.is_active) {
      const { count } = await (supabaseAdmin as any)
        .from('system_prompts')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);

      if (count <= 1) {
        return Response.json({
          success: false,
          error: {
            message: 'Cannot delete the only active system prompt',
            type: 'validation_error',
            code: 'LAST_PROMPT_PROTECTION'
          }
        }, { status: 400 });
      }
    }

    // Delete the prompt
    const { error: deleteError } = await (supabaseAdmin as any)
      .from('system_prompts')
      .delete()
      .eq('id', promptId);

    if (deleteError) {
      throw new Error('Failed to delete system prompt');
    }

    // ⚡ Clear cache if deleted prompt was active
    if (prompt.is_active) {
      try {
        const { clearDynamicConfigCache } = await import('@/lib/ai/dynamic-config');
        clearDynamicConfigCache();

      } catch (cacheError) {
        // Don't fail the operation for cache clearing issues
      }
    }

    return Response.json({
      success: true,
      message: 'System prompt deleted successfully'
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to delete prompt',
        type: 'internal_error',
        code: 'PROMPT_DELETE_ERROR'
      }
    }, { status: 500 });
  }
}

