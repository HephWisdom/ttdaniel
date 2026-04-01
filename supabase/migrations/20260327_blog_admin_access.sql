create table if not exists public.blog_admins (
  email text primary key,
  created_at timestamptz not null default now(),
  check (char_length(email) between 5 and 160),
  check (email = lower(email))
);

alter table public.blog_admins enable row level security;

drop policy if exists "Admins can read own record" on public.blog_admins;
create policy "Admins can read own record"
  on public.blog_admins
  for select
  to authenticated
  using (
    email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "Allowed admins can view subscribers" on public.blog_subscribers;
create policy "Allowed admins can view subscribers"
  on public.blog_subscribers
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.blog_admins as admin
      where admin.email = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );
