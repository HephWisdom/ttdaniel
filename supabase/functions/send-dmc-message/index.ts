import { createClient } from "npm:@supabase/supabase-js@2";

type RegistrationRecipient = {
  id: string;
  full_name: string;
  email: string;
};

type PreviousMessage = {
  sender_email: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  status: "processing" | "sent" | "failed";
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_REQUEST_BODY_LENGTH = 100_000;

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

function sanitizeText(value: unknown, maxLength: number, preserveLines = false) {
  if (typeof value !== "string") return "";

  let sanitized = value
    .normalize("NFKC")
    .replace(/[<>&]/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

  sanitized = preserveLines
    ? sanitized
        .split(/\r?\n/)
        .map((line) => line.replace(/\s+/g, " ").trim())
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
    : sanitized.replace(/\s+/g, " ").trim();

  return sanitized.slice(0, maxLength).trim();
}

function escapeHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function ensureAuthorizedAdmin({
  adminClient,
  callerEmail,
}: {
  adminClient: ReturnType<typeof createClient>;
  callerEmail: string;
}) {
  const { data, error } = await adminClient
    .from("blog_admins")
    .select("email")
    .eq("email", callerEmail)
    .maybeSingle();

  if (error) {
    return {
      status: 500,
      error: error.message || "Unable to verify admin access.",
    };
  }

  return data?.email
    ? null
    : { status: 403, error: "This account is not allowed to message DMC registrants." };
}

function buildMessageHtml(fullName: string, message: string, siteUrl: string) {
  const safeName = escapeHtml(fullName || "there");
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br />");
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
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hello ${safeName},</p>
          <div style="font-size:15px;line-height:1.75;color:#3f3f3a;">${safeMessage}</div>
          <div style="margin-top:26px;padding-top:20px;border-top:1px solid #e5e5df;">
            <a href="${dmcUrl}" style="color:#6f5224;font-size:13px;font-weight:700;text-decoration:none;">
              View Discerning Ministry Class details
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
}

function buildMessageText(fullName: string, message: string, siteUrl: string) {
  const dmcUrl = new URL("/spirituality/discerning-ministry-class", siteUrl).toString();
  return [`Hello ${fullName || "there"},`, "", message, "", `DMC details: ${dmcUrl}`].join("\n");
}

async function sendBatchEmails({
  apiKey,
  from,
  subject,
  message,
  siteUrl,
  recipients,
  requestId,
}: {
  apiKey: string;
  from: string;
  subject: string;
  message: string;
  siteUrl: string;
  recipients: RegistrationRecipient[];
  requestId: string;
}) {
  const response = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `dmc-message-${requestId}`,
    },
    body: JSON.stringify(
      recipients.map((recipient) => ({
        from,
        to: [recipient.email],
        subject,
        html: buildMessageHtml(recipient.full_name, message, siteUrl),
        text: buildMessageText(recipient.full_name, message, siteUrl),
      }))
    ),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      String(payload?.message || payload?.error?.message || payload?.error || "Email send failed.")
    );
  }
}

