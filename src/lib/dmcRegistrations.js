import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

const TABLE_MISSING_CODES = new Set(["42P01", "PGRST205"]);

function normalizeRegistration(registration) {
  return {
    id: String(registration?.id || ""),
    fullName: String(registration?.full_name || "").trim(),
    email: String(registration?.email || "").trim().toLowerCase(),
    phone: String(registration?.phone || "").trim(),
    country: String(registration?.country || "").trim(),
    ministryInvolvement: String(registration?.ministry_involvement || "").trim(),
    discernmentFocus: String(registration?.discernment_focus || "").trim(),
    contactConsent: registration?.contact_consent === true,
    confirmationEmailSentAt: registration?.confirmation_email_sent_at || null,
    confirmationEmailError: String(registration?.confirmation_email_error || "").trim(),
    createdAt: registration?.created_at || null,
    updatedAt: registration?.updated_at || null,
  };
}

function normalizeMessage(message) {
  return {
    id: String(message?.id || ""),
    senderEmail: String(message?.sender_email || "").trim().toLowerCase(),
    subject: String(message?.subject || "").trim(),
    message: String(message?.message || "").trim(),
    recipientCount: Number(message?.recipient_count || 0),
    sentCount: Number(message?.sent_count || 0),
    failedCount: Number(message?.failed_count || 0),
    createdAt: message?.created_at || null,
  };
}

function buildTableError(error, tableName, label) {
  const message = String(error?.message || "").toLowerCase();
  if (TABLE_MISSING_CODES.has(error?.code) || message.includes(tableName)) {
    return `Apply the ${tableName} migration before opening ${label}.`;
  }
  if (
    message.includes("row-level security") ||
    message.includes("permission denied") ||
    message.includes("not allowed")
  ) {
    return `Admin access to ${label} is blocked. Apply the DMC admin access policies.`;
  }
  return error?.message || `Unable to load ${label}.`;
}

async function readFunctionError(error) {
  if (error instanceof FunctionsHttpError) {
    try {
      const payload = await error.context.json();
      return payload?.error || payload?.message || error.message;
    } catch {
      return error.message;
    }
  }

  if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) {
    return "Unable to reach the DMC messaging function. Deploy it before sending messages.";
  }

  return error?.message || "Unable to send the DMC message.";
}

export async function fetchDmcRegistrations() {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from("ministry_class_registrations")
    .select(
      "id,full_name,email,phone,country,ministry_involvement,discernment_focus,contact_consent,confirmation_email_sent_at,confirmation_email_error,created_at,updated_at"
    )
    .eq("program_key", "dmc")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    throw new Error(
      buildTableError(error, "ministry_class_registrations", "DMC registrations")
    );
  }

  return Array.isArray(data) ? data.map(normalizeRegistration) : [];
}

export async function fetchDmcMessageHistory() {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from("ministry_class_messages")
    .select(
      "id,sender_email,subject,message,recipient_count,sent_count,failed_count,created_at"
    )
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(buildTableError(error, "ministry_class_messages", "DMC message history"));
  }

  return Array.isArray(data) ? data.map(normalizeMessage) : [];
}

export async function sendDmcMessage({ requestId, registrationIds, subject, message }) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("DMC messaging requires Supabase configuration.");
  }

  const { data, error } = await supabase.functions.invoke("send-dmc-message", {
    body: {
      requestId: requestId || crypto.randomUUID(),
      registrationIds,
      subject,
      message,
    },
  });

  if (error) {
    throw new Error(await readFunctionError(error));
  }

  return {
    recipientCount: Number(data?.recipientCount || 0),
    sentCount: Number(data?.sentCount || 0),
    failedCount: Number(data?.failedCount || 0),
    processing: Boolean(data?.processing),
    message: String(data?.message || ""),
  };
}
