'use client';

import { useRef, useState } from 'react';
import { ArrowUpRightIcon, CodeIcon, ShareIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ResearchMarkdown } from '@/components/research-markdown';
import { readDecisions } from '@/app/decisions';

export function WorkspaceInfo() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [view, setView] = useState<'help' | 'decisions'>('help');
  const [decisions, setDecisions] = useState<string>();
  const [error, setError] = useState(false);

  async function open(next: typeof view) {
    setView(next);
    dialog.current?.showModal();
    if (next !== 'decisions' || decisions !== undefined) return;
    setError(false);
    try {
      setDecisions(await readDecisions());
    } catch {
      setError(true);
    }
  }

  return (
    <>
      <Button variant="ghost" size="icon-sm" aria-label="Help" title="Help" onClick={() => void open('help')}>
        ?
      </Button>
      <Button variant="ghost" size="sm" onClick={() => void open('decisions')}>
        Decisions
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby="workspace-info-title"
        className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-3xl select-none overflow-y-auto rounded-2xl border bg-background p-0 text-foreground backdrop:bg-black/25"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-6 py-4">
          <h2 id="workspace-info-title" className="font-semibold">
            {view === 'help' ? 'Using OAuth Guide' : 'Agent decisions'}
          </h2>
          <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={() => dialog.current?.close()}>
            <XIcon />
          </Button>
        </div>
        <div className="p-6 text-sm leading-7 sm:p-8">
          {view === 'help' ? (
            <ol className="flex list-decimal flex-col gap-5 pl-5">
              <li>
                <span className="font-semibold">Start research.</span> Enter an app name or website, describe what you
                want to build, and optionally choose who will connect. Select <strong>Research</strong>.
                <div
                  aria-hidden="true"
                  className="pointer-events-none mt-3 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3"
                >
                  <Input tabIndex={-1} readOnly value="Slack" className="w-28 bg-background" />
                  <Input tabIndex={-1} readOnly value="Send channel updates" className="w-44 bg-background" />
                  <Select value="My team" items={[{ value: 'My team', label: 'My team' }]}>
                    <SelectTrigger tabIndex={-1}>
                      <SelectValue />
                    </SelectTrigger>
                  </Select>
                  <Button type="button" tabIndex={-1} size="sm">
                    Research <ArrowUpRightIcon data-icon="inline-end" />
                  </Button>
                </div>
              </li>
              <li>
                <span className="font-semibold">Read your guide.</span> The guide appears beside the chat when research
                finishes. On smaller screens, open the <strong>Guide</strong> tab. Select a citation to view its source.
              </li>
              <li>
                <span className="font-semibold">Ask follow-up questions.</span> Add context or ask a question in chat to
                refine the guide. Use the version selector to view an earlier version.
              </li>
              <li>
                <span className="font-semibold">Share or copy.</span> Select <strong>Share</strong> to copy a link to
                the selected guide. Select <strong>View Markdown</strong> to see and copy its text. Selecting a guide in
                chat opens that version and copies its link.
                <div
                  aria-hidden="true"
                  className="pointer-events-none mt-3 flex flex-wrap items-center gap-2 rounded-lg border bg-background p-2 shadow-sm"
                >
                  <span className="px-1 font-medium">Guide</span>
                  <Select value="version-1" items={[{ value: 'version-1', label: 'Version 1 · Latest' }]}>
                    <SelectTrigger tabIndex={-1} size="sm">
                      <SelectValue />
                    </SelectTrigger>
                  </Select>
                  <Badge variant="outline">Complete</Badge>
                  <Button type="button" tabIndex={-1} variant="ghost" size="sm">
                    <ShareIcon data-icon="inline-start" />
                    Share
                  </Button>
                  <Button type="button" tabIndex={-1} variant="ghost" size="sm">
                    <CodeIcon data-icon="inline-start" />
                    View Markdown
                  </Button>
                </div>
              </li>
              <li>
                <span className="font-semibold">Find guides.</span> Use <strong>Guides</strong> to reopen research from
                this tab, or <strong>Library</strong> to browse ready-to-read examples.
              </li>
            </ol>
          ) : decisions !== undefined ? (
            <ResearchMarkdown text={decisions.replace(/^# Agent decisions\s*/, '')} />
          ) : (
            <p role="status">
              {error ? 'Could not load decisions. Close this panel and try again.' : 'Loading decisions…'}
            </p>
          )}
        </div>
      </dialog>
    </>
  );
}
