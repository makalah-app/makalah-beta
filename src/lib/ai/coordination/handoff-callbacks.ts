import type { AgentRunContext } from '@ai-sdk-tools/agents';
import { supabaseAdmin } from '@/lib/database/supabase-client';
import { canonicalStore } from '@/lib/ai/artifacts/canonical-store';

function wordCountFromHtml(content: string): number {
  if (!content) return 0;
  const text = content.replace(/<[^>]*>/g, ' ').trim();
  if (!text) return 0;
  return text.split(/\s+/g).filter(Boolean).length;
}

export async function onArtifactWriterComplete(runContext: AgentRunContext<any>) {
  try {
    const chatId = (runContext as any)?.context?.chatId as string | undefined;
    if (!chatId) return;

    // Load latest artifact for this chat (default type)
    const artifact = await canonicalStore.loadByChat(chatId);
    if (!artifact) return;

    const totalWords = (artifact.sections || []).reduce((sum, s) => sum + wordCountFromHtml(s.content || ''), 0);

    // Merge into conversations.metadata
    const { data: conv } = await (supabaseAdmin as any)
      .from('conversations')
      .select('id, metadata')
      .eq('id', chatId)
      .single();

    const baseMeta = (conv && typeof conv.metadata === 'object') ? conv.metadata : {};

    await (supabaseAdmin as any)
      .from('conversations')
      .update({
        metadata: {
          ...baseMeta,
          last_artifact_id: artifact.id,
          last_artifact_word_count: totalWords,
          last_artifact_updated_at: artifact.updated_at,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', chatId);
  } catch (err) {
    // Silent: tidak memutus stream kalau metadata gagal diupdate
  }
}

