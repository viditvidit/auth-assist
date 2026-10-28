'use client';

import { useState, type FormEvent } from 'react';
import { ArrowUpRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { audiences, type Audience, type Scenario } from '@/lib/workspace-types';

export function SetupForm({
  onSubmit,
  initial,
  disabled = false,
}: {
  onSubmit: (scenario: Scenario) => void;
  initial?: Scenario;
  disabled?: boolean;
}) {
  const [app, setApp] = useState(initial?.app ?? '');
  const [useCase, setUseCase] = useState(initial?.useCase ?? '');
  const [audience, setAudience] = useState<Audience>(initial?.audience ?? 'Not specified');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (app.trim() && !disabled) onSubmit({ app: app.trim(), useCase: useCase.trim(), audience });
  }
  return (
    <form
      onSubmit={submit}
      className="grid shrink-0 items-end gap-4 border-b bg-background px-5 py-5 sm:grid-cols-[minmax(160px,0.8fr)_minmax(200px,1.5fr)_auto] lg:grid-cols-[minmax(180px,0.8fr)_minmax(240px,1.6fr)_180px_auto] sm:px-8"
    >
      <Field>
        <FieldLabel htmlFor="app">App name or link</FieldLabel>
        <Input
          id="app"
          placeholder="Gmail or github.com"
          required
          maxLength={200}
          value={app}
          onChange={(e) => setApp(e.target.value)}
          disabled={disabled}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="use-case">What do you want to build?</FieldLabel>
        <Input
          id="use-case"
          placeholder="Read emails and summarize new requests"
          maxLength={2000}
          value={useCase}
          onChange={(e) => setUseCase(e.target.value)}
          disabled={disabled}
        />
      </Field>
      <Field className="sm:col-start-1 lg:col-auto">
        <FieldLabel htmlFor="audience">
          Who connects? <span className="font-normal text-muted-foreground">Optional</span>
        </FieldLabel>
        <select
          id="audience"
          value={audience}
          onChange={(e) => setAudience(e.target.value as Audience)}
          disabled={disabled}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
        >
          {audiences.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </Field>
      <Button type="submit" disabled={!app.trim() || disabled}>
        Research <ArrowUpRightIcon data-icon="inline-end" />
      </Button>
    </form>
  );
}
