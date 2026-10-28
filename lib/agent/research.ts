import 'server-only';

import { createAgent } from 'langchain';
import { createResearchModel, getSearchApiKey } from './model';
import { findingsSchema, researchInputSchema, type ResearchResult } from './schema';
import { readPrompt } from './prompts';
import { createResearchTools, type ResearchActivity } from './research-tools';

import type { Conversation } from './protocol';

export type { ResearchResult } from './schema';

export async function researchProvider(
  input: unknown,
  options: {
    signal?: AbortSignal;
    conversation?: Conversation;
    previousResearch?: ResearchResult;
    onActivity?: (event: ResearchActivity) => void;
  } = {},
): Promise<ResearchResult> {
  const scenario = researchInputSchema.parse(input);
  const model = createResearchModel();
  const apiKey = getSearchApiKey();
  const controller = new AbortController();
  const startedAt = Date.now();
  const timer = setTimeout(() => controller.abort(), 90_000);
  const signal = options.signal ? AbortSignal.any([controller.signal, options.signal]) : controller.signal;
  const { readPage, tools, sources, gaps, remaining } = createResearchTools(
    apiKey,
    signal,
    options.onActivity,
    options.previousResearch?.sources,
  );
  try {
    const agent = createAgent({ model, tools, systemPrompt: readPrompt('research'), responseFormat: findingsSchema });
    const result = await agent.invoke(
      {
        messages: [
          {
            role: 'user',
            content: JSON.stringify({
              scenario,
              conversation: options.conversation ?? [],
              previousResearch: options.previousResearch ?? null,
            }),
          },
        ],
      },
      { signal, recursionLimit: 24 },
    );
    let summary = findingsSchema.parse(result.structuredResponse);
    // Read discovery results even when the model skips readPage; these share the same limits.
    if (summary.status !== 'clarification_required' && !sources.some((source) => source.contentType === 'page_text')) {
      const urls = [...new Set(sources.map((source) => source.url))].slice(0, 2);
      for (const url of urls) {
        if (Date.now() - startedAt >= 65_000 || !remaining().pages) break;
        await readPage.invoke({ url });
      }
    }
    const needsFollowUp = summary.unknowns.length > 0 || !sources.some((source) => source.contentType === 'page_text');
    if (
      summary.status !== 'clarification_required' &&
      needsFollowUp &&
      Date.now() - startedAt < 70_000 &&
      (remaining().searches > 0 || remaining().pages > 0)
    ) {
      try {
        const followUp = await agent.invoke(
          {
            messages: [
              ...result.messages,
              {
                role: 'user',
                content: `${readPrompt('research-follow-up')}\n${JSON.stringify({ scenario, findings: summary, sources, remaining: remaining() })}`,
              },
            ],
          },
          { signal, recursionLimit: 24 },
        );
        summary = findingsSchema.parse(followUp.structuredResponse);
      } catch {
        gaps.push('Targeted follow-up did not finish; initial findings and collected evidence are retained.');
      }
    }
    const knownIds = new Set(sources.map((source) => source.id));
    const supported = summary.findings.filter(
      (finding) => finding.sourceIds.length > 0 && finding.sourceIds.every((id) => knownIds.has(id)),
    );
    if (supported.length !== summary.findings.length)
      gaps.push('Some preliminary findings lacked collected source references and were omitted.');
    if (!sources.length)
      gaps.push('No usable evidence was collected. OAuth support and setup requirements remain unconfirmed.');
    return {
      ...summary,
      status: summary.status === 'clarification_required' ? summary.status : gaps.length ? 'partial' : summary.status,
      findings: supported,
      unknowns: [...new Set([...summary.unknowns, ...gaps])],
      sources,
    };
  } catch {
    return {
      status: 'partial',
      provider: null,
      clarification: null,
      findings: [],
      sources,
      unknowns: [
        ...gaps,
        signal.aborted
          ? options.signal?.aborted
            ? 'Research was cancelled. Collected evidence is retained.'
            : 'The 90-second research deadline was reached. Collected evidence is retained.'
          : 'Research could not finish. Check model access, provider quotas, network availability, or output compatibility.',
      ],
    };
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
