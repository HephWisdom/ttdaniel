import { createClient } from "npm:@supabase/supabase-js@2";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const PHONE_PATTERN = /^[+()\-\s0-9.]{7,30}$/;
const INVOLVEMENT_OPTIONS = new Set([
  "exploring",
  "sensing-a-call",
  "currently-serving",
  "ministry-leader",
  "other",
]);
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_ACTOR_MAX = 10;
const RATE_LIMIT_EMAIL_MAX = 4;
const MAX_REQUEST_BODY_LENGTH = 20_000;

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

function isLocalOrigin(origin: string) {
  try {
    const url = new URL(origin);
    return url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  } catch {
    return false;
  }
}

function buildCorsHeaders(siteUrl: string, request: Request) {
  const siteOrigin = normalizeOrigin(siteUrl);
  const requestOrigin = normalizeEnvValue(request.headers.get("Origin") || undefined);
  const allowOrigin =
    requestOrigin && (requestOrigin === siteOrigin || isLocalOrigin(requestOrigin))
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

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";

  return value
    .normalize("NFKC")
    .replace(/[<>&]/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength)
    .trim();
}

function escapeHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getRequestClientIp(request: Request) {
  const forwardedFor = normalizeEnvValue(request.headers.get("x-forwarded-for") || undefined);
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "";

  return (
    normalizeEnvValue(request.headers.get("cf-connecting-ip") || undefined) ||
    normalizeEnvValue(request.headers.get("x-real-ip") || undefined) ||
    ""
  );
}

async function sha256Hex(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function consumeRequestLimit({
  adminClient,
  scope,
  subjectHash,
  limit,
}: {
  adminClient: ReturnType<typeof createClient>;
  scope: "actor" | "email";
  subjectHash: string;
  limit: number;
}) {
  const { data, error } = await adminClient.rpc("consume_edge_request_limit", {
    p_endpoint: "register_for_dmc",
    p_scope: scope,
    p_subject_hash: subjectHash,
    p_window_seconds: Math.floor(RATE_LIMIT_WINDOW_MS / 1000),
    p_max_requests: limit,
  });

  if (error) {
    throw new Error("Registration rate limiting is not configured.");
  }

  if (data !== true) {
    throw new Error("Too many registration attempts. Please try again later.");
  }
}

function registrationAcceptedResponse(siteUrl: string, request: Request) {
  return jsonResponse(
    200,
    {
      accepted: true,
      alreadyRegistered: false,
      confirmationEmailSent: false,
      message:
        "Your pre-registration has been received. We will contact you with class updates.",
    },
    siteUrl,
    request
  );
}

function buildConfirmationHtml(siteUrl: string, fullName: string) {
  const safeName = escapeHtml(fullName || "friend");
  const dmcUrl = new URL("/spirituality/discerning-ministry-class", siteUrl).toString();

  return `
    <div style="background:#f1f2ef;padding:32px 16px;font-family:Arial,sans-serif;color:#181410;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #dedfd9;">
        <div style="background:#151515;padding:18px 24px;">
          <p style="margin:0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;font-weight:700;color:#dfc184;">
            Discerning Ministry Class
          </p>
        </div>
        <div style="padding:30px 24px 34px;">
          <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Hello ${safeName},</p>
          <h1 style="margin:0 0 18px;font-size:30px;line-height:1.1;color:#171717;">
            Your DMC pre-registration is confirmed
          </h1>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#4b4b46;">
            Thank you for pre-registering for the Discerning Ministry Class.
          </p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#4b4b46;">
            We will contact you when the class dates and participation details are available.
          </p>
          <a href="${dmcUrl}" style="display:inline-block;border-radius:8px;background:#151515;color:#ffffff;text-decoration:none;padding:14px 20px;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">
            View DMC details
          </a>
        </div>
      </div>
    </div>
  `;
}

function buildConfirmationText(siteUrl: string, fullName: string) {
  const dmcUrl = new URL("/spirituality/discerning-ministry-class", siteUrl).toString();

  return [
    `Hello ${fullName || "friend"},`,
    "",
    "Your Discerning Ministry Class pre-registration is confirmed.",
    "We will contact you when the class dates and participation details are available.",
    "",
    `View DMC details: ${dmcUrl}`,
  ].join("\n");
}

async function sendConfirmationEmail({
  apiKey,
  from,
  to,
  siteUrl,
  fullName,
  registrationId,
}: {
  apiKey: string;
  from: string;
  to: string;
  siteUrl: string;
  fullName: string;
  registrationId: string;
}) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `dmc-registration-${registrationId}`,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Your DMC pre-registration is confirmed",
      html: buildConfirmationHtml(siteUrl, fullName),
      text: buildConfirmationText(siteUrl, fullName),
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      String(
        payload?.message ||
          payload?.error?.message ||
          payload?.error ||
          "Confirmation email could not be sent."
      )
    );
  }
}

