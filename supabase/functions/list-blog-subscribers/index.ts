import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
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
  const supabaseAnonKey = normalizeEnvValue(Deno.env.get("SUPABASE_ANON_KEY"));
  const serviceRoleKey = normalizeEnvValue(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  const allowedAdminEmail = normalizeEnvValue(Deno.env.get("BLOG_ADMIN_EMAIL")).toLowerCase();

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonResponse(500, {
      error: "Supabase function secrets are incomplete.",
    });
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse(401, { error: "Missing authorization header." });
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
    return jsonResponse(401, { error: "Admin session required to view subscribers." });
  }

  const callerEmail = String(user.email || "").toLowerCase();
  if (allowedAdminEmail && callerEmail !== allowedAdminEmail) {
    return jsonResponse(403, {
      error: "This account is not allowed to view subscriber data.",
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

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
    });
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
  });
});
