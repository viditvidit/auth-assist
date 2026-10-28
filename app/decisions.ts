'use server';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function readDecisions() {
  return readFile(join(process.cwd(), 'DECISIONS.md'), 'utf8');
}
