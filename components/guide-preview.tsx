'use client';

import { useState } from 'react';
import { FileTextIcon, CodeIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
      {result ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {result.status === 'partial' && (
            <aside
              aria-label="Why this guide is partial"
              className="mx-6 mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm sm:mx-8"
            >
              <h3 className="font-semibold text-amber-700">The guide is partial, understand why</h3>
              <ul className="mt-2 list-disc space-y-2 pl-5 leading-relaxed text-amber-700">
                {(result.partialReasons?.length
                  ? result.partialReasons
                  : result.guide.unknowns.length
                    ? result.guide.unknowns
                    : ['Some setup or approval details could not be verified.']
                ).map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
              <p className="mt-2 text-amber-700">
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
      <div className="mx-4 mb-4 mt-2 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-lg border bg-background p-2 shadow-lg">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="text-sm font-medium">Guide</h2>
          {versions.length > 0 && (
            <Select
              value={selectedVersionId}
              onValueChange={(value) => {
                if (value) onSelectVersion?.(value);
              }}
              items={versions.map((version, index) => ({
                value: version.id,
                label: `Version ${index + 1}${index === versions.length - 1 ? ' · Latest' : ''}`,
              }))}
            >
              <SelectTrigger size="sm" aria-label="Guide version">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {versions.map((version, index) => (
                    <SelectItem key={version.id} value={version.id}>
                      Version {index + 1}
                      {index === versions.length - 1 ? ' · Latest' : ''}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
          {result && <Badge variant="outline">{result.status === 'complete' ? 'Complete' : 'Partial'}</Badge>}
        </div>
        {result && (
          <div className="flex flex-wrap items-center gap-2">
            <ShareGuide key={selectedVersionId} result={result} />
            <Button variant="ghost" size="sm" onClick={() => setRaw(!raw)} aria-pressed={raw}>
              <CodeIcon data-icon="inline-start" />
              {raw ? 'View guide' : 'View Markdown'}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
