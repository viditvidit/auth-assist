import 'server-only';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function readPrompt(
  name:
    | 'research-follow-up'
    | 'research'
    | 'search-web'
    | 'read-page'
    | 'generate-guide'
    | 'review-evidence'
    | 'repair-output',
) {
  return readFileSync(join(process.cwd(), 'lib/agent/prompts', `${name}.md`), 'utf8').trim();
}
