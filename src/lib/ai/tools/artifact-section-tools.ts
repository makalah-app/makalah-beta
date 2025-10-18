import { tool } from 'ai'
import { z } from 'zod'
import { getContext as getArtifactContext } from '@/lib/ai/tools/artifact-context'
import { canonicalStore } from '@/lib/ai/artifacts/canonical-store'
import { supabaseAdmin } from '@/lib/database/supabase-client'

type Ctx = { userId: string; chatId?: string }

function getCtx(options?: any): Ctx {
  const agentCtx = (options?.experimental_context || {}) as Partial<Ctx>
  const runtimeCtx = getArtifactContext()
  const userId = agentCtx.userId || runtimeCtx?.userId
  const chatId = agentCtx.chatId || runtimeCtx?.sessionId
  if (!userId) throw new Error('Artifact context missing userId')
  return { userId, chatId }
}

// ────────────────────────────────────────────────────────────────────────────────
// listArtifactSections
// ────────────────────────────────────────────────────────────────────────────────
export const listArtifactSections = tool({
  description: 'List section metadata untuk artefak aktif (tanpa konten).',
  inputSchema: z.object({
    chatId: z.string().uuid().optional(),
    artifactType: z.string().optional(),
  }),
  execute: async (input, options) => {
    const { userId, chatId: ctxChat } = getCtx(options)
    const chatId = input.chatId || ctxChat
    if (!chatId) throw new Error('chatId diperlukan untuk listArtifactSections')

    const artifact = await canonicalStore.loadByChat(chatId, input.artifactType)
    if (!artifact) return { sections: [] as Array<{ key: string; heading: string; status: string; updated_at: string }> }

    const sections = artifact.sections.map((s) => ({
      key: s.key,
      heading: s.heading,
      status: s.status,
      updated_at: s.updated_at,
    }))
    return { sections }
  },
})

// ────────────────────────────────────────────────────────────────────────────────
// getArtifactSection
// ────────────────────────────────────────────────────────────────────────────────
export const getArtifactSection = tool({
  description: 'Ambil satu section lengkap (dengan konten).',
  inputSchema: z.object({
    chatId: z.string().uuid().optional(),
    artifactType: z.string().optional(),
    sectionKey: z.string().min(1),
  }),
  execute: async (input, options) => {
    const { chatId: ctxChat } = getCtx(options)
    const chatId = input.chatId || ctxChat
    if (!chatId) throw new Error('chatId diperlukan untuk getArtifactSection')

    const artifact = await canonicalStore.loadByChat(chatId, input.artifactType)
    if (!artifact) return { section: null }
    const found = artifact.sections.find((s) => s.key === input.sectionKey)
    return { section: found || null }
  },
})

// ────────────────────────────────────────────────────────────────────────────────
// updateArtifactSection (atomik + log perubahan)
// ────────────────────────────────────────────────────────────────────────────────
export const updateArtifactSection = tool({
  description:
    'Update/insert satu section (atomik) berdasarkan chat. Melakukan snapshot versi minimal dan mencatat perubahan.',
  inputSchema: z.object({
    chatId: z.string().uuid().optional(),
    artifactType: z.string().optional(),
    sectionKey: z.string().optional(),
    heading: z.string().min(1).optional(),
    content: z.string().min(1),
    status: z.enum(['draft', 'review', 'complete']).optional(),
  }).refine((v) => Boolean(v.sectionKey || v.heading), {
    message: 'Minimal salah satu: sectionKey atau heading harus diisi',
    path: ['sectionKey'],
  }),
  execute: async (input, options) => {
    const { userId, chatId: ctxChat } = getCtx(options)
    const chatId = input.chatId || ctxChat
    if (!chatId) throw new Error('chatId diperlukan untuk updateArtifactSection')

    const heading = input.heading || input.sectionKey!

    const { artifactId, sectionId, version } = await canonicalStore.upsertSectionByChat({
      userId,
      chatId,
      sectionKey: input.sectionKey,
      heading,
      content: input.content,
      status: input.status || 'draft',
      artifactType: input.artifactType,
    })

    // Log perubahan ke artifact_changes
    await (supabaseAdmin as any)
      .from('artifact_changes')
      .insert({
        artifact_id: artifactId,
        user_id: userId,
        change_type: 'update_section',
        payload: {
          section_id: sectionId,
          section_key: input.sectionKey || null,
          heading,
          version,
          size: input.content.length,
          status: input.status || 'draft',
        },
      })

    // Lightweight observability
    try {
      // eslint-disable-next-line no-console
      console.log('[artifact:upsertSection]', {
        chatId,
        userId,
        artifactId,
        sectionId,
        version,
        heading,
        sectionKey: input.sectionKey || null,
        size: input.content.length,
      })
    } catch {}

    return { artifactId, sectionId, version }
  },
})

// ────────────────────────────────────────────────────────────────────────────────
// logArtifactChange (general-purpose)
// ────────────────────────────────────────────────────────────────────────────────
export const logArtifactChange = tool({
  description: 'Catat perubahan arbitrar terkait artefak aktif.',
  inputSchema: z.object({
    chatId: z.string().uuid().optional(),
    artifactType: z.string().optional(),
    changeType: z.string().min(1),
    payload: z.any(),
  }),
  execute: async (input, options) => {
    const { userId, chatId: ctxChat } = getCtx(options)
    const chatId = input.chatId || ctxChat
    if (!chatId) throw new Error('chatId diperlukan untuk logArtifactChange')

    const artifact = await canonicalStore.ensureArtifact({
      userId,
      chatId,
      artifactType: input.artifactType,
    })

    const { error } = await (supabaseAdmin as any)
      .from('artifact_changes')
      .insert({
        artifact_id: artifact.id,
        user_id: userId,
        change_type: input.changeType,
        payload: input.payload,
      })

    if (error) throw error
    return { artifactId: artifact.id, changeType: input.changeType }
  },
})
