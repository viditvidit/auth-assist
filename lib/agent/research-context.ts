import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { findingsSchema, sourceSchema, type ResearchInput, type ResearchResult } from './schema';

function signature(payload: string) {
  const key = process.env.GOOGLE_API_KEY?.trim();
  if (!key) throw new Error('Research model is not configured. Set GOOGLE_API_KEY on the server.');
  // Purpose-separated signature; rotating the server key invalidates old page-local contexts.
  return createHmac('sha256', key).update(`auth-assist/research-context/v1:${payload}`).digest('base64url');
}

export function sealResearch(scenario: ResearchInput, research: ResearchResult) {
  let bytes = 0;
  const sources = research.sources.slice(-20).filter((source) => {
    bytes += Buffer.byteLength(source.content);
    return bytes <= 100_000;
  });
  const ids = new Set(sources.map((source) => source.id));
  const payload = Buffer.from(
    JSON.stringify({
      scenario,
      expiresAt: Date.now() + 60 * 60 * 1000,
      research: {
        ...research,
        sources,
        findings: research.findings.filter((finding) => finding.sourceIds.every((id) => ids.has(id))),
      },
    }),
  ).toString('base64url');
  return `${payload}.${signature(payload)}`;
}

export function openResearch(token: string, scenario: ResearchInput): ResearchResult {
  const [payload, supplied, extra] = token.split('.');
  if (!payload || !supplied || extra) throw new Error('Invalid research context.');
  const expected = Buffer.from(signature(payload));
  const received = Buffer.from(supplied);
  if (expected.length !== received.length || !timingSafeEqual(expected, received))
    throw new Error('Invalid research context.');
  const saved = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (saved.expiresAt < Date.now() || JSON.stringify(saved.scenario) !== JSON.stringify(scenario)) {
    throw new Error('Expired or mismatched research context.');
  }
  return findingsSchema.extend({ sources: sourceSchema.array().max(20) }).parse(saved.research);
}
