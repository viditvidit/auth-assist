'use client';

import { useState, type ReactNode } from 'react';
import { CheckIcon, CopyIcon, ShareIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { shareGuide } from '@/app/guides/actions';
import { copyText } from '@/lib/copy-text';
import type { ResearchState } from '@/lib/research-session';

export function ShareGuide({
  result,
  children,
  onSelect,
  selected,
}: {
  result: NonNullable<ResearchState['result']>;
  children?: ReactNode;
  onSelect?: () => void;
  selected?: boolean;
}) {
  const [path, setPath] = useState(result.guideId ? `/guides/${result.guideId}` : '');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  async function copy() {
    onSelect?.();
    setError('');
    setBusy(true);
    try {
      let target = path;
      if (!target) {
        if (!result.shareToken) throw new Error('Generate a new version to share this guide.');
        const response = await shareGuide(result, result.shareToken);
        if (!response.path) throw new Error(response.error || 'Could not create a link.');
        target = response.path;
        setPath(target);
      }
      await copyText(new URL(target, window.location.origin).href);
      setCopied(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not copy the link.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={children ? 'mt-3 w-full' : ''}>
      <Button
        type="button"
        size="sm"
        variant={children ? 'outline' : 'ghost'}
        onClick={copy}
        disabled={busy}
        aria-pressed={children ? selected : undefined}
        aria-label={children ? 'Open guide and copy link' : 'Copy guide link'}
        className={children ? 'w-full justify-between' : ''}
      >
        {children || (
          <>
            <ShareIcon data-icon="inline-start" />
            {copied ? 'Copied' : 'Share'}
          </>
        )}
        {children && (
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            {copied ? 'Copied' : selected ? 'Viewing' : 'View guide'}
            {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
          </span>
        )}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
