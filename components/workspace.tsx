'use client';

import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { ArrowLeftIcon, BookOpenIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConversationPanel } from '@/components/conversation-panel';
import { GuidePreview } from '@/components/guide-preview';
import { example, type ChatMessage, type Scenario } from '@/lib/example';

function subscribeToDesktop(callback: () => void) {
  const media = window.matchMedia('(min-width: 1024px)');
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

export function Workspace({ scenario, isExample }: { scenario: Scenario; isExample: boolean }) {
  const desktop = useSyncExternalStore(
    subscribeToDesktop,
    () => window.matchMedia('(min-width: 1024px)').matches,
    () => false,
  );
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    isExample
      ? [...example.messages]
      : [
          {
            id: 'context',
            role: 'user',
            text: `App: ${scenario.app}\nAudience: ${scenario.audience}${scenario.useCase ? `\nUse case: ${scenario.useCase}` : ''}`,
          },
        ],
  );
  const [draft, setDraft] = useState('');
  const [completed, setCompleted] = useState<string[]>([]);
  function send() {
    if (!draft.trim()) return;
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', text: draft.trim() }]);
    setDraft('');
  }
  const conversation = (
    <ConversationPanel messages={messages} draft={draft} onDraftChange={setDraft} onSend={send} isExample={isExample} />
  );
  const guide = (
    <GuidePreview
      scenario={scenario}
      isExample={isExample}
      completed={completed}
      onToggle={(step, checked) =>
        setCompleted((current) => (checked ? [...current, step] : current.filter((item) => item !== step)))
      }
    />
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <BookOpenIcon className="size-4 shrink-0" aria-hidden="true" />
          <h1 className="truncate text-sm font-semibold" title={scenario.app}>
            {scenario.app}
          </h1>
          <span className="hidden text-sm text-muted-foreground sm:inline">/</span>
          <span className="hidden text-sm text-muted-foreground sm:inline">{scenario.audience}</span>
          {isExample && <Badge variant="secondary">Example</Badge>}
        </div>
        <Button variant="ghost" nativeButton={false} render={<Link href="/" />}>
          <ArrowLeftIcon data-icon="inline-start" />
          New guide
        </Button>
      </header>
      <div className="border-b bg-muted/40 px-4 py-2 text-center text-xs text-muted-foreground sm:px-6">
        {isExample
          ? 'Example workspace · Static sample content, not provider guidance.'
          : 'Research is not connected. Messages stay in this page and reset on refresh.'}
      </div>
      <main className="flex min-h-0 flex-1 flex-col">
        {desktop ? (
          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)]">
            {conversation}
            <div className="flex min-h-0 min-w-0 border-l">{guide}</div>
          </div>
        ) : (
          <Tabs defaultValue="chat" className="min-h-0 flex-1 gap-0">
            <div className="border-b px-4 py-2">
              <TabsList aria-label="Workspace view" className="w-full">
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="guide">Guide</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="chat" keepMounted className="min-h-0 overflow-hidden data-[hidden]:hidden">
              {conversation}
            </TabsContent>
            <TabsContent value="guide" keepMounted className="min-h-0 overflow-hidden data-[hidden]:hidden">
              {guide}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
