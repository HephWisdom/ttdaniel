import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

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

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
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
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  const supabaseUrl = normalizeEnvValue(Deno.env.get("SUPABASE_URL"));
  const serviceRoleKey = normalizeEnvValue(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  const resendApiKey = normalizeEnvValue(Deno.env.get("RESEND_API_KEY"));
  const senderEmail = normalizeEnvValue(Deno.env.get("BLOG_EMAIL_FROM"));
  const siteUrl = normalizeEnvValue(Deno.env.get("SITE_URL"));

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, {
      error: "Supabase function secrets are incomplete.",
    });
  }

  if (!resendApiKey || !senderEmail || !siteUrl) {
    return jsonResponse(500, {
      error: "Set RESEND_API_KEY, BLOG_EMAIL_FROM, and SITE_URL before enabling subscriptions.",
    });
  }

  let body: { name?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { error: "Request body must be valid JSON." });
  }

  const name = sanitizeText(body?.name, 80);
  const email = sanitizeText(body?.email, 160).toLowerCase();

  if (!name || !email) {
    return jsonResponse(400, { error: "Name and email are required." });
  }

  if (name.length < 2) {
    return jsonResponse(400, { error: "Enter your full name." });
  }

  if (!EMAIL_PATTERN.test(email)) {
    return jsonResponse(400, { error: "Enter a valid email address." });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

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
    });
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
      });
    } catch (error) {
      return jsonResponse(502, {
        error:
          error instanceof Error
            ? error.message
            : "Subscription exists, but the confirmation email could not be sent.",
      });
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
      });
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
          });
        } catch (error) {
          return jsonResponse(502, {
            error:
              error instanceof Error
                ? error.message
                : "Subscription exists, but the confirmation email could not be sent.",
          });
        }
      }

      return jsonResponse(500, {
        error: insertError.message || "Unable to save the subscription.",
      });
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
    });
  } catch (error) {
    return jsonResponse(502, {
      error:
        error instanceof Error
          ? error.message
          : "Your subscription was saved, but the confirmation email could not be sent.",
    });
  }
});
