/* @ts-nocheck */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/database/supabase-client';
import { generateSmartTitleFromPrompts } from '@/lib/ai/tools/smart-title-tool';
import { sanitizeTitle } from '@/lib/ai/utils/title-utils';

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

  const cachedSmartTitle = await generateSmartTitleFromPrompts(conversationId, userTexts);
  if (cachedSmartTitle) {
    return cachedSmartTitle;
  }

  const fallback = sanitizeTitle(userTexts[0] || '', { maxLength: 35 });
  return fallback || null;
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
