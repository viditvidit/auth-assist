import type { Claim, Guide } from './agent/schema';
import { displayAppName } from './app-name';

export function guideMarkdown(guide: Guide): string {
  const reference = (id: string) => {
    const source = guide.sources.find((item) => item.id === id);
    return source ? `[${source.title.replace(/[\[\]]/g, '')}](${source.url})` : '(reference unavailable)';
  };
  const claim = (item: Claim) =>
    `${item.text.replace(/\[?(source_\d+)\]?/g, (_, id) => reference(id))}${item.evidenceStatus === 'documented' ? '' : `\n\n*${item.evidenceStatus}*`}${item.sourceIds.length ? `\n\n${[...new Set(item.sourceIds)].map(reference).join(' · ')}` : ''}`;
  const duration = (key: 'effortEstimate' | 'approvalWait') => {
    const value = guide[key];
    return `### ${key === 'effortEstimate' ? 'Hands-on effort' : 'Provider approval wait'}\n\n${value.value ?? (value.status === 'not_applicable' ? 'Not applicable' : 'Unknown')}\n\n${value.explanation}\n\n${value.sourceIds.map(reference).join(' · ')}`;
  };
  return [
    `# ${displayAppName(guide.scenario.app)}`,
    guide.scenario.useCase,
    ...(guide.scenario.audience === 'Not specified' ? [] : [`Audience: ${guide.scenario.audience}`]),
    '## Overview',
    claim(guide.overview),
    duration('effortEstimate'),
    duration('approvalWait'),
    '## Prerequisites',
    ...guide.prerequisites.map((item) => `- ${claim(item)}`),
    '## Setup steps',
    ...guide.steps.map(
      (step, i) => `### ${i + 1}. ${step.title}\n\nResponsible: ${step.owner}\n\n${claim(step.action)}`,
    ),
    '## Approvals',
    ...Object.entries(guide.approvals).map(
      ([key, value]) =>
        `### ${{ providerReview: 'Provider review', organizationApproval: 'Organization approval', marketplaceListing: 'Marketplace listing' }[key]} — ${value.applicability.replaceAll('_', ' ')}\n\n${claim(value.explanation)}`,
    ),
    ...guide.approvalRequirements.map(claim),
    '## Blockers and unknowns',
    ...guide.blockers.map((item) => `${claim(item.issue)}\n\nNext action (${item.owner}): ${claim(item.nextAction)}`),
    ...guide.unknowns.map((item) => `- ${item}`),
    '## Reading',
    ...guide.sources.map(
      (source) =>
        `- ${reference(source.id)} — ${source.contentType.replaceAll('_', ' ')}; retrieved ${source.retrievedAt}`,
    ),
  ]
    .filter(Boolean)
    .join('\n\n');
}
