do $$
declare
  policy_record record;
begin
  if to_regclass('public.blog_subscribers') is not null then
    drop policy if exists "Public insert blog subscribers"
      on public.blog_subscribers;

    revoke insert, update, delete on table public.blog_subscribers
      from anon, authenticated;
  end if;

  if to_regclass('public.blog_comments') is not null then
    alter table public.blog_comments
      add column if not exists is_approved boolean;

    update public.blog_comments
    set is_approved = true
    where is_approved is null;

    alter table public.blog_comments
      alter column is_approved set default false,
      alter column is_approved set not null;

    alter table public.blog_comments enable row level security;

    for policy_record in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = 'blog_comments'
    loop
      execute format(
        'drop policy if exists %I on public.blog_comments',
        policy_record.policyname
      );
    end loop;

    revoke insert, update, delete on table public.blog_comments
      from anon, authenticated;
    grant select on table public.blog_comments
      to anon, authenticated;
    grant update, delete on table public.blog_comments
      to authenticated;

    create policy "Public read approved blog comments"
      on public.blog_comments
      for select
      to anon, authenticated
      using (
        is_approved = true
        or exists (
          select 1
          from public.blog_admins as admin
          where admin.email = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
      );

    create policy "Allowed admins update blog comments"
      on public.blog_comments
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.blog_admins as admin
          where admin.email = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
      )
      with check (
        exists (
          select 1
          from public.blog_admins as admin
          where admin.email = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
      );

    create policy "Allowed admins delete blog comments"
      on public.blog_comments
      for delete
      to authenticated
      using (
        exists (
          select 1
          from public.blog_admins as admin
          where admin.email = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
      );
  end if;
end;
$$;
