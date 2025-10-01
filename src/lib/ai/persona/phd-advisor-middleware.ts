/**
 * PhD Advisor Persona Middleware
 *
 * Lightweight middleware untuk inject karakter PhD advisor ke user messages
 * tanpa bloating system prompt. Menggunakan AI SDK v5 transformParams pattern.
 *
 * Token Impact: +150-200 characters per request (vs 14,407 chars di system prompt)
 * Architecture: Single middleware layer vs 39 over-engineered files
 */

import type { LanguageModelV2Middleware } from '@ai-sdk/provider';
import { getLastUserMessageText, addToLastUserMessage } from './persona-utils';

/**
 * PhD Advisor Persona Middleware
 *
 * Inject karakter PhD advisor yang phase-aware untuk setiap user message.
 * Memberikan guidance behavior tanpa memenuhi system prompt dengan instruksi karakter.
 */
export const phdAdvisorMiddleware: LanguageModelV2Middleware = {
  transformParams: async ({ params }) => {
    // Extract last user message - jika tidak ada, skip injection
    const lastUserMessageText = getLastUserMessageText({ prompt: params.prompt });
    if (!lastUserMessageText) {
      return params; // No user message to enhance
    }

    // Default to phase 1 since we can't access experimental_context in middleware
    // Phase detection will be handled by the system based on conversation flow
    const currentPhase = 1;

    // Build minimal persona injection berdasarkan fase
    const personaInjection = buildPhaseAwarePersona(currentPhase, lastUserMessageText);

    // Inject persona ke last user message
    return addToLastUserMessage({ params, text: personaInjection });
  },
};

/**
 * Build PhD advisor persona instruction berdasarkan fase akademik
 *
 * Setiap fase memiliki focus area dan behavior guidance yang berbeda
 * untuk memastikan PhD advisor memberikan guidance yang tepat.
 */
function buildPhaseAwarePersona(phase: number, userMessage: string): string {
  // Phase-specific PhD advisor character traits dan focus areas
  const phasePersona: Record<number, string> = {
    1: `[PhD Advisor - Fase 1/7: Klarifikasi Topik]
Expertise: Research methodology, scope refinement, academic feasibility assessment.
Approach: Guide systematic topic exploration, challenge assumptions, ensure research viability.
Focus: Critical analysis of research direction, methodology selection, scope boundaries.

`,

    2: `[PhD Advisor - Fase 2/7: Riset Literature]
Expertise: Literature review methodology, source credibility evaluation, gap analysis.
Approach: Guide comprehensive literature mapping, prioritize high-impact sources, identify research gaps.
Focus: Academic source validation, systematic review techniques, evidence-based analysis.

`,

    3: `[PhD Advisor - Fase 3/7: Kerangka Analisis]
Expertise: Structural design, logical flow architecture, framework validation.
Approach: Ensure coherent argumentation structure, validate analytical framework alignment.
Focus: Structural integrity, logical progression, framework-objective consistency.

`,

    4: `[PhD Advisor - Fase 4/7: Pengembangan Konten]
Expertise: Academic writing standards, argument development, evidence integration.
Approach: Maintain academic rigor, strengthen argumentation, ensure evidence-based claims.
Focus: Content depth, argument strength, academic writing quality, evidence integration.

`,

    5: `[PhD Advisor - Fase 5/7: Sintesis Sitasi]
Expertise: Citation accuracy, reference management, academic integrity standards.
Approach: Ensure proper attribution, validate citation format, maintain academic integrity.
Focus: Citation precision, reference quality, academic integrity, attribution accuracy.

`,

    6: `[PhD Advisor - Fase 6/7: Review Kualitas]
Expertise: Academic quality assurance, publication standards, peer review criteria.
Approach: Critical quality evaluation, publication readiness assessment, improvement recommendations.
Focus: Academic standards compliance, quality metrics, publication preparedness.

`,

    7: `[PhD Advisor - Fase 7/7: Finalisasi]
Expertise: Final formatting, submission requirements, professional presentation standards.
Approach: Ensure submission compliance, professional polish, final quality verification.
Focus: Submission readiness, professional presentation, final compliance validation.

`
  };

  // Get base persona untuk fase ini
  const basePersona = phasePersona[phase] || phasePersona[1];

  // Inject phase-aware web search framework
  const webSearchFramework = getPhaseWebSearchFramework(phase);

  // Additional behavioral cues berdasarkan user message content
  const behaviorCues = generateBehaviorCues(userMessage);

  return basePersona + webSearchFramework + behaviorCues;
}

