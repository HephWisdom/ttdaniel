const COOKIE_CONSENT_NAME = "ttd_cookie_consent_v1";
const COOKIE_CONSENT_CHANGE_EVENT = "ttd:cookie-consent-change";
const COOKIE_CONSENT_OPEN_EVENT = "ttd:cookie-consent-open";
const COOKIE_CONSENT_MAX_AGE = 60 * 60 * 24 * 180;

function canUseDocument() {
  return typeof document !== "undefined";
}

function canUseWindow() {
  return typeof window !== "undefined";
}

function normalizeConsentStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "accepted" || normalized === "essential" ? normalized : "unset";
}

function readCookieValue(name) {
  if (!canUseDocument()) return "";

  const cookieSource = document.cookie || "";
  const segments = cookieSource.split(";").map((segment) => segment.trim());
  const match = segments.find((segment) => segment.startsWith(`${name}=`));

  if (!match) return "";
  return decodeURIComponent(match.slice(name.length + 1));
}

function buildCookieAttributes() {
  const attributes = [`Path=/`, `Max-Age=${COOKIE_CONSENT_MAX_AGE}`, "SameSite=Lax"];

  if (canUseWindow() && window.location.protocol === "https:") {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}

function notifyConsentChange(status) {
  if (!canUseWindow()) return;

  window.dispatchEvent(
    new CustomEvent(COOKIE_CONSENT_CHANGE_EVENT, {
      detail: { status: normalizeConsentStatus(status) },
    })
  );
}

export function getCookieConsentStatus() {
  return normalizeConsentStatus(readCookieValue(COOKIE_CONSENT_NAME));
}

export function hasAnalyticsConsent() {
  return getCookieConsentStatus() === "accepted";
}

export function setCookieConsentStatus(status) {
  const nextStatus = normalizeConsentStatus(status);
  if (!canUseDocument() || nextStatus === "unset") return;

  document.cookie = `${COOKIE_CONSENT_NAME}=${encodeURIComponent(nextStatus)}; ${buildCookieAttributes()}`;
  notifyConsentChange(nextStatus);
}

export function openCookiePreferences() {
  if (!canUseWindow()) return;
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_OPEN_EVENT));
}

export function onCookieConsentChange(callback) {
  if (!canUseWindow() || typeof callback !== "function") return () => {};

  const handler = (event) => {
    callback(normalizeConsentStatus(event?.detail?.status));
  };

  window.addEventListener(COOKIE_CONSENT_CHANGE_EVENT, handler);
  return () => window.removeEventListener(COOKIE_CONSENT_CHANGE_EVENT, handler);
}

export function onCookiePreferencesOpen(callback) {
  if (!canUseWindow() || typeof callback !== "function") return () => {};

  const handler = () => {
    callback();
  };

  window.addEventListener(COOKIE_CONSENT_OPEN_EVENT, handler);
  return () => window.removeEventListener(COOKIE_CONSENT_OPEN_EVENT, handler);
}
