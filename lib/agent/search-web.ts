import 'server-only';

import { z } from 'zod';

const searchResponse = z.object({
  results: z.array(z.object({ title: z.string(), url: z.string(), snippet: z.string().nullish() })).max(20),
});
export async function searchDocumentation(
  query: string,
  officialDomain: string | undefined,
  apiKey: string,
  signal: AbortSignal,
) {
  const response = await fetch('https://api.perplexity.ai/search', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      max_results: 5,
      max_tokens: 4000,
      max_tokens_per_page: 1000,
      ...(officialDomain ? { search_domain_filter: [officialDomain] } : {}),
    }),
    signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
    redirect: 'error',
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`Search returned HTTP ${response.status}.`);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Search response was empty.');
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 1_000_000) throw new Error('Search response exceeded size limit.');
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return searchResponse.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
}
