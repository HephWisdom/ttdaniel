create extension if not exists pgcrypto;

create table if not exists public.site_analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('page_view', 'section_view', 'blog_post_view')),
  path text not null,
  section text,
  post_id text,
  session_token text not null,
  created_at timestamptz not null default now(),
  check (char_length(path) between 1 and 200),
  check (section is null or char_length(section) between 1 and 80),
  check (post_id is null or char_length(post_id) between 1 and 120),
  check (char_length(session_token) between 8 and 120)
);

create index if not exists idx_site_analytics_events_created_at
  on public.site_analytics_events(created_at desc);

create index if not exists idx_site_analytics_events_type_created_at
  on public.site_analytics_events(event_type, created_at desc);

create index if not exists idx_site_analytics_events_post_id
  on public.site_analytics_events(post_id)
  where post_id is not null;

create index if not exists idx_site_analytics_events_section
  on public.site_analytics_events(section)
  where section is not null;

alter table public.site_analytics_events enable row level security;

drop policy if exists "Public insert site analytics events" on public.site_analytics_events;
create policy "Public insert site analytics events"
  on public.site_analytics_events
  for insert
  to anon, authenticated
  with check (
    event_type in ('page_view', 'section_view', 'blog_post_view')
    and char_length(path) between 1 and 200
    and char_length(session_token) between 8 and 120
  );

drop policy if exists "Authenticated read site analytics events" on public.site_analytics_events;
create policy "Authenticated read site analytics events"
  on public.site_analytics_events
  for select
  to authenticated
  using (true);
