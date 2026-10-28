import 'server-only';

import { ChatGoogle } from '@langchain/google/node';

export function createResearchModel(userKey?: string) {
  const apiKey = userKey?.trim() || process.env.GOOGLE_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim();

  if (!apiKey || !model) {
    const missing = [!apiKey && 'GOOGLE_API_KEY', !model && 'GEMINI_MODEL'].filter(Boolean);
    throw new Error(`Research model is not configured. Set ${missing.join(' and ')} on the server.`);
  }

  return new ChatGoogle({ apiKey, model, platformType: 'gai', maxRetries: 1 });
}

export function getSearchApiKey(userKey?: string) {
  const apiKey = userKey?.trim() || process.env.PERPLEXITY_API_KEY?.trim();
  if (!apiKey) throw new Error('Research search is not configured. Set PERPLEXITY_API_KEY on the server.');
  return apiKey;
}

export function geminiError(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const value = error as { status?: unknown; statusCode?: unknown; code?: unknown; message?: unknown; cause?: unknown };
  const status = Number(value.status ?? value.statusCode ?? value.code);
  const message = typeof value.message === 'string' ? value.message : '';
  if (status === 401 || status === 403 || /API_KEY_INVALID|API key not valid/i.test(message))
    return 'Gemini rejected the API key or access. Check the key and model access in Google AI Studio.';
  if (status === 429 || /RESOURCE_EXHAUSTED/i.test(message))
    return 'Gemini quota or rate limit reached. Wait and retry, or check your AI Studio quota and billing.';
  if (status === 404) return 'The configured Gemini model is unavailable for this API key. Check GEMINI_MODEL.';
  if (status >= 500 && status <= 599) return 'Gemini is temporarily unavailable. Please try again.';
  return value.cause && value.cause !== error ? geminiError(value.cause) : null;
}
