'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConversationPanel } from '@/components/conversation-panel';
import { GuidePreview } from '@/components/guide-preview';
import { saveSession, type ResearchSession } from '@/lib/research-session';
import { useResearch } from '@/lib/use-research';
import type { ChatMessage } from '@/lib/workspace-types';

function subscribeToDesktop(callback: () => void) {
  const media = window.matchMedia('(min-width: 1024px)');
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

export function Workspace({
  initialSession,
  onRunningChange,
}: {
  initialSession: ResearchSession;
  onRunningChange: (running: boolean) => void;
}) {
  const desktop = useSyncExternalStore(
    subscribeToDesktop,
    () => window.matchMedia('(min-width: 1024px)').matches,
    () => false,
  );
  const [messages, setMessages] = useState<ChatMessage[]>(initialSession.messages);
  const [tab, setTab] = useState('chat');
  const [draft, setDraft] = useState(initialSession.draft);
  const research = useResearch(
    initialSession.scenario,
    (message) => setMessages((current) => [...current, message]),
    initialSession.research,
    initialSession.messages.findLast((message) => message.role === 'assistant')?.id,
  );
  const pendingStart = useRef(initialSession.pendingStart);
  const [storageError, setStorageError] = useState(false);
  const saved = JSON.stringify({
    ...initialSession,
    pendingStart: pendingStart.current,
    messages,
    draft,
    research: research.snapshot,
  });
  useEffect(() => {
    setStorageError(!saveSession({ ...JSON.parse(saved), updatedAt: Date.now() }));
  }, [saved]);
  useEffect(() => {
    onRunningChange(research.running);
  }, [research.running, onRunningChange]);
  useEffect(() => {
    if (!pendingStart.current) return;
    // Consume once after Strict Mode's effect replay, never restart saved runs on refresh.
    const timer = setTimeout(() => {
      pendingStart.current = false;
      saveSession({ ...initialSession, pendingStart: false });
      void research.run(messages);
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function send() {
    if (!draft.trim() || research.running) return;
    const next: ChatMessage[] = [...messages, { id: crypto.randomUUID(), role: 'user', text: draft.trim() }];
    setMessages(next);
    setDraft('');
    void research.run(next);
  }
  function selectGuide(id: string) {
    research.selectVersion(id);
    setTab('guide');
  }
  const conversation = (
    <ConversationPanel
      messages={messages}
      draft={draft}
      onDraftChange={setDraft}
      onSend={send}
      research={research}
      onSelectGuide={selectGuide}
    />
  );
  const guide = (
    <GuidePreview
      key={research.result?.id}
      result={research.result}
      versions={research.versions}
      selectedVersionId={research.result?.id}
      onSelectVersion={selectGuide}
    />
  );
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      {storageError && (
        <p role="alert" className="px-6 py-2 text-xs text-destructive">
          Browser storage is full or unavailable. This research will not survive refresh.
        </p>
      )}
      {desktop ? (
        <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] grid-cols-[minmax(0,6fr)_minmax(0,4fr)]">
          {conversation}
          <div className="flex min-h-0 min-w-0 border-l">{guide}</div>
        </div>
      ) : (
        <Tabs value={tab} onValueChange={(value) => setTab(String(value))} className="min-h-0 flex-1 gap-0">
          <div className="border-b px-4 py-2">
            <TabsList aria-label="Workspace view" className="w-full">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="guide">Guide</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="chat" keepMounted className="min-h-0 overflow-hidden data-[hidden]:hidden">
            {conversation}
          </TabsContent>
          <TabsContent value="guide" keepMounted className="flex min-h-0 overflow-hidden data-[hidden]:hidden border">
            {guide}
          </TabsContent>
        </Tabs>
      )}
    </main>
  );
}
