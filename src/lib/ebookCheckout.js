import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

export const EBOOK_MAX_CART_ITEMS = 20;
export const EBOOK_CART_STORAGE_KEY = "tt_daniel_ebook_cart_v1";

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const BOOK_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,80}$/;

function getFunctionInvokeHeaders() {
  if (!supabaseAnonKey) return undefined;

  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
  };
}

async function readFunctionErrorMessage(error, functionName = "edge function") {
  if (error instanceof FunctionsHttpError) {
    try {
      const payload = await error.context.json();
      if (Array.isArray(payload?.unavailableBookIds) && payload.unavailableBookIds.length) {
        return `${payload?.error || "One or more e-books are unavailable right now."} (${payload.unavailableBookIds.join(", ")})`;
      }

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
      return `Unable to reach the ${functionName}. Deploy it in Supabase before selling e-books.`;
    }

    return error.message || `Unable to reach the ${functionName}.`;
  }

  return error?.message || "Unable to complete the e-book request.";
}

export function isValidBuyerEmail(value) {
  const email = String(value || "").trim();
  return EMAIL_PATTERN.test(email) && email.length <= 254;
}

export function normalizeBuyerEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function normalizeBookIds(bookIds) {
  if (!Array.isArray(bookIds)) return [];

  const uniqueIds = [];
  for (const rawId of bookIds) {
    const id = String(rawId || "").trim().toLowerCase();
    if (!BOOK_ID_PATTERN.test(id)) continue;
    if (!uniqueIds.includes(id)) {
      uniqueIds.push(id);
    }
  }

  return uniqueIds.slice(0, EBOOK_MAX_CART_ITEMS);
}

export function readStoredCartBookIds() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(EBOOK_CART_STORAGE_KEY) || "[]");
    return normalizeBookIds(parsed);
  } catch {
    return [];
  }
}

export function storeCartBookIds(bookIds) {
  try {
    window.localStorage.setItem(EBOOK_CART_STORAGE_KEY, JSON.stringify(normalizeBookIds(bookIds)));
  } catch {
    // Local storage is a convenience only; checkout still uses React state.
  }
}

export function formatEbookPrice(priceCents, currency = "usd") {
  const cents = Number(priceCents);
  if (!Number.isFinite(cents) || cents <= 0) {
    return "Checkout price";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: String(currency || "usd").toUpperCase(),
  }).format(cents / 100);
}

export function getEbookDisplayPrice(book) {
  if (Number.isFinite(Number(book?.ebookPriceCents)) && Number(book?.ebookPriceCents) > 0) {
    return formatEbookPrice(book.ebookPriceCents, book.ebookCurrency || "usd");
  }

  const label = String(book?.usdPrice || book?.price || "").trim();
  if (!label || /^buy now!?$/i.test(label)) {
    return "Checkout price";
  }

  return label;
}

function normalizePagePath(value = "/") {
  if (typeof value !== "string") return "/";
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return "/";
  return trimmed.replace(/[\r\n]/g, "") || "/";
}

export function buildCurrentPagePath(location) {
  const params = new URLSearchParams(location?.search || "");
  params.delete("ebook_session_id");
  params.delete("ebook_status");
  const search = params.toString();
  return normalizePagePath(`${location?.pathname || "/"}${search ? `?${search}` : ""}`);
}

export async function createEbookCheckoutSession({ bookIds, customerEmail, pagePath }) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("E-book checkout is not configured yet.");
  }

  const normalizedBookIds = normalizeBookIds(bookIds);
  if (!normalizedBookIds.length) {
    throw new Error("Add at least one e-book to your cart.");
  }

  const normalizedEmail = normalizeBuyerEmail(customerEmail);
  if (!isValidBuyerEmail(normalizedEmail)) {
    throw new Error("Enter a valid email address for delivery.");
  }

  const { data, error } = await supabase.functions.invoke("create-ebook-checkout-session", {
    headers: getFunctionInvokeHeaders(),
    body: {
      bookIds: normalizedBookIds,
      customerEmail: normalizedEmail,
      pagePath: normalizePagePath(pagePath),
    },
  });

  if (error) {
    throw new Error(await readFunctionErrorMessage(error, "create-ebook-checkout-session"));
  }

  const clientSecret = String(data?.clientSecret || "").trim();
  const sessionId = String(data?.sessionId || "").trim();
  if (!clientSecret || !sessionId) {
    throw new Error("Unable to prepare the secure checkout.");
  }

  return {
    clientSecret,
    sessionId,
    amountTotal: Number(data?.amountTotal || 0),
    currency: String(data?.currency || "usd").toLowerCase(),
    lineItems: Array.isArray(data?.lineItems) ? data.lineItems : [],
  };
}

export async function fetchEbookSessionStatus(sessionId) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("E-book delivery is not configured yet.");
  }

  const normalizedSessionId = String(sessionId || "").trim();
  if (!normalizedSessionId) {
    throw new Error("Missing e-book checkout session id.");
  }

  const { data, error } = await supabase.functions.invoke("get-ebook-session", {
    headers: getFunctionInvokeHeaders(),
    body: { sessionId: normalizedSessionId },
  });

  if (error) {
    throw new Error(await readFunctionErrorMessage(error, "get-ebook-session"));
  }

  return {
    checkoutStatus: String(data?.checkoutStatus || ""),
    customerEmail: String(data?.customerEmail || "").trim().toLowerCase(),
    emailSent: Boolean(data?.emailSent),
    fulfilled: Boolean(data?.fulfilled),
    message: String(data?.message || "").trim(),
    paymentStatus: String(data?.paymentStatus || "").trim(),
  };
}
