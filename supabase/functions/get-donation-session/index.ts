import Stripe from "npm:stripe@21.0.1";
import {
  createSupabaseAdminClient,
  normalizeEnvValue,
} from "../_shared/ebookFulfillment.ts";
import {
  fulfillDonationCheckoutSessionFromSession,
  getConfiguredDonationEmailFrom,
  isValidDonationSessionId,
} from "../_shared/donationFulfillment.ts";

function normalizeOrigin(siteUrl: string) {
  try {
    return new URL(siteUrl).origin;
  } catch {
    return "";
  }
}

function buildCorsHeaders(siteUrl: string, request: Request) {
  const siteOrigin = normalizeOrigin(siteUrl);
  const requestOrigin = normalizeEnvValue(request.headers.get("Origin") || undefined);
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

function jsonResponse(
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

Deno.serve(async (request) => {
  const siteUrl = normalizeEnvValue(Deno.env.get("SITE_URL"));

  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: buildCorsHeaders(siteUrl, request) });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." }, siteUrl, request);
  }

  const stripeSecretKey = normalizeEnvValue(Deno.env.get("STRIPE_SECRET_KEY"));
  const resendApiKey = normalizeEnvValue(Deno.env.get("RESEND_API_KEY"));
  const emailFrom = getConfiguredDonationEmailFrom();
  if (!siteUrl || !stripeSecretKey) {
    return jsonResponse(
      500,
      { error: "Donation payments are not configured yet." },
      siteUrl,
      request
    );
  }

  let body: { sessionId?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { error: "Request body must be valid JSON." }, siteUrl, request);
  }

  const sessionId = String(body?.sessionId || "").trim();
  if (!sessionId) {
    return jsonResponse(400, { error: "Missing sessionId." }, siteUrl, request);
  }

  if (!isValidDonationSessionId(sessionId)) {
    return jsonResponse(400, { error: "Invalid sessionId." }, siteUrl, request);
  }

  const stripe = new Stripe(stripeSecretKey);

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.metadata?.donation_kind !== "donation") {
      return jsonResponse(403, { error: "Session is not a donation session." }, siteUrl, request);
    }

    const subscription =
      typeof session.subscription === "string"
        ? await stripe.subscriptions.retrieve(session.subscription)
        : null;

    const interval =
      subscription?.items?.data?.[0]?.price?.recurring?.interval || null;
    let emailSent = false;
    let emailMessage = "";

    if (
      resendApiKey &&
      emailFrom &&
      (session.payment_status === "paid" || session.payment_status === "no_payment_required")
    ) {
      try {
        const adminClient = createSupabaseAdminClient();
        const donationEmail = await fulfillDonationCheckoutSessionFromSession({
          adminClient,
          emailFrom,
          resendApiKey,
          session,
          siteUrl,
        });
        emailSent = donationEmail.emailSent;
        emailMessage = donationEmail.message;
      } catch (error) {
        console.error("Donor thank-you email failed", error);
        emailMessage = "Donation was confirmed, but the thank-you email could not be sent yet.";
      }
    }

    return jsonResponse(
      200,
      {
        amountTotal: session.amount_total || 0,
        currency: session.currency || "usd",
        customerEmail:
          session.customer_details?.email || session.customer_email || "",
        emailMessage,
        emailSent,
        frequency:
          session.metadata?.frequency ||
          (interval === "week" || interval === "month" || interval === "year"
            ? interval
            : "one_time"),
        mode: session.mode || "",
        paymentStatus: session.payment_status || "",
        status: session.status || "",
      },
      siteUrl,
      request
    );
  } catch (error) {
    return jsonResponse(
      502,
      {
        error: "Unable to retrieve the donation session.",
      },
      siteUrl,
      request
    );
  }
});
