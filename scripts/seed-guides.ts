import { generateGuide } from '../lib/agent/generate-guide';
import { guideDatabaseConfigured, saveGuide } from '../lib/guide-store';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { guideSnapshotSchema } from '../lib/shared-guide';

// Creates actual researched examples; this is intentionally not run during builds.
const scenarios = [
  { app: 'Vercel', useCase: 'Provide updates of all deployments', audience: 'My team' },
  { app: 'PostHog MCP', useCase: 'Provide alerts and show details and logs', audience: 'My team' },
];
const persist = guideDatabaseConfigured() && !process.argv.includes('--research-only');

for (const scenario of scenarios) {
  const path = `data/examples/${scenario.app.toLowerCase().replaceAll(' ', '-')}.json`;
  try {
    const cached = guideSnapshotSchema.parse(JSON.parse(await readFile(path, 'utf8')));
    if (cached.status !== 'complete') {
      console.log(`${scenario.app}: skipped partial example`);
      continue;
    }
    const id = persist ? await saveGuide(cached, true) : null;
    console.log(`${scenario.app}: ${id ? `saved existing research /guides/${id}` : 'research saved locally'}`);
    continue;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  console.log(`Researching ${scenario.app}…`);
  const result = await generateGuide(scenario);
  if (result.status === 'error' || result.status === 'clarification_required') {
    console.error(`${scenario.app}: ${result.status === 'error' ? result.error : result.clarification}`);
    process.exitCode = 1;
    continue;
  }
  const snapshot = guideSnapshotSchema.parse(result);
  if (snapshot.status !== 'complete') {
    console.log(
      JSON.stringify({
        app: scenario.app,
        status: snapshot.status,
        reasons: snapshot.partialReasons,
        unknowns: snapshot.guide.unknowns,
      }),
    );
    continue;
  }
  await mkdir('data/examples', { recursive: true });
  await writeFile(path, JSON.stringify(snapshot, null, 2) + '\n');
  const id = persist ? await saveGuide(snapshot, true) : null;
  console.log(`${scenario.app}: ${result.status}, ${id ? `saved /guides/${id}` : 'research saved locally'}`);
}
