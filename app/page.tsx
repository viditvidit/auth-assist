import { HomeExperience } from '@/components/home-experience';
import { guideDatabaseConfigured, listExampleGuides } from '@/lib/guide-store';
import type { GuideListing } from '@/lib/shared-guide';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let examples: GuideListing[] = [];
  let libraryError: string | undefined;
  if (guideDatabaseConfigured()) {
    try {
      examples = await listExampleGuides();
    } catch {
      libraryError = 'The example library is temporarily unavailable. You can still research an app.';
    }
  }
  return <HomeExperience examples={examples} libraryError={libraryError} />;
}
