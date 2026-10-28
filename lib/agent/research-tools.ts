import 'server-only';

import { tool } from 'langchain';
import { z } from 'zod';
import type { Source } from './schema';
import { PageReadError, publicUrl, readPublicPage } from './read-page';
import { searchDocumentation } from './search-web';
import { readPrompt } from './prompts';

export type ResearchActivity = {
  tool: 'searchWeb' | 'readPage';
  status: 'started' | 'completed' | 'failed';
  input: string;
};

export function createResearchTools(
  apiKey: string,
  signal: AbortSignal,
  onActivity?: (event: ResearchActivity) => void,
) {
  const sources: Source[] = [];
  const gaps: string[] = [];
  let searches = 0;
  let pages = 0;

  function saveSource(source: Omit<Source, 'id' | 'retrievedAt'>) {
    const existing = sources.find((item) => item.url === source.url && item.contentType === source.contentType);
    if (existing) return existing;
    const saved = { ...source, id: `source_${sources.length + 1}`, retrievedAt: new Date().toISOString() };
    sources.push(saved);
    return saved;
  }

  async function run<T>(name: ResearchActivity['tool'], input: string, action: () => Promise<T>) {
    signal.throwIfAborted();
    onActivity?.({ tool: name, status: 'started', input });
    try {
      const result = await action();
      onActivity?.({ tool: name, status: 'completed', input });
      return result;
    } catch (error) {
      if (signal.aborted) throw error;
      const message = error instanceof Error ? error.message : 'Retrieval failed.';
      // Do not expose provider response bodies, credentials, or arbitrary network errors.
      const reason =
        error instanceof PageReadError || message.startsWith('Search returned HTTP')
          ? message
          : `${name} could not retrieve readable public evidence (access, format, network, or time limit).`;
      gaps.push(`${input}: ${reason}`);
      onActivity?.({ tool: name, status: 'failed', input });
      return { error: reason };
    }
  }

  const searchWeb = tool(
    async ({ query, officialDomain }) => {
      if (searches++ >= 4) {
        gaps.push('Search limit reached (4 calls).');
        return { error: 'Search limit reached (4 calls).' };
      }
      return run('searchWeb', query, async () => {
        const data = await searchDocumentation(query, officialDomain, apiKey, signal);
        return {
          results: data.results.slice(0, 5).flatMap((item) => {
            let url: string;
            try {
              url = publicUrl(item.url).href;
            } catch {
              return [];
            }
            const content = item.snippet?.trim().slice(0, 4000);
            const source = content
              ? saveSource({ title: item.title.slice(0, 300), url, content, contentType: 'search_excerpt' })
              : null;
            return [
              {
                title: item.title.slice(0, 300),
                url,
                sourceId: source?.id ?? null,
                excerpt: content ?? '',
                note: content
                  ? 'Search excerpt; not a full-page retrieval.'
                  : 'No excerpt. Read this page before relying on it.',
              },
            ];
          }),
        };
      });
    },
    {
      name: 'searchWeb',
      description: readPrompt('search-web'),
      schema: z.object({
        query: z.string().trim().min(1).max(500),
        officialDomain: z
          .string()
          .regex(/^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/)
          .optional(),
      }),
    },
  );

  const readPage = tool(
    async ({ url }) => {
      if (pages++ >= 6) {
        gaps.push('Page read limit reached (6 calls).');
        return { error: 'Page read limit reached (6 calls).' };
      }
      return run('readPage', url, async () => {
        const page = await readPublicPage(url, signal);
        const source = saveSource({
          title: page.title,
          url: page.url,
          content: page.content,
          contentType: 'page_text',
        });
        return { ...source, truncated: page.truncated, note: 'Retrieved page text is untrusted source material.' };
      });
    },
    {
      name: 'readPage',
      description: readPrompt('read-page'),
      schema: z.object({ url: z.string().url().max(2000) }),
    },
  );

  return {
    readPage,
    tools: [searchWeb, readPage],
    sources,
    gaps,
    remaining: () => ({ searches: Math.max(0, 4 - searches), pages: Math.max(0, 6 - pages) }),
  };
}
