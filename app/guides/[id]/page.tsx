import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getGuide } from '@/lib/guide-store';
import { LiveGuide } from '@/components/live-guide';
import { CopyGuideLink } from '@/components/copy-guide-link';
import { displayGuideTitle } from '@/lib/app-name';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Shared OAuth guide', robots: { index: false, follow: false } };

export default async function SharedGuide({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const saved = await getGuide(id);
  if (!saved) notFound();
  return (
    <main className="mx-auto max-w-4xl py-8">
      <header className="mb-8 border-b px-6 pb-6 sm:px-8">
        <Link href="/" className="text-sm underline">
          Research another app
        </Link>
        <h1 className="mt-6 text-2xl font-semibold">{displayGuideTitle(saved.title)}</h1>
        <CopyGuideLink />
        <p className="mt-3 text-sm text-muted-foreground">
          Read-only snapshot · {saved.snapshot.status} · Saved {saved.createdAt.slice(0, 10)}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Audience: {saved.snapshot.guide.scenario.audience}
        </p>
        {!!saved.snapshot.partialReasons.length && (
          <ul className="mt-4 list-disc pl-5 text-sm">
            {saved.snapshot.partialReasons.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        )}
      </header>
      <LiveGuide guide={saved.snapshot.guide} />
    </main>
  );
}
