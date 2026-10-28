import { z } from 'zod';
import { guideSchema, researchInputSchema, sourceSchema } from './agent/schema';
import type { Scenario } from './workspace-types';

const guideResultSchema = z.object({
  guide: guideSchema,
  status: z.enum(['complete', 'partial']),
  partialReasons: z.array(z.string()).optional(),
});
const guideVersionSchema = guideResultSchema.extend({ id: z.string(), messageId: z.string().optional() });
export type GuideVersion = z.infer<typeof guideVersionSchema>;

const researchStateSchema = z.object({
  status: z.string(),
  error: z.string().nullable(),
  running: z.boolean(),
  activities: z.array(
    z.object({
      type: z.literal('activity'),
      tool: z.enum(['searchWeb', 'readPage']),
      status: z.enum(['started', 'completed', 'failed']),
      input: z.string(),
    }),
  ),
  result: guideResultSchema.nullable(),
  versions: z.array(guideVersionSchema).optional(),
  selectedVersionId: z.string().optional(),
  context: z.string().optional(),
});
const sessionSchema = z.object({
  id: z.string(),
  scenario: researchInputSchema,
  updatedAt: z.number(),
  pendingStart: z.boolean(),
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(['user', 'assistant']),
      text: z.string(),
      sources: sourceSchema.array().optional(),
    }),
  ),
  draft: z.string(),
  research: researchStateSchema.optional(),
});
export type ResearchState = z.infer<typeof researchStateSchema>;
export type ResearchSession = z.infer<typeof sessionSchema>;
const prefix = 'auth-assist:research:';
const activeKey = 'auth-assist:active';

export function createSession(scenario: Scenario, pendingStart = true): ResearchSession {
  return {
    id: crypto.randomUUID(),
    scenario,
    updatedAt: Date.now(),
    pendingStart,
    draft: '',
    messages: [
      {
        id: 'context',
        role: 'user',
        text: `App: ${scenario.app}\nAudience: ${scenario.audience}${scenario.useCase ? `\nUse case: ${scenario.useCase}` : ''}`,
      },
    ],
  };
}
export function saveSession(session: ResearchSession) {
  try {
    sessionStorage.setItem(prefix + session.id, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}
export function listSessions(): ResearchSession[] {
  const sessions: ResearchSession[] = [];
  try {
    for (let index = 0; index < sessionStorage.length; index++) {
      const key = sessionStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      try {
        const parsed = sessionSchema.safeParse(JSON.parse(sessionStorage.getItem(key) || 'null'));
        if (parsed.success) sessions.push(parsed.data);
      } catch {
        /* Ignore an unreadable entry, preserving other research. */
      }
    }
  } catch {
    /* Storage may be unavailable; the current workspace still works in memory. */
  }
  return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
}
export function activeSession() {
  try {
    return listSessions().find((session) => session.id === sessionStorage.getItem(activeKey)) ?? null;
  } catch {
    return null;
  }
}
export function selectSession(id: string | null) {
  try {
    if (id) sessionStorage.setItem(activeKey, id);
    else sessionStorage.removeItem(activeKey);
  } catch {
    /* Workspace stays usable without storage. */
  }
}
