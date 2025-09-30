/* @ts-nocheck */
/**
 * Admin Model Prompt Templates Management API Endpoint
 *
 * Handles model-specific prompt template CRUD operations.
 * Features template activation, default template generation, and model-specific optimizations.
 * Restricted to admin access only.
 *
 * Features:
 * - Model-specific template management
 * - Default template auto-generation for new models
 * - Template activation with one-click switching
 * - Custom template creation and management
 * - Model registry integration for automatic template generation
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/database/supabase-client';
import { OPENROUTER_MODELS } from '@/lib/ai/model-registry';

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
  console.warn('⚠️ Crypto initialization error:', error);
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
    console.warn('⚠️ Crypto UUID generation failed:', error);
  }

  // Fallback UUID generation - guaranteed to work
  const timestamp = Date.now().toString(16);
  const random1 = Math.random().toString(16).substring(2, 10);
  const random2 = Math.random().toString(16).substring(2, 10);
  const random3 = Math.random().toString(16).substring(2, 6);
  return `${timestamp.substring(0, 8)}-${random1.substring(0, 4)}-4${random1.substring(4, 7)}-${random2.substring(0, 4)}-${random2.substring(4)}${random3}`;
};

// Request validation schemas
const CreateTemplateRequestSchema = z.object({
  modelSlug: z.string().min(1, 'Model slug is required'),
  templateName: z.string().min(1, 'Template name is required'),
  templateContent: z.string().min(100, 'Template content must be at least 100 characters').max(15000, 'Template content must be at most 15000 characters'),
  isDefault: z.boolean().optional().default(false)
});

const ActivateTemplateRequestSchema = z.object({
  modelSlug: z.string().min(1, 'Model slug is required'),
  templateId: z.string().uuid('Valid template ID is required')
});

const GenerateDefaultTemplatesRequestSchema = z.object({
  modelSlugs: z.array(z.string()).optional(), // If not provided, generate for all models
  forceRegenerate: z.boolean().optional().default(false)
});

type CreateTemplateRequest = z.infer<typeof CreateTemplateRequestSchema>;
type ActivateTemplateRequest = z.infer<typeof ActivateTemplateRequestSchema>;
type GenerateDefaultTemplatesRequest = z.infer<typeof GenerateDefaultTemplatesRequestSchema>;

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
 * Generate model-specific default template content
 */
function generateDefaultTemplateContent(modelSlug: string, modelName: string): string {
  const basePrompt = `You are Makalah AI, an Academic Research Agent specialized in Bahasa Indonesia academic paper development through a structured 7-phase research methodology.

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
- web_search for research needs`;

  // Model-specific optimizations
  if (modelSlug.includes('kimi')) {
    return `${basePrompt}

## MODEL-SPECIFIC OPTIMIZATION (${modelName}):
- Leverage long context capability for comprehensive literature analysis
- Use multimodal understanding for complex academic diagrams and charts
- Prioritize detailed research synthesis and cross-reference verification
- Emphasize thorough academic writing with extensive citation integration

Always maintain academic integrity with evidence-based research, proper citations, and collaborative workflow progression.`;
  }

  if (modelSlug.includes('deepseek')) {
    return `${basePrompt}

## MODEL-SPECIFIC OPTIMIZATION (${modelName}):
- Utilize reasoning chain for structured academic problem-solving
- Apply logical step-by-step methodology validation
- Focus on analytical thinking and evidence-based conclusions
- Emphasize clear reasoning paths in academic argument development

Always maintain academic integrity with evidence-based research, proper citations, and collaborative workflow progression.`;
  }

  if (modelSlug.includes('gemini')) {
    return `${basePrompt}

## MODEL-SPECIFIC OPTIMIZATION (${modelName}):
- Leverage multimodal capabilities for complex document processing
- Use advanced context understanding for large literature reviews
- Apply sophisticated language understanding for nuanced academic writing
- Emphasize comprehensive research synthesis and structural optimization

Always maintain academic integrity with evidence-based research, proper citations, and collaborative workflow progression.`;
  }

  // Default for other models
  return `${basePrompt}

## MODEL-SPECIFIC OPTIMIZATION (${modelName}):
- Focus on balanced academic writing approach
- Emphasize clear methodology and structured progression
- Maintain consistent academic standards throughout all phases
- Prioritize user guidance and collaborative development

Always maintain academic integrity with evidence-based research, proper citations, and collaborative workflow progression.`;
}

