'use client';

import { isValidElement, type ReactElement } from 'react';
import { MermaidDiagram } from '@/components/mermaid-diagram';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  InlineCitation,
  InlineCitationCard,
  InlineCitationCardTrigger,
  InlineCitationCardBody,
  InlineCitationSource,
} from '@/components/ai-elements/inline-citation';
import type { Source } from '@/lib/agent/schema';

type Node = { type: string; value?: string; url?: string; children?: Node[] };

// Transform text nodes only: never rewrite code blocks, inline code, or existing link URLs.
function citationPlugin(sources: Source[]) {
  return () => (tree: Node) => {
    function visit(node: Node) {
      if (!node.children || node.type === 'link' || node.type === 'code' || node.type === 'inlineCode') return;
      node.children = node.children.flatMap((child): Node[] => {
        if (child.type !== 'text' || !child.value) {
          visit(child);
          return [child];
        }
        const text = child.value.replace(/\bSources?:\s*(?=\[?source_\d+)/g, '');
        const nodes: Node[] = [];
        let start = 0;
        for (const match of text.matchAll(/\[?(source_\d+)\]?/g)) {
          nodes.push({ type: 'text', value: text.slice(start, match.index) });
          const source = sources.find((item) => item.id === match[1]);
          nodes.push(
            source
              ? { type: 'link', url: `#citation-${source.id}`, children: [{ type: 'text', value: source.title }] }
              : { type: 'text', value: '(reference unavailable)' },
          );
          start = match.index! + match[0].length;
        }
        nodes.push({ type: 'text', value: text.slice(start) });
        return nodes;
      });
    }
    visit(tree);
  };
}

function Citation({ source }: { source: Source }) {
  return (
    <InlineCitation>
      <InlineCitationCard>
        <InlineCitationCardTrigger sources={[source.url]} label={source.title} />
        <InlineCitationCardBody className="p-4">
          <InlineCitationSource title={source.title} url={source.url} description={source.content.slice(0, 250)}>
            <p className="mt-2 text-xs text-muted-foreground">
              {source.contentType === 'page_text' ? 'Read from page' : 'Search excerpt'} ·{' '}
              {source.retrievedAt.slice(0, 10)}
            </p>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-xs text-primary underline"
            >
              Open page ↗
            </a>
          </InlineCitationSource>
        </InlineCitationCardBody>
      </InlineCitationCard>
    </InlineCitation>
  );
}

export function ResearchMarkdown({
  text,
  sources = [],
  sourceIds = [],
}: {
  text: string;
  sources?: Source[];
  sourceIds?: string[];
}) {
  // Older saved answers may contain an appended citation footer already cited in the body.
  text = text.replace(/\nSources:\s*([^\n]+)$/, (footer, ids: string, offset: number) => {
    const earlier = text.slice(0, offset);
    const missing = (ids.match(/source_\d+/g) ?? []).filter((id) => !earlier.includes(id));
    return missing.length ? `\n\n${missing.join(' ')}` : '';
  });
  const extra = sourceIds.filter((id) => !new RegExp(`\\b${id}\\b`).test(text));
  const content = `${text}${extra.length ? `\n\n${extra.join(' ')}` : ''}`;
  return (
    <div className="research-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, citationPlugin(sources)]}
        skipHtml
        components={{
          a: ({ href, children }) => {
            const source = sources.find((item) => href === `#citation-${item.id}` || href === item.url);
            if (source) return <Citation source={source} />;
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
          pre: ({ children }) => {
            const child = children as ReactElement<{ className?: string; children?: string }>;
            return isValidElement(child) && child.props.className === 'language-mermaid' ? (
              <MermaidDiagram code={String(child.props.children ?? '').trim()} />
            ) : (
              <pre>{children}</pre>
            );
          },
          img: () => null,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
