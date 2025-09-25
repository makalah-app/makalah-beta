/**
 * OpenRouter Model Registry (Source of Truth)
 * Gunakan daftar ini untuk sinkron label UI dan slug model di API/runtime.
 */

export type OpenRouterModel = {
  value: string; // slug resmi OpenRouter
  label: string; // nama tampil di UI
  recommended?: boolean;
};

export const OPENROUTER_MODELS: OpenRouterModel[] = [
  // Kimi (Moonshot)
  { value: 'moonshotai/kimi-k2-0905', label: 'Kimi K2 (0905)', recommended: true },
  { value: 'moonshotai/kimi-k2', label: 'Kimi K2' },
  { value: 'moonshotai/kimi-dev-72b', label: 'Kimi Dev 72B' },

  // DeepSeek
  { value: 'deepseek/deepseek-r1', label: 'DeepSeek R1', recommended: true },
  { value: 'deepseek/deepseek-chat-v3.1', label: 'DeepSeek Chat v3.1' },

  // Google Gemini 2.5
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
];

export const OPENROUTER_MODEL_SLUGS: string[] = OPENROUTER_MODELS.map((m) => m.value);

