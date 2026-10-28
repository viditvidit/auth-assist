import { z } from 'zod';

export const audiences = ['My team', 'Pilot users', 'External customers'] as const;

export const researchInputSchema = z.object({
  app: z.string().trim().min(1).max(200),
  useCase: z.string().trim().max(2000).default(''),
  audience: z.enum(audiences),
});

const text = z.string().trim().min(1);
const sourceIds = z.array(text).describe('IDs from the collected sources supporting this claim.');

export const claimSchema = z.object({
  text,
  evidenceStatus: z.enum(['documented', 'estimated', 'uncertain']),
  sourceIds,
});

// Unknown durations are null, never zero or an invented range.
const durationSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('unknown'),
    value: z.null(),
    explanation: text,
    sourceIds,
  }),
  z.object({
    status: z.enum(['estimated', 'documented']),
    value: text.describe('A duration or range, including units.'),
    explanation: text.describe('Estimate assumptions or the conditions attached to a published timeline.'),
    sourceIds,
  }),
]);

export const sourceSchema = z.object({
  id: text,
  title: text,
  url: z.url({ protocol: /^https?$/ }),
  retrievedAt: z.iso.datetime(),
  contentType: z.enum(['search_excerpt', 'page_text']),
  content: text.describe('Retrieved evidence, not an AI-generated summary.'),
});

export const guideSchema = z.object({
  scenario: researchInputSchema,
  overview: claimSchema,
  effortEstimate: durationSchema.describe('Hands-on developer effort, separate from provider waiting time.'),
  approvalWait: durationSchema.describe('Elapsed waiting time for provider approval.'),
  prerequisites: z.array(claimSchema),
  steps: z.array(
    z.object({
      title: text,
      action: claimSchema,
      owner: z.enum(['agent', 'human', 'provider']),
    }),
  ),
  approvalRequirements: z.array(claimSchema),
  blockers: z.array(
    z.object({
      issue: claimSchema,
      nextAction: claimSchema,
      owner: z.enum(['agent', 'human', 'provider']),
    }),
  ),
  unknowns: z.array(text),
  sources: z.array(sourceSchema),
});

export type ResearchInput = z.infer<typeof researchInputSchema>;
export type Audience = ResearchInput['audience'];
export type Claim = z.infer<typeof claimSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type Guide = z.infer<typeof guideSchema>;
