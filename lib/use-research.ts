'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChatMessage, Scenario } from './workspace-types';
import type { ResearchEvent } from './agent/protocol';
import type { ResearchState } from './research-session';
import type { Guide } from './agent/schema';

type Activity = Extract<ResearchEvent, { type: 'activity' }>;

export function useResearch(scenario: Scenario, onMessage: (message: ChatMessage) => void, saved?: ResearchState) {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState(
    saved?.running ? 'Interrupted · Send a message to continue' : (saved?.status ?? 'Ready to research'),
  );
  const [error, setError] = useState<string | null>(saved?.error ?? null);
  const [activities, setActivities] = useState<Activity[]>(saved?.activities ?? []);
  const [result, setResult] = useState<{ guide: Guide; status: 'complete' | 'partial' } | null>(saved?.result ?? null);
  const context = useRef<string | undefined>(saved?.context);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);

  async function run(messages: ChatMessage[]) {
    if (active.current) return;
    const conversation = messages.slice(-20).map(({ role, text }) => ({ role, text: text.slice(0, 4000) }));
    const controller = new AbortController();
    active.current = controller;
    setRunning(true);
    setError(null);
    setActivities([]);
    setStatus('Starting research…');
    let terminal = false;
    const timeout = setTimeout(() => controller.abort('timeout'), 130_000);
    function receive(event: ResearchEvent) {
      if (controller.signal.aborted) return;
      switch (event.type) {
        case 'started':
          setStatus('Researching…');
          break;
        case 'activity':
          setActivities((items) => [...items, event]);
          break;
        case 'assistant':
          onMessage({ id: crypto.randomUUID(), role: 'assistant', text: event.text, sources: event.sources });
          break;
        case 'guide':
          context.current = event.context;
          setResult({ guide: event.guide, status: event.status });
          setStatus(event.status === 'complete' ? 'Guide ready' : 'Partial guide · review remaining gaps');
          terminal = true;
          break;
        case 'clarification':
          context.current = event.context;
          onMessage({ id: crypto.randomUUID(), role: 'assistant', text: event.text });
          setStatus('Clarification needed · reply below');
          terminal = true;
          break;
        case 'error':
          if (event.context) context.current = event.context;
          setError(event.message);
          setStatus('Research stopped');
          terminal = true;
          break;
        case 'cancelled':
          setStatus('Research stopped');
          terminal = true;
          break;
      }
    }
    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario, conversation, context: context.current }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const failure = await response.json();
        if (failure.resetContext) context.current = undefined;
        throw new Error(failure.error || 'Research request failed.');
      }
      if (!response.body) throw new Error('No response stream received.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = '';
      try {
        for (;;) {
          const { done, value } = await reader.read();
          pending += decoder.decode(value, { stream: !done });
          let boundary;
          while ((boundary = pending.indexOf('\n')) >= 0) {
            const line = pending.slice(0, boundary);
            pending = pending.slice(boundary + 1);
            if (line.trim()) receive(JSON.parse(line) as ResearchEvent);
          }
          if (done) break;
        }
        if (pending.trim()) receive(JSON.parse(pending) as ResearchEvent);
        if (!terminal) throw new Error('Connection ended before research finished. Send a message to continue.');
      } finally {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
      }
    } catch (cause) {
      if (controller.signal.aborted) {
        setStatus('Research stopped');
        if (controller.signal.reason === 'timeout') setError('The response timed out. Send a message to continue.');
      } else {
        setError(cause instanceof Error ? cause.message : 'Research failed.');
        setStatus('Research stopped');
      }
    } finally {
      clearTimeout(timeout);
      active.current = null;
      setRunning(false);
    }
  }
  return {
    snapshot: {
      status,
      error,
      running,
      activities,
      result,
      context: context.current,
    } satisfies ResearchState,
    run,
    running,
    status,
    error,
    activities,
    result,
    stop: () => active.current?.abort(),
  };
}
