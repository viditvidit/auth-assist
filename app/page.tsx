import { BookOpenIcon } from 'lucide-react';
import { SetupForm } from '@/components/setup-form';

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 items-center gap-2 border-b px-6 sm:px-10">
        <BookOpenIcon className="size-4" aria-hidden="true" />
        <span className="text-sm font-semibold">OAuth Guide</span>
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-16 sm:py-24">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Set up your app integration.</h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Start with the app and what you want to build. Keep your research, next steps, and setup guide in one place.
        </p>
        <SetupForm />
      </main>
      <footer className="px-6 pb-6 text-center text-xs text-muted-foreground">
        UI preview · Research is not connected
      </footer>
    </div>
  );
}
