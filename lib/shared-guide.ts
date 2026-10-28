import { z } from 'zod';
import { guideSchema } from './agent/schema';

export const guideSnapshotSchema = z.object({
  guide: guideSchema,
  status: z.enum(['complete', 'partial']),
  partialReasons: z.array(z.string()).default([]),
});
export type GuideSnapshot = z.infer<typeof guideSnapshotSchema>;
export type GuideListing = { id: string; title: string; created_at: string };
