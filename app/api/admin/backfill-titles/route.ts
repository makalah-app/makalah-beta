/* @ts-nocheck */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/database/supabase-client';
import { getDynamicModelConfig } from '../../../../src/lib/ai/dynamic-config';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export const maxDuration = 60;

function isDefaultLikeTitle(title?: string | null): boolean {
  const t = (title || '').trim();
  if (!t) return true;
  return (
    /^new(\s+academic)?\s+chat$/i.test(t) ||
    /^(untitled|new)$/i.test(t) ||
    /academic\s+chat/i.test(t) ||
    /^test\s+chat(\s+history)?$/i.test(t)
  );
}

/**
 * Sanitize and truncate title with smart word boundary logic
 * @param input - Raw title string to sanitize
 * @param maxLength - Maximum allowed length (default: 35 chars for UI consistency)
 * @returns Sanitized and truncated title with "..." if exceeded
 */
function sanitizeTitle(input: string, maxLength: number = 35): string {
  let s = (input || '').trim();
  // remove wrapping quotes
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith('\'') && s.endsWith('\''))) s = s.slice(1, -1).trim();
  // remove trailing punctuation
  s = s.replace(/[\s\-–—:;,.!?]+$/g, '').replace(/\s+/g, ' ').trim();
  // title case conservative
  s = s.split(' ').map(w => (w.length > 2 ? (w[0].toUpperCase() + w.slice(1)) : w.toLowerCase())).join(' ');
  if (/^test\s+chat(\s+history)?$/i.test(s)) return '';

  // Truncate title with ellipsis if too long (smart word boundary)
  if (s.length <= maxLength) return s;

  const truncated = s.substring(0, maxLength - 3); // Reserve 3 chars for "..."
  const lastSpace = truncated.lastIndexOf(' ');

  // If last space is near the end (within 8 chars), truncate at space to avoid breaking words
  if (lastSpace > maxLength - 11) {
    return truncated.substring(0, lastSpace).trim() + '...';
  }

  // Otherwise, hard truncate
  return truncated.trim() + '...';
}

async function buildSmartTitle(conversationId: string): Promise<string | null> {
  // Fetch up to 50 earliest messages for the conversation
  const { data: msgs } = await supabaseAdmin
    .from('chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('sequence_number', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(50);

  const userTexts: string[] = [];
  for (const m of msgs || []) {
    if ((m as any).role !== 'user') continue;
    const content = typeof (m as any).content === 'string' ? (m as any).content : ((m as any).parts || []).find((p: any) => p.type === 'text')?.text || '';
    const text = (content || '').trim();
    if (text) userTexts.push(text);
    if (userTexts.length >= 3) break;
  }
  if (userTexts.length === 0) return null;

  // 🔧 CRITICAL FIX: Force OpenAI provider and model for title generation
  // This function ALREADY hardcodes titleOpenAI (OpenAI instance),
  // so we MUST use OpenAI-compatible model names only.
  // Previous bug: Used OpenRouter model names when primaryProvider was OpenRouter,
  // causing API errors and routing to wrong provider.
  const envOpenAIKey = process.env.OPENAI_API_KEY;
  if (!envOpenAIKey) return null;

  const titleOpenAI = createOpenAI({ apiKey: envOpenAIKey });
  const dynamic = await getDynamicModelConfig();
  const titleModel = 'gpt-4o'; // Always use GPT-4o for title generation via OpenAI

  const result = await generateText({
    model: titleOpenAI(titleModel),
    prompt: [
      'Buat judul singkat dan spesifik (maksimal 35 karakter) dalam Bahasa Indonesia untuk percakapan akademik berikut.',
      'Syarat: Title Case, tanpa tanda kutip, tanpa titik di akhir, tanpa nomor.',
      'Fokus pada keyword utama. Maksimal 4-5 kata.',
      'Dasarkan pada 1-3 prompt awal user di bawah ini:',
      ...userTexts.map((t, i) => `${i + 1}. ${t}`),
      'Output hanya judulnya saja.'
    ].join('\n'),
    temperature: Math.min(0.5, Math.max(0.1, dynamic.config.temperature || 0.3)),
    maxOutputTokens: 48,
  });
  const raw = (result as any)?.text || '';
  const cleaned = sanitizeTitle(raw);
  return cleaned || null;
}

export async function POST(req: NextRequest) {
  try {
    // Optional lightweight auth via header
    const token = req.headers.get('x-admin-token') || '';
    const expected = process.env.BACKFILL_ADMIN_TOKEN || '';
    if (expected && token !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { limit = 200 } = await req.json().catch(() => ({ limit: 200 }));

    // Fetch conversations with default-like titles
    const { data: conversations, error } = await supabaseAdmin
      .from('conversations')
      .select('id,title,updated_at')
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);

    const targets = (conversations || []).filter(c => isDefaultLikeTitle((c as any).title));

    const results: any[] = [];
    for (const conv of targets) {
      try {
        let title = await buildSmartTitle((conv as any).id);
        if (title) {
          // Pre-insert validation: Ensure title doesn't exceed 35 chars (database constraint)
          if (title.length > 35) {
            console.warn(`[Backfill Titles] Generated title exceeds 35 chars (${title.length}), forcing truncation: "${title}"`);
            title = title.substring(0, 32).trim() + '...';
          }

          const { error: updateError } = await supabaseAdmin
            .from('conversations')
            // @ts-ignore - Supabase type inference issue with dynamic table updates
            .update({ title })
            .eq('id', (conv as any).id);
          if (updateError) throw updateError;
          results.push({ id: (conv as any).id, old: (conv as any).title, new: title, status: 'updated' });
        } else {
          results.push({ id: (conv as any).id, old: (conv as any).title, new: null, status: 'skipped_no_user_prompt' });
        }
      } catch (e) {
        results.push({ id: (conv as any).id, old: (conv as any).title, error: e instanceof Error ? e.message : String(e), status: 'error' });
      }
    }

    return NextResponse.json({
      totalChecked: conversations?.length || 0,
      defaultLike: targets.length,
      updated: results.filter(r => r.status === 'updated').length,
      skipped: results.filter(r => r.status === 'skipped_no_user_prompt').length,
      errors: results.filter(r => r.status === 'error').length,
      details: results,
      timestamp: Date.now()
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}

