import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

const SUBSCRIBER_NAME_MAX_LENGTH = 80;
const SUBSCRIBER_EMAIL_MAX_LENGTH = 160;
const SUBSCRIBER_HONEYPOT_MAX_LENGTH = 120;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function stripControlCharacters(value) {
  return Array.from(String(value || ""))
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join("");
}

function sanitizeSubscriptionText(value, maxLength) {
  if (typeof value !== "string") return "";

  let sanitized = value.normalize("NFKC");
  sanitized = sanitized.replace(/[<>&]/g, "");
  sanitized = stripControlCharacters(sanitized);
  sanitized = sanitized.replace(/\s+/g, " ").trim();

  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength).trim();
  }

  return sanitized;
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
      return `Unable to reach the ${functionName}. Deploy it in Supabase or serve the function locally before using this admin action.`;
    }

    return (
      error.message ||
      `Unable to reach the ${functionName}. Deploy it in Supabase and confirm the function URL is live.`
    );
  }

  return error?.message || "Unable to email subscribers.";
}

function prepareSubscriberPayload(input) {
  const name = sanitizeSubscriptionText(input?.name, SUBSCRIBER_NAME_MAX_LENGTH);
  const email = sanitizeSubscriptionText(input?.email, SUBSCRIBER_EMAIL_MAX_LENGTH).toLowerCase();

  if (!name || !email) {
    throw new Error("Name and email are required.");
  }

  if (name.length < 2) {
    throw new Error("Enter your full name.");
  }

  if (!EMAIL_PATTERN.test(email)) {
    throw new Error("Enter a valid email address.");
  }

  return {
    name,
    email,
    website: sanitizeSubscriptionText(input?.website, SUBSCRIBER_HONEYPOT_MAX_LENGTH),
    status: "active",
    source: "website",
  };
}

function normalizeSubscriber(subscriber) {
  return {
    id: subscriber?.id || "",
    name: sanitizeSubscriptionText(subscriber?.name, SUBSCRIBER_NAME_MAX_LENGTH) || "Subscriber",
    email: sanitizeSubscriptionText(subscriber?.email, SUBSCRIBER_EMAIL_MAX_LENGTH).toLowerCase(),
    status: subscriber?.status === "unsubscribed" ? "unsubscribed" : "active",
    source: sanitizeSubscriptionText(subscriber?.source, 60) || "website",
    createdAt: subscriber?.created_at || subscriber?.createdAt || null,
    unsubscribedAt: subscriber?.unsubscribed_at || subscriber?.unsubscribedAt || null,
  };
}

async function fetchBlogSubscribersDirect() {
  if (!isSupabaseConfigured || !supabase) {
    return {
      subscribers: [],
      totalCount: 0,
      activeCount: 0,
      unsubscribedCount: 0,
    };
  }

  const { data, error } = await supabase
    .from("blog_subscribers")
    .select("id,name,email,status,source,created_at,unsubscribed_at")
    .order("created_at", { ascending: false });

  if (error) {
    const message = String(error.message || "").toLowerCase();
    if (
      message.includes("row-level security") ||
      message.includes("permission denied") ||
      message.includes("not allowed")
    ) {
      throw new Error(
        "Direct subscriber access is blocked. Run the admin access migration or finish deploying list-blog-subscribers."
      );
    }

    if (message.includes("blog_subscribers")) {
      throw new Error(
        "Add the blog_subscribers table and admin access policy in Supabase before opening the subscriber dashboard."
      );
    }

    throw new Error(error.message || "Unable to load subscribers.");
  }

  const subscribers = Array.isArray(data)
    ? data.map(normalizeSubscriber).filter((subscriber) => subscriber.email)
    : [];

  return {
    subscribers,
    totalCount: subscribers.length,
    activeCount: subscribers.filter((subscriber) => subscriber.status === "active").length,
    unsubscribedCount: subscribers.filter((subscriber) => subscriber.status === "unsubscribed")
      .length,
  };
}

export async function createBlogSubscriber(input) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Blog subscriptions require Supabase configuration.");
  }

  const payload = prepareSubscriberPayload(input);

  const { data, error } = await supabase.functions.invoke("subscribe-to-blog", {
    body: payload,
  });

  if (error) {
    throw new Error(await readFunctionErrorMessage(error, "subscribe-to-blog Edge Function"));
  }

  return {
    alreadySubscribed: Boolean(data?.alreadySubscribed),
    confirmationEmailSent: Boolean(data?.confirmationEmailSent),
    email: payload.email,
    message: data?.message || "",
    name: payload.name,
  };
}

export async function fetchBlogSubscribers() {
  if (!isSupabaseConfigured || !supabase) {
    return {
      subscribers: [],
      totalCount: 0,
      activeCount: 0,
      unsubscribedCount: 0,
    };
  }

  const { data, error } = await supabase.functions.invoke("list-blog-subscribers");

  if (error) {
    if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) {
      return await fetchBlogSubscribersDirect();
    }

    throw new Error(await readFunctionErrorMessage(error, "list-blog-subscribers Edge Function"));
  }

  const subscribers = Array.isArray(data?.subscribers)
    ? data.subscribers.map(normalizeSubscriber).filter((subscriber) => subscriber.email)
    : [];

  return {
    subscribers,
    totalCount:
      typeof data?.totalCount === "number" ? data.totalCount : subscribers.length,
    activeCount:
      typeof data?.activeCount === "number"
        ? data.activeCount
        : subscribers.filter((subscriber) => subscriber.status === "active").length,
    unsubscribedCount:
      typeof data?.unsubscribedCount === "number"
        ? data.unsubscribedCount
        : subscribers.filter((subscriber) => subscriber.status === "unsubscribed").length,
  };
}

export async function sendBlogPostToSubscribers(postId, options = {}) {
  if (!postId) {
    throw new Error("Missing post id.");
  }

  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Subscriber email requires Supabase.");
  }

  const { data, error } = await supabase.functions.invoke("broadcast-blog-post", {
    body: {
      postId,
      force: options.force === true,
    },
  });

  if (error) {
    throw new Error(await readFunctionErrorMessage(error, "broadcast-blog-post Edge Function"));
  }

  return data || null;
}
