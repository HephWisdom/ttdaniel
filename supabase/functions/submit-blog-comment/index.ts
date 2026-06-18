import { createClient } from "npm:@supabase/supabase-js@2";

const COMMENT_NAME_MAX_LENGTH = 80;
const COMMENT_MESSAGE_MAX_LENGTH = 1200;
const MAX_REQUEST_BODY_LENGTH = 10_000;
const RATE_LIMIT_WINDOW_SECONDS = 15 * 60;
const RATE_LIMIT_ACTOR_MAX = 5;

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
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: "Comment service configuration is incomplete." }, siteUrl, request);
  }

  let body: {
    postId?: unknown;
    name?: unknown;
    message?: unknown;
    website?: unknown;
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

  const postId = sanitizeText(body?.postId, 120);
  const name = sanitizeText(body?.name, COMMENT_NAME_MAX_LENGTH);
  const message = sanitizeText(body?.message, COMMENT_MESSAGE_MAX_LENGTH, true);
  const website = sanitizeText(body?.website, 120);

  if (website) {
    return jsonResponse(
      200,
      {
        accepted: true,
        comment: null,
        message: "Comment submitted. It will appear after admin approval.",
      },
      siteUrl,
      request
    );
  }

  if (!postId) {
    return jsonResponse(400, { error: "Missing post id." }, siteUrl, request);
  }
  if (name.length < 2) {
    return jsonResponse(400, { error: "Enter your name." }, siteUrl, request);
  }
  if (message.length < 2) {
    return jsonResponse(400, { error: "Enter your comment." }, siteUrl, request);
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

  const { data: withinLimit, error: limitError } = await adminClient.rpc(
    "consume_edge_request_limit",
    {
      p_endpoint: "submit_blog_comment",
      p_scope: "actor",
      p_subject_hash: await sha256Hex(actorSource || `anonymous|${postId}|${name}`),
      p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
      p_max_requests: RATE_LIMIT_ACTOR_MAX,
    }
  );

  if (limitError) {
    return jsonResponse(503, { error: "Comment rate limiting is not configured." }, siteUrl, request);
  }
  if (withinLimit !== true) {
    return jsonResponse(
      429,
      { error: "Too many comment attempts. Please try again later." },
      siteUrl,
      request
    );
  }

  let allowComments = true;
  const { data: post, error: postError } = await adminClient
    .from("blog_posts")
    .select("id,allow_comments")
    .eq("id", postId)
    .maybeSingle();

  if (postError?.code === "42703") {
    const { data: legacyPost, error: legacyPostError } = await adminClient
      .from("blog_posts")
      .select("id")
      .eq("id", postId)
      .maybeSingle();

    if (legacyPostError) {
      return jsonResponse(500, { error: "Unable to verify the blog post." }, siteUrl, request);
    }
    if (!legacyPost) {
      return jsonResponse(404, { error: "Blog post not found." }, siteUrl, request);
    }
  } else if (postError) {
    return jsonResponse(500, { error: "Unable to verify the blog post." }, siteUrl, request);
  } else if (!post) {
    return jsonResponse(404, { error: "Blog post not found." }, siteUrl, request);
  } else {
    allowComments = post.allow_comments !== false;
  }

  if (!allowComments) {
    return jsonResponse(403, { error: "Comments are disabled for this post." }, siteUrl, request);
  }

  const commentPayload = {
    post_id: postId,
    name,
    message,
    is_approved: false,
  };
  let { data: comment, error: insertError } = await adminClient
    .from("blog_comments")
    .insert(commentPayload)
    .select("id,post_id,name,message,created_at,is_approved")
    .single();

  if (insertError?.code === "42703") {
    const legacyResult = await adminClient
      .from("blog_comments")
      .insert({ post_id: postId, name, message })
      .select("id,post_id,name,message,created_at")
      .single();
    comment = legacyResult.data
      ? { ...legacyResult.data, is_approved: false }
      : null;
    insertError = legacyResult.error;
  }

  if (insertError || !comment) {
    return jsonResponse(500, { error: "Unable to save the comment right now." }, siteUrl, request);
  }

  return jsonResponse(
    200,
    {
      accepted: true,
      comment,
      message: "Comment submitted. It will appear after admin approval.",
    },
    siteUrl,
    request
  );
});
