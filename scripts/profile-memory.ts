/**
 * MEMORY PROFILING SCRIPT
 *
 * Controlled profiling untuk measure memory impact dari memory architecture.
 * Run dengan: NODE_OPTIONS="--expose-gc" npx tsx scripts/profile-memory.ts
 */

// Load environment variables from .env.local
import { config } from 'dotenv'
import path from 'path'
import fs from 'fs'
config({ path: path.resolve(process.cwd(), '.env.local') })

import { summarizeAndPersistWorkingMemory } from '@/lib/ai/memory/autosummarizer'
import { searchRelevantSections } from '@/lib/ai/retrieval/sections'
import type { UIMessage } from 'ai'

interface ProfilingResult {
  baseline: NodeJS.MemoryUsage
  afterAutosummary: NodeJS.MemoryUsage
  afterRetrieval: NodeJS.MemoryUsage
  delta: {
    autosummary: MemoryDelta
    retrieval: MemoryDelta
    total: MemoryDelta
  }
  timing: {
    autosummary: number
    retrieval: number
  }
}

interface MemoryDelta {
  heapUsed: number
  heapTotal: number
  external: number
  rss: number
}

function calculateDelta(before: NodeJS.MemoryUsage, after: NodeJS.MemoryUsage): MemoryDelta {
  return {
    heapUsed: (after.heapUsed - before.heapUsed) / 1024 / 1024,
    heapTotal: (after.heapTotal - before.heapTotal) / 1024 / 1024,
    external: (after.external - before.external) / 1024 / 1024,
    rss: (after.rss - before.rss) / 1024 / 1024,
  }
}

// Generate realistic conversation data
function generateMockConversation(turns: number): UIMessage[] {
  const messages: UIMessage[] = []

  for (let i = 0; i < turns; i++) {
    // User message
    messages.push({
      id: `user-${i}`,
      role: 'user',
      parts: [{
        type: 'text',
        text: `Saya ingin membahas tentang topik penelitian ${i + 1}. Bagaimana cara menganalisis data kualitatif dengan metode tematik? Saya punya dataset interview dengan 20 partisipan.`
      }],
      createdAt: new Date(Date.now() - (turns - i) * 60000),
    })

    // Assistant message
    messages.push({
      id: `assistant-${i}`,
      role: 'assistant',
      parts: [{
        type: 'text',
        text: `Untuk analisis data kualitatif dengan metode tematik, ada beberapa langkah sistematis yang perlu dilakukan:\n\n1. Familiarisasi dengan data - baca semua transkrip interview\n2. Generate kode awal dari data\n3. Identifikasi tema dari kode\n4. Review tema untuk konsistensi\n5. Definisikan dan beri nama tema\n6. Tulis laporan analisis\n\nDengan 20 partisipan, estimasi waktu analisis sekitar 40-60 jam kerja. Gunakan software seperti NVivo atau Atlas.ti untuk membantu coding.`
      }],
      createdAt: new Date(Date.now() - (turns - i - 0.5) * 60000),
    })
  }

  return messages
}

