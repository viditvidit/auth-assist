import 'server-only';
import postgres from 'postgres';
import { z } from 'zod';
import { guideSnapshotSchema, type GuideListing } from './shared-guide';
import { guideFingerprint } from './guide-sharing';

let client: ReturnType<typeof postgres> | undefined;
export function guideDatabaseConfigured() {
  return !!process.env.OAUTH_GUIDES_DATABASE_URL?.trim();
}
function database() {
  const url = process.env.OAUTH_GUIDES_DATABASE_URL?.trim();
  if (!url) throw new Error('Guide storage is not configured.');
  // Transaction pooling does not support prepared statements.
  return (client ??= postgres(url, { prepare: false, max: 2, idle_timeout: 10, connect_timeout: 10, ssl: 'require' }));
}

export async function saveGuide(input: unknown, isExample = false) {
  const snapshot = guideSnapshotSchema.parse(input);
  if (isExample && snapshot.status !== 'complete') throw new Error('Only complete guides can be library examples.');
  const fingerprint = guideFingerprint(snapshot);
  const title =
    `${snapshot.guide.scenario.app} — ${snapshot.guide.scenario.useCase || snapshot.guide.scenario.audience}`.slice(
      0,
      400,
    );
  const sql = database();
  const rows = await sql<{ id: string }[]>`
    insert into oauth_guides.guides (title, content, fingerprint, is_example)
    values (${title}, ${sql.json(JSON.parse(JSON.stringify(snapshot)))}, ${fingerprint}, ${isExample})
    on conflict (fingerprint) do nothing returning id`;
  if (rows[0]) return rows[0].id;
  const existing = await sql<{ id: string }[]>`select id from oauth_guides.guides where fingerprint = ${fingerprint}`;
  return existing[0].id;
}

export async function getGuide(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const rows = await database()`select id, title, content, created_at from oauth_guides.guides where id = ${id}`;
  if (!rows[0]) return null;
  return {
    id: String(rows[0].id),
    title: String(rows[0].title),
    createdAt: new Date(rows[0].created_at).toISOString(),
    snapshot: guideSnapshotSchema.parse(rows[0].content),
  };
}

export async function listExampleGuides(): Promise<GuideListing[]> {
  const rows =
    await database()`select id, title, created_at from oauth_guides.guides where is_example = true and content->>'status' = 'complete' order by title limit 100`;
  return rows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    created_at: new Date(row.created_at).toISOString(),
  }));
}
