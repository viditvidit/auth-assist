import 'server-only';

import { AIMessage, type BaseMessageLike } from '@langchain/core/messages';
import { z } from 'zod';
import { createResearchTools } from './research-tools';
import { createResearchModel, getSearchApiKey } from './model';
import { readPrompt } from './prompts';
import { researchProvider } from './research';
import { claimSchema, guideSchema, researchInputSchema, type Guide, type ResearchResult } from './schema';
import { applyEvidenceReview, evidenceReviewSchema, guideDraftSchema, reviewClaims } from './guide-evidence';

type Review = z.infer<typeof evidenceReviewSchema>;
class GuideOutputError extends Error {}
export type GuideResult =
  | {
      status: 'complete' | 'partial';
      guide: Guide;
      partialReasons: string[];
      response: string;
      review: Review;
      research: ResearchResult;
    }
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
  const startedAt = Date.now();
  let generationSignal = signal;
  let research: ResearchResult | null = null;
  let stage = 'research';
  let repairAvailable = true;
  try {
    const sharedTools = createResearchTools(
      getSearchApiKey(),
      signal,
      options.onActivity,
      options.previousResearch?.sources,
    );
    sharedTools.setLimits(2, 3);
    research = await researchProvider(scenario, { ...options, signal, sharedTools });
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
        const output = await runnable.invoke(messages, { signal: generationSignal });
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

    async function buildGuide(): Promise<Extract<GuideResult, { guide: Guide }>> {
      if (!research) throw new Error('Missing research');
      stage = 'guide generation';
      const draft = await structured(
        guideDraftSchema
          .extend({
            response: claimSchema
              .extend({ text: z.string().trim().min(1).max(4000) })
              .describe(
                'Concise answer to the latest user question, or initial summary and next action, with evidence references.',
              ),
          })
          .superRefine((value, context) => {
            const allowed = new Set(research!.sources.map((source) => source.id));
            function visit(node: unknown, path: (string | number)[]) {
              if (typeof node === 'string') {
                const ids = path.includes('sourceIds')
                  ? [node]
                  : [...node.matchAll(/\bsource_\d+\b/g)].map((match) => match[0]);
                for (const id of ids)
                  if (!allowed.has(id))
                    context.addIssue({
                      code: 'custom',
                      path,
                      message: `Citation ${id} was not collected. Use only ${[...allowed].join(', ')}. Do not replace an ID unless its source supports the claim; otherwise mark the claim uncertain.`,
                    });
              } else if (Array.isArray(node)) node.forEach((item, index) => visit(item, [...path, index]));
              else if (node && typeof node === 'object')
                Object.entries(node).forEach(([key, item]) => visit(item, [...path, key]));
            }
            visit(value, []);
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
      generationSignal.throwIfAborted();
      return {
        status: checked.partial || !validResponse ? 'partial' : 'complete',
        guide: checked.guide,
        partialReasons: [
          ...checked.partialReasons,
          ...(!validResponse
            ? ['The response to your latest question could not be verified against collected evidence.']
            : []),
        ],
        response: validResponse
          ? `${draft.response.evidenceStatus === 'uncertain' ? 'Uncertain: ' : draft.response.evidenceStatus === 'estimated' ? 'Estimate: ' : ''}${draft.response.text}${draft.response.sourceIds.length ? `\nSources: ${draft.response.sourceIds.join(', ')}` : ''}`
          : 'I could not verify an answer to your latest question. The guide retains the findings that could be reviewed, along with remaining gaps.',
        review,
        research,
      };
    }
    const initial = await buildGuide();
    if (initial.status === 'complete') return initial;
    options.onProgress?.(
      `Some details still need evidence:\n\n${initial.partialReasons.map((reason) => `- ${reason}`).join('\n')}`,
    );
    const remainingMs = 110_000 - (Date.now() - startedAt);
    if (remainingMs < 15_000) {
      const reason = 'The research time budget was exhausted before additional documentation checks could finish.';
      options.onProgress?.(reason + ' The guide remains partial.');
      return { ...initial, partialReasons: [...initial.partialReasons, reason] };
    }
    const recoveryController = new AbortController();
    const recoveryTimer = setTimeout(() => recoveryController.abort(), remainingMs);
    generationSignal = AbortSignal.any([signal, recoveryController.signal]);
    try {
      research = await researchProvider(scenario, {
        ...options,
        signal: generationSignal,
        sharedTools,
        recovery: true,
        previousResearch: { ...research!, status: 'partial', unknowns: initial.partialReasons },
      });
      generationSignal.throwIfAborted();
      const updated = await buildGuide();
      if (updated.status === 'partial')
        options.onProgress?.(
          'Some questions remain unresolved after the documentation checks. I’ll mark the guide partial and list the remaining gaps.',
        );
      return updated;
    } catch {
      if (signal.aborted) throw new Error('Research cancelled');
      const reason =
        'Additional documentation checks or evidence review could not finish. The last reviewed guide is retained with its remaining gaps.';
      options.onProgress?.(reason);
      return { ...initial, partialReasons: [...initial.partialReasons, reason] };
    } finally {
      clearTimeout(recoveryTimer);
      recoveryController.abort();
    }
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
