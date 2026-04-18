create extension if not exists pgcrypto;

alter table public.blog_posts
  add column if not exists subscriber_notified_at timestamptz;

create table if not exists public.blog_subscribers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  status text not null default 'active' check (status in ('active', 'unsubscribed')),
  source text not null default 'website',
  created_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  check (char_length(name) between 2 and 80),
  check (char_length(email) between 5 and 160),
  check (email = lower(email))
);

create index if not exists idx_blog_subscribers_status_created_at
  on public.blog_subscribers(status, created_at desc);

alter table public.blog_subscribers enable row level security;

drop policy if exists "Public insert blog subscribers" on public.blog_subscribers;
create policy "Public insert blog subscribers"
  on public.blog_subscribers
  for insert
  to anon, authenticated
  with check (
    status = 'active'
    and source = 'website'
    and email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  );
