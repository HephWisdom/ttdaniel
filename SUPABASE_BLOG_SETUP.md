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
