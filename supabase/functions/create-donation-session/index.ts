import Stripe from "npm:stripe@21.0.1";

const DONATION_PRESETS = new Set([5, 10, 20, 50, 80, 100, 120, 150, 180, 200]);
const DONATION_MIN_AMOUNT = 5;
const DONATION_MAX_AMOUNT = 5000;
const DONATION_FREQUENCIES = new Set(["one_time", "week", "month", "year"]);

function normalizeEnvValue(value: string | undefined) {
  const trimmed = String(value || "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

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

function normalizeInteger(value: unknown) {
  const nextValue = Number(value);
  if (!Number.isFinite(nextValue)) return 0;
  return Math.round(nextValue);
}

function normalizeDonationFrequency(value: unknown) {
  const normalized = String(value || "").trim().toLowerCase();
  return DONATION_FREQUENCIES.has(normalized) ? normalized : "one_time";
}

function validateDonationAmount(value: unknown) {
  const amount = normalizeInteger(value);
  if (amount < DONATION_MIN_AMOUNT || amount > DONATION_MAX_AMOUNT) {
    throw new Error(
      `Donation amount must be between $${DONATION_MIN_AMOUNT} and $${DONATION_MAX_AMOUNT}.`
    );
  }
  return amount;
}

function normalizePagePath(value: unknown) {
  if (typeof value !== "string") return "/";
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return "/";
  return trimmed.replace(/[\r\n]/g, "").slice(0, 500) || "/";
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
  const donationCurrency = normalizeEnvValue(Deno.env.get("DONATION_CURRENCY")) || "usd";

  if (!siteUrl || !stripeSecretKey) {
    return jsonResponse(
      500,
      {
        error: "Donation payments are not configured yet.",
      },
      siteUrl,
      request
    );
  }

  let body: { amount?: number; frequency?: string; pagePath?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { error: "Request body must be valid JSON." }, siteUrl, request);
  }

  let amount = 0;
  try {
    amount = validateDonationAmount(body?.amount);
  } catch (error) {
    return jsonResponse(
      400,
      { error: error instanceof Error ? error.message : "Invalid donation amount." },
      siteUrl,
      request
    );
  }

  const frequency = normalizeDonationFrequency(body?.frequency);
  const pagePath = normalizePagePath(body?.pagePath);
  const stripe = new Stripe(stripeSecretKey);
  const isRecurring = frequency !== "one_time";
  const interval = isRecurring ? (frequency as "week" | "month" | "year") : undefined;

  try {
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded_page",
      redirect_on_completion: "never",
      mode: isRecurring ? "subscription" : "payment",
      submit_type: isRecurring ? undefined : "donate",
      billing_address_collection: "auto",
      customer_creation: isRecurring ? undefined : "always",
      // Keep the embedded donation flow on cards only.
      // Embedded Checkout auto-enables one-click wallets and Link, which require
      // HTTPS plus a registered domain and can fail during localhost testing.
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: donationCurrency,
            unit_amount: amount * 100,
            recurring: interval ? { interval } : undefined,
            product_data: {
              name: "TT Daniel Donation",
              description: isRecurring
                ? `${frequency.charAt(0).toUpperCase()}${frequency.slice(1)} recurring donation`
                : "One-time donation",
            },
          },
        },
      ],
      metadata: {
        amount: String(amount),
        donation_kind: "donation",
        frequency,
        page_path: pagePath,
        preset_amount: DONATION_PRESETS.has(amount) ? "true" : "false",
      },
    });

    if (!session.client_secret) {
      return jsonResponse(
        502,
        { error: "Unable to prepare the secure checkout." },
        siteUrl,
        request
      );
    }

    return jsonResponse(
      200,
      {
        clientSecret: session.client_secret,
        sessionId: session.id,
      },
      siteUrl,
      request
    );
  } catch (error) {
    return jsonResponse(
      502,
      {
        error: "Unable to create the donation checkout session.",
      },
      siteUrl,
      request
    );
  }
});
