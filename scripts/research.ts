import { researchProvider } from '../lib/agent/research';
import { generateGuide } from '../lib/agent/generate-guide';

const args = process.argv.slice(2);
const guideMode = args[0] === '--guide';
if (guideMode) args.shift();
const [app, useCase = '', audience = 'My team'] = args;
if (!app) {
  console.error('Usage: npm run research -- "App name or website" "Use case" "My team|Pilot users|External customers"');
  process.exitCode = 1;
} else {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.once('SIGINT', cancel);
  try {
    const result = await (guideMode ? generateGuide : researchProvider)(
      { app, useCase, audience },
      {
        signal: controller.signal,
        onActivity: ({ tool, status, input }) => console.error(`[${tool}] ${status}: ${input}`),
      },
    );
    console.log(JSON.stringify(result, null, 2));
    if (result.status === 'partial' || result.status === 'error') process.exitCode = 1;
  } catch {
    console.error(
      'Research could not start. Check the audience and set GOOGLE_API_KEY, GEMINI_MODEL, and PERPLEXITY_API_KEY in .env.local.',
    );
    process.exitCode = 1;
  } finally {
    process.removeListener('SIGINT', cancel);
  }
}
