import type { ResearchInput, Source } from '@/lib/agent/schema';
export { audiences, type Audience } from '@/lib/agent/schema';
export type Scenario = ResearchInput;
export type ChatMessage = { id: string; role: 'user' | 'assistant'; text: string; sources?: Source[] };
