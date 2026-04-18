import Stripe from "npm:stripe@21.0.1";
import {
  createSupabaseAdminClient,
  fulfillEbookCheckoutSession,
  getConfiguredEmailFrom,
  getSignedUrlExpiresSeconds,
  normalizeEnvValue,
} from "../_shared/ebookFulfillment.ts";
import {
  fulfillDonationCheckoutSession,
  getConfiguredDonationEmailFrom,
} from "../_shared/donationFulfillment.ts";

const HANDLED_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed." }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stripeSecretKey = normalizeEnvValue(Deno.env.get("STRIPE_SECRET_KEY"));
  const webhookSecret = normalizeEnvValue(Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET"));
  const siteUrl = normalizeEnvValue(Deno.env.get("SITE_URL"));
  const resendApiKey = normalizeEnvValue(Deno.env.get("RESEND_API_KEY"));
  const ebookEmailFrom = getConfiguredEmailFrom();
  const donationEmailFrom = getConfiguredDonationEmailFrom();
  const signature = request.headers.get("Stripe-Signature");

  if (!stripeSecretKey || !webhookSecret || !siteUrl || !resendApiKey) {
    return new Response(JSON.stringify({ error: "Webhook is not configured." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing Stripe signature." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeSecretKey);
  const cryptoProvider = Stripe.createSubtleCryptoProvider();
  const body = await request.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Invalid Stripe signature.",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  if (!HANDLED_EVENTS.has(event.type)) {
    return new Response(JSON.stringify({ received: true, ignored: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const isEbookOrder = session.metadata?.checkout_kind === "ebook_order";
  const isDonation = session.metadata?.donation_kind === "donation";

  try {
    const adminClient = createSupabaseAdminClient();

    if (isEbookOrder) {
      if (!ebookEmailFrom) {
        throw new Error("E-book email sender is not configured.");
      }

      const result = await fulfillEbookCheckoutSession({
        stripe,
        adminClient,
        sessionId: session.id,
        siteUrl,
        resendApiKey,
        emailFrom: ebookEmailFrom,
        signedUrlExpiresSeconds: getSignedUrlExpiresSeconds(),
      });

      return new Response(JSON.stringify({ received: true, result }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (isDonation) {
      if (!donationEmailFrom) {
        throw new Error("Donation email sender is not configured.");
      }

      const result = await fulfillDonationCheckoutSession({
        stripe,
        adminClient,
        sessionId: session.id,
        siteUrl,
        resendApiKey,
        emailFrom: donationEmailFrom,
      });

      return new Response(JSON.stringify({ received: true, result }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ received: true, ignored: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unable to fulfill Stripe checkout.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
