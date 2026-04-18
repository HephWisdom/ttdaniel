alter table public.ebooks
  add column if not exists delivery_type text not null default 'storage',
  add column if not exists external_download_url text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ebooks_delivery_type_check'
  ) then
    alter table public.ebooks
      add constraint ebooks_delivery_type_check
      check (delivery_type in ('storage', 'external_url'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ebooks_delivery_configuration_check'
  ) then
    alter table public.ebooks
      add constraint ebooks_delivery_configuration_check
      check (
        (
          delivery_type = 'storage'
          and length(trim(storage_bucket)) > 0
          and length(trim(storage_path)) > 0
        )
        or (
          delivery_type = 'external_url'
          and external_download_url ~* '^https://'
        )
      );
  end if;
end $$;
