'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export type ApiKeys = { gemini: string; perplexity: string };

export function ApiKeysCard({ keys, onChange }: { keys: ApiKeys; onChange: (keys: ApiKeys) => void }) {
  const card = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    try {
      if (sessionStorage.getItem('auth-assist:api-keys-intro')) return;
      sessionStorage.setItem('auth-assist:api-keys-intro', 'seen');
    } catch {
      // Still show the introduction when browser storage is unavailable.
    }
    if (card.current) card.current.open = true;
  }, []);
  return (
    <details ref={card} className="relative">
      <summary className="flex h-8 cursor-pointer list-none items-center rounded-md px-3 text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
        API keys
      </summary>
      <section
        aria-labelledby="api-keys-title"
        className="absolute right-0 top-full z-50 mt-2 max-h-[calc(100dvh-5rem)] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border bg-background p-6 text-foreground shadow-lg"
      >
        <div className="flex items-center gap-2">
          <h2 id="api-keys-title" className="text-lg font-semibold">
            Add keys to begin
          </h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          This is built and running using free APIs of google aistudio for the model and perplexity for search. A free tier API is present, if you choose not to add one.
        </p>
        <div className="mt-5 space-y-4">
          <label className="block text-sm font-medium" htmlFor="gemini-api-key">
            Gemini API key{' '}
            <a
              className="font-normal underline"
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
            >
              Get a key in AI Studio
            </a>
          </label>
          <Input
            id="gemini-api-key"
            type="password"
            autoComplete="off"
            value={keys.gemini}
            onChange={(event) => onChange({ ...keys, gemini: event.target.value })}
          />
          <label className="block text-sm font-medium" htmlFor="perplexity-api-key">
            Perplexity API key{' '}
            <a
              className="font-normal underline"
              href="https://www.perplexity.ai/settings/api"
              target="_blank"
              rel="noreferrer"
            >
              Get a key
            </a>
          </label>
          <Input
            id="perplexity-api-key"
            type="password"
            autoComplete="off"
            value={keys.perplexity}
            onChange={(event) => onChange({ ...keys, perplexity: event.target.value })}
          />
        </div>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          Keys stay in this page’s memory and are sent to the server for research. They are cleared on refresh. Leave a
          field empty to use the server configuration.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onChange({ gemini: '', perplexity: '' })}>
            Clear keys
          </Button>
          <Button
            onClick={() => {
              if (card.current) card.current.open = false;
            }}
          >
            Done
          </Button>
        </div>
      </section>
    </details>
  );
}
