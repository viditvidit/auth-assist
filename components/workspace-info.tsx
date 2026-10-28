'use client';

import { useRef, useState } from 'react';
import { XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
        className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-3xl overflow-y-auto rounded-2xl border bg-background p-0 text-foreground backdrop:bg-black/25"
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
            <div className="space-y-6">
              <section>
                <h3 className="font-semibold">What are you setting up?</h3>
                <p className="mt-2 text-muted-foreground">
                  An OAuth app identifies your integration to a provider. Your users connect their own accounts by
                  granting that app permission; creating the app and approving each user's connection are separate
                  steps.
                </p>
              </section>
              <section>
                <h3 className="font-semibold">Start with your use case</h3>
                <p className="mt-2 text-muted-foreground">
                  Enter an app name or website and what your agent should do. Add who will connect if you know. Research
                  starts when you submit; you can clarify details in chat.
                </p>
              </section>
              <section>
                <h3 className="font-semibold">Read, refine, and share</h3>
                <p className="mt-2 text-muted-foreground">
                  The guide appears when ready. Follow-ups can produce new versions. Use the version selector to compare
                  them, View Markdown for the raw document, or Share to copy a link. A guide bar in chat opens that
                  version and copies its link.
                </p>
              </section>
              <section>
                <h3 className="font-semibold">Understand the evidence</h3>
                <p className="mt-2 text-muted-foreground">
                  Citations open supporting pages. Estimates and unknowns stay labelled. A partial guide has unresolved
                  questions; the agent checks official documentation, then external accounts within its research budget.
                  Complete means the guidance is actionable, not that provider approval is guaranteed.
                </p>
              </section>
              <section>
                <h3 className="font-semibold">Where you take over</h3>
                <p className="mt-2 text-muted-foreground">
                  The agent researches public documentation. You handle login, credentials, app registration, payment,
                  and approval submissions. Documentation research is not a tested setup attempt.
                </p>
              </section>
            </div>
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
