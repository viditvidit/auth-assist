'use client';

import { useState } from 'react';
import { FileTextIcon, CodeIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { LiveGuide } from '@/components/live-guide';
import { guideMarkdown } from '@/lib/guide-markdown';
import type { Guide } from '@/lib/agent/schema';

export function GuidePreview({ result }: { result?: { guide: Guide; status: 'complete' | 'partial' } | null }) {
  const [raw, setRaw] = useState(false);
  return (
    <section aria-label="Guide preview" className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b px-6 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium">Guide</h2>
          {result && <Badge variant="outline">{result.status === 'complete' ? 'Complete' : 'Partial'}</Badge>}
        </div>
        {result && (
          <Button variant="ghost" size="sm" onClick={() => setRaw(!raw)} aria-pressed={raw}>
            <CodeIcon data-icon="inline-start" />
            {raw ? 'View guide' : 'View Markdown'}
          </Button>
        )}
      </div>
      {result ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
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
