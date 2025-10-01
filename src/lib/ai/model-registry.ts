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
  // Google Gemini 2.5 (Only supported OpenRouter models)
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', recommended: true },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
];

export const OPENROUTER_MODEL_SLUGS: string[] = OPENROUTER_MODELS.map((m) => m.value);

