import { redirect } from 'next/navigation';
import { Workspace } from '@/components/workspace';
import { audiences, example, type Audience } from '@/lib/example';

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const isExample = query.example === 'true';
  const app = typeof query.app === 'string' ? query.app.trim().slice(0, 200) : '';
  if (!isExample && !app) redirect('/');
  const audience = audiences.includes(query.audience as Audience) ? (query.audience as Audience) : 'My team';
  const scenario = isExample
    ? example.scenario
    : {
        app,
        useCase: typeof query.useCase === 'string' ? query.useCase.trim().slice(0, 2000) : '',
        audience,
      };
  return <Workspace key={JSON.stringify([isExample, scenario])} scenario={scenario} isExample={isExample} />;
}
