'use client';

import { useEffect, useRef } from 'react';
import { ArrowUpIcon, SearchIcon } from 'lucide-react';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { Message, MessageContent, MessageHeader } from '@/components/ui/message';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from '@/components/ui/input-group';
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from '@/components/ui/trace';
import { ResearchMarkdown } from '@/components/research-markdown';
import { Button } from '@/components/ui/button';
import type { useResearch } from '@/lib/use-research';
import { type ChatMessage } from '@/lib/workspace-types';

type Props = {
  messages: ChatMessage[];
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  research: ReturnType<typeof useResearch>;
};

export function ConversationPanel({ messages, draft, onDraftChange, onSend, research }: Props) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length]);
  return (
    <section aria-label="Conversation" className="flex h-full min-h-0 min-w-0 flex-1 flex-col pt-10">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 sm:px-6">
        <div role="log" aria-label="Messages" aria-live="polite" className="mx-auto flex max-w-3xl flex-col gap-7 py-3">
          {messages.map((message) => (
            <Message key={message.id} align={message.role === 'user' ? 'end' : 'start'}>
              <MessageContent>
                <MessageHeader>{message.role === 'user' ? 'You' : 'Assistant'}</MessageHeader>
                <Bubble variant={message.role === 'user' ? 'secondary' : 'ghost'}>
                  <BubbleContent>
                    {message.role === 'assistant' ? (
                      <ResearchMarkdown text={message.text} sources={message.sources} />
                    ) : (
                      <p className="whitespace-pre-wrap wrap-anywhere">{message.text}</p>
                    )}
                  </BubbleContent>
                </Bubble>
              </MessageContent>
            </Message>
          ))}
          {research.activities.length > 0 && (
            <Trace>
              <TraceCollapsible>
                <TraceCollapsibleTrigger>
                  <TraceLine>
                    <TraceIcon>
                      <SearchIcon />
                    </TraceIcon>
                    <TraceTitle>Research activity ({research.activities.length})</TraceTitle>
                  </TraceLine>
                </TraceCollapsibleTrigger>
                <TraceCollapsibleContent>
                  <ol className="flex flex-col gap-3 text-xs">
                    {research.activities.map((activity, index) => (
                      <li key={index} className="break-words">
                        <span className="font-medium">
                          {activity.tool === 'searchWeb' ? 'Search' : 'Read page'} · {activity.status}
                        </span>
                        <p className="mt-1 text-muted-foreground">{activity.input}</p>
                      </li>
                    ))}
                  </ol>
                </TraceCollapsibleContent>
              </TraceCollapsible>
            </Trace>
          )}
          <div ref={end} />
        </div>
      </div>
      <form
        className="mx-auto w-full max-w-2xl shrink-0 px-4 pb-4 sm:px-6 sm:pb-6"
        onSubmit={(event) => {
          event.preventDefault();
          onSend();
        }}
      >
        <div className="mb-3 flex items-center gap-3">
          {research.running && (
            <Button type="button" variant="outline" onClick={research.stop}>
              Stop
            </Button>
          )}
          <p role="status" className="text-xs text-muted-foreground">
            {research.status}
          </p>
        </div>
        {research.error && (
          <p role="alert" className="mb-3 text-sm text-destructive">
            {research.error}
          </p>
        )}
        <InputGroup>
          <InputGroupTextarea
            aria-label="Message"
            placeholder="Add context or ask a question…"
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            rows={3}
            maxLength={4000}
            disabled={research.running}
            className="max-h-48"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                onSend();
              }
            }}
          />
          <InputGroupAddon align="block-end" className="justify-between">
            <span className="text-xs">Shift + Enter for a new line</span>
            <InputGroupButton
              type="submit"
              variant="default"
              size="icon-sm"
              aria-label="Send message"
              disabled={!draft.trim() || research.running}
            >
              <ArrowUpIcon />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </form>
    </section>
  );
}
