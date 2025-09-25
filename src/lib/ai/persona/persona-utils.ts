/**
 * Persona Utility Functions
 *
 * Helper functions untuk persona middleware berdasarkan AI SDK v5 patterns.
 * Extracted dari documentation examples untuk consistency.
 */

import type { LanguageModelV2CallOptions, LanguageModelV2Prompt } from '@ai-sdk/provider';

/**
 * Extract text from last user message dalam prompt array
 *
 * Based on: documentation/examples/ai-core/src/middleware/get-last-user-message-text.ts
 */
export function getLastUserMessageText({
  prompt,
}: {
  prompt: LanguageModelV2Prompt;
}): string | undefined {
  const lastMessage = prompt.at(-1);

  if (lastMessage?.role !== 'user') {
    return undefined;
  }

  return lastMessage.content.length === 0
    ? undefined
    : lastMessage.content
        .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
        .map(c => c.text)
        .join('\n');
}

/**
 * Add text to last user message dalam params
 *
 * Based on: documentation/examples/ai-core/src/middleware/add-to-last-user-message.ts
 */
export function addToLastUserMessage({
  text,
  params,
}: {
  text: string;
  params: LanguageModelV2CallOptions;
}): LanguageModelV2CallOptions {
  const { prompt, ...rest } = params;

  const lastMessage = prompt.at(-1);

  if (lastMessage?.role !== 'user') {
    return params; // No user message to modify
  }

  return {
    ...rest,
    prompt: [
      ...prompt.slice(0, -1),
      {
        ...lastMessage,
        content: [{ type: 'text', text }, ...lastMessage.content],
      },
    ],
  };
}

/**
 * Detect current academic phase from message content analysis
 *
 * Tries to determine fase akademik dari:
 * 1. Message content analysis
 * 2. Recent conversation patterns
 *
 * Note: experimental_context is not available in AI SDK v5 middleware
 */
export function detectPhaseFromContext(params: LanguageModelV2CallOptions): number | undefined {
  // Try to detect from recent conversation content
  const recentMessages = params.prompt.slice(-3); // Last 3 messages
  const conversationText = recentMessages
    .map(msg => {
      if (Array.isArray(msg.content)) {
        return msg.content
          .filter(c => c.type === 'text')
          .map(c => (c as { type: 'text'; text: string }).text)
          .join(' ');
      }
      return typeof msg.content === 'string' ? msg.content : '';
    })
    .join(' ')
    .toLowerCase();

  // Phase detection keywords
  const phaseKeywords: Record<number, string[]> = {
    1: ['klarifikasi', 'topik', 'tema', 'clarification', 'topic', 'penelitian awal', 'brainstorm'],
    2: ['literature', 'pustaka', 'sumber', 'referensi', 'research', 'studi', 'tinjauan'],
    3: ['kerangka', 'struktur', 'outline', 'framework', 'rancangan', 'desain'],
    4: ['konten', 'isi', 'development', 'pengembangan', 'penulisan', 'draft'],
    5: ['sitasi', 'citation', 'referensi', 'daftar pustaka', 'bibliography'],
    6: ['review', 'evaluasi', 'perbaikan', 'revision', 'quality', 'kualitas'],
    7: ['final', 'akhir', 'submission', 'format', 'polish', 'finalisasi']
  };

  // Score each phase based on keyword presence
  let bestPhase = 1;
  let bestScore = 0;

  for (const [phase, keywords] of Object.entries(phaseKeywords)) {
    const score = keywords.filter(keyword =>
      conversationText.includes(keyword)
    ).length;

    if (score > bestScore) {
      bestScore = score;
      bestPhase = parseInt(phase);
    }
  }

  // Return detected phase if we found relevant keywords
  return bestScore > 0 ? bestPhase : undefined;
}

/**
 * Check if message contains workflow transition signals
 *
 * Detects if user is asking to move to next phase atau continue workflow.
 */
export function detectWorkflowProgression(messageText: string): {
  isProgression: boolean;
  targetPhase?: number;
  signal?: string;
} {
  const lowerText = messageText.toLowerCase();

  // Direct phase transition signals
  const progressionSignals = [
    'lanjut', 'next', 'selanjutnya', 'fase berikutnya',
    'what\'s next', 'apa selanjutnya', 'sekarang apa',
    'langkah selanjutnya', 'fase selanjutnya'
  ];

  for (const signal of progressionSignals) {
    if (lowerText.includes(signal)) {
      return {
        isProgression: true,
        signal
      };
    }
  }

  // Phase number detection
  const phaseMatch = lowerText.match(/fase (\d+)|phase (\d+)/);
  if (phaseMatch) {
    const phaseNum = parseInt(phaseMatch[1] || phaseMatch[2]);
    if (phaseNum >= 1 && phaseNum <= 7) {
      return {
        isProgression: true,
        targetPhase: phaseNum,
        signal: `explicit phase ${phaseNum}`
      };
    }
  }

  return { isProgression: false };
}

/**
 * Extract academic context dari message content
 *
 * Useful untuk understanding research context dan providing relevant guidance.
 */
export function extractAcademicContext(messageText: string): {
  topic?: string;
  methodology?: string;
  fieldOfStudy?: string;
  language: 'id' | 'en';
} {
  const lowerText = messageText.toLowerCase();

  // Detect language
  const indonesianKeywords = ['dan', 'yang', 'adalah', 'dengan', 'untuk', 'dalam', 'pada'];
  const indonesianCount = indonesianKeywords.filter(word => lowerText.includes(word)).length;
  const language: 'id' | 'en' = indonesianCount >= 2 ? 'id' : 'en';

  // Extract potential topic (simple heuristic)
  const topicIndicators = [
    'tentang', 'about', 'mengenai', 'regarding',
    'topik', 'topic', 'tema', 'theme'
  ];

  let topic: string | undefined;
  for (const indicator of topicIndicators) {
    const index = lowerText.indexOf(indicator);
    if (index !== -1) {
      // Extract text after the indicator (next 50 chars)
      const afterIndicator = messageText.substring(index + indicator.length).trim();
      const words = afterIndicator.split(' ').slice(0, 8); // Max 8 words
      topic = words.join(' ');
      break;
    }
  }

  // Detect methodology keywords
  let methodology: string | undefined;
  const methodKeywords: Record<string, string[]> = {
    'qualitative': ['kualitatif', 'qualitative', 'wawancara', 'interview'],
    'quantitative': ['kuantitatif', 'quantitative', 'survei', 'survey', 'statistik'],
    'mixed-methods': ['mixed method', 'campuran', 'gabungan'],
    'experimental': ['eksperimen', 'experimental', 'rct'],
    'descriptive': ['deskriptif', 'descriptive', 'observasi']
  };

  for (const [method, keywords] of Object.entries(methodKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      methodology = method;
      break;
    }
  }

  // Basic field detection
  const fieldKeywords: Record<string, string[]> = {
    'psychology': ['psikologi', 'psychology', 'behavioral'],
    'education': ['pendidikan', 'education', 'pedagogi'],
    'medicine': ['kedokteran', 'medicine', 'medical', 'health'],
    'engineering': ['teknik', 'engineering', 'technology'],
    'business': ['bisnis', 'business', 'management', 'ekonomi'],
    'computer-science': ['komputer', 'computer', 'informatika', 'software']
  };

  let fieldOfStudy: string | undefined;
  for (const [field, keywords] of Object.entries(fieldKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      fieldOfStudy = field;
      break;
    }
  }

  return {
    topic,
    methodology,
    fieldOfStudy,
    language
  };
}