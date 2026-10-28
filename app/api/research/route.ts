import { generateGuide } from '@/lib/agent/generate-guide';
import { createResearchModel, getSearchApiKey } from '@/lib/agent/model';
import { openResearch, sealResearch } from '@/lib/agent/research-context';
import { researchRequestSchema, type ResearchEvent } from '@/lib/agent/protocol';
import type { ResearchResult } from '@/lib/agent/schema';
import { saveGuide, guideDatabaseConfigured } from '@/lib/guide-store';

export const runtime = 'nodejs';
export const maxDuration = 180;

async function readInput(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing request body.');
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  const timer = setTimeout(() => void reader.cancel(), 10_000);
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 1_048_576) throw new Error('Request is too large.');
      chunks.push(value);
    }
    return researchRequestSchema.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
  } finally {
    clearTimeout(timer);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin)
    return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  let input;
  try {
    input = await readInput(request);
  } catch {
    return Response.json(
      { error: 'Invalid request. Provide an app, audience, and bounded conversation.' },
      { status: 400 },
    );
  }
  try {
    if (!guideDatabaseConfigured())
      return Response.json({ error: 'Guide storage is not configured.' }, { status: 503 });
    if (!process.env.GOOGLE_API_KEY?.trim()) throw new Error('Server signing key missing');
    createResearchModel(input.apiKeys?.gemini);
    getSearchApiKey(input.apiKeys?.perplexity);
  } catch {
    return Response.json(
      {
        error:
          'Research is not configured. The server needs GOOGLE_API_KEY for signing and GEMINI_MODEL; add API keys in the app or configure them on the server.',
      },
      { status: 503 },
    );
  }
  let previousResearch: ResearchResult | undefined;
  try {
    if (input.context) previousResearch = openResearch(input.context, input.scenario);
  } catch {
    return Response.json(
      { error: 'Research context expired or is invalid. Send a message to research again.', resetContext: true },
      { status: 409 },
    );
  }
  const abort = new AbortController();
  const signal = AbortSignal.any([request.signal, abort.signal]);
  let closed = false;
  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (event: ResearchEvent) => {
        if (!closed) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      const close = () => {
        if (!closed) {
          closed = true;
          controller.close();
        }
        cleanup();
      };
      const onAbort = () => {
        send({ type: 'cancelled' });
        close();
      };
      const timer = setTimeout(() => {
        send({ type: 'error', message: 'The 120-second research deadline was reached. Send a message to continue.' });
        close();
        abort.abort();
      }, 120_000);
      cleanup = () => {
        clearTimeout(timer);
        signal.removeEventListener('abort', onAbort);
      };
      signal.addEventListener('abort', onAbort, { once: true });
      if (signal.aborted) {
        onAbort();
        return;
      }
      send({ type: 'started' });
      void (async () => {
        try {
          const result = await generateGuide(input.scenario, {
            signal,
            apiKeys: input.apiKeys,
            previousResearch,
            conversation: input.conversation,
            onProgress: (text) => send({ type: 'assistant', text, sources: [] }),
            onActivity: (activity) => send({ type: 'activity', ...activity }),
          });
          if (closed) return;
          const context = result.research ? sealResearch(input.scenario, result.research) : undefined;
          if (result.status === 'error') send({ type: 'error', message: result.error, context });
          else if (result.status === 'clarification_required') {
            send({ type: 'clarification', text: result.clarification, context: context! });
          } else {
            let guideId: string;
            try {
              guideId = await saveGuide(result);
            } catch {
              send({ type: 'error', message: 'Could not save the generated guide. Please try again.', context });
              return;
            }
            if (closed) return;
            send({ type: 'assistant', text: result.response, sources: result.guide.sources });
            send({
              type: 'guide',
              status: result.status,
              guide: result.guide,
              partialReasons: result.partialReasons,
              guideId,
              context: context!,
            });
          }
        } catch {
          send({ type: 'error', message: 'Research could not finish. Send a message to continue.' });
        } finally {
          close();
        }
      })();
    },
    cancel() {
      closed = true;
      cleanup();
      abort.abort();
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
