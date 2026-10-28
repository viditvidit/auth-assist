import 'server-only';

import { AIMessage, type BaseMessageLike } from '@langchain/core/messages';
import { z } from 'zod';
import { createResearchModel } from './model';
import { readPrompt } from './prompts';
import { researchProvider } from './research';
import { claimSchema, guideSchema, researchInputSchema, type Guide, type ResearchResult } from './schema';
import { applyEvidenceReview, evidenceReviewSchema, guideDraftSchema, reviewClaims } from './guide-evidence';

type Review = z.infer<typeof evidenceReviewSchema>;
class GuideOutputError extends Error {}
export type GuideResult =
  | { status: 'complete' | 'partial'; guide: Guide; response: string; review: Review; research: ResearchResult }
  | { status: 'clarification_required'; clarification: string; research: ResearchResult }
  | { status: 'error'; error: string; research: ResearchResult | null };

export async function generateGuide(
  input: unknown,
  options: Parameters<typeof researchProvider>[1] = {},
): Promise<GuideResult> {
  const scenario = researchInputSchema.parse(input);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  const signal = options.signal ? AbortSignal.any([controller.signal, options.signal]) : controller.signal;
  let research: ResearchResult | null = null;
  let stage = 'research';
  let repairAvailable = true;
  try {
    research = await researchProvider(scenario, { ...options, signal });
    signal.throwIfAborted();
    if (research.status === 'clarification_required')
      return {
        status: 'clarification_required',
        clarification: research.clarification || 'Which provider website do you mean?',
        research,
      };
    if (!research.sources.length)
      return { status: 'error', error: 'No usable evidence was collected. A guide cannot be generated.', research };
    const model = createResearchModel();

    async function structured<S extends z.ZodObject>(schema: S, messages: BaseMessageLike[]): Promise<z.infer<S>> {
      const runnable = model.withStructuredOutput(schema, { includeRaw: true });
      for (;;) {
        const output = await runnable.invoke(messages, { signal });
        // includeRaw suppresses parser errors; validate the actual tool payload to retain field-level issues.
        const rawArguments = AIMessage.isInstance(output.raw)
          ? output.raw.tool_calls?.find((call) => call.name === 'extract')?.args
          : undefined;
        const parsed = schema.safeParse(output.parsed ?? rawArguments);
        if (parsed.success) return parsed.data;
        if (!repairAvailable)
          throw new GuideOutputError(
            `Invalid structured output during ${stage}; the single repair attempt has been used. ${parsed.error.issues
              .slice(0, 3)
              .map((issue) => `${issue.path.join('.') || 'response'}: ${issue.message}`)
              .join('; ')}`,
          );
        repairAvailable = false;
        messages = [
          ...messages,
          {
            role: 'user',
            content: `${readPrompt('repair-output')}\n${JSON.stringify({
              previousOutput: {
                content: output.raw.content,
                toolCalls: 'tool_calls' in output.raw ? output.raw.tool_calls : [],
              },
              issues: parsed.error.issues.map(({ path, message }) => ({ path, message })),
            })}`,
          },
        ];
      }
    }

    stage = 'guide generation';
    const draft = await structured(
      guideDraftSchema.extend({
        response: claimSchema
          .extend({ text: z.string().trim().min(1).max(4000) })
          .describe(
            'Concise answer to the latest user question, or initial summary and next action, with evidence references.',
          ),
      }),
      [
        { role: 'system', content: readPrompt('generate-guide') },
        { role: 'user', content: JSON.stringify({ scenario, research, conversation: options.conversation ?? [] }) },
      ],
    );
    const guide = guideSchema.parse({
      ...draft,
      scenario,
      sources: research.sources,
    });
    stage = 'evidence review';
    const review = await structured(evidenceReviewSchema, [
      { role: 'system', content: readPrompt('review-evidence') },
      {
        role: 'user',
        content: JSON.stringify({
          scenario,
          claims: [...reviewClaims(guide), { id: 'assistantResponse', ...draft.response }],
          approvals: guide.approvals,
          effortEstimate: guide.effortEstimate,
          approvalWait: guide.approvalWait,
          unknowns: guide.unknowns,
          researchUnknowns: research.unknowns,
          sources: research.sources,
        }),
      },
    ]);
    const checked = applyEvidenceReview(guide, review);
    const responseChecks = review.checks.filter((check) => check.claimId === 'assistantResponse');
    const validResponse =
      responseChecks.length === 1 &&
      responseChecks[0].verdict === 'supported' &&
      draft.response.sourceIds.every((id) => research!.sources.some((source) => source.id === id)) &&
      (draft.response.evidenceStatus !== 'documented' || draft.response.sourceIds.length > 0);
    if (!validResponse)
      checked.guide.unknowns.push(
        'The response to the latest question could not be verified against collected evidence.',
      );
    signal.throwIfAborted();
    return {
      status: checked.partial || !validResponse ? 'partial' : 'complete',
      guide: checked.guide,
      response: validResponse
        ? `${draft.response.evidenceStatus === 'uncertain' ? 'Uncertain: ' : draft.response.evidenceStatus === 'estimated' ? 'Estimate: ' : ''}${draft.response.text}${draft.response.sourceIds.length ? `\nSources: ${draft.response.sourceIds.join(', ')}` : ''}`
        : 'I could not verify an answer to your latest question. The guide retains the findings that could be reviewed, along with remaining gaps.',
      review,
      research,
    };
  } catch (error) {
    return {
      status: 'error',
      error: signal.aborted
        ? options.signal?.aborted
          ? 'Guide generation was cancelled.'
          : 'The 120-second guide generation deadline was reached.'
        : error instanceof GuideOutputError
          ? error.message
          : `Could not complete ${stage}. Check configuration, provider access, or structured-output compatibility. At most one output repair is attempted.`,
      research,
    };
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
