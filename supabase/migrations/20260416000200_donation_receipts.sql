create table if not exists public.donation_receipts (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text not null unique,
  stripe_payment_intent text,
  stripe_subscription_id text,
  donor_email text not null,
  amount_total integer not null default 0,
  currency text not null default 'usd',
  frequency text not null default 'one_time',
  payment_status text not null default '',
  checkout_status text not null default '',
  email_status text not null default 'pending',
  email_error text,
  email_sent_at timestamptz,
  last_email_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint donation_receipts_currency_format check (currency ~ '^[a-z]{3}$'),
  constraint donation_receipts_frequency_check check (
    frequency in ('one_time', 'week', 'month', 'year')
  ),
  constraint donation_receipts_email_status_check check (
    email_status in ('pending', 'sending', 'sent', 'failed')
  )
);

create index if not exists donation_receipts_donor_email_idx
  on public.donation_receipts (donor_email);

create index if not exists donation_receipts_created_at_idx
  on public.donation_receipts (created_at desc);

alter table public.donation_receipts enable row level security;

create or replace function public.set_donation_receipts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_donation_receipts_updated_at on public.donation_receipts;
create trigger set_donation_receipts_updated_at
  before update on public.donation_receipts
  for each row
  execute function public.set_donation_receipts_updated_at();

create or replace function public.claim_donation_receipt_email(p_stripe_session_id text)
returns public.donation_receipts
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_receipt public.donation_receipts;
begin
  update public.donation_receipts
     set email_status = 'sending',
         last_email_attempt_at = now(),
         updated_at = now()
   where stripe_session_id = p_stripe_session_id
     and (
       email_status in ('pending', 'failed')
       or (
         email_status = 'sending'
         and last_email_attempt_at < now() - interval '15 minutes'
       )
     )
  returning * into claimed_receipt;

  return claimed_receipt;
end;
$$;

revoke all on function public.claim_donation_receipt_email(text) from public;
revoke all on function public.claim_donation_receipt_email(text) from anon;
revoke all on function public.claim_donation_receipt_email(text) from authenticated;
grant execute on function public.claim_donation_receipt_email(text) to service_role;
