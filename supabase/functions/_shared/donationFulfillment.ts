import Stripe from "npm:stripe@21.0.1";
import {
  createSupabaseAdminClient,
  escapeHtml,
  normalizeEnvValue,
  sendResendEmail,
} from "./ebookFulfillment.ts";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

type DonationEmailStatus = "pending" | "sending" | "sent" | "failed";

export type DonationFulfillmentResult = {
  ignored?: boolean;
  amountTotal: number;
  checkoutStatus: string;
  currency: string;
  customerEmail?: string;
  emailSent: boolean;
  emailStatus?: DonationEmailStatus;
  frequency: string;
  message: string;
  mode: string;
  paymentStatus: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const DONATION_FREQUENCIES = new Set(["one_time", "week", "month", "year"]);

function isValidEmail(value: string) {
  return EMAIL_PATTERN.test(value) && value.length <= 254;
}

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function normalizeFrequency(value: unknown) {
  const normalized = String(value || "").trim().toLowerCase();
  return DONATION_FREQUENCIES.has(normalized) ? normalized : "one_time";
}

function formatFrequency(value: string) {
  const frequency = normalizeFrequency(value);
  if (frequency === "week") return "weekly";
  if (frequency === "month") return "monthly";
  if (frequency === "year") return "yearly";
  return "one-time";
}

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: String(currency || "usd").toUpperCase(),
  }).format(Number(cents || 0) / 100);
}

function getSessionStringId(value: string | Stripe.PaymentIntent | Stripe.Subscription | null) {
  return typeof value === "string" ? value : null;
}

function getDonationCustomerEmail(session: Stripe.Checkout.Session) {
  return normalizeEmail(session.customer_details?.email || session.customer_email);
}

function isDonationPaymentComplete(session: Stripe.Checkout.Session) {
  const paymentStatus = String(session.payment_status || "");
  return paymentStatus === "paid" || paymentStatus === "no_payment_required";
}

function buildDonationHtml({
  amountLabel,
  frequency,
  siteUrl,
}: {
  amountLabel: string;
  frequency: string;
  siteUrl: string;
}) {
  const homeUrl = new URL("/", siteUrl).toString();
  const frequencyLabel = formatFrequency(frequency);

  return `
    <div style="background:#f7f5f1;padding:30px 14px;font-family:Arial,sans-serif;color:#201b17;">
      <div style="max-width:680px;margin:0 auto;background:#fffdf8;border:1px solid #e4d8c8;border-radius:24px;overflow:hidden;">
        <div style="background:#22180f;padding:18px 24px;">
          <p style="margin:0;color:#f3d9a2;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;font-weight:700;">TT Daniel</p>
        </div>
        <div style="padding:28px 24px 30px;">
          <h1 style="margin:0 0 14px;font-size:28px;line-height:1.15;color:#20160d;">Thank you for your gift</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#4a3b2a;">
            Your ${escapeHtml(frequencyLabel)} support has been received. Thank you for standing with TT Daniel and helping this ministry continue its teaching, outreach, and care work.
          </p>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#4a3b2a;">
            We do not take your trust lightly. Your gift helps make spiritual resources, counsel, and practical encouragement available to more people.
          </p>
          <div style="margin:22px 0;padding:18px;border:1px solid #eadfcf;border-radius:14px;background:#faf6ee;">
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#8c7962;">Donation summary</p>
            <p style="margin:0;font-size:20px;font-weight:700;color:#20160d;">${escapeHtml(amountLabel)}</p>
            <p style="margin:8px 0 0;font-size:13px;color:#6b5c4a;">${escapeHtml(frequencyLabel)} support</p>
          </div>
          <p style="margin:0 0 18px;font-size:14px;line-height:1.7;color:#6b5c4a;">
            Keep this email for your records. If you need help with your donation, reply with the email address used at checkout.
          </p>
          <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#4a3b2a;">
            With gratitude,<br />
            TT Daniel
          </p>
          <p style="margin:0;">
            <a href="${homeUrl}" style="display:inline-block;border-radius:8px;background:#22180f;color:#fff4d6;text-decoration:none;padding:12px 16px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">
              Visit TT Daniel
            </a>
          </p>
        </div>
      </div>
    </div>
  `;
}

function buildDonationText({
  amountLabel,
  frequency,
}: {
  amountLabel: string;
  frequency: string;
}) {
  const frequencyLabel = formatFrequency(frequency);

  return [
    "Thank you for your gift.",
    "",
    `Your ${frequencyLabel} support has been received.`,
    "",
    "Thank you for standing with TT Daniel and helping this ministry continue its teaching, outreach, and care work. We do not take your trust lightly. Your gift helps make spiritual resources, counsel, and practical encouragement available to more people.",
    "",
    "Donation summary",
    `${amountLabel}`,
    `${frequencyLabel} support`,
    "",
    "Keep this email for your records. If you need help with your donation, reply with the email address used at checkout.",
    "",
    "With gratitude,",
    "TT Daniel",
  ].join("\n");
}

async function markDonationEmailFailed(
  adminClient: SupabaseAdminClient,
  sessionId: string,
  error: unknown
) {
  const message = error instanceof Error ? error.message : "Unable to send donor email.";

  await adminClient
    .from("donation_receipts")
    .update({
      email_status: "failed",
      email_error: message.slice(0, 1000),
    })
    .eq("stripe_session_id", sessionId);
}

export function getConfiguredDonationEmailFrom() {
  return (
    normalizeEnvValue(Deno.env.get("DONATION_EMAIL_FROM")) ||
    normalizeEnvValue(Deno.env.get("BLOG_EMAIL_FROM")) ||
    normalizeEnvValue(Deno.env.get("EBOOK_EMAIL_FROM"))
  );
}

