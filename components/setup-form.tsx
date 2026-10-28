'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ArrowRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { audiences, type Audience } from '@/lib/example';

export function SetupForm() {
  const router = useRouter();
  const [app, setApp] = useState('');
  const [useCase, setUseCase] = useState('');
  const [audience, setAudience] = useState<Audience>('My team');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!app.trim()) return;
    const query = new URLSearchParams({ app: app.trim(), useCase: useCase.trim(), audience });
    router.push(`/workspace?${query}`);
  }

  return (
    <form onSubmit={submit} className="mt-10">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="app">App name or website</FieldLabel>
          <Input
            id="app"
            name="app"
            placeholder="e.g. Slack or slack.com"
            required
            maxLength={200}
            value={app}
            onChange={(event) => setApp(event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="use-case">What should your agent do?</FieldLabel>
          <Textarea
            id="use-case"
            name="useCase"
            placeholder="e.g. Read project tasks and share updates"
            rows={3}
            maxLength={2000}
            value={useCase}
            onChange={(event) => setUseCase(event.target.value)}
          />
          <FieldDescription>Optional. A little context helps shape the guide.</FieldDescription>
        </Field>
        <FieldSet>
          <FieldLegend variant="label" id="audience-label">
            Who will connect?
          </FieldLegend>
          <ToggleGroup
            aria-labelledby="audience-label"
            variant="outline"
            value={[audience]}
            onValueChange={(values) => {
              if (values.length) setAudience(values[0] as Audience);
            }}
            className="flex-wrap"
          >
            {audiences.map((option) => (
              <ToggleGroupItem key={option} value={option}>
                {option}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </FieldSet>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" disabled={!app.trim()}>
            Open workspace <ArrowRightIcon data-icon="inline-end" />
          </Button>
          <Button variant="ghost" size="lg" nativeButton={false} render={<Link href="/workspace?example=true" />}>
            View example
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
