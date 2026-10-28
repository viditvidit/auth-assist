import Link from 'next/link';
import { guideDatabaseConfigured, listExampleGuides } from '@/lib/guide-store';
import type { GuideListing } from '@/lib/shared-guide';
import { displayGuideTitle } from '@/lib/app-name';

export const dynamic = 'force-dynamic';

export default async function GuideLibrary() {
  let guides: GuideListing[] = [];
  let unavailable = !guideDatabaseConfigured();
  if (!unavailable) {
    try {
      guides = await listExampleGuides();
    } catch {
      unavailable = true;
    }
  }
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm underline">
        Research an app
      </Link>
      <h1 className="mt-8 text-2xl font-semibold">Guide library</h1>
      <p className="mt-3 text-sm text-muted-foreground">Research guides that i have personally tested appear here.</p>
      {unavailable ? (
        <p role="status" className="mt-8">
          The guide library is temporarily unavailable. Please try again shortly.
        </p>
      ) : guides.length ? (
        <ul className="mt-8 divide-y">
          {guides.map((guide) => (
            <li key={guide.id} className="py-5">
              <Link href={`/guides/${guide.id}`} className="font-medium underline underline-offset-4">
                {displayGuideTitle(guide.title)}
              </Link>
              <p className="mt-2 text-xs text-muted-foreground">
                {guide.status === 'partial' ? 'Partial · ' : ''}Saved {guide.created_at.slice(0, 10)}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8">No example guides are available yet.</p>
      )}
    </main>
  );
}
