import { isSupabaseConfigured, supabase } from "./supabaseClient";

const SITE_ANALYTICS_EVENTS_KEY = "ttd_site_analytics_events_v1";
const SITE_ANALYTICS_SEEN_KEY = "ttd_site_analytics_seen_v1";
const SITE_ANALYTICS_SESSION_KEY = "ttd_site_analytics_session_v1";
const SITE_ANALYTICS_SIGNAL_KEY = "ttd_site_analytics_signal_v1";
const SITE_ANALYTICS_TABLE = "site_analytics_events";
const MAX_LOCAL_EVENTS = 4000;

const HOME_SECTION_LABELS = {
  home: "Home",
  about: "About",
  books: "Books",
  events: "Events",
  spirituality: "Bible Studies",
  counselling: "Counselling",
  blog: "Blog",
  comments: "Comments",
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

function normalizePath(pathname) {
  const trimmed = sanitizeAnalyticsValue(pathname || "/", 200);
  return trimmed || "/";
}

function getBlogPostIdFromPath(pathname) {
  const normalized = normalizePath(pathname);
  const match = normalized.match(/^\/blog\/([^/?#]+)/i);
  return match ? sanitizeAnalyticsValue(decodeURIComponent(match[1]), 120) : "";
}

function createEventPayload({ eventType, path, section = "", postId = "" }) {
  return {
    event_type: sanitizeAnalyticsValue(eventType, 40),
    path: normalizePath(path),
    section: sanitizeAnalyticsValue(section, 80) || null,
    post_id: sanitizeAnalyticsValue(postId, 120) || null,
    session_token: getAnalyticsSessionToken(),
    created_at: new Date().toISOString(),
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

export function getSiteAnalyticsSignalKey() {
  return SITE_ANALYTICS_SIGNAL_KEY;
}

export async function fetchAnalyticsEvents() {
  const localEvents = loadLocalEvents();

  if (!isSupabaseConfigured || !supabase) {
    return sortAnalyticsEvents(localEvents);
  }

  try {
    const { data, error } = await supabase
      .from(SITE_ANALYTICS_TABLE)
      .select("event_type,path,section,post_id,session_token,created_at")
      .order("created_at", { ascending: false })
      .limit(MAX_LOCAL_EVENTS);

    if (error) {
      if (isMissingAnalyticsTableError(error)) {
        return sortAnalyticsEvents(localEvents);
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
        label: "Site Visits",
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
        change: `${formatCompactNumber(totalBlogReads)} blog article opens`,
        tone: "up",
      },
      {
        label: "Love Reactions",
        value: formatCompactNumber(totalLikes),
        change: `${formatCompactNumber(totalComments)} approved comments`,
        tone: totalLikes >= totalComments ? "up" : "down",
      },
      {
        label: "Top Section",
        value: topSections[0]?.label || "No traffic",
        change: topSections[0] ? `${topSections[0].percentage}% of tracked browsing` : "Awaiting data",
        tone: "up",
      },
    ],
  };
}
