import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const PHONE_PATTERN = /^[+()\-\s0-9.]{7,30}$/;
const MINISTRY_INVOLVEMENT_OPTIONS = new Set([
  "exploring",
  "sensing-a-call",
  "currently-serving",
  "ministry-leader",
  "other",
]);

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
    return "The registration service is unavailable. Please try again after it has been deployed.";
  }

  return error?.message || "We could not save your pre-registration. Please try again.";
}

function sanitizeText(value, maxLength) {
  if (typeof value !== "string") return "";

  return Array.from(value.normalize("NFKC"))
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join("")
    .replace(/[<>&]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength)
    .trim();
}

function prepareRegistration(input) {
  const fullName = sanitizeText(input?.fullName, 100);
  const email = sanitizeText(input?.email, 160).toLowerCase();
  const phone = sanitizeText(input?.phone, 30);
  const country = sanitizeText(input?.country, 80);
  const ministryInvolvement = sanitizeText(input?.ministryInvolvement, 40);
  const discernmentFocus = sanitizeText(input?.discernmentFocus, 1000);
  const website = sanitizeText(input?.website, 120);

  if (website) {
    return { spamFiltered: true };
  }

  if (fullName.length < 2) {
    throw new Error("Enter your full name.");
  }

  if (!EMAIL_PATTERN.test(email)) {
    throw new Error("Enter a valid email address.");
  }

  if (phone && !PHONE_PATTERN.test(phone)) {
    throw new Error("Enter a valid phone or WhatsApp number.");
  }

  if (country.length < 2) {
    throw new Error("Enter your country.");
  }

  if (!MINISTRY_INVOLVEMENT_OPTIONS.has(ministryInvolvement)) {
    throw new Error("Select the option that best describes your ministry journey.");
  }

  if (input?.contactConsent !== true) {
    throw new Error("Consent is required so we can contact you about the class.");
  }

  return {
    full_name: fullName,
    email,
    phone: phone || null,
    country,
    ministry_involvement: ministryInvolvement,
    discernment_focus: discernmentFocus || null,
    contact_consent: true,
    program_key: "dmc",
    source: "website",
  };
}

export async function createMinistryClassRegistration(input) {
  const registration = prepareRegistration(input);

  if (registration.spamFiltered) {
    return { accepted: true, alreadyRegistered: false };
  }

  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Online pre-registration is temporarily unavailable. Please try again later.");
  }

  const { data, error } = await supabase.functions.invoke("register-for-dmc", {
    body: {
      fullName: registration.full_name,
      email: registration.email,
      phone: registration.phone,
      country: registration.country,
      ministryInvolvement: registration.ministry_involvement,
      discernmentFocus: registration.discernment_focus,
      contactConsent: registration.contact_consent,
      website: "",
    },
  });

  if (error) {
    throw new Error(await readFunctionError(error));
  }

  return {
    accepted: true,
    alreadyRegistered: Boolean(data?.alreadyRegistered),
    confirmationEmailSent: Boolean(data?.confirmationEmailSent),
    message: String(data?.message || ""),
  };
}