Deno.serve(async (request) => {
  const siteUrl = normalizeEnvValue(Deno.env.get("SITE_URL"));

  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: buildCorsHeaders(siteUrl, request) });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." }, siteUrl, request);
  }

  const supabaseUrl = normalizeEnvValue(Deno.env.get("SUPABASE_URL"));
  const serviceRoleKey = normalizeEnvValue(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  const resendApiKey = normalizeEnvValue(Deno.env.get("RESEND_API_KEY"));
  const senderEmail = normalizeEnvValue(Deno.env.get("BLOG_EMAIL_FROM"));

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: "Supabase function secrets are incomplete." }, siteUrl, request);
  }

  if (!resendApiKey || !senderEmail || !siteUrl || !normalizeOrigin(siteUrl)) {
    return jsonResponse(
      500,
      {
        error:
          "Set RESEND_API_KEY, SITE_URL, and BLOG_EMAIL_FROM before enabling DMC registration.",
      },
      siteUrl,
      request
    );
  }

  let body: {
    fullName?: string;
    email?: string;
    phone?: string | null;
    country?: string;
    ministryInvolvement?: string;
    discernmentFocus?: string | null;
    contactConsent?: boolean;
    website?: string;
  };

  try {
    const rawBody = await request.text();
    if (rawBody.length > MAX_REQUEST_BODY_LENGTH) {
      return jsonResponse(413, { error: "Request body is too large." }, siteUrl, request);
    }
    body = JSON.parse(rawBody);
  } catch {
    return jsonResponse(400, { error: "Request body must be valid JSON." }, siteUrl, request);
  }

  const fullName = sanitizeText(body?.fullName, 100);
  const email = sanitizeText(body?.email, 160).toLowerCase();
  const phone = sanitizeText(body?.phone, 30);
  const country = sanitizeText(body?.country, 80);
  const ministryInvolvement = sanitizeText(body?.ministryInvolvement, 40);
  const discernmentFocus = sanitizeText(body?.discernmentFocus, 1000);
  const website = sanitizeText(body?.website, 120);

  if (website) {
    return registrationAcceptedResponse(siteUrl, request);
  }

  if (fullName.length < 2) {
    return jsonResponse(400, { error: "Enter your full name." }, siteUrl, request);
  }
  if (!EMAIL_PATTERN.test(email)) {
    return jsonResponse(400, { error: "Enter a valid email address." }, siteUrl, request);
  }
  if (phone && !PHONE_PATTERN.test(phone)) {
    return jsonResponse(400, { error: "Enter a valid phone or WhatsApp number." }, siteUrl, request);
  }
  if (country.length < 2) {
    return jsonResponse(400, { error: "Enter your country." }, siteUrl, request);
  }
  if (!INVOLVEMENT_OPTIONS.has(ministryInvolvement)) {
    return jsonResponse(
      400,
      { error: "Select the option that best describes your ministry journey." },
      siteUrl,
      request
    );
  }
  if (body?.contactConsent !== true) {
    return jsonResponse(
      400,
      { error: "Consent is required so we can contact you about the class." },
      siteUrl,
      request
    );
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const actorSource = [
    getRequestClientIp(request),
    normalizeEnvValue(request.headers.get("user-agent") || undefined),
    normalizeEnvValue(request.headers.get("Origin") || undefined),
  ]
    .filter(Boolean)
    .join("|");

  try {
    await consumeRequestLimit({
      adminClient,
      scope: "actor",
      subjectHash: await sha256Hex(actorSource || `anonymous|${email}`),
      limit: RATE_LIMIT_ACTOR_MAX,
    });
    await consumeRequestLimit({
      adminClient,
      scope: "email",
      subjectHash: await sha256Hex(email),
      limit: RATE_LIMIT_EMAIL_MAX,
    });
  } catch (error) {
    return jsonResponse(
      429,
      {
        error:
          error instanceof Error
            ? error.message
            : "Too many registration attempts. Please try again later.",
      },
      siteUrl,
      request
    );
  }

  const { data: existingData, error: existingError } = await adminClient
    .from("ministry_class_registrations")
    .select("id")
    .eq("program_key", "dmc")
    .eq("email", email)
    .maybeSingle();

  if (existingError) {
    console.error("Unable to check DMC registration:", existingError);
    return jsonResponse(
      500,
      {
        error: "Unable to process the registration right now.",
      },
      siteUrl,
      request
    );
  }

  if (existingData?.id) {
    return registrationAcceptedResponse(siteUrl, request);
  }

  const registrationPayload = {
    program_key: "dmc",
    full_name: fullName,
    email,
    phone: phone || null,
    country,
    ministry_involvement: ministryInvolvement,
    discernment_focus: discernmentFocus || null,
    contact_consent: true,
    source: "website",
    confirmation_email_error: null,
  };

  const { data: insertedRegistration, error: insertError } = await adminClient
    .from("ministry_class_registrations")
    .insert(registrationPayload)
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return registrationAcceptedResponse(siteUrl, request);
    }

    console.error("Unable to save DMC registration:", insertError);
    return jsonResponse(
      500,
      { error: "Unable to save the registration right now." },
      siteUrl,
      request
    );
  }

  const registrationId = String(insertedRegistration?.id || "");

  try {
    await sendConfirmationEmail({
      apiKey: resendApiKey,
      from: senderEmail,
      to: email,
      siteUrl,
      fullName,
      registrationId,
    });

    await adminClient
      .from("ministry_class_registrations")
      .update({
        confirmation_email_sent_at: new Date().toISOString(),
        confirmation_email_error: null,
      })
      .eq("id", registrationId);

    return registrationAcceptedResponse(siteUrl, request);
  } catch (error) {
    const emailError =
      error instanceof Error ? error.message : "The confirmation email could not be sent.";

    await adminClient
      .from("ministry_class_registrations")
      .update({ confirmation_email_error: emailError.slice(0, 1000) })
      .eq("id", registrationId);

    return registrationAcceptedResponse(siteUrl, request);
  }
});
