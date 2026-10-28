import type { ResearchInput } from '@/lib/agent/schema';

export { audiences, type Audience } from '@/lib/agent/schema';
export type Scenario = ResearchInput;
export type ChatMessage = { id: string; role: 'user' | 'assistant'; text: string };

export const example = {
  scenario: {
    app: 'Example app',
    useCase: 'Read project tasks and share updates.',
    audience: 'My team',
  } satisfies Scenario,
  messages: [
    {
      id: 'example-user',
      role: 'user',
      text: 'I want to connect Example app so my agent can read project tasks and share updates for my team.',
    },
    {
      id: 'example-assistant',
      role: 'assistant',
      text: 'This is a sample conversation. The guide beside it shows where setup steps, approval requirements, and sources will appear. No provider research has been performed.',
    },
  ] satisfies ChatMessage[],
  activity: [
    { title: 'Find official documentation', detail: 'Example activity only. No documentation has been retrieved.' },
    {
      title: 'Check setup and approval requirements',
      detail: 'Example activity only. Requirements remain unverified.',
    },
    { title: 'Prepare the guide', detail: 'This preview uses fixed placeholder content.' },
  ],
  steps: [
    'Identify the provider’s developer portal',
    'Confirm permissions for your use case',
    'Record setup and approval requirements',
  ],
};