async function runProfile(options: {
  conversationTurns: number
  iterations: number
  chatId: string
  userId: string
}): Promise<ProfilingResult[]> {
  const results: ProfilingResult[] = []

  for (let i = 0; i < options.iterations; i++) {
    console.log(`\n[PROFILE] Iteration ${i + 1}/${options.iterations}`)

    // Force GC before measuring
    if (global.gc) {
      global.gc()
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    const baseline = process.memoryUsage()

    // Generate conversation
    const messages = generateMockConversation(options.conversationTurns)

    // Test 1: Autosummarizer
    const autoStart = Date.now()
    await summarizeAndPersistWorkingMemory({
      userId: options.userId,
      chatId: options.chatId,
      messages,
      model: 'gpt-4o-mini',
      tail: 12,
    })
    const autoTime = Date.now() - autoStart
    const afterAutosummary = process.memoryUsage()

    // Test 2: Retrieval (skip if no sections exist)
    let retrievalTime = 0
    let afterRetrieval = afterAutosummary
    try {
      const retrievalStart = Date.now()
      const lastUserMsg = messages.filter(m => m.role === 'user').slice(-1)[0]
      if (lastUserMsg?.parts?.[0]?.type === 'text') {
        await searchRelevantSections({
          chatId: options.chatId,
          query: lastUserMsg.parts[0].text,
          limit: 2,
        })
      }
      retrievalTime = Date.now() - retrievalStart
      afterRetrieval = process.memoryUsage()
    } catch (e) {
      console.warn('  [Retrieval skipped - no sections in DB]')
    }

    results.push({
      baseline,
      afterAutosummary,
      afterRetrieval,
      delta: {
        autosummary: calculateDelta(baseline, afterAutosummary),
        retrieval: calculateDelta(afterAutosummary, afterRetrieval),
        total: calculateDelta(baseline, afterRetrieval),
      },
      timing: {
        autosummary: autoTime,
        retrieval: retrievalTime,
      },
    })

    console.log(`  Autosummary: ${autoTime}ms, Δheap: ${results[i].delta.autosummary.heapUsed.toFixed(2)}MB`)
    console.log(`  Retrieval: ${retrievalTime}ms, Δheap: ${results[i].delta.retrieval.heapUsed.toFixed(2)}MB`)
  }

  return results
}

function analyzeResults(results: ProfilingResult[]) {
  const n = results.length

  const avgAutosummaryHeap = results.reduce((sum, r) => sum + r.delta.autosummary.heapUsed, 0) / n
  const avgRetrievalHeap = results.reduce((sum, r) => sum + r.delta.retrieval.heapUsed, 0) / n
  const avgTotalHeap = results.reduce((sum, r) => sum + r.delta.total.heapUsed, 0) / n

  const avgAutosummaryTime = results.reduce((sum, r) => sum + r.timing.autosummary, 0) / n
  const avgRetrievalTime = results.reduce((sum, r) => sum + r.timing.retrieval, 0) / n

  const maxAutosummaryHeap = Math.max(...results.map(r => r.delta.autosummary.heapUsed))
  const maxRetrievalHeap = Math.max(...results.map(r => r.delta.retrieval.heapUsed))
  const maxTotalHeap = Math.max(...results.map(r => r.delta.total.heapUsed))

  return {
    averages: {
      autosummaryHeapMB: avgAutosummaryHeap.toFixed(2),
      retrievalHeapMB: avgRetrievalHeap.toFixed(2),
      totalHeapMB: avgTotalHeap.toFixed(2),
      autosummaryTimeMs: avgAutosummaryTime.toFixed(2),
      retrievalTimeMs: avgRetrievalTime.toFixed(2),
    },
    peaks: {
      autosummaryHeapMB: maxAutosummaryHeap.toFixed(2),
      retrievalHeapMB: maxRetrievalHeap.toFixed(2),
      totalHeapMB: maxTotalHeap.toFixed(2),
    },
    threshold: {
      autosummaryWithin10MB: maxAutosummaryHeap < 10,
      retrievalWithin5MB: maxRetrievalHeap < 5,
      totalWithin10Percent: avgTotalHeap < 10,
    },
  }
}

async function main() {
  console.log('🔬 Memory Profiling - Makalah AI Memory Architecture\n')
  console.log('Node version:', process.version)
  console.log('Platform:', process.platform, process.arch)
  console.log('')

  // Test scenarios
  const scenarios = [
    { name: 'Short conversation (2 turns)', turns: 2, iterations: 5 },
    { name: 'Medium conversation (6 turns)', turns: 6, iterations: 5 },
    { name: 'Long conversation (12 turns)', turns: 12, iterations: 5 },
  ]

  const allResults: Record<string, any> = {}

  for (const scenario of scenarios) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`SCENARIO: ${scenario.name}`)
    console.log('='.repeat(60))

    // Generate proper UUID for chatId (PostgreSQL UUID format required)
    const chatId = `00000000-${Date.now().toString(16).padStart(12, '0').slice(0, 4)}-4000-8000-${Date.now().toString(16).padStart(12, '0').slice(-12)}`

    const results = await runProfile({
      conversationTurns: scenario.turns,
      iterations: scenario.iterations,
      chatId,
      userId: '00000000-0000-4000-8000-000000000000',
    })

    const analysis = analyzeResults(results)
    allResults[scenario.name] = analysis

    console.log('\n📊 ANALYSIS:')
    console.log(JSON.stringify(analysis, null, 2))

    // Threshold warnings
    if (!analysis.threshold.autosummaryWithin10MB) {
      console.warn(`⚠️  WARNING: Autosummary peak heap (${analysis.peaks.autosummaryHeapMB}MB) exceeds 10MB threshold`)
    }
    if (!analysis.threshold.retrievalWithin5MB) {
      console.warn(`⚠️  WARNING: Retrieval peak heap (${analysis.peaks.retrievalHeapMB}MB) exceeds 5MB threshold`)
    }
    if (!analysis.threshold.totalWithin10Percent) {
      console.warn(`⚠️  WARNING: Total average heap (${analysis.averages.totalHeapMB}MB) exceeds 10MB threshold`)
    }
  }

  // Save report
  const reportPath = path.join(process.cwd(), 'profile-report.json')
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    scenarios: allResults,
  }, null, 2))

  console.log(`\n✅ Report saved to: ${reportPath}`)

  // Summary verdict
  const allPassed = Object.values(allResults).every((r: any) =>
    r.threshold.autosummaryWithin10MB &&
    r.threshold.retrievalWithin5MB &&
    r.threshold.totalWithin10Percent
  )

  if (allPassed) {
    console.log('\n✅ VERDICT: All scenarios PASSED memory thresholds')
  } else {
    console.log('\n❌ VERDICT: Some scenarios EXCEEDED memory thresholds')
  }
}

// Run with: NODE_OPTIONS="--expose-gc" tsx scripts/profile-memory.ts
main().catch(err => {
  console.error('❌ Profiling failed:', err)
  process.exit(1)
})
