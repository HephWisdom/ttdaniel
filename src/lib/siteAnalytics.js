import { isSupabaseConfigured, supabase } from "./supabaseClient";

const SITE_ANALYTICS_EVENTS_KEY = "ttd_site_analytics_events_v1";
const SITE_ANALYTICS_SEEN_KEY = "ttd_site_analytics_seen_v1";
const SITE_ANALYTICS_SESSION_KEY = "ttd_site_analytics_session_v1";
const SITE_ANALYTICS_SIGNAL_KEY = "ttd_site_analytics_signal_v1";
const SITE_ANALYTICS_TABLE = "site_analytics_events";
const MAX_LOCAL_EVENTS = 4000;
const ENGAGEMENT_EVENT_TYPES = new Set([
  "page_view",
  "section_view",
  "blog_post_view",
  "engagement_ping",
  "scroll_depth",
  "outbound_click",
  "contact_click",
]);

const HOME_SECTION_LABELS = {
  home: "Home",
  about: "About",
  books: "Books",
  events: "Events",
  spirituality: "Bible Studies",
  counselling: "Counselling",
  blog: "Blog",
  comments: "Comments",
  donate: "Donate",
  "blog-article": "Blog Article",
  "blog-archive": "Blog Archive",
};

function readStorageValue(storage, key) {
  if (!storage) return null;

  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function removeStorageValue(storage, key) {
  if (!storage) return;

  try {
    storage.removeItem(key);
  } catch {
    // Ignore removal failures.
  }
}

function writeStorageValue(storage, key, value) {
  if (!storage) return;

  try {
    storage.setItem(key, value);
  } catch {
    // Ignore write failures.
  }
}

function readJsonStorage(storage, key, fallback) {
  const value = readStorageValue(storage, key);
  if (!value) return fallback;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function getBrowserSessionStorage() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

function getBrowserLocalStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function getAnalyticsSessionToken() {
  const sessionStorage = getBrowserSessionStorage();
  const existing = readStorageValue(sessionStorage, SITE_ANALYTICS_SESSION_KEY);
  if (existing) return existing;

  const nextToken =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  writeStorageValue(sessionStorage, SITE_ANALYTICS_SESSION_KEY, nextToken);
  return nextToken;
}

function loadLocalEvents() {
  const localStorage = getBrowserLocalStorage();
  const parsed = readJsonStorage(localStorage, SITE_ANALYTICS_EVENTS_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

function sortAnalyticsEvents(events) {
  return [...events].sort(
    (first, second) => new Date(second.created_at).getTime() - new Date(first.created_at).getTime()
  );
}

function getAnalyticsEventFingerprint(event) {
  return [
    sanitizeAnalyticsValue(event?.event_type, 40),
    normalizePath(event?.path),
    sanitizeAnalyticsValue(event?.section, 80),
    sanitizeAnalyticsValue(event?.post_id, 120),
    sanitizeAnalyticsValue(event?.session_token, 120),
    sanitizeAnalyticsValue(event?.created_at, 40),
  ].join("::");
}

function mergeAnalyticsEvents(primaryEvents = [], fallbackEvents = []) {
  const merged = [];
  const seen = new Set();

  [...primaryEvents, ...fallbackEvents].forEach((event) => {
    if (!event || typeof event !== "object") return;
    const fingerprint = getAnalyticsEventFingerprint(event);
    if (!fingerprint || seen.has(fingerprint)) return;
    seen.add(fingerprint);
    merged.push(event);
  });

  return sortAnalyticsEvents(merged).slice(0, MAX_LOCAL_EVENTS);
}

function saveLocalEvents(events) {
  const localStorage = getBrowserLocalStorage();
  if (!localStorage) return;

  const nextEvents = Array.isArray(events) ? events.slice(-MAX_LOCAL_EVENTS) : [];
  writeStorageValue(localStorage, SITE_ANALYTICS_EVENTS_KEY, JSON.stringify(nextEvents));
}

function loadSeenEventKeys() {
  const sessionStorage = getBrowserSessionStorage();
  const parsed = readJsonStorage(sessionStorage, SITE_ANALYTICS_SEEN_KEY, {});
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
}

function markSeenEvent(eventKey) {
  const sessionStorage = getBrowserSessionStorage();
  if (!sessionStorage || !eventKey) return;

  const seen = loadSeenEventKeys();
  seen[eventKey] = Date.now();
  writeStorageValue(sessionStorage, SITE_ANALYTICS_SEEN_KEY, JSON.stringify(seen));
}

function hasSeenEvent(eventKey) {
  if (!eventKey) return false;
  const seen = loadSeenEventKeys();
  return Boolean(seen[eventKey]);
}

function emitAnalyticsSignal() {
  const localStorage = getBrowserLocalStorage();
  if (!localStorage) return;
  writeStorageValue(localStorage, SITE_ANALYTICS_SIGNAL_KEY, String(Date.now()));
}

function isMissingAnalyticsTableError(error) {
  const message = String(error?.message || "").toLowerCase();
  return error?.code === "42P01" || message.includes(SITE_ANALYTICS_TABLE);
}

function sanitizeAnalyticsValue(value, maxLength = 120) {
  if (value == null) return "";
  return String(value).trim().slice(0, maxLength);
}

function sanitizeMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.entries(value).reduce((metadata, [key, rawValue]) => {
    const safeKey = sanitizeAnalyticsValue(key, 40);
    if (!safeKey) return metadata;

    if (typeof rawValue === "number") {
      metadata[safeKey] = Number.isFinite(rawValue) ? rawValue : 0;
      return metadata;
    }

    if (typeof rawValue === "boolean") {
      metadata[safeKey] = rawValue;
      return metadata;
    }

    metadata[safeKey] = sanitizeAnalyticsValue(rawValue, 180);
    return metadata;
  }, {});
}

function normalizePositiveInteger(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.round(parsed);
}

function normalizePath(pathname) {
  const trimmed = sanitizeAnalyticsValue(pathname || "/", 200);
  return trimmed || "/";
}

function getWindowLocation() {
  if (typeof window === "undefined") return null;
  return window.location || null;
}

function getNavigatorValue(key) {
  if (typeof navigator === "undefined") return "";
  return sanitizeAnalyticsValue(navigator[key], 120);
}

function getUserAgent() {
  return getNavigatorValue("userAgent");
}

function getDeviceType() {
  const userAgent = getUserAgent().toLowerCase();
  const width = typeof window !== "undefined" ? Number(window.innerWidth || 0) : 0;

  if (/ipad|tablet/.test(userAgent) || (width >= 700 && width <= 1100 && /mobile/.test(userAgent))) {
    return "tablet";
  }

  if (/mobi|android|iphone|ipod|blackberry|phone/.test(userAgent) || (width > 0 && width < 700)) {
    return "mobile";
  }

  return "desktop";
}

function getBrowserName() {
  const userAgent = getUserAgent();
  if (/Edg\//.test(userAgent)) return "Edge";
  if (/OPR\//.test(userAgent) || /Opera/.test(userAgent)) return "Opera";
  if (/Firefox\//.test(userAgent)) return "Firefox";
  if (/Chrome\//.test(userAgent) && !/Chromium/.test(userAgent)) return "Chrome";
  if (/Safari\//.test(userAgent) && !/Chrome\//.test(userAgent)) return "Safari";
  return "Other";
}

function getOsName() {
  const userAgent = getUserAgent();
  if (/Windows NT/.test(userAgent)) return "Windows";
  if (/Android/.test(userAgent)) return "Android";
  if (/iPhone|iPad|iPod/.test(userAgent)) return "iOS";
  if (/Mac OS X/.test(userAgent)) return "macOS";
  if (/Linux/.test(userAgent)) return "Linux";
  return "Other";
}

function getReferrerDetails(rawReferrer) {
  const location = getWindowLocation();
  const currentHost = location?.hostname || "";
  const referrer = sanitizeAnalyticsValue(rawReferrer ?? (typeof document !== "undefined" ? document.referrer : ""), 300);

  if (!referrer) {
    return { referrer: "", referrerHost: "", trafficSource: "direct" };
  }

  try {
    const url = new URL(referrer);
    const host = sanitizeAnalyticsValue(url.hostname.replace(/^www\./, ""), 120);

    if (currentHost && url.hostname === currentHost) {
      return { referrer, referrerHost: host, trafficSource: "internal" };
    }

    if (/(^|\.)google\.|(^|\.)bing\.|duckduckgo\.|search\.yahoo\.|ecosia\./i.test(host)) {
      return { referrer, referrerHost: host, trafficSource: "search" };
    }

    if (/(facebook|instagram|twitter|x\.com|linkedin|youtube|tiktok|whatsapp|t\.me)/i.test(host)) {
      return { referrer, referrerHost: host, trafficSource: "social" };
    }

    return { referrer, referrerHost: host, trafficSource: "referral" };
  } catch {
    return { referrer: "", referrerHost: "", trafficSource: "direct" };
  }
}

function getAnalyticsContext(input = {}) {
  const referrerDetails = getReferrerDetails(input.referrer);
  const language = getNavigatorValue("language");
  const timezone =
    typeof Intl !== "undefined"
      ? sanitizeAnalyticsValue(Intl.DateTimeFormat().resolvedOptions().timeZone, 80)
      : "";

  return {
    referrer: referrerDetails.referrer || null,
    referrer_host: referrerDetails.referrerHost || null,
    traffic_source: sanitizeAnalyticsValue(input.trafficSource || referrerDetails.trafficSource, 40) || "direct",
    device_type: sanitizeAnalyticsValue(input.deviceType || getDeviceType(), 40) || "desktop",
    browser: sanitizeAnalyticsValue(input.browser || getBrowserName(), 60) || "Other",
    os: sanitizeAnalyticsValue(input.os || getOsName(), 60) || "Other",
    viewport_width:
      typeof window !== "undefined" ? normalizePositiveInteger(window.innerWidth, 0) : null,
    viewport_height:
      typeof window !== "undefined" ? normalizePositiveInteger(window.innerHeight, 0) : null,
    language: language || null,
    timezone: timezone || null,
  };
}

function getBlogPostIdFromPath(pathname) {
  const normalized = normalizePath(pathname);
  const match = normalized.match(/^\/blog\/([^/?#]+)/i);
  return match ? sanitizeAnalyticsValue(decodeURIComponent(match[1]), 120) : "";
}

function createEventPayload({ eventType, path, section = "", postId = "", metadata = {}, ...contextInput }) {
  const normalizedEventType = sanitizeAnalyticsValue(eventType, 40);
  const analyticsContext = getAnalyticsContext(contextInput);

  return {
    event_type: ENGAGEMENT_EVENT_TYPES.has(normalizedEventType)
      ? normalizedEventType
      : "page_view",
    path: normalizePath(path),
    section: sanitizeAnalyticsValue(section, 80) || null,
    post_id: sanitizeAnalyticsValue(postId, 120) || null,
    session_token: getAnalyticsSessionToken(),
    created_at: new Date().toISOString(),
    ...analyticsContext,
    metadata: sanitizeMetadata(metadata),
  };
}

function getEventCacheKey(event) {
  return [
    event.event_type,
    event.path,
    event.section || "",
    event.post_id || "",
    event.session_token,
  ].join("::");
}

function saveLocalFallbackEvent(event) {
  const events = loadLocalEvents();
  events.push(event);
  saveLocalEvents(events);
  emitAnalyticsSignal();
}

function shouldSkipAnalyticsPath(pathname) {
  return normalizePath(pathname).startsWith("/admin/blog");
}

function formatAreaLabel(value) {
  const raw = sanitizeAnalyticsValue(value, 120);
  if (!raw) return "Unknown";
  if (HOME_SECTION_LABELS[raw]) return HOME_SECTION_LABELS[raw];

  if (raw.startsWith("/")) {
    if (raw === "/") return "Home";
    if (raw === "/blog") return "Blog Archive";
    if (raw.startsWith("/blog/")) return "Blog Article";
    if (raw === "/gallery") return "Gallery";
    if (raw === "/interlude-read-more") return "About Story";
    if (raw.startsWith("/bible-studies/") || raw.startsWith("/spirituality/")) {
      return "Bible Study Detail";
    }

    return raw
      .replaceAll("/", " ")
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  return raw.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0);
}

function getDayKey(date) {
  const target = new Date(date);
  if (Number.isNaN(target.getTime())) return "";

  return new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate())
  ).toISOString();
}

function buildDailySeries(events, totalDays = 7, startOffsetDays = 0) {
  const today = new Date();
  const buckets = [];

  for (let index = totalDays - 1; index >= 0; index -= 1) {
    const date = new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate() - index - startOffsetDays
      )
    );

    buckets.push({
      key: date.toISOString(),
      label: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date),
      count: 0,
    });
  }

  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  events.forEach((event) => {
    const key = getDayKey(event.created_at);
    const bucket = bucketMap.get(key);
    if (!bucket) return;
    bucket.count += 1;
  });

  return buckets;
}

function buildTopSections(pageViewEvents, sectionEvents) {
  const counts = new Map();
  const sourceEvents = sectionEvents.length > 0 ? sectionEvents : pageViewEvents;

  sourceEvents.forEach((event) => {
    const label = formatAreaLabel(event.section || event.path);
    counts.set(label, Number(counts.get(label) || 0) + 1);
  });

  const sorted = [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((first, second) => second.count - first.count);

  const top = sorted.slice(0, 3);
  const total = sorted.reduce((sum, item) => sum + item.count, 0);

  return top.map((item) => ({
    label: item.label,
    count: item.count,
    percentage: total > 0 ? Math.round((item.count / total) * 100) : 0,
  }));
}

function buildTopAreas(pageViewEvents, sectionEvents) {
  const counts = new Map();
  const sourceEvents = sectionEvents.length > 0 ? sectionEvents : pageViewEvents;

  sourceEvents.forEach((event) => {
    const label = formatAreaLabel(event.section || event.path);
    const existing = counts.get(label) || { label, hits: 0, visitors: new Set() };
    existing.hits += 1;

    const sessionToken = sanitizeAnalyticsValue(event.session_token, 120);
    if (sessionToken) {
      existing.visitors.add(sessionToken);
    }

    counts.set(label, existing);
  });

  return [...counts.values()]
    .map((item) => ({
      label: item.label,
      hits: item.hits,
      visitors: item.visitors.size,
    }))
    .sort((first, second) => second.hits - first.hits);
}

function buildPostMetrics(posts, viewCounts, loveCounts, commentCounts) {
  return posts
    .map((post) => {
      const postId = String(post.id);
      return {
        ...post,
        views: Number(viewCounts[postId] || 0),
        likes: Number(loveCounts[postId] || 0),
        comments: Number(commentCounts[postId] || 0),
      };
    })
    .sort((first, second) => {
      const secondScore = second.views * 4 + second.likes * 2 + second.comments;
      const firstScore = first.views * 4 + first.likes * 2 + first.comments;
      return secondScore - firstScore;
    });
}

function getEventTime(event) {
  const date = new Date(event?.created_at);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getMetadataNumber(event, key) {
  const value = event?.metadata?.[key];
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDuration(seconds) {
  const normalizedSeconds = Math.max(0, Math.round(Number(seconds || 0)));
  if (normalizedSeconds < 60) return `${normalizedSeconds}s`;

  const minutes = Math.floor(normalizedSeconds / 60);
  const remainingSeconds = normalizedSeconds % 60;
  if (minutes < 60) return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function buildCountList(events, key, fallback = "Unknown") {
  const counts = new Map();
  events.forEach((event) => {
    const label = sanitizeAnalyticsValue(event?.[key], 80) || fallback;
    counts.set(label, Number(counts.get(label) || 0) + 1);
  });

  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);

  return [...counts.entries()]
    .map(([label, count]) => ({
      label: formatAreaLabel(label),
      rawLabel: label,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((first, second) => second.count - first.count);
}

function buildTopPages(pageViewEvents) {
  const pageMap = new Map();

  pageViewEvents.forEach((event) => {
    const path = normalizePath(event.path);
    const current = pageMap.get(path) || {
      label: formatAreaLabel(path),
      path,
      views: 0,
      visitors: new Set(),
    };

    current.views += 1;

    const sessionToken = sanitizeAnalyticsValue(event.session_token, 120);
    if (sessionToken) {
      current.visitors.add(sessionToken);
    }

    pageMap.set(path, current);
  });

  return [...pageMap.values()]
    .map((page) => ({
      label: page.label,
      path: page.path,
      views: page.views,
      visitors: page.visitors.size,
      viewsPerVisitor:
        page.visitors.size > 0 ? Number((page.views / page.visitors.size).toFixed(1)) : 0,
    }))
    .sort((first, second) => second.views - first.views);
}

function buildSessionInsights(events) {
  const sessionMap = new Map();

  events.forEach((event) => {
    const sessionToken = sanitizeAnalyticsValue(event.session_token, 120);
    if (!sessionToken) return;

    const current = sessionMap.get(sessionToken) || {
      token: sessionToken,
      events: [],
      pageViews: [],
      maxEngagementSeconds: 0,
      maxScrollDepth: 0,
    };

    current.events.push(event);

    if (event.event_type === "page_view") {
      current.pageViews.push(event);
    }

    if (event.event_type === "engagement_ping") {
      current.maxEngagementSeconds = Math.max(
        current.maxEngagementSeconds,
        getMetadataNumber(event, "seconds")
      );
    }

    if (event.event_type === "scroll_depth") {
      current.maxScrollDepth = Math.max(current.maxScrollDepth, getMetadataNumber(event, "depth"));
    }

    sessionMap.set(sessionToken, current);
  });

  const sessions = [...sessionMap.values()].map((session) => {
    const sortedEvents = [...session.events].sort((first, second) => getEventTime(first) - getEventTime(second));
    const sortedPageViews = [...session.pageViews].sort(
      (first, second) => getEventTime(first) - getEventTime(second)
    );
    const firstEvent = sortedEvents[0] || null;
    const lastEvent = sortedEvents[sortedEvents.length - 1] || null;
    const firstPage = sortedPageViews[0] || firstEvent;
    const lastPage = sortedPageViews[sortedPageViews.length - 1] || lastEvent;
    const observedDurationSeconds =
      firstEvent && lastEvent ? Math.max(0, (getEventTime(lastEvent) - getEventTime(firstEvent)) / 1000) : 0;
    const durationSeconds = Math.min(
      Math.max(observedDurationSeconds, session.maxEngagementSeconds),
      60 * 60
    );
    const isEngaged =
      durationSeconds >= 15 ||
      session.maxScrollDepth >= 50 ||
      sortedPageViews.length > 1 ||
      sortedEvents.some((event) => event.event_type === "outbound_click" || event.event_type === "contact_click");

    return {
      token: session.token,
      entryPage: firstPage ? normalizePath(firstPage.path) : "/",
      exitPage: lastPage ? normalizePath(lastPage.path) : "/",
      entryLabel: firstPage ? formatAreaLabel(firstPage.path) : "Unknown",
      exitLabel: lastPage ? formatAreaLabel(lastPage.path) : "Unknown",
      pageViews: sortedPageViews.length,
      events: sortedEvents.length,
      durationSeconds,
      durationLabel: formatDuration(durationSeconds),
      maxScrollDepth: session.maxScrollDepth,
      maxEngagementSeconds: session.maxEngagementSeconds,
      deviceType: sanitizeAnalyticsValue(firstEvent?.device_type, 40) || "unknown",
      source: sanitizeAnalyticsValue(firstEvent?.traffic_source, 40) || "direct",
      isEngaged,
    };
  });

  const totalSessions = sessions.length;
  const engagedSessions = sessions.filter((session) => session.isEngaged).length;
  const bouncedSessions = sessions.filter(
    (session) => session.pageViews <= 1 && !session.isEngaged
  ).length;
  const totalDuration = sessions.reduce((sum, session) => sum + session.durationSeconds, 0);
  const totalSessionPageViews = sessions.reduce((sum, session) => sum + session.pageViews, 0);

  return {
    sessions,
    totalSessions,
    engagedSessions,
    bounceRate: totalSessions > 0 ? Math.round((bouncedSessions / totalSessions) * 100) : 0,
    averageDurationSeconds: totalSessions > 0 ? totalDuration / totalSessions : 0,
    averageDurationLabel: formatDuration(totalSessions > 0 ? totalDuration / totalSessions : 0),
    pagesPerSession:
      totalSessions > 0 ? Number((totalSessionPageViews / totalSessions).toFixed(1)) : 0,
    topJourneys: sessions
      .filter((session) => session.pageViews > 0)
      .sort((first, second) => second.events - first.events || second.durationSeconds - first.durationSeconds)
      .slice(0, 8),
  };
}

function buildScrollDepthSummary(scrollEvents) {
  const milestones = [25, 50, 75, 90];
  return milestones.map((milestone) => ({
    label: `${milestone}% scroll`,
    count: scrollEvents.filter((event) => getMetadataNumber(event, "depth") >= milestone).length,
  }));
}

function buildEngagementTimeSummary(engagementEvents) {
  const milestones = [15, 45, 120];
  return milestones.map((seconds) => ({
    label: `${seconds}s engaged`,
    count: engagementEvents.filter((event) => getMetadataNumber(event, "seconds") >= seconds).length,
  }));
}

function buildHourlyActivity(events) {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: `${String(hour).padStart(2, "0")}:00`,
    count: 0,
  }));

  events.forEach((event) => {
    const date = new Date(event.created_at);
    if (Number.isNaN(date.getTime())) return;
    buckets[date.getHours()].count += 1;
  });

  return buckets;
}

export async function trackAnalyticsEvent(input) {
  const event = createEventPayload(input);
  if (!event.event_type || shouldSkipAnalyticsPath(event.path)) {
    return false;
  }

  const dedupe = input?.dedupe !== false;
  const cacheKey = getEventCacheKey(event);
  if (dedupe && hasSeenEvent(cacheKey)) {
    return false;
  }

  if (dedupe) {
    markSeenEvent(cacheKey);
  }

  if (!isSupabaseConfigured || !supabase) {
    saveLocalFallbackEvent(event);
    return true;
  }

  try {
    const { error } = await supabase.from(SITE_ANALYTICS_TABLE).insert(event);

    if (error) {
      if (isMissingAnalyticsTableError(error)) {
        saveLocalFallbackEvent(event);
        return true;
      }

      saveLocalFallbackEvent(event);
      return false;
    }

    emitAnalyticsSignal();
    return true;
  } catch {
    saveLocalFallbackEvent(event);
    return false;
  }
}

export function trackPageView(path) {
  return trackAnalyticsEvent({ eventType: "page_view", path });
}

export function trackSectionView(path, section) {
  return trackAnalyticsEvent({ eventType: "section_view", path, section });
}

export function trackBlogPostView(postId, path) {
  return trackAnalyticsEvent({ eventType: "blog_post_view", path, postId });
}

export function trackEngagementPing(path, seconds) {
  const normalizedSeconds = normalizePositiveInteger(seconds, 0);
  if (!normalizedSeconds) return false;

  return trackAnalyticsEvent({
    eventType: "engagement_ping",
    path,
    section: `${normalizedSeconds}s`,
    metadata: { seconds: normalizedSeconds },
  });
}

export function trackScrollDepth(path, depth) {
  const normalizedDepth = normalizePositiveInteger(depth, 0);
  if (!normalizedDepth) return false;

  return trackAnalyticsEvent({
    eventType: "scroll_depth",
    path,
    section: `${normalizedDepth}%`,
    metadata: { depth: normalizedDepth },
  });
}

function normalizeTrackedLink(rawUrl) {
  const urlValue = sanitizeAnalyticsValue(rawUrl, 500);
  if (!urlValue) return null;

  try {
    const url = new URL(urlValue, getWindowLocation()?.origin || "https://ttdaniel525.live");
    if (url.protocol === "mailto:" || url.protocol === "tel:") {
      return {
        host: url.protocol.replace(":", ""),
        label: url.protocol.replace(":", ""),
        safeUrl: url.protocol.replace(":", ""),
        type: "contact_click",
      };
    }

    return {
      host: sanitizeAnalyticsValue(url.hostname.replace(/^www\./, ""), 80) || "external",
      label: sanitizeAnalyticsValue(url.hostname.replace(/^www\./, ""), 80) || "external",
      safeUrl: sanitizeAnalyticsValue(`${url.origin}${url.pathname}`, 220),
      type: "outbound_click",
    };
  } catch {
    return null;
  }
}

export function trackOutboundClick(path, rawUrl) {
  const link = normalizeTrackedLink(rawUrl);
  if (!link) return false;

  return trackAnalyticsEvent({
    dedupe: false,
    eventType: link.type,
    path,
    section: link.label,
    metadata: {
      host: link.host,
      url: link.safeUrl,
    },
  });
}

export function getSiteAnalyticsSignalKey() {
  return SITE_ANALYTICS_SIGNAL_KEY;
}

export function clearSiteAnalyticsStorage() {
  const localStorage = getBrowserLocalStorage();
  const sessionStorage = getBrowserSessionStorage();

  removeStorageValue(localStorage, SITE_ANALYTICS_EVENTS_KEY);
  removeStorageValue(localStorage, SITE_ANALYTICS_SIGNAL_KEY);
  removeStorageValue(sessionStorage, SITE_ANALYTICS_SEEN_KEY);
  removeStorageValue(sessionStorage, SITE_ANALYTICS_SESSION_KEY);
}

export async function fetchAnalyticsEvents() {
  const localEvents = loadLocalEvents();

  if (!isSupabaseConfigured || !supabase) {
    return sortAnalyticsEvents(localEvents);
  }

  try {
    const { data, error } = await supabase
      .from(SITE_ANALYTICS_TABLE)
      .select(
        "event_type,path,section,post_id,session_token,created_at,referrer,referrer_host,traffic_source,device_type,browser,os,viewport_width,viewport_height,language,timezone,metadata"
      )
      .order("created_at", { ascending: false })
      .limit(MAX_LOCAL_EVENTS);

    if (error) {
      if (isMissingAnalyticsTableError(error)) {
        return sortAnalyticsEvents(localEvents);
      }

      if (String(error.message || "").toLowerCase().includes("column")) {
        const { data: legacyData, error: legacyError } = await supabase
          .from(SITE_ANALYTICS_TABLE)
          .select("event_type,path,section,post_id,session_token,created_at")
          .order("created_at", { ascending: false })
          .limit(MAX_LOCAL_EVENTS);

        if (!legacyError) {
          return mergeAnalyticsEvents(Array.isArray(legacyData) ? legacyData : [], localEvents);
        }
      }

      return sortAnalyticsEvents(localEvents);
    }

    return mergeAnalyticsEvents(Array.isArray(data) ? data : [], localEvents);
  } catch {
    return sortAnalyticsEvents(localEvents);
  }
}

export async function fetchSiteAnalyticsSummary({
  posts = [],
  loveCounts = {},
  commentCounts = {},
} = {}) {
  const events = await fetchAnalyticsEvents();
  const safeEvents = (Array.isArray(events) ? events : []).filter(
    (event) => !shouldSkipAnalyticsPath(event.path)
  );

  const pageViewEvents = safeEvents.filter((event) => event.event_type === "page_view");
  const sectionEvents = safeEvents.filter((event) => event.event_type === "section_view");
  const blogReadEvents = safeEvents.filter((event) => event.event_type === "blog_post_view");
  const engagementEvents = safeEvents.filter((event) => event.event_type === "engagement_ping");
  const scrollEvents = safeEvents.filter((event) => event.event_type === "scroll_depth");
  const outboundEvents = safeEvents.filter((event) => event.event_type === "outbound_click");
  const contactEvents = safeEvents.filter((event) => event.event_type === "contact_click");
  const visitorSourceEvents = pageViewEvents.length > 0 ? pageViewEvents : safeEvents;

  const uniqueVisitors = new Set(
    visitorSourceEvents
      .map((event) => sanitizeAnalyticsValue(event.session_token, 120))
      .filter(Boolean)
  ).size;

  const explicitPostViewCounts = blogReadEvents.reduce((counts, event) => {
    const postId = sanitizeAnalyticsValue(event.post_id, 120);
    if (!postId) return counts;

    const current = Number(counts[postId] || 0);
    counts[postId] = Number.isFinite(current) ? current + 1 : 1;
    return counts;
  }, {});

  const detailPageViewCounts = pageViewEvents.reduce((counts, event) => {
    const postId = getBlogPostIdFromPath(event.path);
    if (!postId) return counts;

    const current = Number(counts[postId] || 0);
    counts[postId] = Number.isFinite(current) ? current + 1 : 1;
    return counts;
  }, {});

  const postViewCounts = Object.keys({
    ...detailPageViewCounts,
    ...explicitPostViewCounts,
  }).reduce((counts, postId) => {
    counts[postId] = Math.max(
      Number(explicitPostViewCounts[postId] || 0),
      Number(detailPageViewCounts[postId] || 0)
    );
    return counts;
  }, {});

  const dailyPageViews = buildDailySeries(pageViewEvents, 7);
  const previousDailyPageViews = buildDailySeries(pageViewEvents, 7, 7);

  const currentTraffic = dailyPageViews.reduce((sum, item) => sum + item.count, 0);
  const previousTraffic = previousDailyPageViews.reduce((sum, item) => sum + item.count, 0);
  const trafficChange =
    previousTraffic > 0 ? ((currentTraffic - previousTraffic) / previousTraffic) * 100 : 0;

  const totalPageViews = pageViewEvents.length;
  const totalBlogReads =
    Object.values(postViewCounts).reduce((sum, value) => sum + Number(value || 0), 0) ||
    blogReadEvents.length;
  const totalLikes = Object.values(loveCounts).reduce(
    (sum, value) => sum + (Number.isFinite(Number(value)) ? Number(value) : 0),
    0
  );
  const totalComments = Object.values(commentCounts).reduce(
    (sum, value) => sum + (Number.isFinite(Number(value)) ? Number(value) : 0),
    0
  );

  const topSections = buildTopSections(pageViewEvents, sectionEvents);
  const topAreas = buildTopAreas(pageViewEvents, sectionEvents);
  const topPosts = buildPostMetrics(posts, postViewCounts, loveCounts, commentCounts);
  const topPages = buildTopPages(pageViewEvents);
  const sessionInsights = buildSessionInsights(safeEvents);
  const trafficSources = buildCountList(pageViewEvents, "traffic_source", "direct");
  const referrers = buildCountList(
    pageViewEvents.filter((event) => sanitizeAnalyticsValue(event.referrer_host, 120)),
    "referrer_host",
    "direct"
  );
  const deviceBreakdown = buildCountList(pageViewEvents, "device_type", "unknown");
  const browserBreakdown = buildCountList(pageViewEvents, "browser", "Other");
  const osBreakdown = buildCountList(pageViewEvents, "os", "Other");
  const languageBreakdown = buildCountList(pageViewEvents, "language", "Unknown");
  const timezoneBreakdown = buildCountList(pageViewEvents, "timezone", "Unknown");
  const scrollDepth = buildScrollDepthSummary(scrollEvents);
  const engagementTime = buildEngagementTimeSummary(engagementEvents);
  const hourlyActivity = buildHourlyActivity(pageViewEvents);
  const topClickTargets = buildCountList([...outboundEvents, ...contactEvents], "section", "Unknown");
  const hasTraffic = safeEvents.length > 0;

  return {
    hasTraffic,
    trackedEvents: safeEvents.length,
    uniqueVisitors,
    totalPageViews,
    totalBlogReads,
    totalLikes,
    totalComments,
    trafficChange,
    dailyPageViews,
    sessionInsights,
    topPages,
    trafficSources,
    referrers,
    deviceBreakdown,
    browserBreakdown,
    osBreakdown,
    languageBreakdown,
    timezoneBreakdown,
    scrollDepth,
    engagementTime,
    hourlyActivity,
    topClickTargets,
    outboundClicks: outboundEvents.length,
    contactClicks: contactEvents.length,
    topSections,
    topAreas,
    topPosts,
    postViewCounts,
    donut: {
      centerValue: formatCompactNumber(totalPageViews || uniqueVisitors),
      centerLabel: "Site Views",
      primaryLabel: "Blog Pages",
      secondaryLabel: "Other Pages",
      primaryValue: totalBlogReads,
      secondaryValue: Math.max(totalPageViews - totalBlogReads, 0),
    },
    visitorsCard: {
      label: "Website Visitors",
      value: formatCompactNumber(uniqueVisitors),
      footLabel: "All Page Views",
      footValue: formatCompactNumber(totalPageViews),
      change: trafficChange,
    },
    generalResults: {
      labels: topAreas.slice(0, 7).map((area) => {
        const title = sanitizeAnalyticsValue(area.label, 24);
        return title.length > 10 ? `${title.slice(0, 10)}...` : title;
      }),
      views: topAreas.slice(0, 7).map((area) => area.hits),
      likes: topAreas.slice(0, 7).map((area) => area.visitors),
      primaryLabel: "Visits",
      secondaryLabel: "Visitors",
      peakLabel:
        topAreas[0] && topAreas[0].label
          ? `${formatCompactNumber(topAreas[0].hits)} visits`
          : "No visits yet",
      peakSubLabel:
        topAreas[0] && topAreas[0].label ? sanitizeAnalyticsValue(topAreas[0].label, 18) : "",
    },
    analyticsCards: [
      {
        label: "Visitors",
        value: formatCompactNumber(uniqueVisitors),
        change:
          trafficChange >= 0
            ? `↑ ${Math.round(Math.abs(trafficChange))}% vs last week`
            : `↓ ${Math.round(Math.abs(trafficChange))}% vs last week`,
        tone: trafficChange >= 0 ? "up" : "down",
      },
      {
        label: "Page Views",
        value: formatCompactNumber(totalPageViews),
        change: `${sessionInsights.pagesPerSession} pages per session`,
        tone: "up",
      },
      {
        label: "Engaged Sessions",
        value: formatCompactNumber(sessionInsights.engagedSessions),
        change: `${sessionInsights.bounceRate}% bounce rate`,
        tone: sessionInsights.bounceRate <= 55 ? "up" : "down",
      },
      {
        label: "Avg. Time",
        value: sessionInsights.averageDurationLabel,
        change: `${formatCompactNumber(outboundEvents.length + contactEvents.length)} tracked clicks`,
        tone: "up",
      },
    ],
    behaviorCards: [
      {
        label: "Top Page",
        value: topPages[0]?.label || "No traffic",
        change: topPages[0] ? `${formatCompactNumber(topPages[0].views)} views` : "Awaiting data",
        tone: "up",
      },
      {
        label: "Top Source",
        value: trafficSources[0]?.label || "Direct",
        change: trafficSources[0] ? `${trafficSources[0].percentage}% of page views` : "Awaiting data",
        tone: "up",
      },
      {
        label: "Top Device",
        value: deviceBreakdown[0]?.label || "Unknown",
        change: deviceBreakdown[0] ? `${deviceBreakdown[0].percentage}% of page views` : "Awaiting data",
        tone: "up",
      },
      {
        label: "Blog Reads",
        value: formatCompactNumber(totalBlogReads),
        change: `${formatCompactNumber(totalLikes)} reactions · ${formatCompactNumber(totalComments)} comments`,
        tone: "up",
      },
    ],
  };
}
