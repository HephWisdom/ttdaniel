drop policy if exists "Allowed admins read ebook orders" on public.ebook_orders;
create policy "Allowed admins read ebook orders"
  on public.ebook_orders
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.blog_admins as admin
      where admin.email = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

drop policy if exists "Allowed admins read donation receipts" on public.donation_receipts;
create policy "Allowed admins read donation receipts"
  on public.donation_receipts
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.blog_admins as admin
      where admin.email = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );
