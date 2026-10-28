'use client';

import { createContext, useContext } from 'react';
import { ResearchMarkdown } from '@/components/research-markdown';
import { CitationFavicon } from '@/components/ai-elements/inline-citation';
import { Badge } from '@/components/ui/badge';
import type { Claim, Guide } from '@/lib/agent/schema';

const SourceContext = createContext<Guide['sources']>([]);

function ClaimText({ claim }: { claim: Claim }) {
  const sources = useContext(SourceContext);
  return (
    <div className="flex flex-col gap-2">
      <ResearchMarkdown text={claim.text} sources={sources} sourceIds={claim.sourceIds} />
      {claim.evidenceStatus !== 'documented' && <Badge variant="outline">{claim.evidenceStatus}</Badge>}
    </div>
  );
}

export function LiveGuide({ guide }: { guide: Guide }) {
  return (
    <SourceContext.Provider value={guide.sources}>
      <article className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-8 text-sm break-words sm:px-10 sm:py-10">
        <h3 className="text-xl font-semibold">{guide.scenario.app}</h3>
        <div className="flex flex-col gap-10">
          <section className="guide-section">
            <h3 className="mb-5 text-lg font-semibold tracking-tight">Overview and time</h3>
            <div className="flex flex-col gap-4">
              <ClaimText claim={guide.overview} />
              {(['effortEstimate', 'approvalWait'] as const).map((key) => (
                <div key={key}>
                  <h4 className="font-medium">
                    {key === 'effortEstimate' ? 'Hands-on effort' : 'Provider approval wait'}
                  </h4>
                  <p>
                    {guide[key].value ?? (guide[key].status === 'not_applicable' ? 'Not applicable' : 'Unknown')}
                    {guide[key].value && guide[key].status === 'estimated' ? ' · estimated' : ''}
                  </p>
                  <ResearchMarkdown
                    text={guide[key].explanation}
                    sources={guide.sources}
                    sourceIds={guide[key].sourceIds}
                  />
                </div>
              ))}
            </div>
          </section>
          <section className="guide-section">
            <h3 className="mb-5 text-lg font-semibold tracking-tight">Prerequisites</h3>
            <div className="flex flex-col gap-4">
              {guide.prerequisites.length ? (
                guide.prerequisites.map((claim, i) => <ClaimText key={i} claim={claim} />)
              ) : (
                <p>No prerequisites identified in this research.</p>
              )}
            </div>
          </section>
          <section className="guide-section">
            <h3 className="mb-5 text-lg font-semibold tracking-tight">Setup steps</h3>
            <div>
              <ol className="guide-steps">
                {guide.steps.map((step, index) => (
                  <li key={`${index}-${step.title}`}>
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <h4 className="text-base font-semibold leading-snug">{step.title}</h4>
                        <span className="text-xs text-muted-foreground">
                          {{ human: 'You', agent: 'Agent can help', provider: 'Provider' }[step.owner]}
                        </span>
                      </div>
                      <ClaimText claim={step.action} />
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>
          <section className="guide-section">
            <h3 className="mb-5 text-lg font-semibold tracking-tight">Approvals</h3>
            <div className="flex flex-col gap-5">
              {Object.entries(guide.approvals).map(([key, approval]) => (
                <div key={key} className="flex flex-col gap-2">
                  <h4 className="font-medium">
                    {
                      {
                        providerReview: 'Provider review',
                        organizationApproval: 'Organization approval',
                        marketplaceListing: 'Marketplace listing',
                      }[key]
                    }{' '}
                    · {approval.applicability.replaceAll('_', ' ')}
                  </h4>
                  <ClaimText claim={approval.explanation} />
                </div>
              ))}
              {guide.approvalRequirements.map((claim, i) => (
                <ClaimText key={i} claim={claim} />
              ))}
            </div>
          </section>
          <section className="guide-section">
            <h3 className="mb-5 text-lg font-semibold tracking-tight">Blockers and unknowns</h3>
            <div className="flex flex-col gap-4">
              {!guide.blockers.length && !guide.unknowns.length && (
                <p>No unresolved blockers identified in this research.</p>
              )}
              {guide.blockers.map((blocker, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <ClaimText claim={blocker.issue} />
                  <p className="font-medium">Next action · {blocker.owner}</p>
                  <ClaimText claim={blocker.nextAction} />
                </div>
              ))}
              <ul className="list-disc flex flex-col gap-2 pl-4">
                {guide.unknowns.map((unknown, i) => (
                  <li key={i}>
                    <ResearchMarkdown text={unknown} sources={guide.sources} />
                  </li>
                ))}
              </ul>
            </div>
          </section>
          <section className="guide-section">
            <h3 className="mb-5 text-lg font-semibold tracking-tight">Reading ({guide.sources.length})</h3>
            <div className="flex flex-col gap-4">
              {guide.sources.map((source) => (
                <div key={source.id} id={source.id} className="scroll-mt-4 flex flex-col gap-1">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 underline underline-offset-2"
                  >
                    <CitationFavicon url={source.url} />
                    <span>{source.title}</span>
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {source.contentType === 'page_text' ? 'Retrieved page' : 'Search excerpt'} · {source.retrievedAt}
                  </p>
                  <details>
                    <summary className="cursor-pointer text-xs">View collected text</summary>
                    <p className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                      {source.content}
                    </p>
                  </details>
                </div>
              ))}
            </div>
          </section>
        </div>
      </article>
    </SourceContext.Provider>
  );
}
