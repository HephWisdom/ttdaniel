import { createClient } from "npm:@supabase/supabase-js@2";

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

type BlogPost = {
  id: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  image: string | null;
  author: string | null;
  created_at: string;
  subscriber_notified_at: string | null;
};

type BlogSubscriber = {
  name: string | null;
  email: string;
};

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

async function ensureAuthorizedBlogAdmin({
  adminClient,
  callerEmail,
  allowedAdminEmail,
}: {
  adminClient: ReturnType<typeof createClient>;
  callerEmail: string;
  allowedAdminEmail: string;
}) {
  if (allowedAdminEmail) {
    return callerEmail === allowedAdminEmail
      ? null
      : { status: 403, error: "This account is not allowed to send subscriber emails." };
  }

  const { data, error } = await adminClient
    .from("blog_admins")
    .select("email")
    .eq("email", callerEmail)
    .maybeSingle();

  if (error) {
    const message = String(error.message || "");
    return {
      status: 500,
      error: message.toLowerCase().includes("blog_admins")
        ? "Add the blog_admins table in Supabase before using subscriber email tools."
        : message || "Unable to verify admin access.",
    };
  }

  if (!data?.email) {
    return {
      status: 403,
      error: "This account is not allowed to send subscriber emails.",
    };
  }

  return null;
}

function escapeHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toPlainText(value = "") {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/[#*_`>[\]()!-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value = "", limit = 240) {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit).trimEnd()}...`;
}

function buildPostUrl(siteUrl: string, postId: string) {
  return new URL(`/blog/${postId}`, siteUrl).toString();
}

function buildSummary(post: BlogPost) {
  const excerpt = String(post.excerpt || "").trim();
  if (excerpt) return excerpt;
  return truncate(toPlainText(post.content || ""), 220);
}

function buildEmailHtml(post: BlogPost, postUrl: string, subscriberName: string) {
  const safeTitle = escapeHtml(post.title || "Latest blog post");
  const safeAuthor = escapeHtml(post.author || "TT Daniel");
  const safeSummary = escapeHtml(buildSummary(post));
  const safeGreeting = escapeHtml(subscriberName || "there");
  const imageMarkup = post.image
    ? `
      <div style="margin: 0 0 24px;">
        <img
          src="${escapeHtml(post.image)}"
          alt="${safeTitle}"
          style="display:block;width:100%;max-width:640px;height:auto;border-radius:20px;"
        />
      </div>
    `
    : "";

  return `
    <div style="background:#f3f0e7;padding:32px 16px;font-family:Arial,sans-serif;color:#181410;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:28px;overflow:hidden;border:1px solid #e6dcc8;">
        <div style="background:#111827;padding:16px 24px;">
          <p style="margin:0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;font-weight:700;color:#ffe800;">
            TT Daniel Blog Update
          </p>
        </div>
        <div style="padding:28px 24px 32px;">
          <p style="margin:0 0 10px;font-size:15px;line-height:1.6;">Hello ${safeGreeting},</p>
          <h1 style="margin:0 0 18px;font-size:32px;line-height:1.05;text-transform:uppercase;">
            ${safeTitle}
          </h1>
          ${imageMarkup}
          <p style="margin:0 0 10px;font-size:15px;line-height:1.7;color:#3d342c;">
            ${safeSummary}
          </p>
          <p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#6b5a49;">
            By ${safeAuthor}
          </p>
          <a
            href="${postUrl}"
            style="display:inline-block;border-radius:999px;background:#ffe800;color:#111111;text-decoration:none;padding:14px 22px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;"
          >
            Read The Full Post
          </a>
        </div>
      </div>
    </div>
  `;
}

function buildEmailText(post: BlogPost, postUrl: string, subscriberName: string) {
  const greeting = subscriberName ? `Hello ${subscriberName},` : "Hello,";
  const summary = buildSummary(post);

  return [
    greeting,
    "",
    post.title || "Latest blog post",
    `By ${post.author || "TT Daniel"}`,
    "",
    summary,
    "",
    `Read the full post: ${postUrl}`,
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
  const allowedAdminEmail = normalizeEnvValue(Deno.env.get("BLOG_ADMIN_EMAIL")).toLowerCase();

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonResponse(500, {
      error: "Supabase function secrets are incomplete.",
    }, siteUrl, request);
  }

  if (!resendApiKey || !senderEmail || !siteUrl) {
    return jsonResponse(500, {
      error: "Set RESEND_API_KEY, BLOG_EMAIL_FROM, and SITE_URL before sending blog emails.",
    }, siteUrl, request);
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse(401, { error: "Missing authorization header." }, siteUrl, request);
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse(401, { error: "Admin session required to email subscribers." }, siteUrl, request);
  }

  const callerEmail = String(user.email || "").toLowerCase();

  let body: { postId?: string; force?: boolean };
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { error: "Request body must be valid JSON." }, siteUrl, request);
  }

  const postId = typeof body?.postId === "string" ? body.postId.trim() : "";
  const force = body?.force === true;

  if (!postId) {
    return jsonResponse(400, { error: "Missing postId." }, siteUrl, request);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const authorizationError = await ensureAuthorizedBlogAdmin({
    adminClient,
    callerEmail,
    allowedAdminEmail,
  });

  if (authorizationError) {
    return jsonResponse(
      authorizationError.status,
      { error: authorizationError.error },
      siteUrl,
      request
    );
  }

  const { data: postData, error: postError } = await adminClient
    .from("blog_posts")
    .select("id,title,excerpt,content,image,author,created_at,subscriber_notified_at")
    .eq("id", postId)
    .maybeSingle();

  if (postError) {
    const message = String(postError.message || "");
    if (message.includes("subscriber_notified_at")) {
      return jsonResponse(500, {
        error: "Add blog_posts.subscriber_notified_at in Supabase before using subscriber email.",
      }, siteUrl, request);
    }
    return jsonResponse(500, { error: message || "Unable to load the blog post." }, siteUrl, request);
  }

  const post = postData as BlogPost | null;
  if (!post) {
    return jsonResponse(404, { error: "Blog post not found." }, siteUrl, request);
  }

  const publishDate = new Date(post.created_at);
  if (Number.isNaN(publishDate.getTime())) {
    return jsonResponse(400, { error: "This post has an invalid publish date." }, siteUrl, request);
  }

  if (!force && publishDate.getTime() > Date.now()) {
    return jsonResponse(409, {
      error: "This post is scheduled for the future. Publish it before emailing subscribers.",
    }, siteUrl, request);
  }

  if (!force && post.subscriber_notified_at) {
    return jsonResponse(200, {
      postId: post.id,
      sentCount: 0,
      skipped: true,
      reason: "already_notified",
    }, siteUrl, request);
  }

  const { data: subscriberData, error: subscriberError } = await adminClient
    .from("blog_subscribers")
    .select("name,email")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (subscriberError) {
    const message = String(subscriberError.message || "");
    return jsonResponse(500, {
      error: message.includes("blog_subscribers")
        ? "Add the blog_subscribers table in Supabase before sending subscriber email."
        : message || "Unable to load subscribers.",
    }, siteUrl, request);
  }

  const subscribers = Array.isArray(subscriberData)
    ? (subscriberData as BlogSubscriber[]).filter(
        (subscriber) => typeof subscriber.email === "string" && subscriber.email.trim()
      )
    : [];

  if (subscribers.length === 0) {
    return jsonResponse(200, {
      postId: post.id,
      sentCount: 0,
      skipped: true,
      reason: "no_active_subscribers",
    }, siteUrl, request);
  }

  const postUrl = buildPostUrl(siteUrl, post.id);
  const subject = `New blog post: ${post.title || "Latest update"}`;
  const failures: Array<{ email: string; message: string }> = [];
  let sentCount = 0;

  for (const subscriber of subscribers) {
    try {
      await sendResendEmail({
        apiKey: resendApiKey,
        from: senderEmail,
        to: subscriber.email,
        subject,
        html: buildEmailHtml(post, postUrl, String(subscriber.name || "").trim()),
        text: buildEmailText(post, postUrl, String(subscriber.name || "").trim()),
      });
      sentCount += 1;
    } catch (error) {
      failures.push({
        email: subscriber.email,
        message: error instanceof Error ? error.message : "Unknown email error.",
      });
    }
  }

  if (failures.length > 0) {
    return jsonResponse(502, {
      error: `Email sent to ${sentCount} subscriber(s), but ${failures.length} failed.`,
      postId: post.id,
      sentCount,
      failedCount: failures.length,
      failures: failures.slice(0, 10),
    }, siteUrl, request);
  }

  const { error: updateError } = await adminClient
    .from("blog_posts")
    .update({
      subscriber_notified_at: new Date().toISOString(),
    })
    .eq("id", post.id);

  if (updateError) {
    return jsonResponse(500, {
      error: `Emails were sent, but subscriber_notified_at could not be saved: ${updateError.message}`,
      postId: post.id,
      sentCount,
    }, siteUrl, request);
  }

  return jsonResponse(200, {
    postId: post.id,
    sentCount,
    skipped: false,
  }, siteUrl, request);
});
