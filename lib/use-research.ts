'use client';

import { loadGuideVersions } from '@/app/guides/actions';
import { useEffect, useRef, useState } from 'react';
import type { ChatMessage, Scenario } from './workspace-types';
import type { ResearchEvent } from './agent/protocol';
import type { ResearchState, GuideVersion } from './research-session';

type Activity = Extract<ResearchEvent, { type: 'activity' }>;

export function useResearch(
  scenario: Scenario,
  onMessage: (message: ChatMessage) => void,
  saved?: ResearchState,
  legacyMessageId?: string,
  apiKeys?: { gemini: string; perplexity: string },
) {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState(
    saved?.running ? 'Interrupted · Send a message to continue' : (saved?.status ?? 'Ready to research'),
  );
  const [error, setError] = useState<string | null>(saved?.error ?? null);
  const [activities, setActivities] = useState<Activity[]>(saved?.activities ?? []);
  const [versions, setVersions] = useState<GuideVersion[]>(
    () => saved?.versions ?? (saved?.result ? [{ ...saved.result, id: 'legacy', messageId: legacyMessageId }] : []),
  );
  const [selectedVersionId, selectVersion] = useState(
    saved?.selectedVersionId ?? saved?.versions?.at(-1)?.id ?? 'legacy',
  );
  const result = versions.find((version) => version.id === selectedVersionId) ?? versions.at(-1) ?? null;
  const [restoring, setRestoring] = useState(!!saved?.versionRefs?.length);
  const [restored, setRestored] = useState(!saved?.versionRefs?.length);
  useEffect(() => {
    if (!saved?.versionRefs?.length) return;
    let cancelled = false;
    void loadGuideVersions(saved.versionRefs.map((ref) => ref.guideId))
      .then((snapshots) => {
        if (cancelled) return;
        const loaded = snapshots.flatMap((snapshot, index) =>
          snapshot ? [{ ...snapshot, ...saved.versionRefs![index] }] : [],
        );
        setVersions((current) => [
          ...loaded,
          ...current.filter((version) => !loaded.some((item) => item.id === version.id)),
        ]);
        setRestored(true);
        if (snapshots.some((snapshot) => !snapshot)) setError('Some saved guide versions are unavailable.');
      })
      .catch(() => {
        if (!cancelled) setError('Could not load saved guide versions. Reload to try again.');
      })
      .finally(() => {
        if (!cancelled) setRestoring(false);
      });
    return () => {
      cancelled = true;
    };
  }, [saved]);
  const context = useRef<string | undefined>(saved?.context);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);

  async function run(messages: ChatMessage[]) {
    if (active.current || restoring) return;
    const conversation = messages.slice(-20).map(({ role, text }) => ({ role, text: text.slice(0, 4000) }));
    const controller = new AbortController();
    active.current = controller;
    setRunning(true);
    setError(null);
    setActivities([]);
    setStatus('Starting research…');
    let terminal = false;
    let responseId: string | undefined;
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
          responseId = crypto.randomUUID();
          onMessage({ id: responseId, role: 'assistant', text: event.text, sources: event.sources });
          break;
        case 'guide':
          context.current = event.context;
          const version: GuideVersion = {
            id: crypto.randomUUID(),
            messageId: responseId,
            guide: event.guide,
            status: event.status,
            partialReasons: event.partialReasons,
            guideId: event.guideId,
          };
          setVersions((previous) => [...previous, version]);
          selectVersion(version.id);
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
        body: JSON.stringify({ scenario, conversation, context: context.current, apiKeys }),
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
      versions,
      versionRefs: restored ? [] : saved?.versionRefs,
      selectedVersionId,
      context: context.current,
    } satisfies ResearchState,
    run,
    running: running || restoring,
    status: restoring ? 'Loading guides…' : status,
    error,
    activities,
    result,
    versions,
    selectVersion,
    stop: () => active.current?.abort(),
  };
}
