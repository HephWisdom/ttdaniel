import Stripe from "npm:stripe@21.0.1";

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
  if (!siteUrl || !stripeSecretKey) {
    return jsonResponse(
      500,
      { error: "Set SITE_URL and STRIPE_SECRET_KEY in Supabase function secrets." },
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

  const stripe = new Stripe(stripeSecretKey);

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const subscription =
      typeof session.subscription === "string"
        ? await stripe.subscriptions.retrieve(session.subscription)
        : null;

    const interval =
      subscription?.items?.data?.[0]?.price?.recurring?.interval || null;

    return jsonResponse(
      200,
      {
        amountTotal: session.amount_total || 0,
        currency: session.currency || "usd",
        customerEmail:
          session.customer_details?.email || session.customer_email || "",
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
        error:
          error instanceof Error
            ? error.message
            : "Unable to retrieve the donation session.",
      },
      siteUrl,
      request
    );
  }
});
