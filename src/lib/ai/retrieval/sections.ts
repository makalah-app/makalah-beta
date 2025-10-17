import { supabaseAdmin } from '@/lib/database/supabase-client'

export interface SearchSectionsParams {
  chatId: string
  query: string
  artifactType?: string
  limit?: number
}

export async function searchRelevantSections(params: SearchSectionsParams) {
  const { chatId, query } = params
  if (!chatId || !query || query.trim().length < 3) return [] as Array<{ key: string; heading: string; content: string }>

  const artifactType = params.artifactType || 'academic-analysis'
  const limit = Math.max(1, Math.min(params.limit || 3, 5))

  const { data, error } = await (supabaseAdmin as any).rpc('search_sections_by_chat', {
    p_chat_id: chatId,
    p_artifact_type: artifactType,
    p_query: query,
    p_limit: limit,
  })

  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[retrieval] search_sections_by_chat error', error)
    return []
  }

  return (data || []).map((row: any) => ({
    key: row.section_key,
    heading: row.heading,
    content: row.content,
  }))
}

export function buildRetrievalPreface(results: Array<{ heading: string; content: string }>, maxChars = 800) {
  if (!results.length) return ''
  const take = results.slice(0, 2)
  const parts = take.map((r, i) => {
    const body = (r.content || '').replace(/\s+/g, ' ').slice(0, Math.floor(maxChars / take.length))
    return `(${i + 1}) ${r.heading}\n${body}`
  })
  return `CATATAN KONTEN RELEVAN (FTS)\nGunakan potongan berikut untuk mempertahankan konsistensi isi saat revisi. Jangan tempel seluruh konten ke jawaban.\n\n${parts.join('\n\n')}`
}

