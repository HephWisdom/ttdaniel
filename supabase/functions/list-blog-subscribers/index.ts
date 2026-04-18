import { createClient } from "npm:@supabase/supabase-js@2";

type BlogSubscriber = {
  id: string;
  name: string | null;
  email: string;
  status: string | null;
  source: string | null;
  created_at: string;
  unsubscribed_at: string | null;
};

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
      : { status: 403, error: "This account is not allowed to view subscriber data." };
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
        ? "Add the blog_admins table in Supabase before using subscriber tools."
        : message || "Unable to verify admin access.",
    };
  }

  if (!data?.email) {
    return {
      status: 403,
      error: "This account is not allowed to view subscriber data.",
    };
  }

  return null;
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
  const allowedAdminEmail = normalizeEnvValue(Deno.env.get("BLOG_ADMIN_EMAIL")).toLowerCase();

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonResponse(500, {
      error: "Supabase function secrets are incomplete.",
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
    return jsonResponse(401, { error: "Admin session required to view subscribers." }, siteUrl, request);
  }

  const callerEmail = String(user.email || "").toLowerCase();
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

  const { data, error } = await adminClient
    .from("blog_subscribers")
    .select("id,name,email,status,source,created_at,unsubscribed_at")
    .order("created_at", { ascending: false });

  if (error) {
    const message = String(error.message || "");
    return jsonResponse(500, {
      error: message.includes("blog_subscribers")
        ? "Add the blog_subscribers table in Supabase before opening the subscriber dashboard."
        : message || "Unable to load subscribers.",
    }, siteUrl, request);
  }

  const subscribers = Array.isArray(data) ? (data as BlogSubscriber[]) : [];
  const activeCount = subscribers.filter((subscriber) => subscriber.status === "active").length;
  const unsubscribedCount = subscribers.filter(
    (subscriber) => subscriber.status === "unsubscribed"
  ).length;

  return jsonResponse(200, {
    subscribers,
    totalCount: subscribers.length,
    activeCount,
    unsubscribedCount,
  }, siteUrl, request);
});