function previousMessageResponse(
  previousMessage: PreviousMessage,
  siteUrl: string,
  request: Request
) {
  const isProcessing = previousMessage.status === "processing";

  return jsonResponse(
    isProcessing ? 202 : 200,
    {
      recipientCount: Number(previousMessage.recipient_count || 0),
      sentCount: Number(previousMessage.sent_count || 0),
      failedCount: Number(previousMessage.failed_count || 0),
      processing: isProcessing,
      message: isProcessing
        ? "This message request is already being processed."
        : "This message request was already processed.",
    },
    siteUrl,
    request
  );
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
  const supabaseAnonKey = normalizeEnvValue(Deno.env.get("SUPABASE_ANON_KEY"));
  const serviceRoleKey = normalizeEnvValue(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  const resendApiKey = normalizeEnvValue(Deno.env.get("RESEND_API_KEY"));
  const senderEmail = normalizeEnvValue(Deno.env.get("BLOG_EMAIL_FROM"));

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonResponse(500, { error: "Supabase function secrets are incomplete." }, siteUrl, request);
  }
  if (!resendApiKey || !senderEmail || !siteUrl || !normalizeOrigin(siteUrl)) {
    return jsonResponse(
      500,
      {
        error:
          "Set RESEND_API_KEY, SITE_URL, and BLOG_EMAIL_FROM before sending DMC messages.",
      },
      siteUrl,
      request
    );
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse(401, { error: "Missing authorization header." }, siteUrl, request);
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse(401, { error: "Admin session required to send DMC messages." }, siteUrl, request);
  }

  let body: {
    requestId?: unknown;
    registrationIds?: unknown;
    subject?: unknown;
    message?: unknown;
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

  const requestId = sanitizeText(body?.requestId, 36).toLowerCase();
  const registrationIds = Array.isArray(body?.registrationIds)
    ? Array.from(
        new Set(
          body.registrationIds
            .map((value) => String(value || "").trim())
            .filter((value) => UUID_PATTERN.test(value))
        )
      )
    : [];
  const subject = sanitizeText(body?.subject, 160);
  const message = sanitizeText(body?.message, 5000, true);

  if (!UUID_PATTERN.test(requestId)) {
    return jsonResponse(400, { error: "A valid message request id is required." }, siteUrl, request);
  }
  if (!registrationIds.length) {
    return jsonResponse(400, { error: "Select at least one DMC registrant." }, siteUrl, request);
  }
  if (registrationIds.length > 100) {
    return jsonResponse(400, { error: "Send to no more than 100 registrants at a time." }, siteUrl, request);
  }
  if (subject.length < 2) {
    return jsonResponse(400, { error: "Enter an email subject." }, siteUrl, request);
  }
  if (message.length < 2) {
    return jsonResponse(400, { error: "Enter the message to send." }, siteUrl, request);
  }

  const callerEmail = String(user.email || "").trim().toLowerCase();
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const authorizationError = await ensureAuthorizedAdmin({
    adminClient,
    callerEmail,
  });

  if (authorizationError) {
    return jsonResponse(
      authorizationError.status,
      { error: authorizationError.error },
      siteUrl,
      request
    );
  }

  const { data: previousMessage, error: previousMessageError } = await adminClient
    .from("ministry_class_messages")
    .select("sender_email,recipient_count,sent_count,failed_count,status")
    .eq("request_id", requestId)
    .maybeSingle();

  if (previousMessageError) {
    return jsonResponse(
      500,
      { error: "Unable to verify the message request." },
      siteUrl,
      request
    );
  }

  if (previousMessage) {
    if (previousMessage.sender_email !== callerEmail) {
      return jsonResponse(
        409,
        { error: "This message request id has already been used." },
        siteUrl,
        request
      );
    }

    return previousMessageResponse(previousMessage as PreviousMessage, siteUrl, request);
  }

  const { data, error } = await adminClient
    .from("ministry_class_registrations")
    .select("id,full_name,email")
    .eq("program_key", "dmc")
    .in("id", registrationIds);

  if (error) {
    return jsonResponse(
      500,
      {
        error: String(error.message || "").includes("ministry_class_registrations")
          ? "Apply the ministry class migration before sending messages."
          : error.message || "Unable to load selected registrants.",
      },
      siteUrl,
      request
    );
  }

  const recipients = Array.isArray(data) ? (data as RegistrationRecipient[]) : [];
  if (!recipients.length) {
    return jsonResponse(404, { error: "No selected DMC registrants were found." }, siteUrl, request);
  }

  const { error: claimError } = await adminClient.from("ministry_class_messages").insert({
    request_id: requestId,
    sender_email: callerEmail,
    subject,
    message,
    recipient_ids: recipients.map((recipient) => recipient.id),
    recipient_count: recipients.length,
    sent_count: 0,
    failed_count: 0,
    failures: [],
    status: "processing",
  });

  if (claimError) {
    if (claimError.code === "23505") {
      const { data: claimedMessage, error: claimedMessageError } = await adminClient
        .from("ministry_class_messages")
        .select("sender_email,recipient_count,sent_count,failed_count,status")
        .eq("request_id", requestId)
        .maybeSingle();

      if (!claimedMessageError && claimedMessage) {
        if (claimedMessage.sender_email !== callerEmail) {
          return jsonResponse(
            409,
            { error: "This message request id has already been used." },
            siteUrl,
            request
          );
        }

        return previousMessageResponse(claimedMessage as PreviousMessage, siteUrl, request);
      }
    }

    return jsonResponse(
      500,
      { error: "Unable to reserve the message request for processing." },
      siteUrl,
      request
    );
  }

  const failures: Array<{ id: string; email: string; message: string }> = [];
  let sentCount = recipients.length;

  try {
    await sendBatchEmails({
      apiKey: resendApiKey,
      from: senderEmail,
      subject,
      message,
      siteUrl,
      recipients,
      requestId,
    });
  } catch (sendError) {
    const failureMessage =
      sendError instanceof Error ? sendError.message : "Unknown email error.";
    sentCount = 0;
    failures.push(
      ...recipients.map((recipient) => ({
        id: recipient.id,
        email: recipient.email,
        message: failureMessage,
      }))
    );
  }

  const { error: logError } = await adminClient
    .from("ministry_class_messages")
    .update({
      sent_count: sentCount,
      failed_count: failures.length,
      failures,
      status: failures.length > 0 ? "failed" : "sent",
    })
    .eq("request_id", requestId)
    .eq("sender_email", callerEmail);

  if (logError) {
    return jsonResponse(
      500,
      {
        error: "Messages were processed, but the audit record could not be finalized.",
        recipientCount: recipients.length,
        sentCount,
        failedCount: failures.length,
      },
      siteUrl,
      request
    );
  }

  return jsonResponse(
    200,
    {
      recipientCount: recipients.length,
      sentCount,
      failedCount: failures.length,
      failures: failures.slice(0, 10),
      message:
        failures.length > 0
          ? `Sent to ${sentCount} registrant(s); ${failures.length} failed.`
          : `Message sent to ${sentCount} registrant(s).`,
    },
    siteUrl,
    request
  );
});
