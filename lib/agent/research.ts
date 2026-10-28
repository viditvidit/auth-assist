import 'server-only';

import { createAgent } from 'langchain';
import { createResearchModel, geminiError, getSearchApiKey } from './model';
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
    sharedTools?: ReturnType<typeof createResearchTools>;
    recovery?: boolean;
    apiKeys?: { gemini: string; perplexity: string };
    onProgress?: (text: string) => void;
    onActivity?: (event: ResearchActivity) => void;
  } = {},
): Promise<ResearchResult> {
  const scenario = researchInputSchema.parse(input);
  const model = createResearchModel(options.apiKeys?.gemini);
  const apiKey = getSearchApiKey(options.apiKeys?.perplexity);
  const controller = new AbortController();
  const startedAt = Date.now();
  const timer = setTimeout(() => controller.abort(), options.sharedTools ? 45_000 : 90_000);
  const signal = options.signal ? AbortSignal.any([controller.signal, options.signal]) : controller.signal;
  const { readPage, tools, sources, gaps, remaining, setLimits, setSignal } =
    options.sharedTools ?? createResearchTools(apiKey, signal, options.onActivity, options.previousResearch?.sources);
  setSignal(signal);
  if (!options.recovery) setLimits(2, 3);
  try {
    const agent = createAgent({ model, tools, systemPrompt: readPrompt('research'), responseFormat: findingsSchema });
    const result = options.recovery
      ? null
      : await agent.invoke(
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
    let summary = findingsSchema.parse(result?.structuredResponse ?? options.previousResearch);
    // Read discovery results even when the model skips readPage; these share the same limits.
    if (
      !options.recovery &&
      summary.status !== 'clarification_required' &&
      !sources.some((source) => source.contentType === 'page_text')
    ) {
      const urls = [...new Set(sources.map((source) => source.url))].slice(0, 2);
      for (const url of urls) {
        if (Date.now() - startedAt >= 65_000 || !remaining().pages) break;
        await readPage.invoke({ url });
      }
    }
    // A generation run reserves these passes until evidence review identifies the actual gaps.
    if (!options.sharedTools || options.recovery) {
      for (const phase of ['official', 'external'] as const) {
        const unresolved = summary.status === 'partial' || summary.unknowns.length > 0;
        if (summary.status === 'clarification_required' || !unresolved) break;
        setLimits(phase === 'official' ? 3 : 4, phase === 'official' ? 5 : 6);
        if (signal.aborted || (!remaining().searches && !remaining().pages)) {
          gaps.push('The remaining research budget was exhausted before all documentation gaps could be checked.');
          break;
        }
        options.onProgress?.(
          phase === 'official'
            ? 'Some documentation is still unclear. I’m checking official docs for the remaining gaps.'
            : 'The official-docs pass left open questions. I’m checking external guides and community discussions next.',
        );
        try {
          const followUp = await agent.invoke(
            {
              messages: [
                {
                  role: 'user',
                  content: `${readPrompt(phase === 'official' ? 'research-official' : 'research-external')}\n${JSON.stringify({ scenario, findings: summary, sources, remaining: remaining() })}`,
                },
              ],
            },
            { signal, recursionLimit: 16 },
          );
          summary = findingsSchema.parse(followUp.structuredResponse);
        } catch (error) {
          gaps.push(
            geminiError(error) ?? `The ${phase} documentation pass did not finish; collected evidence is retained.`,
          );
        }
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
  } catch (error) {
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
            : 'The research pass deadline was reached. Collected evidence is retained.'
          : (geminiError(error) ??
            'Research could not finish. Check model access, provider quotas, network availability, or output compatibility.'),
      ],
    };
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
