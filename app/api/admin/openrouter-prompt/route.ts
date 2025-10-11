/**
 * Admin OpenRouter System Prompt Management API Endpoint
 *
 * Simplified CRUD for OpenRouter system prompt (used by Gemini models).
 * Restricted to admin access only.
 *
 * Features:
 * - GET: Retrieve active OpenRouter prompt
 * - PUT: Update/create OpenRouter prompt
 * - Single active prompt enforced by database constraint
 * - Table: openrouter_system_prompts
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/database/supabase-client';
import { validateAdminAccess as validateAdmin } from '@/lib/admin/admin-auth';

// Request validation schemas
const UpdateOpenRouterPromptSchema = z.object({
  content: z.string()
    .min(100, 'Content must be at least 100 characters')
    .max(50000, 'Content must not exceed 50,000 characters'),
  version: z.string().optional(),
  description: z.string().optional()
});

type UpdateOpenRouterPromptRequest = z.infer<typeof UpdateOpenRouterPromptSchema>;

/**
 * GET /api/admin/openrouter-prompt - Retrieve active OpenRouter prompt
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

    // Type assertion needed due to Supabase PostgREST type inference returning 'never'
    // See CLAUDE.md "Supabase Type Inference Workarounds" (commit 95c46e7)
    const { data: prompt, error } = await (supabaseAdmin as any)
      .from('openrouter_system_prompts')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    // Detailed error logging for debugging
    if (error) {
      console.error('[OpenRouter Prompt API] Supabase query error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to get OpenRouter prompt: ${error.message || 'Unknown database error'}`);
    }

    // Success: return prompt (or null if no active prompt found)
    const message = prompt
      ? 'OpenRouter prompt loaded successfully'
      : 'No active OpenRouter prompt found';

    return Response.json({
      success: true,
      data: { prompt: prompt || null },
      message,
      metadata: {
        hasPrompt: !!prompt,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    // Log detailed error for server-side debugging
    console.error('[OpenRouter Prompt API] Unexpected error in GET handler:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    return Response.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to get fallback prompt',
        type: 'internal_error',
        code: 'GET_ERROR'
      }
    }, { status: 500 });
  }
}

/**
 * PUT /api/admin/openrouter-prompt - Update or create OpenRouter prompt
 */
export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const validated: UpdateOpenRouterPromptRequest = UpdateOpenRouterPromptSchema.parse(body);

    // Get current active prompt
    // Type assertion needed due to Supabase PostgREST type inference returning 'never'
    // See CLAUDE.md "Supabase Type Inference Workarounds" (commit 95c46e7)
    const { data: currentPrompt } = await (supabaseAdmin as any)
      .from('openrouter_system_prompts')
      .select('id')
      .eq('is_active', true)
      .maybeSingle();

    if (!currentPrompt) {
      // Create new if none exists
      // Type assertion needed due to Supabase PostgREST type inference returning 'never'
      // See CLAUDE.md "Supabase Type Inference Workarounds" (commit 95c46e7)
      const { data: newPrompt, error: insertError } = await (supabaseAdmin as any)
        .from('openrouter_system_prompts')
        .insert({
          content: validated.content,
          version: validated.version || 'v1.0',
          description: validated.description || 'System prompt for OpenRouter Gemini models',
          is_active: true,
          created_by: adminCheck.userId
          // created_at and updated_at will use database defaults
        })
        .select('*')
        .single();

      if (insertError) {
        console.error('[OpenRouter Prompt API] Failed to create OpenRouter prompt:', {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          timestamp: new Date().toISOString()
        });
        throw new Error(`Failed to create OpenRouter prompt: ${insertError.message || 'Unknown database error'}`);
      }

      return Response.json({
        success: true,
        data: { prompt: newPrompt },
        message: 'OpenRouter prompt created successfully',
        metadata: {
          action: 'created',
          generatedAt: new Date().toISOString()
        }
      });
    }

    // Update existing prompt
    // Type assertion needed due to Supabase PostgREST type inference returning 'never'
    // See CLAUDE.md "Supabase Type Inference Workarounds" (commit 95c46e7)
    const { data: updatedPrompt, error: updateError } = await (supabaseAdmin as any)
      .from('openrouter_system_prompts')
      .update({
        content: validated.content,
        version: validated.version,
        description: validated.description,
        updated_by: adminCheck.userId
        // updated_at will use database trigger/default
      })
      .eq('id', currentPrompt.id)
      .select('*')
      .single();

    if (updateError) {
      console.error('[OpenRouter Prompt API] Failed to update OpenRouter prompt:', {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to update OpenRouter prompt: ${updateError.message || 'Unknown database error'}`);
    }

    return Response.json({
      success: true,
      data: { prompt: updatedPrompt },
      message: 'OpenRouter prompt updated successfully',
      metadata: {
        action: 'updated',
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.warn('[OpenRouter Prompt API] Validation error in PUT handler:', {
        errors: error.errors,
        timestamp: new Date().toISOString()
      });
      return Response.json({
        success: false,
        error: {
          message: 'Invalid request data',
          type: 'validation_error',
          details: error.errors,
          code: 'VALIDATION_ERROR'
        }
      }, { status: 400 });
    }

    // Log detailed error for server-side debugging
    console.error('[OpenRouter Prompt API] Unexpected error in PUT handler:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    return Response.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to update OpenRouter prompt',
        type: 'internal_error',
        code: 'UPDATE_ERROR'
      }
    }, { status: 500 });
  }
}
