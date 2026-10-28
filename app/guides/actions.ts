'use server';

import { guideSnapshotSchema } from '@/lib/shared-guide';
import { verifyGuide } from '@/lib/guide-sharing';
import { saveGuide, getGuide } from '@/lib/guide-store';

export async function shareGuide(input: unknown, token: string) {
  try {
    if (typeof token !== 'string' || token.length !== 64 || JSON.stringify(input).length > 900_000)
      return { error: 'This guide cannot be shared. Generate a new version and try again.' };
    const snapshot = guideSnapshotSchema.parse(input);
    if (!verifyGuide(snapshot, token))
      return { error: 'This guide has changed or its signing key expired. Generate a new version to share.' };
    const id = await saveGuide(snapshot);
    return { path: `/guides/${id}` };
  } catch {
    return {
      error:
        'Could not save this guide. Check database configuration and try again. Your guide is still available here.',
    };
  }
}

export async function loadGuideVersions(ids: string[]) {
  if (!Array.isArray(ids) || ids.length > 100 || ids.some((id) => typeof id !== 'string' || id.length > 36))
    throw new Error('Invalid guide IDs.');
  return Promise.all(
    ids.map(async (id) => {
      const saved = await getGuide(id);
      return saved ? { guideId: saved.id, ...saved.snapshot } : null;
    }),
  );
}
