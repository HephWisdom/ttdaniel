create extension if not exists pgcrypto;

create table if not exists public.blog_love_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id text not null,
  reactor_token_hash text not null,
  created_at timestamptz not null default now(),
  check (char_length(post_id) between 1 and 120),
  check (reactor_token_hash ~ '^[a-f0-9]{64}$'),
  unique (post_id, reactor_token_hash)
);

create index if not exists idx_blog_love_reactions_post_id
  on public.blog_love_reactions(post_id);

alter table public.blog_love_reactions enable row level security;

revoke all on table public.blog_love_reactions from anon, authenticated;

create or replace function public.get_blog_love_reaction_stats(
  target_post_id text,
  target_reactor_hash text
)
returns table(reaction_count bigint, has_reacted boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_post_id text := trim(coalesce(target_post_id, ''));
  clean_hash text := lower(trim(coalesce(target_reactor_hash, '')));
begin
  if clean_post_id = '' then
    return query select 0::bigint, false;
    return;
  end if;

  return query
  select
    count(*)::bigint as reaction_count,
    exists (
      select 1
      from public.blog_love_reactions as reaction
      where reaction.post_id = clean_post_id
        and reaction.reactor_token_hash = clean_hash
    ) as has_reacted
  from public.blog_love_reactions
  where post_id = clean_post_id;
end;
$$;

create or replace function public.get_blog_love_reaction_counts()
returns table(post_id text, reaction_count bigint)
language sql
security definer
set search_path = public
as $$
  select
    reaction.post_id,
    count(*)::bigint as reaction_count
  from public.blog_love_reactions as reaction
  group by reaction.post_id
  order by reaction_count desc, reaction.post_id asc;
$$;

create or replace function public.add_blog_love_reaction(
  target_post_id text,
  target_reactor_hash text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_post_id text := trim(coalesce(target_post_id, ''));
  clean_hash text := lower(trim(coalesce(target_reactor_hash, '')));
begin
  if clean_post_id = '' or char_length(clean_post_id) > 120 then
    raise exception 'Invalid post id.';
  end if;

  if clean_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid reactor token hash.';
  end if;

  insert into public.blog_love_reactions (post_id, reactor_token_hash)
  values (clean_post_id, clean_hash)
  on conflict (post_id, reactor_token_hash) do nothing;
end;
$$;

create or replace function public.remove_blog_love_reaction(
  target_post_id text,
  target_reactor_hash text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_post_id text := trim(coalesce(target_post_id, ''));
  clean_hash text := lower(trim(coalesce(target_reactor_hash, '')));
begin
  if clean_post_id = '' or char_length(clean_post_id) > 120 then
    raise exception 'Invalid post id.';
  end if;

  if clean_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid reactor token hash.';
  end if;

  delete from public.blog_love_reactions
  where post_id = clean_post_id
    and reactor_token_hash = clean_hash;
end;
$$;

revoke all on function public.get_blog_love_reaction_stats(text, text) from public;
revoke all on function public.get_blog_love_reaction_counts() from public;
revoke all on function public.add_blog_love_reaction(text, text) from public;
revoke all on function public.remove_blog_love_reaction(text, text) from public;

grant execute on function public.get_blog_love_reaction_stats(text, text) to anon, authenticated;
grant execute on function public.get_blog_love_reaction_counts() to anon, authenticated;
grant execute on function public.add_blog_love_reaction(text, text) to anon, authenticated;
grant execute on function public.remove_blog_love_reaction(text, text) to anon, authenticated;
