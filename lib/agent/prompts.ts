import 'server-only';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function readPrompt(name: 'research' | 'search-web' | 'read-page') {
  return readFileSync(join(process.cwd(), 'lib/agent/prompts', `${name}.md`), 'utf8').trim();
}
