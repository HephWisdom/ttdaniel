do $$
declare
  policy_record record;
begin
  if to_regclass('public.blog_posts') is not null then
    for policy_record in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = 'blog_posts'
    loop
      execute format('drop policy if exists %I on public.blog_posts', policy_record.policyname);
    end loop;

    execute $policy$
      create policy "Public read blog posts"
        on public.blog_posts
        for select
        to anon, authenticated
        using (true)
    $policy$;

    execute $policy$
      create policy "Allowed admins insert blog posts"
        on public.blog_posts
        for insert
        to authenticated
        with check (
          exists (
            select 1
            from public.blog_admins as admin
            where admin.email = lower(coalesce(auth.jwt() ->> 'email', ''))
          )
        )
    $policy$;

    execute $policy$
      create policy "Allowed admins update blog posts"
        on public.blog_posts
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
        )
    $policy$;

    execute $policy$
      create policy "Allowed admins delete blog posts"
        on public.blog_posts
        for delete
        to authenticated
        using (
          exists (
            select 1
            from public.blog_admins as admin
            where admin.email = lower(coalesce(auth.jwt() ->> 'email', ''))
          )
        )
    $policy$;
  end if;

  if to_regclass('public.site_analytics_events') is not null then
    for policy_record in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = 'site_analytics_events'
    loop
      execute format(
        'drop policy if exists %I on public.site_analytics_events',
        policy_record.policyname
      );
    end loop;

    execute $policy$
      create policy "Public insert site analytics events"
        on public.site_analytics_events
        for insert
        to anon, authenticated
        with check (
          event_type in ('page_view', 'section_view', 'blog_post_view')
          and char_length(path) between 1 and 200
          and char_length(session_token) between 8 and 120
        )
    $policy$;

    execute $policy$
      create policy "Allowed admins read site analytics events"
        on public.site_analytics_events
        for select
        to authenticated
        using (
          exists (
            select 1
            from public.blog_admins as admin
            where admin.email = lower(coalesce(auth.jwt() ->> 'email', ''))
          )
        )
    $policy$;
  end if;
end;
$$;
