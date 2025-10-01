/* @ts-nocheck */
/**
 * Admin OpenRouter System Prompt Management API Endpoint
 *
 * Simplified CRUD for OpenRouter Gemini system prompt.
 * Restricted to admin access only.
 *
 * Features:
 * - GET: Retrieve active OpenRouter prompt
 * - PUT: Update/create OpenRouter prompt
 * - Single active prompt enforced by database constraint
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/database/supabase-client';

// Admin email hardcoded for security
const ADMIN_EMAIL = 'makalah.app@gmail.com';

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
 * GET /api/admin/fallback-prompt - Retrieve active OpenRouter prompt
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

    console.log('🔍 Getting active OpenRouter system prompt');

    const { data: prompt, error } = await (supabaseAdmin as any)
      .from('openrouter_system_prompts')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('❌ Error getting OpenRouter prompt:', error);
      throw new Error('Failed to get OpenRouter prompt');
    }

    const message = prompt
      ? 'OpenRouter prompt loaded successfully'
      : 'No active OpenRouter prompt found';

    console.log(prompt ? '✅ OpenRouter prompt loaded' : 'ℹ️ No OpenRouter prompt found');

    return Response.json({
      success: true,
      data: { prompt },
      message,
      metadata: {
        hasPrompt: !!prompt,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ GET OpenRouter prompt error:', error);

    return Response.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to get OpenRouter prompt',
        type: 'internal_error',
        code: 'GET_ERROR'
      }
    }, { status: 500 });
  }
}

/**
 * PUT /api/admin/fallback-prompt - Update or create OpenRouter prompt
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
    const validated: UpdateOpenRouterPromptRequest = UpdateOpenRouterPromptSchema.parse(body);

    console.log('💾 Updating OpenRouter system prompt', {
      contentLength: validated.content.length,
      version: validated.version
    });

    // Get current active prompt
    const { data: currentPrompt } = await (supabaseAdmin as any)
      .from('openrouter_system_prompts')
      .select('id')
      .eq('is_active', true)
      .maybeSingle();

    if (!currentPrompt) {
      // Create new if none exists
      console.log('📝 Creating new OpenRouter prompt (none exists)');

      const { data: newPrompt, error: insertError } = await (supabaseAdmin as any)
        .from('openrouter_system_prompts')
        .insert({
          content: validated.content,
          version: validated.version || 'v1.0',
          description: validated.description || 'System prompt for OpenRouter Gemini models',
          is_active: true,
          created_by: adminCheck.userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('*')
        .single();

      if (insertError) {
        console.error('❌ Error creating OpenRouter prompt:', insertError);
        throw new Error('Failed to create OpenRouter prompt');
      }

      console.log('✅ OpenRouter prompt created successfully');

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
    console.log('📝 Updating existing OpenRouter prompt:', currentPrompt.id);

    const { data: updatedPrompt, error: updateError } = await (supabaseAdmin as any)
      .from('openrouter_system_prompts')
      .update({
        content: validated.content,
        version: validated.version,
        description: validated.description,
        updated_by: adminCheck.userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentPrompt.id)
      .select('*')
      .single();

    if (updateError) {
      console.error('❌ Error updating OpenRouter prompt:', updateError);
      throw new Error('Failed to update OpenRouter prompt');
    }

    console.log('✅ OpenRouter prompt updated successfully');

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
    console.error('❌ PUT OpenRouter prompt error:', error);

    if (error instanceof z.ZodError) {
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
