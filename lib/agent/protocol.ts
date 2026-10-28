import { z } from 'zod';
import { researchInputSchema, type Guide, type Source } from './schema';

export const conversationSchema = z
  .array(
    z.object({
      role: z.enum(['user', 'assistant']),
      text: z.string().trim().min(1).max(4000),
    }),
  )
  .max(20);
export type Conversation = z.infer<typeof conversationSchema>;

export const researchRequestSchema = z
  .object({
    scenario: researchInputSchema,
    conversation: conversationSchema.default([]),
    context: z.string().max(900_000).optional(),
    apiKeys: z.object({ gemini: z.string().trim().max(512), perplexity: z.string().trim().max(512) }).optional(),
  })
  .strict();

export type ResearchEvent =
  | { type: 'started' }
  | { type: 'activity'; tool: 'searchWeb' | 'readPage'; status: 'started' | 'completed' | 'failed'; input: string }
  | { type: 'assistant'; text: string; sources: Source[] }
  | {
      type: 'guide';
      status: 'complete' | 'partial';
      guide: Guide;
      partialReasons?: string[];
      guideId: string;
      context: string;
    }
  | { type: 'clarification'; text: string; context: string }
  | { type: 'error'; message: string; context?: string }
  | { type: 'cancelled' };
