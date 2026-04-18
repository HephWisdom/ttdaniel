import Stripe from "npm:stripe@21.0.1";
import {
  buildCorsHeaders,
  createSupabaseAdminClient,
  fulfillEbookCheckoutSession,
  getConfiguredEmailFrom,
  getSignedUrlExpiresSeconds,
  isValidCheckoutSessionId,
  jsonResponse,
  normalizeEnvValue,
} from "../_shared/ebookFulfillment.ts";

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
  const emailFrom = getConfiguredEmailFrom();

  if (!siteUrl || !stripeSecretKey || !resendApiKey || !emailFrom) {
    return jsonResponse(
      500,
      { error: "E-book delivery is not configured yet." },
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

  if (!isValidCheckoutSessionId(sessionId)) {
    return jsonResponse(400, { error: "Invalid sessionId." }, siteUrl, request);
  }

  try {
    const stripe = new Stripe(stripeSecretKey);
    const adminClient = createSupabaseAdminClient();
    const result = await fulfillEbookCheckoutSession({
      stripe,
      adminClient,
      sessionId,
      siteUrl,
      resendApiKey,
      emailFrom,
      signedUrlExpiresSeconds: getSignedUrlExpiresSeconds(),
    });

    if (result.ignored) {
      return jsonResponse(403, { error: "Session is not an e-book order." }, siteUrl, request);
    }

    return jsonResponse(200, result, siteUrl, request);
  } catch (error) {
    console.error("E-book checkout confirmation failed", error);
    return jsonResponse(
      502,
      {
        error:
          "Payment was received, but delivery could not be confirmed. Please contact support with your order email.",
      },
      siteUrl,
      request
    );
  }
});
