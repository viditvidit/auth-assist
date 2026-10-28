-- Apply once to the Supabase project using its SQL editor or connector.
-- Private schema: the website uses a server-only Postgres connection.
create schema oauth_guides;
revoke all on schema oauth_guides from public, anon, authenticated;
create table oauth_guides.guides (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 400),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  fingerprint text not null unique,
  is_example boolean not null default false,
  created_at timestamptz not null default now()
);
alter table oauth_guides.guides enable row level security;
revoke all on oauth_guides.guides from public, anon, authenticated;
