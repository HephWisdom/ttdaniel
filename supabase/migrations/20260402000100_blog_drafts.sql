create extension if not exists pgcrypto;

create table if not exists public.blog_drafts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  image text not null default '',
  excerpt text not null default '',
  content text not null default '',
  author text not null default 'Admin',
  tags text[] not null default '{}',
  publish_at timestamptz,
  allow_comments boolean not null default true,
  is_featured boolean not null default false,
  seo_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id)
);

create index if not exists idx_blog_drafts_owner_updated_at
  on public.blog_drafts(owner_user_id, updated_at desc);

create or replace function public.set_blog_draft_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_blog_draft_updated_at on public.blog_drafts;
create trigger set_blog_draft_updated_at
  before update on public.blog_drafts
  for each row
  execute function public.set_blog_draft_updated_at();

alter table public.blog_drafts enable row level security;

drop policy if exists "Authenticated select own blog drafts" on public.blog_drafts;
create policy "Authenticated select own blog drafts"
  on public.blog_drafts
  for select
  to authenticated
  using (auth.uid() = owner_user_id);

drop policy if exists "Authenticated insert own blog drafts" on public.blog_drafts;
create policy "Authenticated insert own blog drafts"
  on public.blog_drafts
  for insert
  to authenticated
  with check (auth.uid() = owner_user_id);

drop policy if exists "Authenticated update own blog drafts" on public.blog_drafts;
create policy "Authenticated update own blog drafts"
  on public.blog_drafts
  for update
  to authenticated
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

drop policy if exists "Authenticated delete own blog drafts" on public.blog_drafts;
create policy "Authenticated delete own blog drafts"
  on public.blog_drafts
  for delete
  to authenticated
  using (auth.uid() = owner_user_id);
