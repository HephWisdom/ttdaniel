import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export async function getAdminSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(error.message);
  }
  return data?.session || null;
}

export async function requireAuthorizedAdmin(session = null) {
  if (!supabase) return null;

  const activeSession = session || (await getAdminSession());
  const email = String(activeSession?.user?.email || "").trim().toLowerCase();

  if (!email) {
    throw new Error("Admin session required.");
  }

  const { data, error } = await supabase
    .from("blog_admins")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    const message = String(error.message || "").toLowerCase();
    if (message.includes("blog_admins") || error.code === "42P01") {
      throw new Error(
        "Add the blog_admins table and access policy in Supabase before using the admin dashboard."
      );
    }

    throw new Error(error.message || "Unable to verify admin access.");
  }

  if (!data?.email) {
    throw new Error("This account is not allowed to access the admin dashboard.");
  }

  return activeSession;
}

export async function signInAdmin(email, password) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data?.session || null;
}

export async function signOutAdmin() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}

export function onAdminAuthStateChange(callback) {
  if (!supabase) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  }

  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session || null);
  });
}
