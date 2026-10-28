'use client';

import { Fragment, useEffect, useRef } from 'react';
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
import { ShareGuide } from '@/components/share-guide';
import { ResearchMarkdown } from '@/components/research-markdown';
import { Button } from '@/components/ui/button';
import type { useResearch } from '@/lib/use-research';
import { type ChatMessage } from '@/lib/workspace-types';
import { displayAppName } from '@/lib/app-name';

type Props = {
  messages: ChatMessage[];
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onSelectGuide: (id: string) => void;
  research: ReturnType<typeof useResearch>;
};

export function ConversationPanel({ messages, draft, onDraftChange, onSend, research, onSelectGuide }: Props) {
  const end = useRef<HTMLDivElement>(null);
  const activities = research.activities.filter((activity) => activity.status === 'started');
  const lastUserIndex = messages.findLastIndex((message) => message.role === 'user');
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length]);
  return (
    <section aria-label="Conversation" className="flex h-full min-h-0 min-w-0 flex-1 flex-col pt-10">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 sm:px-6">
        <div role="log" aria-label="Messages" aria-live="polite" className="mx-auto flex max-w-3xl flex-col gap-7 py-3">
          {messages.map((message, messageIndex) => (
            <Fragment key={message.id}>
              <Message align={message.role === 'user' ? 'end' : 'start'}>
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
                  {research.versions.map(
                    (version, index) =>
                      version.messageId === message.id && (
                        <ShareGuide
                          key={version.id}
                          result={version}
                          selected={research.result?.id === version.id}
                          onSelect={() => onSelectGuide(version.id)}
                        >
                          <span>
                            {displayAppName(version.guide.scenario.app)} · Guide v{index + 1}
                          </span>
                        </ShareGuide>
                      ),
                  )}
                </MessageContent>
              </Message>
              {messageIndex === lastUserIndex && activities.length > 0 && (
                <Trace>
                  <TraceCollapsible>
                    <TraceCollapsibleTrigger>
                      <TraceLine>
                        <TraceIcon>
                          <SearchIcon />
                        </TraceIcon>
                        <TraceTitle>Research activity ({activities.length})</TraceTitle>
                      </TraceLine>
                    </TraceCollapsibleTrigger>
                    <TraceCollapsibleContent>
                      <ol className="flex flex-col gap-3 text-xs">
                        {activities.map((activity, index) => (
                          <li key={index} className="break-words">
                            <span className="font-medium">
                              {activity.tool === 'searchWeb' ? 'Searching' : 'Reading'}
                            </span>
                            <p className="mt-1 text-muted-foreground">{activity.input}</p>
                          </li>
                        ))}
                      </ol>
                    </TraceCollapsibleContent>
                  </TraceCollapsible>
                </Trace>
              )}
            </Fragment>
          ))}
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
        {research.running && (
          <div className="mb-3 flex items-center gap-3">
            <Button type="button" variant="outline" onClick={research.stop}>
              Stop
            </Button>
          </div>
        )}
        {research.error && (
          <p role="alert" className="mb-3 text-sm text-destructive">
            {research.error}
          </p>
        )}
        <InputGroup className="rounded-xl border border-foreground/20 bg-card">
          <InputGroupTextarea
            aria-label="Message"
            placeholder="Ask a question…"
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            rows={3}
            maxLength={4000}
            disabled={research.running}
            className="max-h-48 px-4 pt-4"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                onSend();
              }
            }}
          />
          <InputGroupAddon align="block-end" className="justify-between pl-4">
            <span className="text-xs text-muted-foreground">Shift + Enter for a new line</span>
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
