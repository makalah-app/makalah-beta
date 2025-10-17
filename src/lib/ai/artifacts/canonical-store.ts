import { supabaseAdmin } from '@/lib/database/supabase-client'

export interface CanonicalSection {
  key: string
  heading: string
  content: string
  status: 'draft' | 'review' | 'complete'
  updated_at: string
}

export interface CanonicalArtifact {
  id: string
  chat_id: string | null
  user_id: string
  artifact_type: string
  title: string
  phase: string | null
  status: string
  updated_at: string
  sections: CanonicalSection[]
}

export interface EnsureArtifactParams {
  userId: string
  chatId?: string
  artifactType?: string
  title?: string
}

export interface UpsertSectionParams {
  userId: string
  chatId: string
  sectionKey?: string
  heading: string
  content: string
  status?: 'draft' | 'review' | 'complete'
  artifactType?: string
}

function toSectionKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ') // strip HTML if any
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 64)
}

/**
 * CanonicalStore - persistence layer for artifacts & sections.
 * Server-side only: relies on supabaseAdmin (RLS bypass for internal ops).
 */
export class CanonicalStore {
  private readonly defaultType: string

  constructor(defaultType = 'academic-analysis') {
    this.defaultType = defaultType
  }

  /**
   * Load artifact and its sections by chatId (and optional type).
   * Returns null if not found.
   */
  async loadByChat(chatId: string, artifactType = this.defaultType): Promise<CanonicalArtifact | null> {
    const { data: artifact, error: aErr } = await (supabaseAdmin as any)
      .from('artifacts')
      .select('*')
      .eq('chat_id', chatId)
      .eq('artifact_type', artifactType)
      .maybeSingle()

    if (aErr) {
      // eslint-disable-next-line no-console
      console.error('[CanonicalStore] loadByChat: artifact error', aErr)
      return null
    }

    if (!artifact) return null

    const { data: sections, error: sErr } = await (supabaseAdmin as any)
      .from('artifact_sections')
      .select('section_key, heading, content, status, updated_at')
      .eq('artifact_id', artifact.id)
      .order('updated_at', { ascending: false })

    if (sErr) {
      // eslint-disable-next-line no-console
      console.error('[CanonicalStore] loadByChat: sections error', sErr)
      return {
        id: artifact.id,
        chat_id: artifact.chat_id,
        user_id: artifact.user_id,
        artifact_type: artifact.artifact_type,
        title: artifact.title,
        phase: artifact.phase,
        status: artifact.status,
        updated_at: artifact.updated_at,
        sections: [],
      }
    }

    const mapped: CanonicalSection[] = (sections || []).map((s: any) => ({
      key: s.section_key,
      heading: s.heading,
      content: s.content,
      status: s.status,
      updated_at: s.updated_at,
    }))

    return {
      id: artifact.id,
      chat_id: artifact.chat_id,
      user_id: artifact.user_id,
      artifact_type: artifact.artifact_type,
      title: artifact.title,
      phase: artifact.phase,
      status: artifact.status,
      updated_at: artifact.updated_at,
      sections: mapped,
    }
  }

  /**
   * Ensure an artifact row exists for user/chat/type. Creates one if absent.
   */
  async ensureArtifact(params: EnsureArtifactParams) {
    const artifactType = params.artifactType || this.defaultType

    if (!params.userId) throw new Error('ensureArtifact: userId required')

    if (params.chatId) {
      const { data: existing, error: eErr } = await (supabaseAdmin as any)
        .from('artifacts')
        .select('*')
        .eq('chat_id', params.chatId)
        .eq('artifact_type', artifactType)
        .maybeSingle()

      if (!eErr && existing) return existing
    }

    const insertPayload = {
      chat_id: params.chatId || null,
      user_id: params.userId,
      artifact_type: artifactType,
      title: params.title || 'Untitled Artifact',
      status: 'draft',
    }

    const { data: created, error: cErr } = await (supabaseAdmin as any)
      .from('artifacts')
      .insert(insertPayload)
      .select('*')
      .single()

    if (cErr) throw cErr
    return created
  }

  /**
   * Upsert a section atomically for a given chat. Creates artifact if needed.
   * Also writes a minimal snapshot to artifact_versions.
   */
  async upsertSectionByChat(params: UpsertSectionParams): Promise<{ artifactId: string; sectionId: string; version: number }> {
    const artifact = await this.ensureArtifact({
      userId: params.userId,
      chatId: params.chatId,
      artifactType: params.artifactType,
    })

    const sectionKey = params.sectionKey || toSectionKey(params.heading || 'section')

    const upsertPayload = {
      artifact_id: artifact.id,
      section_key: sectionKey,
      heading: params.heading,
      content: params.content,
      status: params.status || 'draft',
      updated_at: new Date().toISOString(),
    }

    const { data: sectionRows, error: sErr } = await (supabaseAdmin as any)
      .from('artifact_sections')
      .upsert(upsertPayload, { onConflict: 'artifact_id,section_key' })
      .select('id')

    if (sErr) throw sErr
    const sectionId = sectionRows?.[0]?.id as string

    const version = await this.createMinimalSectionSnapshot(artifact.id, {
      section_key: sectionKey,
      heading: params.heading,
      status: params.status || 'draft',
    })

    return { artifactId: artifact.id, sectionId, version }
  }

  private async createMinimalSectionSnapshot(artifactId: string, sectionMeta: { section_key: string; heading: string; status: string }): Promise<number> {
    const next = await this.nextVersion(artifactId)
    const snapshot = {
      type: 'section-update',
      at: new Date().toISOString(),
      ...sectionMeta,
    }

    const { error } = await (supabaseAdmin as any)
      .from('artifact_versions')
      .insert({
        artifact_id: artifactId,
        version: next,
        snapshot,
      })

    if (error) throw error
    return next
  }

  private async nextVersion(artifactId: string): Promise<number> {
    const { data, error } = await (supabaseAdmin as any)
      .from('artifact_versions')
      .select('version')
      .eq('artifact_id', artifactId)
      .order('version', { ascending: false })
      .limit(1)

    if (error) return 1
    const current = Array.isArray(data) && data.length ? Number(data[0].version) : 0
    return (current || 0) + 1
  }
}

export const canonicalStore = new CanonicalStore()

