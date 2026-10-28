'use client';

import { useEffect, useRef } from 'react';
import { ArrowUpIcon, ListChecksIcon, SearchIcon } from 'lucide-react';
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
import { example, type ChatMessage } from '@/lib/example';

type Props = {
  messages: ChatMessage[];
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  isExample: boolean;
};

export function ConversationPanel({ messages, draft, onDraftChange, onSend, isExample }: Props) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length]);
  return (
    <section aria-label="Conversation" className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <div className="px-6 py-5">
        <h2 className="text-sm font-medium">Conversation</h2>
        <p className="mt-1 text-xs text-muted-foreground">Context and questions for your integration.</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 sm:px-6">
        <div role="log" aria-label="Messages" aria-live="polite" className="mx-auto flex max-w-2xl flex-col gap-7 py-3">
          {messages.map((message) => (
            <Message key={message.id} align={message.role === 'user' ? 'end' : 'start'}>
              <MessageContent>
                <MessageHeader>{message.role === 'user' ? 'You' : 'Assistant · Example'}</MessageHeader>
                <Bubble variant={message.role === 'user' ? 'secondary' : 'ghost'}>
                  <BubbleContent>
                    <p className="whitespace-pre-wrap wrap-anywhere">{message.text}</p>
                  </BubbleContent>
                </Bubble>
                {isExample && message.id === 'example-assistant' && (
                  <Trace className="mt-2">
                    <TraceCollapsible>
                      <TraceCollapsibleTrigger>
                        <TraceLine>
                          <TraceIcon>
                            <ListChecksIcon />
                          </TraceIcon>
                          <TraceTitle>Example research activity</TraceTitle>
                        </TraceLine>
                      </TraceCollapsibleTrigger>
                      <TraceCollapsibleContent>
                        <Trace>
                          {example.activity.map((activity) => (
                            <TraceCollapsible key={activity.title}>
                              <TraceCollapsibleTrigger>
                                <TraceLine>
                                  <TraceIcon>
                                    <SearchIcon />
                                  </TraceIcon>
                                  <TraceTitle>{activity.title}</TraceTitle>
                                </TraceLine>
                              </TraceCollapsibleTrigger>
                              <TraceCollapsibleContent>
                                <p className="text-sm">{activity.detail}</p>
                              </TraceCollapsibleContent>
                            </TraceCollapsible>
                          ))}
                        </Trace>
                      </TraceCollapsibleContent>
                    </TraceCollapsible>
                  </Trace>
                )}
              </MessageContent>
            </Message>
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
        <InputGroup>
          <InputGroupTextarea
            aria-label="Message"
            aria-describedby="composer-note"
            placeholder="Add context or ask a question…"
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            rows={3}
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
              disabled={!draft.trim()}
            >
              <ArrowUpIcon />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <p id="composer-note" className="mt-2 text-center text-xs text-muted-foreground">
          Local messages only. No assistant replies are generated.
        </p>
      </form>
    </section>
  );
}
