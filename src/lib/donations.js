import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

export const DONATION_AMOUNTS = [5, 10, 20, 50, 80, 100, 120, 150, 180, 200];
export const DONATION_MIN_AMOUNT = 5;
export const DONATION_MAX_AMOUNT = 5000;
export const DONATION_FREQUENCIES = ["one_time", "week", "month", "year"];

function normalizeInteger(value) {
  const nextValue = Number(value);
  if (!Number.isFinite(nextValue)) return 0;
  return Math.round(nextValue);
}

async function readFunctionErrorMessage(error, functionName = "edge function") {
  if (error instanceof FunctionsHttpError) {
    try {
      const payload = await error.context.json();
      return payload?.error || payload?.message || error.message;
    } catch {
      try {
        const text = await error.context.text();
        return text || error.message;
      } catch {
        return error.message;
      }
    }
  }

  if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
    const genericMessage = String(error.message || "").toLowerCase();
    if (
      !genericMessage ||
      genericMessage.includes("failed to send a request to the edge function")
    ) {
      return `Unable to reach the ${functionName}. Deploy it in Supabase or serve the function locally before accepting donations.`;
    }

    return error.message || `Unable to reach the ${functionName}.`;
  }

  return error?.message || "Unable to complete the donation request.";
}

export function normalizeDonationFrequency(value = "") {
  return DONATION_FREQUENCIES.includes(value) ? value : "one_time";
}

export function normalizeDonationAmount(value) {
  return normalizeInteger(value);
}

export function validateDonationAmount(value) {
  const amount = normalizeDonationAmount(value);
  if (amount < DONATION_MIN_AMOUNT || amount > DONATION_MAX_AMOUNT) {
    throw new Error(
      `Enter an amount between $${DONATION_MIN_AMOUNT} and $${DONATION_MAX_AMOUNT}.`
    );
  }
  return amount;
}

function normalizePagePath(value = "/") {
  if (typeof value !== "string") return "/";
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return "/";
  return trimmed.replace(/[\r\n]/g, "") || "/";
}

export async function createDonationCheckoutSession({ amount, frequency, pagePath }) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Donations require Supabase and Stripe configuration.");
  }

  const payload = {
    amount: validateDonationAmount(amount),
    frequency: normalizeDonationFrequency(frequency),
    pagePath: normalizePagePath(pagePath),
  };

  const { data, error } = await supabase.functions.invoke("create-donation-session", {
    body: payload,
  });

  if (error) {
    throw new Error(await readFunctionErrorMessage(error, "create-donation-session"));
  }

  const clientSecret = String(data?.clientSecret || "").trim();
  if (!clientSecret) {
    throw new Error("Stripe did not return a checkout client secret.");
  }

  return {
    clientSecret,
  };
}

export async function fetchDonationSessionStatus(sessionId) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Donations require Supabase and Stripe configuration.");
  }

  const normalizedSessionId = String(sessionId || "").trim();
  if (!normalizedSessionId) {
    throw new Error("Missing donation session id.");
  }

  const { data, error } = await supabase.functions.invoke("get-donation-session", {
    body: { sessionId: normalizedSessionId },
  });

  if (error) {
    throw new Error(await readFunctionErrorMessage(error, "get-donation-session"));
  }

  return {
    amountTotal: Number(data?.amountTotal || 0),
    currency: String(data?.currency || "usd").toLowerCase(),
    customerEmail: String(data?.customerEmail || "").trim().toLowerCase(),
    frequency: normalizeDonationFrequency(data?.frequency),
    mode: String(data?.mode || "").trim(),
    paymentStatus: String(data?.paymentStatus || "").trim(),
    status: String(data?.status || "").trim(),
  };
}
