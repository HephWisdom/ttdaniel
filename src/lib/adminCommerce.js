import { isSupabaseConfigured, supabase } from "./supabaseClient";

const TABLE_MISSING_CODES = new Set(["42P01", "PGRST205"]);

function normalizeMoneyCents(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount) : 0;
}

function normalizeCurrency(value) {
  const currency = String(value || "usd").trim().toLowerCase();
  return /^[a-z]{3}$/.test(currency) ? currency : "usd";
}

function normalizeItems(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => ({
      currency: normalizeCurrency(item?.currency),
      id: String(item?.id || "").trim(),
      priceCents: normalizeMoneyCents(item?.price_cents ?? item?.priceCents),
      title: String(item?.title || "Untitled e-book").trim(),
    }))
    .filter((item) => item.id || item.title);
}

function normalizeEbookOrder(order) {
  const items = normalizeItems(order?.items);

  return {
    id: order?.id || "",
    stripeSessionId: order?.stripe_session_id || "",
    stripePaymentIntent: order?.stripe_payment_intent || "",
    customerEmail: String(order?.customer_email || "").trim().toLowerCase(),
    amountTotal: normalizeMoneyCents(order?.amount_total),
    currency: normalizeCurrency(order?.currency),
    paymentStatus: String(order?.payment_status || "").trim(),
    checkoutStatus: String(order?.checkout_status || "").trim(),
    fulfillmentStatus: String(order?.fulfillment_status || "").trim(),
    deliveryError: String(order?.delivery_error || "").trim(),
    emailSentAt: order?.email_sent_at || null,
    fulfilledAt: order?.fulfilled_at || null,
    createdAt: order?.created_at || null,
    items,
    itemCount: items.length,
  };
}

function normalizeDonationReceipt(receipt) {
  return {
    id: receipt?.id || "",
    stripeSessionId: receipt?.stripe_session_id || "",
    stripePaymentIntent: receipt?.stripe_payment_intent || "",
    stripeSubscriptionId: receipt?.stripe_subscription_id || "",
    donorEmail: String(receipt?.donor_email || "").trim().toLowerCase(),
    amountTotal: normalizeMoneyCents(receipt?.amount_total),
    currency: normalizeCurrency(receipt?.currency),
    frequency: String(receipt?.frequency || "one_time").trim(),
    paymentStatus: String(receipt?.payment_status || "").trim(),
    checkoutStatus: String(receipt?.checkout_status || "").trim(),
    emailStatus: String(receipt?.email_status || "").trim(),
    emailError: String(receipt?.email_error || "").trim(),
    emailSentAt: receipt?.email_sent_at || null,
    createdAt: receipt?.created_at || null,
  };
}

function buildAdminCommerceError(error, tableName, label) {
  const message = String(error?.message || "").toLowerCase();
  if (TABLE_MISSING_CODES.has(error?.code) || message.includes(tableName)) {
    return `Add the ${tableName} table and admin read policy before opening ${label}.`;
  }

  if (
    message.includes("row-level security") ||
    message.includes("permission denied") ||
    message.includes("not allowed")
  ) {
    return `Admin access to ${label} is blocked. Apply the admin commerce read-policy migration.`;
  }

  return error?.message || `Unable to load ${label}.`;
}

export async function fetchAdminEbookOrders() {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("ebook_orders")
    .select(
      "id,stripe_session_id,stripe_payment_intent,customer_email,amount_total,currency,payment_status,checkout_status,fulfillment_status,items,delivery_error,fulfilled_at,email_sent_at,created_at"
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    throw new Error(buildAdminCommerceError(error, "ebook_orders", "e-book purchases"));
  }

  return Array.isArray(data) ? data.map(normalizeEbookOrder) : [];
}

export async function fetchAdminDonationReceipts() {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("donation_receipts")
    .select(
      "id,stripe_session_id,stripe_payment_intent,stripe_subscription_id,donor_email,amount_total,currency,frequency,payment_status,checkout_status,email_status,email_error,email_sent_at,created_at"
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    throw new Error(buildAdminCommerceError(error, "donation_receipts", "donations"));
  }

  return Array.isArray(data) ? data.map(normalizeDonationReceipt) : [];
}
