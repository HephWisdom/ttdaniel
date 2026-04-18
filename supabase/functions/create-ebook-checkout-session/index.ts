import Stripe from "npm:stripe@21.0.1";
import {
  buildCorsHeaders,
  createSupabaseAdminClient,
  fetchActiveEbooks,
  getConfiguredEmailFrom,
  isValidBuyerEmail,
  jsonResponse,
  normalizeBookIds,
  normalizeBuyerEmail,
  normalizeEnvValue,
  normalizePagePath,
} from "../_shared/ebookFulfillment.ts";

const MAX_CART_ITEMS = 20;

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
      { error: "E-book checkout is not configured yet." },
      siteUrl,
      request
    );
  }

  let body: { bookIds?: string[]; customerEmail?: string; pagePath?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { error: "Request body must be valid JSON." }, siteUrl, request);
  }

  const bookIds = normalizeBookIds(body?.bookIds);
  if (!bookIds.length) {
    return jsonResponse(400, { error: "Add at least one e-book to your cart." }, siteUrl, request);
  }

  if (bookIds.length > MAX_CART_ITEMS) {
    return jsonResponse(
      400,
      { error: `You can checkout with up to ${MAX_CART_ITEMS} e-books at once.` },
      siteUrl,
      request
    );
  }

  const customerEmail = normalizeBuyerEmail(body?.customerEmail);
  if (!isValidBuyerEmail(customerEmail)) {
    return jsonResponse(400, { error: "Enter a valid email address for delivery." }, siteUrl, request);
  }

  let adminClient;
  try {
    adminClient = createSupabaseAdminClient();
  } catch {
    return jsonResponse(
      500,
      { error: "E-book checkout storage is not configured yet." },
      siteUrl,
      request
    );
  }

  let ebooks;
  try {
    ebooks = await fetchActiveEbooks(adminClient, bookIds);
  } catch {
    return jsonResponse(
      502,
      { error: "Unable to load the secure e-book catalog." },
      siteUrl,
      request
    );
  }

  if (ebooks.length !== bookIds.length) {
    const foundBookIds = new Set(ebooks.map((ebook) => ebook.id));
    const unavailableBookIds = bookIds.filter((bookId) => !foundBookIds.has(bookId));

    return jsonResponse(
      400,
      {
        error: "One or more e-books are unavailable right now.",
        unavailableBookIds,
      },
      siteUrl,
      request
    );
  }

  const currency = ebooks[0]?.currency?.toLowerCase() || "usd";
  const hasMixedCurrency = ebooks.some((ebook) => ebook.currency.toLowerCase() !== currency);
  if (hasMixedCurrency) {
    return jsonResponse(
      400,
      { error: "Cart contains e-books with mixed currencies." },
      siteUrl,
      request
    );
  }

  const ebookMap = new Map(ebooks.map((ebook) => [ebook.id, ebook]));
  const orderedEbooks = bookIds.map((bookId) => ebookMap.get(bookId)).filter(Boolean) as typeof ebooks;
  const stripe = new Stripe(stripeSecretKey);
  const pagePath = normalizePagePath(body?.pagePath);

  try {
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded_page",
      redirect_on_completion: "never",
      mode: "payment",
      billing_address_collection: "auto",
      customer_creation: "always",
      customer_email: customerEmail,
      payment_method_types: ["card"],
      line_items: orderedEbooks.map((ebook) => ({
        quantity: 1,
        price_data: {
          currency,
          unit_amount: ebook.price_cents,
          product_data: {
            name: ebook.title,
            description: ebook.description?.slice(0, 500) || "TT Daniel e-book",
            metadata: {
              ebook_id: ebook.id,
            },
          },
        },
      })),
      metadata: {
        checkout_kind: "ebook_order",
        customer_email: customerEmail,
        ebook_ids: bookIds.join(","),
        page_path: pagePath,
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
        currency,
        amountTotal: orderedEbooks.reduce((total, ebook) => total + ebook.price_cents, 0),
        lineItems: orderedEbooks.map((ebook) => ({
          id: ebook.id,
          title: ebook.title,
          priceCents: ebook.price_cents,
          currency: ebook.currency,
        })),
      },
      siteUrl,
      request
    );
  } catch {
    return jsonResponse(
      502,
      { error: "Unable to create the e-book checkout session." },
      siteUrl,
      request
    );
  }
});
