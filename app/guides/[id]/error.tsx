'use client';
import Link from 'next/link';

export default function GuideError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-xl font-semibold">This guide is temporarily unavailable</h1>
      <p className="my-4">The saved guide could not be loaded. Please try again shortly.</p>
      <button className="mr-6 underline" onClick={reset}>
        Try again
      </button>
      <Link className="underline" href="/">
        Back to research
      </Link>
    </main>
  );
}
