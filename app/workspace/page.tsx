import { redirect } from 'next/navigation';
import { HomeExperience } from '@/components/home-experience';
import { audiences, type Audience } from '@/lib/workspace-types';

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const app = typeof query.app === 'string' ? query.app.trim().slice(0, 200) : '';
  if (!app) redirect('/');
  const audience = audiences.some((audience) => audience === query.audience)
    ? (query.audience as Audience)
    : 'Not specified';
  return (
    <HomeExperience
      initialScenario={{
        app,
        useCase: typeof query.useCase === 'string' ? query.useCase.slice(0, 2000) : '',
        audience,
      }}
    />
  );
}
