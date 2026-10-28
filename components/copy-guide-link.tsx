'use client';

import { useState } from 'react';
import { copyText } from '@/lib/copy-text';
import { CopyIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CopyGuideLink() {
  const [message, setMessage] = useState('');
  async function copy() {
    const link = window.location.href;
    try {
      await copyText(link);
      setMessage('Link copied.');
    } catch {
      setMessage('Clipboard access was blocked. Allow it and try again.');
    }
  }
  return (
    <div className="mt-4">
      <Button variant="outline" size="sm" onClick={copy}>
        <CopyIcon /> Share
      </Button>
      <span role="status" className="ml-3 text-xs">
        {message}
      </span>
    </div>
  );
}
