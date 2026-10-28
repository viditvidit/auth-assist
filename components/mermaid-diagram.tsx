'use client';

import { useEffect, useId, useState } from 'react';

export function MermaidDiagram({ code }: { code: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [image, setImage] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setImage('');
    setFailed(false);
    void (async () => {
      try {
        // Only declarative diagrams; model text cannot change renderer configuration or add actions.
        if (code.length > 10_000 || /%%\{|^---|\bclick\s|<\/?[a-z]/im.test(code))
          throw new Error('Unsupported diagram');
        const { default: mermaid } = await import('mermaid');
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'neutral',
          suppressErrorRendering: true,
          maxTextSize: 10_000,
          flowchart: { htmlLabels: false },
        });
        const { svg } = await mermaid.render(`diagram${id}`, code);
        if (!cancelled) setImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, id]);
  if (failed)
    return (
      <div>
        <p className="text-xs text-muted-foreground">Diagram unavailable; showing its definition.</p>
        <pre>
          <code>{code}</code>
        </pre>
      </div>
    );
  return (
    <figure className="my-5 overflow-x-auto rounded-lg border bg-background p-5">
      {image ? (
        <img src={image} alt="Diagram illustrating the setup flow" className="mx-auto max-w-full" />
      ) : (
        <p role="status" className="text-xs text-muted-foreground">
          Rendering diagram…
        </p>
      )}
    </figure>
  );
}
