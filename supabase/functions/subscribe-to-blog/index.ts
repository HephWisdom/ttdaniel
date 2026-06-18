import { createClient } from "npm:@supabase/supabase-js@2";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const SUBSCRIBE_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const SUBSCRIBE_RATE_LIMIT_ACTOR_MAX = 12;
const SUBSCRIBE_RATE_LIMIT_EMAIL_MAX = 4;
const SUBSCRIBE_HONEYPOT_MAX_LENGTH = 200;

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

function escapeHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";

  let sanitized = value.normalize("NFKC");
  sanitized = sanitized.replace(/[<>&]/g, "");
  sanitized = sanitized.replace(/[\u0000-\u001F\u007F]/g, "");
  sanitized = sanitized.replace(/\s+/g, " ").trim();

  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength).trim();
  }

  return sanitized;
}

function getRequestClientIp(request: Request) {
  const forwardedFor = normalizeEnvValue(request.headers.get("x-forwarded-for") || undefined);
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "";
  }

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

async function ensureRequestWithinRateLimit({
  adminClient,
  actorHash,
  emailHash,
}: {
  adminClient: ReturnType<typeof createClient>;
  actorHash: string;
  emailHash: string;
}) {
  const checks = [
    {
      scope: "actor",
      subjectHash: actorHash,
      limit: SUBSCRIBE_RATE_LIMIT_ACTOR_MAX,
    },
    {
      scope: "email",
      subjectHash: emailHash,
      limit: SUBSCRIBE_RATE_LIMIT_EMAIL_MAX,
    },
  ];

  for (const check of checks) {
    const { data, error } = await adminClient.rpc("consume_edge_request_limit", {
      p_endpoint: "subscribe_to_blog",
      p_scope: check.scope,
      p_subject_hash: check.subjectHash,
      p_window_seconds: Math.floor(SUBSCRIBE_RATE_LIMIT_WINDOW_MS / 1000),
      p_max_requests: check.limit,
    });

    if (error) {
      throw new Error("Subscription rate limiting is not configured.");
    }

    if (data !== true) {
      throw new Error("Too many subscription attempts. Please try again later.");
    }
  }
}

function buildConfirmationHtml(siteUrl: string, subscriberName: string) {
  const safeName = escapeHtml(subscriberName || "friend");
  const blogUrl = new URL("/blog", siteUrl).toString();

  return `
    <div style="background:#f3f0e7;padding:32px 16px;font-family:Arial,sans-serif;color:#181410;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:28px;overflow:hidden;border:1px solid #e6dcc8;">
        <div style="background:#111827;padding:16px 24px;">
          <p style="margin:0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;font-weight:700;color:#ffe800;">
            TT Daniel Blog
          </p>
        </div>
        <div style="padding:28px 24px 32px;">
          <p style="margin:0 0 10px;font-size:15px;line-height:1.6;">Hello ${safeName},</p>
          <h1 style="margin:0 0 18px;font-size:30px;line-height:1.05;text-transform:uppercase;">
            Your Subscription Is Confirmed
          </h1>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#3d342c;">
            You are now subscribed to receive the latest TT Daniel blog updates by email.
          </p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#3d342c;">
            We will send new posts to this email address as they are published.
          </p>
          <a
            href="${blogUrl}"
            style="display:inline-block;border-radius:999px;background:#ffe800;color:#111111;text-decoration:none;padding:14px 22px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;"
          >
            Browse The Blog
          </a>
        </div>
      </div>
    </div>
  `;
}

function buildConfirmationText(siteUrl: string, subscriberName: string) {
  const blogUrl = new URL("/blog", siteUrl).toString();

  return [
    `Hello ${subscriberName || "friend"},`,
    "",
    "Your TT Daniel blog subscription is confirmed.",
    "You will now receive the latest blog updates by email.",
    "",
    `Browse the blog: ${blogUrl}`,
  ].join("\n");
}

