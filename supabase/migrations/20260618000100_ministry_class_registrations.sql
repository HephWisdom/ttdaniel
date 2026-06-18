create extension if not exists pgcrypto;

create table if not exists public.ministry_class_registrations (
  id uuid primary key default gen_random_uuid(),
  program_key text not null default 'dmc',
  full_name text not null,
  email text not null,
  phone text,
  country text not null,
  ministry_involvement text not null,
  discernment_focus text,
  contact_consent boolean not null default false,
  source text not null default 'website',
  confirmation_email_sent_at timestamptz,
  confirmation_email_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ministry_class_registrations_program_check
    check (program_key = 'dmc'),
  constraint ministry_class_registrations_name_check
    check (char_length(full_name) between 2 and 100),
  constraint ministry_class_registrations_email_check
    check (
      char_length(email) between 5 and 160
      and email = lower(email)
      and email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    ),
  constraint ministry_class_registrations_phone_check
    check (phone is null or char_length(phone) between 7 and 30),
  constraint ministry_class_registrations_country_check
    check (char_length(country) between 2 and 80),
  constraint ministry_class_registrations_involvement_check
    check (
      ministry_involvement in (
        'exploring',
        'sensing-a-call',
        'currently-serving',
        'ministry-leader',
        'other'
      )
    ),
  constraint ministry_class_registrations_focus_check
    check (discernment_focus is null or char_length(discernment_focus) <= 1000),
  constraint ministry_class_registrations_consent_check
    check (contact_consent = true),
  constraint ministry_class_registrations_source_check
    check (source = 'website'),
  unique (program_key, email)
);

alter table public.ministry_class_registrations
  add column if not exists confirmation_email_sent_at timestamptz,
  add column if not exists confirmation_email_error text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_ministry_class_registrations_created_at
  on public.ministry_class_registrations(created_at desc);

create table if not exists public.ministry_class_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  sender_email text not null,
  subject text not null,
  message text not null,
  recipient_ids uuid[] not null default '{}',
  recipient_count integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  failures jsonb not null default '[]'::jsonb,
  status text not null default 'processing',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ministry_class_messages_sender_check
    check (
      char_length(sender_email) between 5 and 160
      and sender_email = lower(sender_email)
    ),
  constraint ministry_class_messages_subject_check
    check (char_length(subject) between 2 and 160),
  constraint ministry_class_messages_message_check
    check (char_length(message) between 2 and 5000),
  constraint ministry_class_messages_status_check
    check (status in ('processing', 'sent', 'failed')),
  constraint ministry_class_messages_counts_check
    check (
      recipient_count >= 0
      and sent_count >= 0
      and failed_count >= 0
      and sent_count + failed_count <= recipient_count
  )
);

alter table public.ministry_class_messages
  add column if not exists request_id uuid,
  add column if not exists status text not null default 'processing',
  add column if not exists updated_at timestamptz not null default now();

update public.ministry_class_messages
set status = case
  when failed_count > 0 then 'failed'
  when sent_count = recipient_count then 'sent'
  else 'processing'
end;

alter table public.ministry_class_messages
  drop constraint if exists ministry_class_messages_counts_check;

alter table public.ministry_class_messages
  add constraint ministry_class_messages_counts_check
    check (
      recipient_count >= 0
      and sent_count >= 0
      and failed_count >= 0
      and sent_count + failed_count <= recipient_count
    );

alter table public.ministry_class_messages
  drop constraint if exists ministry_class_messages_status_check;

alter table public.ministry_class_messages
  add constraint ministry_class_messages_status_check
    check (status in ('processing', 'sent', 'failed'));

alter table public.ministry_class_messages
  drop constraint if exists ministry_class_messages_status_counts_check;

alter table public.ministry_class_messages
  add constraint ministry_class_messages_status_counts_check
    check (
      status = 'processing'
      or (
        status = 'sent'
        and sent_count = recipient_count
        and failed_count = 0
      )
      or (
        status = 'failed'
        and failed_count > 0
        and sent_count + failed_count = recipient_count
      )
    );

