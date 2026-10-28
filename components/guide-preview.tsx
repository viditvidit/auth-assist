'use client';

import { FileTextIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { example, type Scenario } from '@/lib/example';

type Props = {
  scenario: Scenario;
  isExample: boolean;
  completed: string[];
  onToggle: (step: string, checked: boolean) => void;
};

export function GuidePreview({ scenario, isExample, completed, onToggle }: Props) {
  return (
    <section
      aria-label="Guide preview"
      className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-muted/20"
    >
      <div className="flex items-center justify-between px-6 py-5">
        <h2 className="text-sm font-medium">Guide preview</h2>
        <Badge variant="outline">{isExample ? 'Example' : 'Not generated'}</Badge>
      </div>
      {!isExample ? (
        <Empty className="my-auto">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileTextIcon />
            </EmptyMedia>
            <EmptyTitle>Your guide will appear here.</EmptyTitle>
            <EmptyDescription>
              Setup steps, approval requirements, and sources will be collected here once research is connected.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <article className="mx-4 mb-6 rounded-xl border bg-background p-5 sm:mx-6 sm:p-7">
          <h3 className="text-xl font-semibold tracking-tight wrap-anywhere">{scenario.app}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{scenario.useCase}</p>
          <p className="mt-3 text-xs text-muted-foreground">Audience: {scenario.audience}</p>
          <Accordion defaultValue={['overview', 'steps']} multiple className="mt-7">
            <AccordionItem value="overview">
              <AccordionTrigger>Overview</AccordionTrigger>
              <AccordionContent>
                <p>
                  This is a placeholder guide showing how research will be organized. It contains no verified provider
                  requirements.
                </p>
                <dl className="grid grid-cols-2 gap-4 py-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">Hands-on effort</dt>
                    <dd className="mt-1">Not assessed</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Approval wait</dt>
                    <dd className="mt-1">Not verified</dd>
                  </div>
                </dl>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="steps">
              <AccordionTrigger>Setup steps</AccordionTrigger>
              <AccordionContent>
                <FieldSet>
                  <FieldLegend className="sr-only">Example setup checklist</FieldLegend>
                  <FieldGroup>
                    {example.steps.map((step, index) => (
                      <Field key={step} orientation="horizontal">
                        <Checkbox
                          id={`step-${index}`}
                          checked={completed.includes(step)}
                          onCheckedChange={(checked) => onToggle(step, checked === true)}
                        />
                        <FieldLabel htmlFor={`step-${index}`}>{step}</FieldLabel>
                      </Field>
                    ))}
                  </FieldGroup>
                </FieldSet>
                <p className="mt-4 text-xs text-muted-foreground">Sample checklist · Changes reset on refresh.</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="approval">
              <AccordionTrigger>Approval requirements</AccordionTrigger>
              <AccordionContent>
                <p>
                  Provider-specific review triggers, prerequisites, and human handoffs will appear here. None have been
                  verified in this example.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="blockers">
              <AccordionTrigger>Blockers</AccordionTrigger>
              <AccordionContent>
                <p>
                  Research is not connected. Potential blockers and the actions needed to resolve them have not been
                  assessed.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="sources">
              <AccordionTrigger>Sources</AccordionTrigger>
              <AccordionContent>
                <p>No sources have been retrieved. This example does not include citations.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </article>
      )}
    </section>
  );
}
