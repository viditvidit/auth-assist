import 'server-only';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { guideSnapshotSchema } from './shared-guide';

export function guideFingerprint(input: unknown) {
  return createHash('sha256')
    .update(JSON.stringify(guideSnapshotSchema.parse(input)))
    .digest('hex');
}

export function signGuide(input: unknown) {
  const key = process.env.GOOGLE_API_KEY?.trim();
  if (!key) throw new Error('Guide signing is not configured.');
  return createHmac('sha256', key)
    .update(`oauth-guide/share/v1:${guideFingerprint(input)}`)
    .digest('hex');
}

export function verifyGuide(input: unknown, token: string) {
  const expected = Buffer.from(signGuide(input));
  const supplied = Buffer.from(token);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