create index if not exists idx_ministry_class_messages_created_at
  on public.ministry_class_messages(created_at desc);

create unique index if not exists idx_ministry_class_messages_request_id
  on public.ministry_class_messages(request_id)
  where request_id is not null;

create table if not exists public.edge_request_guards (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null,
  scope text not null check (scope in ('actor', 'email')),
  subject_hash text not null check (subject_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);

create index if not exists idx_edge_request_guards_lookup
  on public.edge_request_guards(endpoint, scope, subject_hash, created_at desc);

create index if not exists idx_edge_request_guards_created_at
  on public.edge_request_guards(created_at);

alter table public.edge_request_guards enable row level security;
revoke all on table public.edge_request_guards from anon, authenticated;

create or replace function public.consume_edge_request_limit(
  p_endpoint text,
  p_scope text,
  p_subject_hash text,
  p_window_seconds integer,
  p_max_requests integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent_request_count bigint;
begin
  if char_length(trim(coalesce(p_endpoint, ''))) not between 1 and 120 then
    raise exception 'Invalid rate-limit endpoint.';
  end if;

  if p_scope not in ('actor', 'email') then
    raise exception 'Invalid rate-limit scope.';
  end if;

  if lower(trim(coalesce(p_subject_hash, ''))) !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid rate-limit subject.';
  end if;

  if p_window_seconds not between 1 and 86400 then
    raise exception 'Invalid rate-limit window.';
  end if;

  if p_max_requests not between 1 and 1000 then
    raise exception 'Invalid rate-limit maximum.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      concat_ws('|', p_endpoint, p_scope, lower(trim(p_subject_hash))),
      0
    )
  );

  delete from public.edge_request_guards
  where created_at < now() - interval '2 days';

  select count(*)
    into recent_request_count
  from public.edge_request_guards
  where endpoint = p_endpoint
    and scope = p_scope
    and subject_hash = lower(trim(p_subject_hash))
    and created_at >= now() - make_interval(secs => p_window_seconds);

  if recent_request_count >= p_max_requests then
    return false;
  end if;

  insert into public.edge_request_guards (endpoint, scope, subject_hash)
  values (p_endpoint, p_scope, lower(trim(p_subject_hash)));

  return true;
end;
$$;

revoke all on function public.consume_edge_request_limit(text, text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_edge_request_limit(text, text, text, integer, integer)
  to service_role;

create or replace function public.set_ministry_class_registration_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_ministry_class_registration_updated_at
  on public.ministry_class_registrations;
create trigger set_ministry_class_registration_updated_at
  before update on public.ministry_class_registrations
  for each row
  execute function public.set_ministry_class_registration_updated_at();

drop trigger if exists set_ministry_class_message_updated_at
  on public.ministry_class_messages;
create trigger set_ministry_class_message_updated_at
  before update on public.ministry_class_messages
  for each row
  execute function public.set_ministry_class_registration_updated_at();

alter table public.ministry_class_registrations enable row level security;
alter table public.ministry_class_messages enable row level security;

drop policy if exists "Public insert ministry class registrations"
  on public.ministry_class_registrations;

revoke insert, update, delete on table public.ministry_class_registrations
  from anon, authenticated;
revoke all on table public.ministry_class_messages
  from anon, authenticated;
grant select on table public.ministry_class_registrations to authenticated;
grant select on table public.ministry_class_messages to authenticated;

drop policy if exists "Allowed admins read ministry class registrations"
  on public.ministry_class_registrations;
create policy "Allowed admins read ministry class registrations"
  on public.ministry_class_registrations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.blog_admins as admin
      where admin.email = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

drop policy if exists "Allowed admins read ministry class messages"
  on public.ministry_class_messages;
create policy "Allowed admins read ministry class messages"
  on public.ministry_class_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.blog_admins as admin
      where admin.email = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );
