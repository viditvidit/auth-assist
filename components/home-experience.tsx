'use client';

import { useEffect, useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { SetupForm } from '@/components/setup-form';
import { Workspace } from '@/components/workspace';
import { GuidePreview } from '@/components/guide-preview';
import { Button } from '@/components/ui/button';
import {
  activeSession,
  createSession,
  listSessions,
  saveSession,
  selectSession,
  type ResearchSession,
} from '@/lib/research-session';
import type { Scenario } from '@/lib/workspace-types';

export function HomeExperience({ initialScenario }: { initialScenario?: Scenario }) {
  const [ready, setReady] = useState(false);
  const [current, setCurrent] = useState<ResearchSession | null>(null);
  const [history, setHistory] = useState<ResearchSession[]>([]);
  const [running, setRunning] = useState(false);
  const [newKey, setNewKey] = useState(0);
  useEffect(() => {
    const sessions = listSessions();
    setCurrent(
      initialScenario
        ? (sessions.find((s) => JSON.stringify(s.scenario) === JSON.stringify(initialScenario)) ?? null)
        : activeSession(),
    );
    setHistory(sessions);
    setReady(true);
  }, [initialScenario]);
  function open(session: ResearchSession | null) {
    selectSession(session?.id ?? null);
    setCurrent(session);
    setHistory(listSessions());
    setRunning(false);
  }
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b px-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate text-base font-semibold">{current?.scenario.app || 'New integration'}</h1>
          <Button
            variant="ghost"
            size="icon-sm"
            title="New guide"
            aria-label="New guide"
            onClick={() => {
              open(null);
              setNewKey((key) => key + 1);
            }}
          >
            <PlusIcon />
          </Button>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <label htmlFor="guide-history" className="text-xs text-muted-foreground">
            Guides
          </label>
          <select
            id="guide-history"
            aria-label="Open a guide"
            value={current?.id ?? ''}
            onFocus={() => setHistory(listSessions())}
            onChange={(e) => {
              const session = listSessions().find((s) => s.id === e.target.value);
              if (session) open(session);
            }}
            className="h-9 max-w-48 rounded-md border bg-background px-3 text-sm sm:max-w-80"
          >
            <option value="" disabled>
              {history.length ? 'Choose a guide' : 'No guides yet'}
            </option>
            {history.map((session) => (
              <option key={session.id} value={session.id}>
                {session.scenario.app}
                {session.scenario.useCase ? ` — ${session.scenario.useCase}` : ''}
              </option>
            ))}
          </select>
        </div>
      </header>
      {ready && (
        <SetupForm
          key={current ? `setup-${current.id}` : `setup-new-${newKey}`}
          initial={current?.scenario ?? (newKey === 0 ? initialScenario : undefined)}
          disabled={running}
          onSubmit={(scenario) => {
            const session = createSession(scenario);
            saveSession(session);
            open(session);
          }}
        />
      )}
      {ready && current ? (
        <Workspace key={`workspace-${current.id}`} initialSession={current} onRunningChange={setRunning} />
      ) : (
        <main className="grid min-h-0 flex-1 lg:grid-cols-2">
          <div className="flex items-center justify-center px-8 py-12">
            <div className="max-w-sm">
              <h2 className="text-lg font-medium">What would you like to connect?</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Enter an app and your use case above. Research and follow-up questions will appear here.
              </p>
            </div>
          </div>
          <div className="hidden min-h-0 border-l lg:flex">
            <GuidePreview />
          </div>
        </main>
      )}
    </div>
  );
}
