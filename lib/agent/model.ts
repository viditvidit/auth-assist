import 'server-only';

import { ChatGoogle } from '@langchain/google/node';

export function createResearchModel() {
  const apiKey = process.env.GOOGLE_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim();

  if (!apiKey || !model) {
    const missing = [!apiKey && 'GOOGLE_API_KEY', !model && 'GEMINI_MODEL'].filter(Boolean);
    throw new Error(`Research model is not configured. Set ${missing.join(' and ')} on the server.`);
  }

  return new ChatGoogle({ apiKey, model, platformType: 'gai', maxRetries: 1 });
}
