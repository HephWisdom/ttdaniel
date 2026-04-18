alter table public.blog_posts
  add column if not exists allow_comments boolean not null default true,
  add column if not exists is_featured boolean not null default false,
  add column if not exists seo_enabled boolean not null default true;
