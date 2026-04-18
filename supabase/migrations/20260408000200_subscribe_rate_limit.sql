create extension if not exists pgcrypto;

create table if not exists public.edge_request_guards (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null,
  scope text not null check (scope in ('actor', 'email')),
  subject_hash text not null check (subject_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);

create index if not exists idx_edge_request_guards_lookup
  on public.edge_request_guards(endpoint, scope, subject_hash, created_at desc);

alter table public.edge_request_guards enable row level security;

revoke all on table public.edge_request_guards from anon, authenticated;
