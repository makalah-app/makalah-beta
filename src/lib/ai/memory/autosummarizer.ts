import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import type { UIMessage } from 'ai'
import { supabaseMemoryProvider } from '@/lib/ai/memory/supabase-memory-provider'

export interface AutosummarizeParams {
  userId?: string
  chatId?: string
  messages: UIMessage[]
  model?: string
  tail?: number
}

// Simple in-memory cache for recent summaries (2-minute TTL)
interface CacheEntry {
  summary: string
  contentHash: string
  timestamp: number
}

const summaryCache = new Map<string, CacheEntry>()
const CACHE_TTL = 2 * 60 * 1000 // 2 minutes

function hashContent(messages: UIMessage[]): string {
  // Simple hash: concat last 3 message IDs + content length
  const tail3 = messages.slice(-3)
  return tail3.map(m => `${m.id}:${JSON.stringify(m.parts).length}`).join('|')
}

function getCachedSummary(chatId: string, contentHash: string): string | null {
  const cached = summaryCache.get(chatId)
  if (!cached) return null

  const age = Date.now() - cached.timestamp
  if (age > CACHE_TTL || cached.contentHash !== contentHash) {
    summaryCache.delete(chatId)
    return null
  }

  return cached.summary
}

function setCachedSummary(chatId: string, summary: string, contentHash: string) {
  summaryCache.set(chatId, {
    summary,
    contentHash,
    timestamp: Date.now(),
  })

  // Auto-cleanup: keep cache size <100 entries
  if (summaryCache.size > 100) {
    const oldest = Array.from(summaryCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)[0]
    if (oldest) summaryCache.delete(oldest[0])
  }
}

function pickTail(messages: UIMessage[], n: number) {
  if (!Array.isArray(messages) || messages.length === 0) return [] as UIMessage[]
  return messages.slice(-Math.max(1, n))
}

function toPlain(messages: UIMessage[]): string {
  const lines: string[] = []
  for (const m of messages) {
    const role = m.role || 'user'
    const text = (m.content || '') as string
    if (!text) continue
    lines.push(`${role.toUpperCase()}: ${text}`)
  }
  return lines.join('\n')
}

export async function summarizeAndPersistWorkingMemory(params: AutosummarizeParams) {
  const { userId, chatId } = params
  if (!chatId) return { skipped: true, reason: 'no_chat_id' }

  const tailCount = params.tail ?? 12
  const recent = pickTail(params.messages, tailCount)

  // ✅ OPTIMIZATION: Skip if conversation too short or simple
  if (recent.length < 6) {
    // Require ≥3 turns (6 messages) before summarizing
    // Rationale: Short conversations don't need summaries yet
    return { skipped: true, reason: 'conversation_too_short' }
  }

  // ✅ OPTIMIZATION: Skip if total content is minimal (< 200 chars)
  const totalLength = recent.reduce((sum, m) => {
    const text = m.parts?.map(p => (p as any).text || '').join('') || ''
    return sum + text.length
  }, 0)
  if (totalLength < 200) {
    return { skipped: true, reason: 'content_too_minimal' }
  }

  // ✅ OPTIMIZATION: Check cache before calling OpenAI API
  const contentHash = hashContent(recent)
  const cachedSummary = getCachedSummary(chatId, contentHash)
  if (cachedSummary) {
    // Cache hit - skip API call, persist cached result
    await supabaseMemoryProvider.updateWorkingMemory({
      scope: 'chat',
      chatId,
      userId,
      content: cachedSummary,
    })
    return { cached: true, length: cachedSummary.length, took: 0 }
  }

  // Load existing summary (if any)
  const existing = await supabaseMemoryProvider.getWorkingMemory({
    scope: 'chat',
    chatId,
    userId,
  })

  const prompt = `Ringkas percakapan menjadi working memory singkat (<200 token) dalam Bahasa Indonesia baku.
Fokus: tujuan, keputusan, preferensi, TODO. Bullet maksimal 5 butir.

Ringkasan lama:\n${existing?.content || '(tidak ada)'}

Transkrip (${recent.length} msg):\n${toPlain(recent)}
`

  try {
    const started = Date.now()
    const modelName = params.model || 'gpt-4o-mini'
    const { text } = await generateText({
      model: openai(modelName),
      prompt,
      temperature: 0.2,
      maxTokens: 250, // Reduced from 500 (actual usage ~20-40 tokens)
    })

    const summary = text.trim()
    if (!summary) return { skipped: true, reason: 'empty_summary' }

    await supabaseMemoryProvider.updateWorkingMemory({
      scope: 'chat',
      chatId,
      userId,
      content: summary,
    })

    // ✅ OPTIMIZATION: Cache result for future requests
    setCachedSummary(chatId, summary, contentHash)

    const took = Date.now() - started
    // eslint-disable-next-line no-console
    console.log(`[autosummarizer] updated working_memory for chat=${chatId} len=${summary.length} took=${took}ms`)
    return { updated: true, length: summary.length, took }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[autosummarizer] failed:', err)
    return { error: true }
  }
}
