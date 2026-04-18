create extension if not exists pgcrypto;

create table if not exists public.ebooks (
  id text primary key,
  title text not null,
  description text,
  price_cents integer not null check (price_cents >= 50),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  storage_bucket text not null default 'ebooks',
  storage_path text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ebooks_id_format check (id ~ '^[a-z0-9][a-z0-9-]{1,80}$')
);

create table if not exists public.ebook_orders (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text not null unique,
  stripe_payment_intent text,
  customer_email text not null,
  amount_total integer not null default 0,
  currency text not null default 'usd',
  payment_status text not null default 'unpaid',
  checkout_status text not null default '',
  fulfillment_status text not null default 'pending',
  items jsonb not null default '[]'::jsonb,
  delivery_error text,
  fulfilled_at timestamptz,
  email_sent_at timestamptz,
  last_fulfillment_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ebook_orders_fulfillment_status check (
    fulfillment_status in ('pending', 'sending', 'sent', 'failed')
  )
);

create index if not exists ebook_orders_customer_email_idx
  on public.ebook_orders (customer_email);

create index if not exists ebook_orders_created_at_idx
  on public.ebook_orders (created_at desc);

alter table public.ebooks enable row level security;
alter table public.ebook_orders enable row level security;

create or replace function public.set_ebook_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_ebooks_updated_at on public.ebooks;
create trigger set_ebooks_updated_at
  before update on public.ebooks
  for each row
  execute function public.set_ebook_updated_at();

drop trigger if exists set_ebook_orders_updated_at on public.ebook_orders;
create trigger set_ebook_orders_updated_at
  before update on public.ebook_orders
  for each row
  execute function public.set_ebook_updated_at();

create or replace function public.claim_ebook_order_fulfillment(p_stripe_session_id text)
returns public.ebook_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_order public.ebook_orders;
begin
  update public.ebook_orders
     set fulfillment_status = 'sending',
         last_fulfillment_attempt_at = now(),
         updated_at = now()
   where stripe_session_id = p_stripe_session_id
     and (
       fulfillment_status in ('pending', 'failed')
       or (
         fulfillment_status = 'sending'
         and last_fulfillment_attempt_at < now() - interval '15 minutes'
       )
     )
  returning * into claimed_order;

  return claimed_order;
end;
$$;

revoke all on function public.claim_ebook_order_fulfillment(text) from public;
revoke all on function public.claim_ebook_order_fulfillment(text) from anon;
revoke all on function public.claim_ebook_order_fulfillment(text) from authenticated;
grant execute on function public.claim_ebook_order_fulfillment(text) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ebooks',
  'ebooks',
  false,
  52428800,
  array['application/pdf', 'application/epub+zip']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