/**
 * GET /api/admin/templates - Get templates for specific model or all models
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
    const modelSlug = searchParams.get('modelSlug');

    console.log('🔍 Getting model prompt templates', { modelSlug });

    let query = (supabaseAdmin as any)
      .from('model_prompt_templates')
      .select('*')
      .order('is_active', { ascending: false })
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (modelSlug) {
      query = query.eq('model_slug', modelSlug);
    }

    const { data: templates, error } = await query;

    if (error) {
      console.error('❌ Error getting templates:', error);
      throw new Error('Failed to get templates');
    }

    // Group templates by model if getting all models
    let groupedTemplates: any = {};
    if (!modelSlug) {
      templates.forEach((template: any) => {
        if (!groupedTemplates[template.model_slug]) {
          groupedTemplates[template.model_slug] = [];
        }
        groupedTemplates[template.model_slug].push(template);
      });
    }

    return Response.json({
      success: true,
      data: {
        templates: modelSlug ? templates : groupedTemplates,
        modelSlug,
        count: templates.length
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        availableModels: OPENROUTER_MODELS.map(m => ({ slug: m.value, name: m.label }))
      }
    });

  } catch (error) {
    console.error('❌ Admin templates GET error:', error);

    return Response.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to get templates',
        type: 'internal_error',
        code: 'TEMPLATES_GET_ERROR'
      }
    }, { status: 500 });
  }
}

/**
 * POST /api/admin/templates - Create new template or generate default templates
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
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Handle different actions
    if (action === 'generate-defaults') {
      const validatedRequest: GenerateDefaultTemplatesRequest = GenerateDefaultTemplatesRequestSchema.parse(body);
      const { modelSlugs, forceRegenerate } = validatedRequest;

      console.log('🔄 Generating default templates', { modelSlugs, forceRegenerate });

      const modelsToProcess = modelSlugs || OPENROUTER_MODELS.map(m => m.value);
      const results = [];

      for (const modelSlug of modelsToProcess) {
        const model = OPENROUTER_MODELS.find(m => m.value === modelSlug);
        if (!model) {
          console.warn(`⚠️ Model ${modelSlug} not found in registry`);
          continue;
        }

        const templateName = `${model.label} Default`;

        // Check if default template already exists
        const { data: existingTemplate } = await (supabaseAdmin as any)
          .from('model_prompt_templates')
          .select('id, is_active')
          .eq('model_slug', modelSlug)
          .eq('is_default', true)
          .maybeSingle();

        if (existingTemplate && !forceRegenerate) {
          console.log(`ℹ️ Default template for ${model.label} already exists, skipping`);
          results.push({ modelSlug, status: 'skipped', reason: 'already_exists' });
          continue;
        }

        const templateContent = generateDefaultTemplateContent(modelSlug, model.label);

        if (existingTemplate && forceRegenerate) {
          // Update existing default template
          const { error: updateError } = await (supabaseAdmin as any)
            .from('model_prompt_templates')
            .update({
              template_content: templateContent,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingTemplate.id);

          if (updateError) {
            console.error(`❌ Error updating default template for ${model.label}:`, updateError);
            results.push({ modelSlug, status: 'error', error: updateError.message });
          } else {
            console.log(`✅ Updated default template for ${model.label}`);
            results.push({ modelSlug, status: 'updated' });
          }
        } else {
          // Create new default template
          const { error: insertError } = await (supabaseAdmin as any)
            .from('model_prompt_templates')
            .insert({
              id: getCryptoUUID(),
              model_slug: modelSlug,
              model_name: model.label,
              template_name: templateName,
              template_content: templateContent,
              is_default: true,
              is_active: false, // Generated templates start inactive - admin must explicitly activate
              created_by: adminCheck.userId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (insertError) {
            console.error(`❌ Error creating default template for ${model.label}:`, insertError);
            results.push({ modelSlug, status: 'error', error: insertError.message });
          } else {
            console.log(`✅ Created default template for ${model.label}`);
            results.push({ modelSlug, status: 'created' });
          }
        }
      }

      return Response.json({
        success: true,
        data: {
          results,
          processedCount: results.length,
          createdCount: results.filter(r => r.status === 'created').length,
          updatedCount: results.filter(r => r.status === 'updated').length,
          skippedCount: results.filter(r => r.status === 'skipped').length,
          errorCount: results.filter(r => r.status === 'error').length
        },
        message: 'Default templates generation completed'
      });
    }

    // Handle regular template creation
    const validatedRequest: CreateTemplateRequest = CreateTemplateRequestSchema.parse(body);
    const { modelSlug, templateName, templateContent, isDefault } = validatedRequest;

    console.log('💾 Creating template:', { modelSlug, templateName, isDefault });

    // Validate model exists in registry
    const model = OPENROUTER_MODELS.find(m => m.value === modelSlug);
    if (!model) {
      return Response.json({
        success: false,
        error: {
          message: 'Model not found in registry',
          type: 'validation_error',
          code: 'INVALID_MODEL'
        }
      }, { status: 400 });
    }

    // Check if template name already exists for this model
    const { data: existingTemplate } = await (supabaseAdmin as any)
      .from('model_prompt_templates')
      .select('id')
      .eq('model_slug', modelSlug)
      .eq('template_name', templateName)
      .maybeSingle();

    if (existingTemplate) {
      return Response.json({
        success: false,
        error: {
          message: 'Template name already exists for this model',
          type: 'validation_error',
          code: 'DUPLICATE_TEMPLATE_NAME'
        }
      }, { status: 400 });
    }

    // Create new template
    const { data: newTemplate, error: insertError } = await (supabaseAdmin as any)
      .from('model_prompt_templates')
      .insert({
        id: getCryptoUUID(),
        model_slug: modelSlug,
        model_name: model.label,
        template_name: templateName,
        template_content: templateContent,
        is_default: isDefault,
        is_active: false, // New templates are not active by default
        created_by: adminCheck.userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('❌ Error creating template:', insertError);
      throw new Error('Failed to create template');
    }

    return Response.json({
      success: true,
      data: {
        template: newTemplate
      },
      message: 'Template created successfully'
    });

  } catch (error) {
    console.error('❌ Admin templates POST error:', error);

    if (error instanceof z.ZodError) {
      return Response.json({
        success: false,
        error: {
          message: 'Invalid request data',
          type: 'validation_error',
          details: error.errors,
          code: 'INVALID_REQUEST'
        }
      }, { status: 400 });
    }

    return Response.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to create template',
        type: 'internal_error',
        code: 'TEMPLATE_CREATE_ERROR'
      }
    }, { status: 500 });
  }
}

/**
 * PUT /api/admin/templates - Activate template
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
    const validatedRequest: ActivateTemplateRequest = ActivateTemplateRequestSchema.parse(body);
    const { modelSlug, templateId } = validatedRequest;

    console.log('🎯 Activating template:', { modelSlug, templateId });

    // Verify template exists and belongs to the model
    const { data: template, error: templateError } = await (supabaseAdmin as any)
      .from('model_prompt_templates')
      .select('*')
      .eq('id', templateId)
      .eq('model_slug', modelSlug)
      .maybeSingle();

    if (templateError || !template) {
      return Response.json({
        success: false,
        error: {
          message: 'Template not found',
          type: 'not_found_error',
          code: 'TEMPLATE_NOT_FOUND'
        }
      }, { status: 404 });
    }

    // Deactivate all templates for this model first
    await (supabaseAdmin as any)
      .from('model_prompt_templates')
      .update({ is_active: false })
      .eq('model_slug', modelSlug)
      .eq('is_active', true);

    // Activate the selected template
    const { data: activatedTemplate, error: activateError } = await (supabaseAdmin as any)
      .from('model_prompt_templates')
      .update({
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .select('*')
      .single();

    if (activateError) {
      console.error('❌ Error activating template:', activateError);
      throw new Error('Failed to activate template');
    }

    return Response.json({
      success: true,
      data: {
        template: activatedTemplate
      },
      message: 'Template activated successfully'
    });

  } catch (error) {
    console.error('❌ Admin templates PUT error:', error);

    if (error instanceof z.ZodError) {
      return Response.json({
        success: false,
        error: {
          message: 'Invalid request data',
          type: 'validation_error',
          details: error.errors,
          code: 'INVALID_REQUEST'
        }
      }, { status: 400 });
    }

    return Response.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to activate template',
        type: 'internal_error',
        code: 'TEMPLATE_ACTIVATE_ERROR'
      }
    }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/templates - Delete custom template (default templates cannot be deleted)
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
    const templateId = searchParams.get('templateId');

    if (!templateId) {
      return Response.json({
        success: false,
        error: {
          message: 'Template ID is required',
          type: 'validation_error',
          code: 'MISSING_TEMPLATE_ID'
        }
      }, { status: 400 });
    }

    console.log('🗑️ Deleting template:', { templateId });

    // Verify template exists and is not a default template
    const { data: template, error: templateError } = await (supabaseAdmin as any)
      .from('model_prompt_templates')
      .select('*')
      .eq('id', templateId)
      .maybeSingle();

    if (templateError || !template) {
      return Response.json({
        success: false,
        error: {
          message: 'Template not found',
          type: 'not_found_error',
          code: 'TEMPLATE_NOT_FOUND'
        }
      }, { status: 404 });
    }

    if (template.is_default) {
      return Response.json({
        success: false,
        error: {
          message: 'Default templates cannot be deleted',
          type: 'validation_error',
          code: 'CANNOT_DELETE_DEFAULT'
        }
      }, { status: 400 });
    }

    // Delete the template
    const { error: deleteError } = await (supabaseAdmin as any)
      .from('model_prompt_templates')
      .delete()
      .eq('id', templateId);

    if (deleteError) {
      console.error('❌ Error deleting template:', deleteError);
      throw new Error('Failed to delete template');
    }

    // If deleted template was active, activate a default template for the model
    if (template.is_active) {
      const { data: defaultTemplate } = await (supabaseAdmin as any)
        .from('model_prompt_templates')
        .select('id')
        .eq('model_slug', template.model_slug)
        .eq('is_default', true)
        .maybeSingle();

      if (defaultTemplate) {
        await (supabaseAdmin as any)
          .from('model_prompt_templates')
          .update({
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', defaultTemplate.id);
      }
    }

    return Response.json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    console.error('❌ Admin templates DELETE error:', error);

    return Response.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to delete template',
        type: 'internal_error',
        code: 'TEMPLATE_DELETE_ERROR'
      }
    }, { status: 500 });
  }
}