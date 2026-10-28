import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyEvidenceReview, reviewClaims } from '../lib/agent/guide-evidence';
import { guideSchema } from '../lib/agent/schema';

function fixture() {
  const claim = {
    text: 'Documented scenario-specific setup path.',
    evidenceStatus: 'documented',
    sourceIds: ['source_1'],
  };
  const unknown = { status: 'unknown', value: null, explanation: 'No published duration.', sourceIds: [] };
  const guide = guideSchema.parse({
    scenario: { app: 'Example', useCase: 'Read data', audience: 'My team' },
    overview: claim,
    effortEstimate: unknown,
    approvalWait: unknown,
    approvals: {
      providerReview: { applicability: 'not_required', explanation: claim },
      organizationApproval: { applicability: 'conditional', explanation: claim },
      marketplaceListing: { applicability: 'not_required', explanation: claim },
    },
    prerequisites: [],
    steps: [{ title: 'Register', action: claim, owner: 'human' }],
    approvalRequirements: [],
    blockers: [],
    unknowns: ['Old approval-wait question'],
    sources: [
      {
        id: 'source_1',
        title: 'Documentation',
        url: 'https://example.com/docs',
        retrievedAt: '2026-10-28T00:00:00.000Z',
        contentType: 'page_text',
        content: 'Scenario-specific evidence.',
      },
    ],
  });
  const review = {
    unresolvedUnknowns: ['Optional detail unavailable'],
    blockingUnknowns: [] as string[],
    checks: reviewClaims(guide).map(({ id }) => ({
      claimId: id,
      verdict: 'supported' as const,
      reason: 'Supported.',
      material: true,
    })),
  };
  return { guide, review };
}

test('supported no-review conclusion removes an irrelevant wait and retains optional caveats without partial status', () => {
  const { guide, review } = fixture();
  const result = applyEvidenceReview(guide, review);
  assert.equal(result.guide.approvalWait.status, 'not_applicable');
  assert.equal(result.guide.approvalWait.value, null);
  assert.deepEqual(result.guide.unknowns, ['Optional detail unavailable']);
  assert.equal(result.partial, false);
});

test('missing approval evidence cannot produce a not-applicable wait or complete guide', () => {
  const { guide, review } = fixture();
  review.checks = review.checks.filter((check) => check.claimId !== 'approvals.providerReview');
  const result = applyEvidenceReview(guide, review);
  assert.equal(result.guide.approvals.providerReview.applicability, 'unknown');
  assert.equal(result.guide.approvalWait.status, 'unknown');
  assert.equal(result.partial, true);
});

test('an unresolved material question keeps the guide partial', () => {
  const { guide, review } = fixture();
  review.blockingUnknowns.push('Required permissions could not be confirmed.');
  const result = applyEvidenceReview(guide, review);
  assert.equal(result.partial, true);
  assert.ok(result.guide.unknowns.includes(review.blockingUnknowns[0]));
});
