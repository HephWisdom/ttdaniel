# Supabase E-book Store Setup

This store uses Stripe Embedded Checkout, Supabase Edge Functions, private Supabase Storage, and Resend.

## 1. Apply the migration

Run the Supabase migration in `supabase/migrations/20260414_ebook_store.sql`.

It creates:

- `public.ebooks` for the private server-side product catalog
- `public.ebook_orders` for Stripe order and delivery status
- a private `ebooks` storage bucket
- `claim_ebook_order_fulfillment()` for idempotent email delivery

No public read policy is added for the catalog or orders. The Edge Functions use the service role key.

## 2. Upload the e-book files

Upload each PDF or EPUB into the private `ebooks` bucket.

Use stable paths, for example:

```text
before-prayer.pdf
christian-home-culture.pdf
introduction-to-faith-energy.pdf
courtship-companion.pdf
the-40-new-lives-in-christ.pdf
sinful-sweets.pdf
```

For oversized files, do not upload the file to Supabase Storage. Store a direct HTTPS
download link in the catalog instead. Dropbox share links should use `dl=1` for direct
download; the fulfillment function also normalizes Dropbox links to `dl=1`.

## 3. Add catalog rows

Insert one row per sellable e-book. The `id` must match the `id` in `src/data/books.js`.

```sql
insert into public.ebooks (
  id,
  title,
  description,
  price_cents,
  currency,
  storage_bucket,
  storage_path,
  active
) values
  (
    'before-prayer',
    'BEFORE PRAYER',
    'Build a deeper foundation for prayer with ancient biblical patterns and insight.',
    1200,
    'usd',
    'ebooks',
    'before-prayer.pdf',
    true
  )
on conflict (id) do update
set title = excluded.title,
    description = excluded.description,
    price_cents = excluded.price_cents,
    currency = excluded.currency,
    storage_bucket = excluded.storage_bucket,
    storage_path = excluded.storage_path,
    active = excluded.active;
```

Repeat for the other books. The first book currently shows `Checkout price` in the UI because its old static data did not include a USD price; set its exact `price_cents` in Supabase before selling it.

For Courtship Companion, use external delivery after you have the Dropbox direct-download
link:

```sql
insert into public.ebooks (
  id,
  title,
  description,
  price_cents,
  currency,
  storage_bucket,
  storage_path,
  delivery_type,
  external_download_url,
  active
) values (
  'courtship-companion',
  'Courtship Companion',
  'Timeless relationship counsel for intentional courtship and wise partner selection.',
  1500,
  'usd',
  'ebooks',
  'external/courtship-companion',
  'external_url',
  'https://www.dropbox.com/s/PASTE_DROPBOX_FILE_ID/courtship-companion.pdf?dl=1',
  true
)
on conflict (id) do update
set title = excluded.title,
    description = excluded.description,
    price_cents = excluded.price_cents,
    currency = excluded.currency,
    storage_bucket = excluded.storage_bucket,
    storage_path = excluded.storage_path,
    delivery_type = excluded.delivery_type,
    external_download_url = excluded.external_download_url,
    active = excluded.active;
```

## 4. Configure Edge Function secrets

Set these Supabase secrets:

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SITE_URL=https://your-domain.example
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SIGNING_SECRET=whsec_...
RESEND_API_KEY=re_...
EBOOK_EMAIL_FROM=TT Daniel Books <noreply@your-domain.example>
EBOOK_SIGNED_URL_EXPIRES_SECONDS=604800
```

`EBOOK_EMAIL_FROM` can be omitted if `BLOG_EMAIL_FROM` is already configured.

## 5. Deploy functions

Deploy:

```bash
supabase functions deploy create-ebook-checkout-session
supabase functions deploy get-ebook-session
supabase functions deploy stripe-webhook
```

The webhook must stay public. `supabase/config.toml` sets `verify_jwt = false` for `stripe-webhook`.

## 6. Configure Stripe webhook

Create a Stripe webhook endpoint:

```text
https://your-project.supabase.co/functions/v1/stripe-webhook
```

Subscribe to:

```text
checkout.session.completed
checkout.session.async_payment_succeeded
```

Copy the webhook signing secret into `STRIPE_WEBHOOK_SIGNING_SECRET`.

## Security Model

- The browser sends only book IDs and the buyer email.
- Prices, active status, and storage paths are loaded server-side from Supabase.
- Stripe webhook signatures are verified before fulfillment.
- Files remain in a private bucket.
- Buyers receive expiring signed download links, not public file URLs.
- Fulfillment is idempotent so Stripe retries or customer return checks do not duplicate delivery emails.
