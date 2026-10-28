'use client';

import { useState } from 'react';
import { FileTextIcon, CodeIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { LiveGuide } from '@/components/live-guide';
import { ShareGuide } from '@/components/share-guide';
import { guideMarkdown } from '@/lib/guide-markdown';
import type { ResearchState, GuideVersion } from '@/lib/research-session';

export function GuidePreview({
  result,
  versions = [],
  selectedVersionId,
  onSelectVersion,
}: {
  result?: ResearchState['result'];
  versions?: GuideVersion[];
  selectedVersionId?: string;
  onSelectVersion?: (id: string) => void;
}) {
  const [raw, setRaw] = useState(false);
  return (
    <section aria-label="Guide preview" className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b px-6 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium">Guide</h2>
          {versions.length > 0 && (
            <select
              aria-label="Guide version"
              value={selectedVersionId}
              onChange={(event) => onSelectVersion?.(event.target.value)}
              className="rounded-md border bg-background px-2 py-1 text-xs"
            >
              {versions.map((version, index) => (
                <option key={version.id} value={version.id}>
                  Version {index + 1}
                  {index === versions.length - 1 ? ' · Latest' : ''}
                </option>
              ))}
            </select>
          )}
          {result && <Badge variant="outline">{result.status === 'complete' ? 'Complete' : 'Partial'}</Badge>}
        </div>
        {result && (
          <div className="flex items-center gap-2">
            <ShareGuide key={selectedVersionId} result={result} />
            <Button variant="ghost" size="sm" onClick={() => setRaw(!raw)} aria-pressed={raw}>
              <CodeIcon data-icon="inline-start" />
              {raw ? 'View guide' : 'View Markdown'}
            </Button>
          </div>
        )}
      </div>
      {result ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {result.status === 'partial' && (
            <aside
              aria-label="Why this guide is partial"
              className="mx-6 mt-6 rounded-lg border bg-muted/40 p-5 text-sm sm:mx-8"
            >
              <h3 className="font-medium">Why this guide is partial</h3>
              <ul className="mt-2 list-disc space-y-2 pl-5 leading-relaxed text-muted-foreground">
                {(result.partialReasons?.length
                  ? result.partialReasons
                  : result.guide.unknowns.length
                    ? result.guide.unknowns
                    : ['Some setup or approval details could not be verified.']
                ).map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
              <p className="mt-3 text-muted-foreground">
                Ask a follow-up in chat to clarify these gaps before relying on the affected steps.
              </p>
            </aside>
          )}
          {raw ? (
            <textarea
              aria-label="Raw guide Markdown"
              readOnly
              value={guideMarkdown(result.guide)}
              className="h-full min-h-96 w-full resize-none bg-background p-8 font-mono text-xs leading-6 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            />
          ) : (
            <LiveGuide guide={result.guide} />
          )}
        </div>
      ) : (
        <Empty className="my-auto">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileTextIcon />
            </EmptyMedia>
            <EmptyTitle>Your integration guide</EmptyTitle>
            <EmptyDescription>Setup steps, permissions, and approval requirements will appear here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </section>
  );
}
