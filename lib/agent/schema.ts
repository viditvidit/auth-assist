import { z } from 'zod';

export const audiences = ['Not specified', 'My team', 'Pilot users', 'External customers'] as const;

export const researchInputSchema = z.object({
  app: z.string().trim().min(1).max(200),
  useCase: z.string().trim().max(2000).default(''),
  audience: z.enum(audiences).default('Not specified'),
});

const text = z.string().trim().min(1);
const sourceIds = z.array(text).describe('IDs from the collected sources supporting this claim.');

export const claimSchema = z.object({
  text,
  evidenceStatus: z.enum(['documented', 'estimated', 'uncertain']),
  sourceIds,
});

// Gemini drops oneOf schemas. Keep the wire shape simple and validate the relationship locally.
const durationObject = z.object({
  status: z.enum(['unknown', 'estimated', 'documented']),
  value: text.nullable().describe('Null when status is unknown; otherwise a duration or range including units.'),
  explanation: text.describe('Why the duration is unknown, estimate assumptions, or published timeline conditions.'),
  sourceIds,
});

const durationSchema = durationObject.superRefine((duration, context) => {
  if ((duration.status === 'unknown') !== (duration.value === null)) {
    context.addIssue({
      code: 'custom',
      path: ['value'],
      message: 'Use null only for unknown durations; estimated or documented durations require a value.',
    });
  }
});

const approvalWaitSchema = durationObject
  .extend({
    status: z.enum(['unknown', 'estimated', 'documented', 'not_applicable']),
    value: text.nullable().describe('Null for unknown or not_applicable; otherwise a duration including units.'),
  })
  .superRefine((duration, context) => {
    const needsNull = duration.status === 'unknown' || duration.status === 'not_applicable';
    if (needsNull !== (duration.value === null))
      context.addIssue({
        code: 'custom',
        path: ['value'],
        message: 'Unknown or not-applicable waits require null; other waits require a duration.',
      });
  });

const approvalSchema = z.object({
  applicability: z.enum(['required', 'not_required', 'conditional', 'unknown']),
  explanation: claimSchema.describe(
    'Scenario-specific conclusion, conditions, and who must act; label secondary evidence as reported experience.',
  ),
});

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
  approvalWait: approvalWaitSchema.describe(
    'Provider review wait only. Use not_applicable only when providerReview is not_required, with cited justification.',
  ),
  approvals: z.object({
    providerReview: approvalSchema,
    organizationApproval: approvalSchema,
    marketplaceListing: approvalSchema,
  }),
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

export const findingsSchema = z.object({
  status: z.enum(['researched', 'partial', 'clarification_required']),
  provider: z.string().nullable(),
  clarification: z.string().nullable(),
  findings: z.array(z.object({ text: z.string(), sourceIds: z.array(z.string()) })).max(20),
  unknowns: z.array(z.string()).max(20),
});

export type ResearchResult = z.infer<typeof findingsSchema> & { sources: Source[] };