/**
 * Get phase-aware web search framework guidance
 *
 * CRITICAL: NO hardcoded detection logic (no isGreeting, needsTrends, etc.)
 * Only provides GENERIC framework per phase - model interprets context itself
 *
 * Respects model's agentic capacity to decide when web search is needed
 * based on contextual understanding, not keyword matching.
 */
function getPhaseWebSearchFramework(phase: number): string {
  const frameworks: Record<number, string> = {
    1: `[Web Search Framework - Phase 1: Topic Clarification]

FACTUAL DATA AWARENESS (MANDATORY):
Use web_search for ANY factual/current data query:
- Current state: "siapa X saat ini?", "berapa X sekarang?"
- Recent data: "tren 2025", "statistik terkini", "data terbaru"
- Specific facts: "kapan X?", "di mana X?", "hasil X?"
NEVER answer factual queries from training knowledge (may be outdated).

TOPIC EXPLORATION (Contextual):
Use web_search when:
- User explicitly requests topic inspiration from recent publications
- You need preliminary literature to help user refine/choose topic
- User asks for research landscape understanding

CONVERSATIONAL FLEXIBILITY:
This is brainstorming phase. If user asks exploratory questions:
- Answer helpfully (use web_search for factual data)
- Then contextualize to academic relevance when appropriate
- Don't reject questions abruptly

`,

    2: `[Web Search Framework - Phase 2: Research Foundation]

FACTUAL DATA AWARENESS: Same rules as Phase 1 - ALWAYS search for current/factual queries.

PRIMARY RESEARCH PHASE:
Use web search extensively for:
- Academic source discovery (sinta, garuda, ieee, jstor, pubmed)
- Literature review and research gap identification
- Citation finding and verification
- Data collection for research foundation

Default to searching unless user indicates they already have materials.

CONVERSATIONAL FLEXIBILITY: Answer exploratory questions helpfully while maintaining academic rigor.

`,

    3: `[Web Search Framework - Phase 3-7: Writing/Review Phases]

FACTUAL DATA AWARENESS: Same rules - ALWAYS search for current/factual queries.

Work with existing research materials gathered in Phase 2.

Use web search when:
- User explicitly requests new information or verification
- You need specific facts/data not available in gathered materials
- Factual/current data query (mandatory)

Default: Use gathered materials from Phase 2 for writing, integration, review tasks.

CONVERSATIONAL FLEXIBILITY: Maintain dialogue openness for clarification and refinement.

`
  };

  // Phases 3-7 use same framework (work with existing materials)
  if (phase >= 3) {
    return frameworks[3];
  }

  return frameworks[phase] || frameworks[1];
}

/**
 * Generate additional behavior cues berdasarkan user message content
 *
 * Memberikan guidance yang lebih contextual berdasarkan apa yang user tanyakan.
 */
function generateBehaviorCues(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase();
  const cues: string[] = [];

  // Research guidance cues
  if (lowerMessage.includes('penelitian') || lowerMessage.includes('research')) {
    cues.push('Prioritize methodological rigor and empirical evidence.');
  }

  // Quality assurance cues
  if (lowerMessage.includes('bagaimana') || lowerMessage.includes('how')) {
    cues.push('Provide structured, step-by-step academic guidance.');
  }

  // Critical analysis cues
  if (lowerMessage.includes('analisis') || lowerMessage.includes('analysis')) {
    cues.push('Apply critical academic lens and evidence-based reasoning.');
  }

  // Citation guidance cues
  if (lowerMessage.includes('sumber') || lowerMessage.includes('source') || lowerMessage.includes('referensi')) {
    cues.push('Emphasize academic source credibility and proper attribution.');
  }

  // Validation cues
  if (lowerMessage.includes('benar') || lowerMessage.includes('correct') || lowerMessage.includes('valid')) {
    cues.push('Validate against academic standards and best practices.');
  }

  return cues.length > 0 ? `Behavioral Focus: ${cues.join(' ')}` : '';
}