export function isValidDonationSessionId(value: string) {
  return /^cs_[A-Za-z0-9_]+$/.test(value);
}

export async function fulfillDonationCheckoutSessionFromSession({
  adminClient,
  emailFrom,
  resendApiKey,
  session,
  siteUrl,
}: {
  adminClient: SupabaseAdminClient;
  emailFrom: string;
  resendApiKey: string;
  session: Stripe.Checkout.Session;
  siteUrl: string;
}): Promise<DonationFulfillmentResult> {
  const paymentStatus = String(session.payment_status || "");
  const checkoutStatus = String(session.status || "");
  const mode = String(session.mode || "");
  const amountTotal = Number(session.amount_total || 0);
  const currency = String(session.currency || "usd").toLowerCase();
  const frequency = normalizeFrequency(session.metadata?.frequency);

  if (session.metadata?.donation_kind !== "donation") {
    return {
      ignored: true,
      amountTotal,
      checkoutStatus,
      currency,
      emailSent: false,
      frequency,
      message: "Session ignored.",
      mode,
      paymentStatus,
    };
  }

  if (!isDonationPaymentComplete(session)) {
    return {
      amountTotal,
      checkoutStatus,
      currency,
      emailSent: false,
      frequency,
      message: "Donation payment is not complete yet.",
      mode,
      paymentStatus,
    };
  }

  const customerEmail = getDonationCustomerEmail(session);
  if (!isValidEmail(customerEmail)) {
    throw new Error("Donation session is missing a valid donor email address.");
  }

  const receiptPayload = {
    stripe_session_id: session.id,
    stripe_payment_intent: getSessionStringId(session.payment_intent),
    stripe_subscription_id: getSessionStringId(session.subscription),
    donor_email: customerEmail,
    amount_total: amountTotal,
    currency,
    frequency,
    payment_status: paymentStatus,
    checkout_status: checkoutStatus,
    email_status: "pending",
  };

  const { error: insertError } = await adminClient.from("donation_receipts").insert(receiptPayload);

  if (insertError) {
    if (insertError.code !== "23505") {
      throw new Error(insertError.message || "Unable to record donation receipt.");
    }

    const { error: updateError } = await adminClient
      .from("donation_receipts")
      .update({
        stripe_payment_intent: receiptPayload.stripe_payment_intent,
        stripe_subscription_id: receiptPayload.stripe_subscription_id,
        donor_email: receiptPayload.donor_email,
        amount_total: receiptPayload.amount_total,
        currency: receiptPayload.currency,
        frequency: receiptPayload.frequency,
        payment_status: receiptPayload.payment_status,
        checkout_status: receiptPayload.checkout_status,
      })
      .eq("stripe_session_id", session.id);

    if (updateError) {
      throw new Error(updateError.message || "Unable to update donation receipt.");
    }
  }

  const { data: claimedReceipt, error: claimError } = await adminClient.rpc(
    "claim_donation_receipt_email",
    {
      p_stripe_session_id: session.id,
    }
  );

  if (claimError) {
    throw new Error(claimError.message || "Unable to claim donation email.");
  }

  if (!claimedReceipt) {
    const { data: existingReceipt } = await adminClient
      .from("donation_receipts")
      .select("email_sent_at,email_status")
      .eq("stripe_session_id", session.id)
      .maybeSingle();

    const emailStatus = existingReceipt?.email_status as DonationEmailStatus | undefined;
    return {
      amountTotal,
      checkoutStatus,
      currency,
      customerEmail,
      emailSent: Boolean(existingReceipt?.email_sent_at),
      emailStatus,
      frequency,
      message: existingReceipt?.email_sent_at
        ? "Donor thank-you email was already sent."
        : "Donor thank-you email is already being processed.",
      mode,
      paymentStatus,
    };
  }

  try {
    const amountLabel = formatCurrency(amountTotal, currency);

    await sendResendEmail({
      apiKey: resendApiKey,
      from: emailFrom,
      to: customerEmail,
      subject: "Thank you for supporting TT Daniel",
      html: buildDonationHtml({
        amountLabel,
        frequency,
        siteUrl,
      }),
      text: buildDonationText({
        amountLabel,
        frequency,
      }),
    });

    const sentAt = new Date().toISOString();
    const { error: updateError } = await adminClient
      .from("donation_receipts")
      .update({
        email_status: "sent",
        email_error: null,
        email_sent_at: sentAt,
      })
      .eq("stripe_session_id", session.id);

    if (updateError) {
      throw new Error(updateError.message || "Unable to mark donor email sent.");
    }

    return {
      amountTotal,
      checkoutStatus,
      currency,
      customerEmail,
      emailSent: true,
      emailStatus: "sent",
      frequency,
      message: "Donor thank-you email sent.",
      mode,
      paymentStatus,
    };
  } catch (error) {
    await markDonationEmailFailed(adminClient, session.id, error);
    throw error;
  }
}

export async function fulfillDonationCheckoutSession({
  adminClient,
  emailFrom,
  resendApiKey,
  sessionId,
  siteUrl,
  stripe,
}: {
  adminClient: SupabaseAdminClient;
  emailFrom: string;
  resendApiKey: string;
  sessionId: string;
  siteUrl: string;
  stripe: Stripe;
}) {
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  return fulfillDonationCheckoutSessionFromSession({
    adminClient,
    emailFrom,
    resendApiKey,
    session,
    siteUrl,
  });
}
