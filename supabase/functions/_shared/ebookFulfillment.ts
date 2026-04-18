import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@21.0.1";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const BOOK_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,80}$/;
const DEFAULT_SIGNED_URL_EXPIRES_SECONDS = 60 * 60 * 24 * 7;

type SupabaseAdminClient = ReturnType<typeof createClient>;

export type EbookRecord = {
  id: string;
  title: string;
  description: string | null;
  price_cents: number;
  currency: string;
  storage_bucket: string;
  storage_path: string;
  delivery_type: "storage" | "external_url";
  external_download_url: string | null;
  active: boolean;
};

type FulfillmentResult = {
  ignored?: boolean;
  fulfilled: boolean;
  emailSent: boolean;
  customerEmail?: string;
  paymentStatus: string;
  checkoutStatus: string;
  message: string;
};

export function normalizeEnvValue(value: string | undefined | null) {
  const trimmed = String(value || "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function normalizeOrigin(siteUrl: string) {
  try {
    return new URL(siteUrl).origin;
  } catch {
    return "";
  }
}

export function buildCorsHeaders(siteUrl: string, request: Request) {
  const siteOrigin = normalizeOrigin(siteUrl);
  const requestOrigin = normalizeEnvValue(request.headers.get("Origin"));
  const allowOrigin =
    requestOrigin && (requestOrigin === siteOrigin || requestOrigin.startsWith("http://localhost:"))
      ? requestOrigin
      : siteOrigin || "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

export function jsonResponse(
  status: number,
  body: Record<string, unknown>,
  siteUrl: string,
  request: Request
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...buildCorsHeaders(siteUrl, request),
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
    },
  });
}

export function isValidBuyerEmail(value: string) {
  return EMAIL_PATTERN.test(value) && value.length <= 254;
}

export function normalizeBuyerEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export function normalizeBookIds(value: unknown) {
  const rawIds = Array.isArray(value) ? value : [];
  const uniqueIds: string[] = [];

  for (const rawId of rawIds) {
    const id = String(rawId || "").trim().toLowerCase();
    if (!BOOK_ID_PATTERN.test(id)) continue;
    if (!uniqueIds.includes(id)) {
      uniqueIds.push(id);
    }
  }

  return uniqueIds;
}

export function parseBookIdsMetadata(value: unknown) {
  return normalizeBookIds(
    String(value || "")
      .split(",")
      .map((item) => item.trim())
  );
}

export function isValidCheckoutSessionId(value: string) {
  return /^cs_[A-Za-z0-9_]+$/.test(value);
}

export function normalizePagePath(value: unknown) {
  if (typeof value !== "string") return "/";
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return "/";
  return trimmed.replace(/[\r\n]/g, "").slice(0, 500) || "/";
}

export function escapeHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(Number(cents || 0) / 100);
}

function buildDownloadFilename(title: string) {
  const slug =
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "tt-daniel-ebook";

  return `${slug}.pdf`;
}

function formatExpiry(seconds: number) {
  const days = Math.round(seconds / 86400);
  if (days >= 1) return `${days} day${days === 1 ? "" : "s"}`;

  const hours = Math.round(seconds / 3600);
  if (hours >= 1) return `${hours} hour${hours === 1 ? "" : "s"}`;

  return `${seconds} seconds`;
}

function normalizeExternalDownloadUrl(value: string | null) {
  const rawUrl = normalizeEnvValue(value);
  if (!rawUrl) return "";

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("External e-book download link is not a valid URL.");
  }

  if (url.protocol !== "https:") {
    throw new Error("External e-book download link must use HTTPS.");
  }

  if (url.hostname === "dropbox.com" || url.hostname.endsWith(".dropbox.com")) {
    url.searchParams.set("dl", "1");
  }

  return url.toString();
}

export function getSignedUrlExpiresSeconds() {
  const parsed = Number(normalizeEnvValue(Deno.env.get("EBOOK_SIGNED_URL_EXPIRES_SECONDS")));
  if (!Number.isFinite(parsed) || parsed < 300) {
    return DEFAULT_SIGNED_URL_EXPIRES_SECONDS;
  }

  return Math.min(Math.round(parsed), 60 * 60 * 24 * 14);
}

