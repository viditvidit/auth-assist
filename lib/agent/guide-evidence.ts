import { z } from 'zod';
import { guideSchema, type Claim, type Guide } from './schema';

// Source records and the scenario are attached by the server, never authored by the model.
export const guideDraftSchema = guideSchema.omit({ scenario: true, sources: true });
export const evidenceReviewSchema = z.object({
  unresolvedUnknowns: z
    .array(z.string().trim().min(1))
    .describe(
      'All still-unresolved guide and research caveats after considering collected evidence; omit resolved questions.',
    ),
  blockingUnknowns: z
    .array(z.string().trim().min(1))
    .describe(
      'Unresolved questions from guide or research that materially affect the setup path; exclude optional caveats and evidence-resolved questions.',
    ),
  checks: z.array(
    z.object({
      claimId: z.string(),
      verdict: z.enum(['supported', 'unsupported', 'contradicted']),
      material: z
        .boolean()
        .describe(
          'Whether an unsupported claim changes setup, permissions, costs, distribution, or approval decisions.',
        ),
      reason: z.string().trim().min(1),
    }),
  ),
});

function claims(guide: Guide): Array<{ id: string; claim: Claim }> {
  return [
    { id: 'overview', claim: guide.overview },
    ...Object.entries(guide.approvals).map(([key, approval]) => ({
      id: `approvals.${key}`,
      claim: approval.explanation,
    })),
    ...guide.prerequisites.map((claim, i) => ({ id: `prerequisites.${i}`, claim })),
    ...guide.steps.map((step, i) => ({ id: `steps.${i}.action`, claim: step.action })),
    ...guide.approvalRequirements.map((claim, i) => ({ id: `approvalRequirements.${i}`, claim })),
    ...guide.blockers.flatMap((blocker, i) => [
      { id: `blockers.${i}.issue`, claim: blocker.issue },
      { id: `blockers.${i}.nextAction`, claim: blocker.nextAction },
    ]),
  ];
}

export function reviewClaims(guide: Guide) {
  return [
    ...claims(guide).map(({ id, claim }) => ({
      id,
      ...claim,
      text: id.startsWith('approvals.')
        ? `${guide.approvals[id.slice('approvals.'.length) as keyof Guide['approvals']].applicability}: ${claim.text}`
        : claim.text,
    })),
    ...(['effortEstimate', 'approvalWait'] as const).flatMap((id) => {
      const duration = guide[id];
      return duration.status === 'unknown'
        ? []
        : [
            {
              id,
              text: `${duration.value}. ${duration.explanation}`,
              evidenceStatus: duration.status,
              sourceIds: duration.sourceIds,
            },
          ];
    }),
  ];
}

export function applyEvidenceReview(guide: Guide, review: z.infer<typeof evidenceReviewSchema>) {
  guide.unknowns = [...review.unresolvedUnknowns];
  const sourceIds = new Set(guide.sources.map((source) => source.id));
  function unsupported(id: string, ids: string[], documented: boolean) {
    if (ids.some((sourceId) => !sourceIds.has(sourceId))) return 'References a source that was not collected.';
    if (documented && !ids.length) return 'Documented claim has no source reference.';
    const checks = review.checks.filter((check) => check.claimId === id);
    if (checks.length !== 1) return 'Evidence review did not return exactly one check for this claim.';
    const check = checks[0];
    return check.verdict === 'supported' ? null : `${check.verdict}: ${check.reason}`;
  }

  const partialReasons = [...review.blockingUnknowns];
  function recordFailure(id: string, reason: string) {
    guide.unknowns.push(`${id}: ${reason}`);
    const checks = review.checks.filter((check) => check.claimId === id);
    if (checks.length !== 1 || checks[0].material) partialReasons.push(reason);
  }

  for (const { id, claim } of claims(guide)) {
    const approval = id.startsWith('approvals.')
      ? guide.approvals[id.slice('approvals.'.length) as keyof Guide['approvals']]
      : null;
    const reason = unsupported(
      id,
      claim.sourceIds,
      claim.evidenceStatus === 'documented' || (approval !== null && approval.applicability !== 'unknown'),
    );
    claim.sourceIds = [...new Set(claim.sourceIds.filter((sourceId) => sourceIds.has(sourceId)))];
    if (reason) {
      claim.evidenceStatus = 'uncertain';
      recordFailure(id, reason);
    }
  }
  const providerReview = guide.approvals.providerReview;
  if (providerReview.applicability === 'not_required' && providerReview.explanation.evidenceStatus !== 'uncertain') {
    guide.approvalWait = {
      status: 'not_applicable',
      value: null,
      explanation: providerReview.explanation.text,
      sourceIds: [...providerReview.explanation.sourceIds],
    };
  }
  for (const id of ['effortEstimate', 'approvalWait'] as const) {
    const duration = guide[id];
    const reason =
      duration.status === 'unknown'
        ? null
        : unsupported(
            id === 'approvalWait' &&
              providerReview.applicability === 'not_required' &&
              providerReview.explanation.evidenceStatus !== 'uncertain'
              ? 'approvals.providerReview'
              : id,
            duration.sourceIds,
            duration.status === 'documented' || duration.status === 'not_applicable',
          );
    const validIds = [...new Set(duration.sourceIds.filter((sourceId) => sourceIds.has(sourceId)))];
    if (reason) {
      guide[id] = { status: 'unknown', value: null, explanation: reason, sourceIds: validIds };
      recordFailure(id, reason);
    } else duration.sourceIds = validIds;
  }
  for (const approval of Object.values(guide.approvals)) {
    if (approval.explanation.evidenceStatus === 'uncertain') approval.applicability = 'unknown';
  }
  if (
    guide.approvalWait.status === 'not_applicable' &&
    guide.approvals.providerReview.applicability !== 'not_required'
  ) {
    guide.approvalWait = {
      status: 'unknown',
      value: null,
      explanation: 'Provider review applicability is unresolved or conditional.',
      sourceIds: [],
    };
    guide.unknowns.push(guide.approvalWait.explanation);
    partialReasons.push(guide.approvalWait.explanation);
  }
  guide.unknowns = [...new Set([...guide.unknowns, ...review.blockingUnknowns])];
  if (guide.approvals.providerReview.applicability === 'unknown')
    partialReasons.push('Whether provider approval is required could not be established.');
  if (!guide.steps.length) partialReasons.push('No actionable setup steps could be established.');
  return { guide: guideSchema.parse(guide), partial: partialReasons.length > 0, partialReasons: [...new Set(partialReasons)] };
}