async function sendResendEmail({
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

async function sendConfirmationEmail({
  apiKey,
  from,
  to,
  siteUrl,
  subscriberName,
}: {
  apiKey: string;
  from: string;
  to: string;
  siteUrl: string;
  subscriberName: string;
}) {
  await sendResendEmail({
    apiKey,
    from,
    to,
    subject: "You are subscribed to TT Daniel blog updates",
    html: buildConfirmationHtml(siteUrl, subscriberName),
    text: buildConfirmationText(siteUrl, subscriberName),
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

  const supabaseUrl = normalizeEnvValue(Deno.env.get("SUPABASE_URL"));
  const serviceRoleKey = normalizeEnvValue(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  const resendApiKey = normalizeEnvValue(Deno.env.get("RESEND_API_KEY"));
  const senderEmail = normalizeEnvValue(Deno.env.get("BLOG_EMAIL_FROM"));

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, {
      error: "Supabase function secrets are incomplete.",
    }, siteUrl, request);
  }

  if (!resendApiKey || !senderEmail || !siteUrl) {
    return jsonResponse(500, {
      error: "Set RESEND_API_KEY, BLOG_EMAIL_FROM, and SITE_URL before enabling subscriptions.",
    }, siteUrl, request);
  }

  let body: { name?: string; email?: string; website?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { error: "Request body must be valid JSON." }, siteUrl, request);
  }

  const name = sanitizeText(body?.name, 80);
  const email = sanitizeText(body?.email, 160).toLowerCase();
  const honeypot = sanitizeText(body?.website, SUBSCRIBE_HONEYPOT_MAX_LENGTH);

  if (honeypot) {
    return jsonResponse(
      200,
      {
        alreadySubscribed: false,
        confirmationEmailSent: false,
        message: "You are subscribed. Check your inbox for the confirmation email.",
      },
      siteUrl,
      request
    );
  }

  if (!name || !email) {
    return jsonResponse(400, { error: "Name and email are required." }, siteUrl, request);
  }

  if (name.length < 2) {
    return jsonResponse(400, { error: "Enter your full name." }, siteUrl, request);
  }

  if (!EMAIL_PATTERN.test(email)) {
    return jsonResponse(400, { error: "Enter a valid email address." }, siteUrl, request);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const requestClientIp = getRequestClientIp(request);
  const requestUserAgent = normalizeEnvValue(request.headers.get("user-agent") || undefined);
  const actorFingerprintSource = [
    requestClientIp,
    requestUserAgent,
    normalizeEnvValue(request.headers.get("Origin") || undefined),
  ]
    .filter(Boolean)
    .join("|");
  const actorHash = await sha256Hex(actorFingerprintSource || `anonymous|${email}`);
  const emailHash = await sha256Hex(email);

  try {
    await ensureRequestWithinRateLimit({
      adminClient,
      actorHash,
      emailHash,
    });
  } catch (error) {
    return jsonResponse(
      429,
      {
        error:
          error instanceof Error
            ? error.message
            : "Too many subscription attempts. Please try again later.",
      },
      siteUrl,
      request
    );
  }

  const { data: existingData, error: existingError } = await adminClient
    .from("blog_subscribers")
    .select("id,status")
    .eq("email", email)
    .maybeSingle();

  if (existingError) {
    const message = String(existingError.message || "");
    return jsonResponse(500, {
      error: message.includes("blog_subscribers")
        ? "Add the blog_subscribers table in Supabase before enabling subscriptions."
        : message || "Unable to check the existing subscription.",
    }, siteUrl, request);
  }

  const existing = existingData as { id: string; status: string } | null;
  if (existing?.status === "active") {
    try {
      await sendConfirmationEmail({
        apiKey: resendApiKey,
        from: senderEmail,
        to: email,
        siteUrl,
        subscriberName: name,
      });

      return jsonResponse(200, {
        alreadySubscribed: true,
        confirmationEmailSent: true,
        message: "This email is already subscribed. We have sent the confirmation email again.",
      }, siteUrl, request);
    } catch (error) {
      return jsonResponse(502, {
        error:
          error instanceof Error
            ? error.message
            : "Subscription exists, but the confirmation email could not be sent.",
      }, siteUrl, request);
    }
  }

  if (existing?.id) {
    const { error: updateError } = await adminClient
      .from("blog_subscribers")
      .update({
        name,
        status: "active",
        source: "website",
        unsubscribed_at: null,
      })
      .eq("id", existing.id);

    if (updateError) {
      return jsonResponse(500, {
        error: updateError.message || "Unable to reactivate the subscription.",
      }, siteUrl, request);
    }
  } else {
    const { error: insertError } = await adminClient.from("blog_subscribers").insert({
      name,
      email,
      status: "active",
      source: "website",
    });

    if (insertError) {
      const message = String(insertError.message || "");
      if (message.toLowerCase().includes("duplicate")) {
        try {
          await sendConfirmationEmail({
            apiKey: resendApiKey,
            from: senderEmail,
            to: email,
            siteUrl,
            subscriberName: name,
          });

          return jsonResponse(200, {
            alreadySubscribed: true,
            confirmationEmailSent: true,
            message: "This email is already subscribed. We have sent the confirmation email again.",
          }, siteUrl, request);
        } catch (error) {
          return jsonResponse(502, {
            error:
              error instanceof Error
                ? error.message
                : "Subscription exists, but the confirmation email could not be sent.",
          }, siteUrl, request);
        }
      }

      return jsonResponse(500, {
        error: insertError.message || "Unable to save the subscription.",
      }, siteUrl, request);
    }
  }

  try {
    await sendConfirmationEmail({
      apiKey: resendApiKey,
      from: senderEmail,
      to: email,
      siteUrl,
      subscriberName: name,
    });

    return jsonResponse(200, {
      alreadySubscribed: false,
      confirmationEmailSent: true,
      message: "You are subscribed. Check your inbox for the confirmation email.",
    }, siteUrl, request);
  } catch (error) {
    return jsonResponse(502, {
      error:
        error instanceof Error
          ? error.message
          : "Your subscription was saved, but the confirmation email could not be sent.",
    }, siteUrl, request);
  }
});