export function getConfiguredEmailFrom() {
  return (
    normalizeEnvValue(Deno.env.get("EBOOK_EMAIL_FROM")) ||
    normalizeEnvValue(Deno.env.get("BLOG_EMAIL_FROM"))
  );
}

export function createSupabaseAdminClient() {
  const supabaseUrl = normalizeEnvValue(Deno.env.get("SUPABASE_URL"));
  const serviceRoleKey = normalizeEnvValue(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service role credentials are not configured.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    global: {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function fetchActiveEbooks(adminClient: SupabaseAdminClient, bookIds: string[]) {
  const { data, error } = await adminClient
    .from("ebooks")
    .select(
      "id,title,description,price_cents,currency,storage_bucket,storage_path,delivery_type,external_download_url,active"
    )
    .in("id", bookIds)
    .eq("active", true);

  if (error) {
    throw new Error(error.message || "Unable to load ebook catalog.");
  }

  const ebooks = (data || []) as EbookRecord[];
  const ebookMap = new Map(ebooks.map((ebook) => [ebook.id, ebook]));
  return bookIds.map((bookId) => ebookMap.get(bookId)).filter(Boolean) as EbookRecord[];
}

export async function sendResendEmail({
  apiKey,
  from,
  to,
  subject,
  html,
  text,
}: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error?.message ||
      payload?.error ||
      "Resend request failed.";
    throw new Error(String(message));
  }

  return payload;
}

async function createDownloadLinks({
  adminClient,
  ebooks,
  expiresIn,
}: {
  adminClient: SupabaseAdminClient;
  ebooks: EbookRecord[];
  expiresIn: number;
}) {
  const links: Array<{
    id: string;
    title: string;
    price: string;
    url: string;
    expires: boolean;
  }> = [];

  for (const ebook of ebooks) {
    if (ebook.delivery_type === "external_url") {
      const externalDownloadUrl = normalizeExternalDownloadUrl(ebook.external_download_url);
      if (!externalDownloadUrl) {
        throw new Error(`External delivery is not configured for ${ebook.title}.`);
      }

      links.push({
        id: ebook.id,
        title: ebook.title,
        price: formatCurrency(ebook.price_cents, ebook.currency),
        url: externalDownloadUrl,
        expires: false,
      });
      continue;
    }

    if (!ebook.storage_bucket || !ebook.storage_path) {
      throw new Error(`Ebook delivery is not configured for ${ebook.title}.`);
    }

    const { data, error } = await adminClient.storage
      .from(ebook.storage_bucket)
      .createSignedUrl(ebook.storage_path, expiresIn, {
        download: buildDownloadFilename(ebook.title),
      });

    if (error || !data?.signedUrl) {
      throw new Error(error?.message || `Unable to create download link for ${ebook.title}.`);
    }

    links.push({
      id: ebook.id,
      title: ebook.title,
      price: formatCurrency(ebook.price_cents, ebook.currency),
      url: data.signedUrl,
      expires: true,
    });
  }

  return links;
}

function buildDeliveryHtml({
  siteUrl,
  downloadLinks,
  expiresIn,
}: {
  siteUrl: string;
  downloadLinks: Array<{ title: string; price: string; url: string; expires: boolean }>;
  expiresIn: number;
}) {
  const homeUrl = new URL("/", siteUrl).toString();
  const expiryLabel = escapeHtml(formatExpiry(expiresIn));
  const hasExpiringLinks = downloadLinks.some((link) => link.expires);
  const hasExternalLinks = downloadLinks.some((link) => !link.expires);
  const expiryCopy = hasExpiringLinks
    ? hasExternalLinks
      ? `Private storage links expire in ${expiryLabel}. External direct-download links are managed by the file host.`
      : `These links expire in ${expiryLabel}. Keep this email private.`
    : "Use the direct-download links below to save your e-books. Keep this email private.";
  const rows = downloadLinks
    .map(
      (link) => `
        <tr>
          <td style="padding:16px 0;border-bottom:1px solid #e7dfd2;">
            <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#21170f;">${escapeHtml(
              link.title
            )}</p>
            <p style="margin:0;font-size:13px;color:#766954;">${escapeHtml(link.price)}</p>
          </td>
          <td align="right" style="padding:16px 0;border-bottom:1px solid #e7dfd2;">
            <a href="${escapeHtml(
              link.url
            )}" style="display:inline-block;border-radius:8px;background:#22180f;color:#fff4d6;text-decoration:none;padding:11px 14px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">
              Download
            </a>
          </td>
        </tr>
      `
    )
    .join("");

  return `
    <div style="background:#f5f1e8;padding:30px 14px;font-family:Arial,sans-serif;color:#1b1711;">
      <div style="max-width:680px;margin:0 auto;background:#fffaf0;border:1px solid #dfcfac;border-radius:24px;overflow:hidden;">
        <div style="background:#22180f;padding:18px 24px;">
          <p style="margin:0;color:#f3d9a2;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;font-weight:700;">TT Daniel Books</p>
        </div>
        <div style="padding:26px 24px 30px;">
          <h1 style="margin:0 0 14px;font-size:28px;line-height:1.1;color:#20160d;">Your e-books are ready</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#4a3b2a;">
            Thank you for your purchase. Use the secure download links below to save your e-books.
          </p>
          <p style="margin:0 0 18px;font-size:13px;line-height:1.55;color:#6d5d47;">
            ${expiryCopy}
          </p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
            ${rows}
          </table>
          <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6d5d47;">
            If a link expires before you download your book, reply to this email with your order email address.
          </p>
          <p style="margin:18px 0 0;">
            <a href="${homeUrl}" style="color:#22180f;font-size:13px;font-weight:700;">Visit TT Daniel</a>
          </p>
        </div>
      </div>
    </div>
  `;
}

function buildDeliveryText({
  downloadLinks,
  expiresIn,
}: {
  downloadLinks: Array<{ title: string; price: string; url: string; expires: boolean }>;
  expiresIn: number;
}) {
  const hasExpiringLinks = downloadLinks.some((link) => link.expires);
  const hasExternalLinks = downloadLinks.some((link) => !link.expires);
  const expiryLine = hasExpiringLinks
    ? hasExternalLinks
      ? `Private storage links expire in ${formatExpiry(expiresIn)}. External direct-download links are managed by the file host.`
      : `These secure download links expire in ${formatExpiry(expiresIn)}. Keep this email private.`
    : "Use the direct-download links below to save your e-books. Keep this email private.";

  return [
    "Your TT Daniel e-books are ready.",
    "",
    expiryLine,
    "",
    ...downloadLinks.flatMap((link) => [`${link.title} (${link.price})`, link.url, ""]),
    "If a link expires before you download your book, reply to this email with your order email address.",
  ].join("\n");
}

async function markOrderFailed(
  adminClient: SupabaseAdminClient,
  sessionId: string,
  error: unknown
) {
  const message = error instanceof Error ? error.message : "Unable to deliver ebook order.";

  await adminClient
    .from("ebook_orders")
    .update({
      fulfillment_status: "failed",
      delivery_error: message.slice(0, 1000),
    })
    .eq("stripe_session_id", sessionId);
}

export async function fulfillEbookCheckoutSession({
  stripe,
  adminClient,
  sessionId,
  siteUrl,
  resendApiKey,
  emailFrom,
  signedUrlExpiresSeconds,
}: {
  stripe: Stripe;
  adminClient: SupabaseAdminClient;
  sessionId: string;
  siteUrl: string;
  resendApiKey: string;
  emailFrom: string;
  signedUrlExpiresSeconds: number;
}): Promise<FulfillmentResult> {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items"],
  });

  const paymentStatus = String(session.payment_status || "");
  const checkoutStatus = String(session.status || "");

  if (session.metadata?.checkout_kind !== "ebook_order") {
    return {
      ignored: true,
      fulfilled: false,
      emailSent: false,
      paymentStatus,
      checkoutStatus,
      message: "Session ignored.",
    };
  }

  if (paymentStatus === "unpaid") {
    return {
      fulfilled: false,
      emailSent: false,
      paymentStatus,
      checkoutStatus,
      message: "Payment has not completed yet.",
    };
  }

  const customerEmail = normalizeBuyerEmail(
    session.customer_details?.email || session.customer_email || session.metadata?.customer_email
  );

  if (!isValidBuyerEmail(customerEmail)) {
    throw new Error("Checkout session is missing a valid customer email address.");
  }

  const bookIds = parseBookIdsMetadata(session.metadata?.ebook_ids);
  if (!bookIds.length) {
    throw new Error("Checkout session is missing ebook metadata.");
  }

  const ebooks = await fetchActiveEbooks(adminClient, bookIds);
  if (ebooks.length !== bookIds.length) {
    throw new Error("One or more purchased e-books are no longer configured.");
  }

  const ebookMap = new Map(ebooks.map((ebook) => [ebook.id, ebook]));
  const orderedEbooks = bookIds.map((bookId) => ebookMap.get(bookId)).filter(Boolean) as EbookRecord[];
  const currency = String(session.currency || orderedEbooks[0]?.currency || "usd").toLowerCase();
  const items = orderedEbooks.map((ebook) => ({
    id: ebook.id,
    title: ebook.title,
    price_cents: ebook.price_cents,
    currency: ebook.currency,
  }));

  const orderPayload = {
    stripe_session_id: session.id,
    stripe_payment_intent:
      typeof session.payment_intent === "string" ? session.payment_intent : null,
    customer_email: customerEmail,
    amount_total: Number(session.amount_total || 0),
    currency,
    payment_status: paymentStatus,
    checkout_status: checkoutStatus,
    fulfillment_status: "pending",
    items,
  };

  const { error: insertError } = await adminClient.from("ebook_orders").insert(orderPayload);

  if (insertError) {
    if (insertError.code !== "23505") {
      throw new Error(insertError.message || "Unable to record ebook order.");
    }

    const { error: updateError } = await adminClient
      .from("ebook_orders")
      .update({
        stripe_payment_intent: orderPayload.stripe_payment_intent,
        customer_email: orderPayload.customer_email,
        amount_total: orderPayload.amount_total,
        currency: orderPayload.currency,
        payment_status: orderPayload.payment_status,
        checkout_status: orderPayload.checkout_status,
        items: orderPayload.items,
      })
      .eq("stripe_session_id", session.id);

    if (updateError) {
      throw new Error(updateError.message || "Unable to update ebook order.");
    }
  }

  const { data: claimedOrder, error: claimError } = await adminClient.rpc(
    "claim_ebook_order_fulfillment",
    {
      p_stripe_session_id: session.id,
    }
  );

  if (claimError) {
    throw new Error(claimError.message || "Unable to claim ebook order for delivery.");
  }

  if (!claimedOrder) {
    const { data: existingOrder } = await adminClient
      .from("ebook_orders")
      .select("email_sent_at,fulfillment_status")
      .eq("stripe_session_id", session.id)
      .maybeSingle();

    return {
      fulfilled: existingOrder?.fulfillment_status === "sent",
      emailSent: Boolean(existingOrder?.email_sent_at),
      customerEmail,
      paymentStatus,
      checkoutStatus,
      message: existingOrder?.email_sent_at
        ? "Delivery email was already sent."
        : "Delivery is already being processed.",
    };
  }

  try {
    const downloadLinks = await createDownloadLinks({
      adminClient,
      ebooks: orderedEbooks,
      expiresIn: signedUrlExpiresSeconds,
    });

    await sendResendEmail({
      apiKey: resendApiKey,
      from: emailFrom,
      to: customerEmail,
      subject: "Your TT Daniel e-books are ready",
      html: buildDeliveryHtml({
        siteUrl,
        downloadLinks,
        expiresIn: signedUrlExpiresSeconds,
      }),
      text: buildDeliveryText({
        downloadLinks,
        expiresIn: signedUrlExpiresSeconds,
      }),
    });

    const sentAt = new Date().toISOString();
    const { error: updateError } = await adminClient
      .from("ebook_orders")
      .update({
        fulfillment_status: "sent",
        fulfilled_at: sentAt,
        email_sent_at: sentAt,
        delivery_error: null,
      })
      .eq("stripe_session_id", session.id);

    if (updateError) {
      throw new Error(updateError.message || "Unable to mark ebook order delivered.");
    }

    return {
      fulfilled: true,
      emailSent: true,
      customerEmail,
      paymentStatus,
      checkoutStatus,
      message: "Delivery email sent.",
    };
  } catch (error) {
    await markOrderFailed(adminClient, session.id, error);
    throw error;
  }
}
