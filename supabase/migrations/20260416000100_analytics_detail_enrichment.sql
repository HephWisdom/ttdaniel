alter table public.site_analytics_events
  add column if not exists referrer text,
  add column if not exists referrer_host text,
  add column if not exists traffic_source text,
  add column if not exists device_type text,
  add column if not exists browser text,
  add column if not exists os text,
  add column if not exists viewport_width integer,
  add column if not exists viewport_height integer,
  add column if not exists language text,
  add column if not exists timezone text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.site_analytics_events
  drop constraint if exists site_analytics_events_event_type_check;

alter table public.site_analytics_events
  add constraint site_analytics_events_event_type_check
  check (
    event_type in (
      'page_view',
      'section_view',
      'blog_post_view',
      'engagement_ping',
      'scroll_depth',
      'outbound_click',
      'contact_click'
    )
  );

create index if not exists idx_site_analytics_events_traffic_source
  on public.site_analytics_events(traffic_source)
  where traffic_source is not null;

create index if not exists idx_site_analytics_events_device_type
  on public.site_analytics_events(device_type)
  where device_type is not null;

create index if not exists idx_site_analytics_events_referrer_host
  on public.site_analytics_events(referrer_host)
  where referrer_host is not null;

drop policy if exists "Public insert site analytics events" on public.site_analytics_events;
create policy "Public insert site analytics events"
  on public.site_analytics_events
  for insert
  to anon, authenticated
  with check (
    event_type in (
      'page_view',
      'section_view',
      'blog_post_view',
      'engagement_ping',
      'scroll_depth',
      'outbound_click',
      'contact_click'
    )
    and char_length(path) between 1 and 200
    and char_length(session_token) between 8 and 120
    and (section is null or char_length(section) between 1 and 80)
    and (post_id is null or char_length(post_id) between 1 and 120)
  );
