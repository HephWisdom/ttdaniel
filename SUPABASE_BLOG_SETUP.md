# Supabase Blog Setup

## 1) Environment variables
Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_DONATE_LINK=https://buy.stripe.com/REPLACE_WITH_YOUR_LINK
```

Restart the Vite dev server after updating env vars.

## 2) SQL schema
Run this in Supabase SQL Editor:

```sql
create extension if not exists pgcrypto;

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image text not null default '',
  excerpt text not null,
  content text not null,
  author text not null default 'Admin',
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.blog_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  name text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_blog_posts_created_at on public.blog_posts(created_at desc);
create index if not exists idx_blog_comments_post_id_created_at on public.blog_comments(post_id, created_at desc);
```

## 3) Create admin user (Supabase Auth)
Use Supabase Dashboard -> Authentication -> Users:
- Create a user with email/password (this account signs in at `/admin/blog`).

Optional strict mode:
- Use one dedicated admin email and enforce that email in RLS (see below).

## 4) Secure RLS policies (recommended)
Run this in Supabase SQL Editor.

```sql
alter table public.blog_posts enable row level security;
alter table public.blog_comments enable row level security;

-- Public read access

drop policy if exists "Public read blog posts" on public.blog_posts;
create policy "Public read blog posts"
  on public.blog_posts
  for select
  to anon, authenticated
  using (true);


drop policy if exists "Public read blog comments" on public.blog_comments;
create policy "Public read blog comments"
  on public.blog_comments
  for select
  to anon, authenticated
  using (true);

-- Public can add comments

drop policy if exists "Public insert blog comments" on public.blog_comments;
create policy "Public insert blog comments"
  on public.blog_comments
  for insert
  to anon, authenticated
  with check (true);

-- Authenticated users manage posts

drop policy if exists "Authenticated insert blog posts" on public.blog_posts;
create policy "Authenticated insert blog posts"
  on public.blog_posts
  for insert
  to authenticated
  with check (true);


drop policy if exists "Authenticated update blog posts" on public.blog_posts;
create policy "Authenticated update blog posts"
  on public.blog_posts
  for update
  to authenticated
  using (true)
  with check (true);


drop policy if exists "Authenticated delete blog posts" on public.blog_posts;
create policy "Authenticated delete blog posts"
  on public.blog_posts
  for delete
  to authenticated
  using (true);
```

### Optional strict admin-email RLS
Replace `with check (true)` / `using (true)` with:

```sql
(auth.jwt()->>'email') = 'your-admin@email.com'
```

This limits post CRUD to exactly one auth user email.

## 5) Storage bucket for blog images
Create a **public** bucket and secure write to authenticated users only:

```sql
insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do nothing;

-- Public read
drop policy if exists "Public read blog images" on storage.objects;
create policy "Public read blog images"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'blog-images');

-- Authenticated write
drop policy if exists "Authenticated upload blog images" on storage.objects;
create policy "Authenticated upload blog images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'blog-images');


drop policy if exists "Authenticated update blog images" on storage.objects;
create policy "Authenticated update blog images"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'blog-images')
  with check (bucket_id = 'blog-images');


drop policy if exists "Authenticated delete blog images" on storage.objects;
create policy "Authenticated delete blog images"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'blog-images');
```

## 6) CRUD verification checklist
1. Open `/admin/blog` and sign in with your Supabase admin user.
2. Create a post with image.
3. Edit the post.
4. Delete the post.
5. Open public pages (`/#blog`, `/blog`, `/blog/:id`) and confirm read access still works when signed out.
6. Add a comment on a post while signed out.

## 7) Blog subscribers
Run the migration in [supabase/migrations/20260325_blog_subscribers.sql](/home/wisdom/Desktop/ttdanielportfolio/supabase/migrations/20260325_blog_subscribers.sql).

If you prefer to paste SQL manually, run this in Supabase SQL Editor:

```sql
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
```

Notes:
- No public `select` policy is added for `blog_subscribers`, so the subscriber list stays private.
- The website stores emails in lowercase and rejects duplicates with the table unique constraint.

## 8) Subscriber email functions
This repo now includes:
- [supabase/functions/subscribe-to-blog/index.ts](/home/wisdom/Desktop/ttdanielportfolio/supabase/functions/subscribe-to-blog/index.ts) for public signup + confirmation email.
- [supabase/functions/broadcast-blog-post/index.ts](/home/wisdom/Desktop/ttdanielportfolio/supabase/functions/broadcast-blog-post/index.ts) for admin publish broadcasts.

### Free-tier mode
If you only want to use Supabase free-tier storage for subscriptions:
- Run the `blog_subscribers` migration.
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Do not deploy any subscriber functions yet.

Behavior in free-tier mode:
- Visitors can subscribe from the website.
- Their name and email are stored directly in `public.blog_subscribers`.
- No confirmation email is sent.
- Admin publish broadcasts will still require the optional `broadcast-blog-post` function.

Note:
- The current website subscription flow is now configured to require the confirmation-email function.
- If you want the public subscribe button to work, deploy `subscribe-to-blog` and configure Resend.

### Optional email-enabled mode
If you also want confirmation emails and subscriber broadcasts, set these Supabase function secrets before deployment:

Recommended free-tier option:
- Use a Resend free account for confirmation emails.
- Verify a sending domain in Resend and use a sender address on that domain for `BLOG_EMAIL_FROM`.
- Keep using Supabase Edge Functions for the subscription endpoint.

```bash
supabase secrets set RESEND_API_KEY=YOUR_RESEND_API_KEY
supabase secrets set BLOG_EMAIL_FROM="TT Daniel <updates@yourdomain.com>"
supabase secrets set SITE_URL=https://yourdomain.com
supabase secrets set BLOG_ADMIN_EMAIL=your-admin@email.com
```

Deploy both functions:

```bash
supabase functions deploy subscribe-to-blog
supabase functions deploy broadcast-blog-post
```

JWT note:
- `subscribe-to-blog` is a public website endpoint and should be deployed with JWT verification disabled.
- This repo now includes [supabase/config.toml](/home/wisdom/Desktop/ttdanielportfolio/supabase/config.toml) with `verify_jwt = false` for `subscribe-to-blog` and `verify_jwt = true` for `broadcast-blog-post`.
- If you deployed `subscribe-to-blog` before adding this config, redeploy it.

Behavior:
- Visitors click the `Subscribe` button beside `View All Blog Posts` and fill the popup form.
- `subscribe-to-blog` sends the confirmation email immediately after a successful subscription.
- If the function is missing or email delivery fails, the website shows an error instead of pretending the subscription is complete.
- When you publish from `/admin/blog`, you can keep the "Email subscribers after publish" option on.
- Immediate publishes can email the subscriber list through Resend.
- Scheduled posts are saved normally, but they are not emailed automatically by this setup.
