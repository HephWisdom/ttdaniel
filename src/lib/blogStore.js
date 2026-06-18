import { isSupabaseConfigured, supabase } from "./supabaseClient";

const BLOG_STORAGE_KEY = "ttd_blog_posts_v1";
const BLOG_DRAFT_STORAGE_KEY = "ttd_blog_admin_editor_draft_v2";
const LEGACY_BLOG_DRAFT_STORAGE_KEY = "ttd_blog_admin_editor_draft_v1";
const BLOG_DRAFT_MIGRATION_BACKUP_KEY = "ttd_blog_admin_editor_draft_migration_backup_v1";
const BLOG_COMMENTS_STORAGE_KEY = "ttd_blog_comments_v1";
const BLOG_IMAGE_BUCKET = "blog-images";
const BLOG_COMMENT_RATE_KEY = "ttd_blog_comment_last_submit_v1";
const BLOG_LOVE_REACTIONS_COUNT_KEY = "ttd_blog_love_reactions_count_v1";
const BLOG_LOVE_REACTED_POSTS_KEY = "ttd_blog_love_reacted_posts_v1";
const BLOG_LOVE_REACTOR_TOKEN_KEY = "ttd_blog_love_reactor_token_v1";
const BLOG_LOVE_REACTION_SIGNAL_KEY = "ttd_blog_love_reaction_signal_v1";
const COMMENT_NAME_MAX_LENGTH = 80;
const COMMENT_MESSAGE_MAX_LENGTH = 1200;
const COMMENT_SUBMIT_COOLDOWN_MS = 15_000;

function isMissingApprovedColumnError(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.code === "42703" ||
    message.includes("blog_comments.is_approved") ||
    message.includes("column \"is_approved\" does not exist")
  );
}

function isMissingBlogPostOptionColumnError(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.code === "42703" ||
    message.includes("allow_comments") ||
    message.includes("is_featured") ||
    message.includes("seo_enabled")
  );
}

function isMissingBlogDraftTableError(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.code === "42P01" ||
    message.includes("blog_drafts") ||
    message.includes("relation \"public.blog_drafts\" does not exist")
  );
}

function stripControlCharacters(value, { preserveNewLines = false } = {}) {
  return Array.from(String(value || ""))
    .filter((char) => {
      if (preserveNewLines && (char === "\n" || char === "\r")) {
        return true;
      }

      const code = char.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join("");
}

function sanitizeCommentText(value, maxLength, { preserveNewLines = false } = {}) {
  if (typeof value !== "string") return "";

  let sanitized = value.normalize("NFKC");
  sanitized = sanitized.replace(/[<>&]/g, "");
  sanitized = stripControlCharacters(sanitized, { preserveNewLines });
  sanitized = preserveNewLines
    ? sanitized.replace(/[^\S\r\n]+/g, " ").replace(/\r\n/g, "\n")
    : sanitized.replace(/\s+/g, " ");
  sanitized = sanitized.trim();

  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }

  return sanitized;
}

function enforceCommentRateLimit() {
  if (typeof window === "undefined") return;

  const now = Date.now();
  const previous = Number(window.localStorage.getItem(BLOG_COMMENT_RATE_KEY) || "0");
  if (previous && now - previous < COMMENT_SUBMIT_COOLDOWN_MS) {
    const secondsLeft = Math.ceil((COMMENT_SUBMIT_COOLDOWN_MS - (now - previous)) / 1000);
    throw new Error(`Please wait ${secondsLeft}s before posting another comment.`);
  }
}

function markCommentSubmittedNow() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BLOG_COMMENT_RATE_KEY, String(Date.now()));
}

function prepareCommentPayload(postId, input) {
  const name = sanitizeCommentText(input?.name, COMMENT_NAME_MAX_LENGTH);
  const message = sanitizeCommentText(input?.message, COMMENT_MESSAGE_MAX_LENGTH, {
    preserveNewLines: true,
  });

  if (!name || !message) {
    throw new Error("Name and comment are required.");
  }

  return {
    post_id: postId,
    name,
    message,
    is_approved: false,
  };
}

function resolveBlogImageUrl(imageValue) {
  if (typeof imageValue !== "string") return "";

  const trimmed = imageValue.trim();
  if (!trimmed) return "";

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  if (!isSupabaseConfigured || !supabase) {
    return trimmed;
  }

  let storagePath = trimmed;

  const publicPathPrefix = `storage/v1/object/public/${BLOG_IMAGE_BUCKET}/`;
  const prefixIndex = storagePath.indexOf(publicPathPrefix);
  if (prefixIndex >= 0) {
    storagePath = storagePath.slice(prefixIndex + publicPathPrefix.length);
  } else {
    storagePath = storagePath.replace(new RegExp(`^/?${BLOG_IMAGE_BUCKET}/`), "");
  }

  const { data } = supabase.storage.from(BLOG_IMAGE_BUCKET).getPublicUrl(storagePath);
  return data?.publicUrl || trimmed;
}

export const INITIAL_BLOG_POSTS = [
  {
    id: "welcome-post",
    title: "Welcome To The Blog",
    image: "",
    excerpt:
      "Updates, teachings, ministry reflections, and practical guidance will be shared here.",
    content:
      "This section is now active for regular ministry updates. Check back for new teachings, announcements, and encouragement.",
    author: "Admin",
    createdAt: "2026-02-16T09:00:00.000Z",
    tags: ["Update", "Ministry"],
    allowComments: true,
    isFeatured: false,
    seoEnabled: true,
  },
];

function normalizePost(post) {
  return {
    id: post.id,
    title: post.title,
    image: resolveBlogImageUrl(post.image),
    excerpt: post.excerpt,
    content: post.content,
    author: post.author || "Admin",
    createdAt: post.created_at || post.createdAt,
    subscriberNotifiedAt:
      post.subscriber_notified_at || post.subscriberNotifiedAt || null,
    tags: Array.isArray(post.tags) ? post.tags : [],
    allowComments:
      typeof post.allow_comments === "boolean"
        ? post.allow_comments
        : typeof post.allowComments === "boolean"
          ? post.allowComments
          : true,
    isFeatured:
      typeof post.is_featured === "boolean"
        ? post.is_featured
        : typeof post.isFeatured === "boolean"
          ? post.isFeatured
          : false,
    seoEnabled:
      typeof post.seo_enabled === "boolean"
        ? post.seo_enabled
        : typeof post.seoEnabled === "boolean"
          ? post.seoEnabled
          : true,
  };
}

function toValidDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toPublishAtIso(value) {
  if (!value) return null;
  const parsed = toValidDate(value);
  return parsed ? parsed.toISOString() : null;
}

function isPostPublished(post) {
  const publishDate = toValidDate(post?.createdAt);
  if (!publishDate) return false;
  return publishDate.getTime() <= Date.now();
}

function normalizeDraft(draft) {
  if (!draft || typeof draft !== "object") return null;

  return {
    id: draft.id || "",
    title: draft.title || "",
    image: resolveBlogImageUrl(draft.image),
    excerpt: draft.excerpt || "",
    content: draft.content || "",
    author: draft.author || "Admin",
    tags: Array.isArray(draft.tags) ? draft.tags : [],
    publishAt: draft.publish_at || draft.publishAt || "",
    allowComments:
      typeof draft.allow_comments === "boolean"
        ? draft.allow_comments
        : typeof draft.allowComments === "boolean"
          ? draft.allowComments
          : true,
    isFeatured:
      typeof draft.is_featured === "boolean"
        ? draft.is_featured
        : typeof draft.isFeatured === "boolean"
          ? draft.isFeatured
          : false,
    seoEnabled:
      typeof draft.seo_enabled === "boolean"
        ? draft.seo_enabled
        : typeof draft.seoEnabled === "boolean"
          ? draft.seoEnabled
          : true,
    createdAt: draft.created_at || draft.createdAt || null,
    updatedAt: draft.updated_at || draft.updatedAt || null,
  };
}

function normalizeLegacyDraft(draft) {
  if (!draft || typeof draft !== "object") return null;

  return normalizeDraft({
    id: draft.id || "legacy-local-draft",
    title: draft.title || "",
    image: draft.image || "",
    excerpt: draft.excerpt || "",
    content: draft.content || "",
    author: draft.author || "Admin",
    tags: Array.isArray(draft.tags) ? draft.tags : [],
    publishAt: draft.publishAt || "",
    allowComments:
      typeof draft.allowComments === "boolean" ? draft.allowComments : true,
    isFeatured:
      typeof draft.featuredArticle === "boolean" ? draft.featuredArticle : false,
    seoEnabled:
      typeof draft.seoOptimized === "boolean" ? draft.seoOptimized : true,
    createdAt: draft.createdAt || draft.savedAt || null,
    updatedAt: draft.updatedAt || draft.savedAt || draft.createdAt || null,
  });
}

function readLocalDraftByKey(storageKey, normalizer = normalizeDraft) {
  if (typeof window === "undefined") return null;

  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return null;

    return normalizer(JSON.parse(saved));
  } catch {
    return null;
  }
}

function getDraftTimestampMs(draft) {
  const updated = toValidDate(draft?.updatedAt || draft?.createdAt);
  return updated ? updated.getTime() : Number.NaN;
}

function getDraftMeaningfulFieldScore(draft) {
  if (!draft) return 0;

  let score = 0;
  if (String(draft.title || "").trim()) score += 1;
  if (String(draft.image || "").trim()) score += 1;
  if (String(draft.excerpt || "").trim()) score += 1;
  if (String(draft.content || "").trim()) score += 2;
  if (String(draft.publishAt || "").trim()) score += 1;
  if (Array.isArray(draft.tags) && draft.tags.some((tag) => String(tag || "").trim())) score += 1;
  if (String(draft.author || "").trim() && String(draft.author || "").trim() !== "Admin") score += 1;
  return score;
}

function combineDraftTags(primaryTags = [], fallbackTags = []) {
  const seen = new Set();

  return [...primaryTags, ...fallbackTags]
    .map((tag) => String(tag || "").trim())
    .filter((tag) => {
      if (!tag) return false;

      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function pickPreferredDraft(firstDraft, secondDraft) {
  if (!firstDraft) return secondDraft || null;
  if (!secondDraft) return firstDraft;

  const firstTimestamp = getDraftTimestampMs(firstDraft);
  const secondTimestamp = getDraftTimestampMs(secondDraft);
  const hasFirstTimestamp = Number.isFinite(firstTimestamp);
  const hasSecondTimestamp = Number.isFinite(secondTimestamp);

  if (hasFirstTimestamp && hasSecondTimestamp && firstTimestamp !== secondTimestamp) {
    return firstTimestamp > secondTimestamp ? firstDraft : secondDraft;
  }

  if (hasFirstTimestamp !== hasSecondTimestamp) {
    return hasFirstTimestamp ? firstDraft : secondDraft;
  }

  return getDraftMeaningfulFieldScore(firstDraft) >= getDraftMeaningfulFieldScore(secondDraft)
    ? firstDraft
    : secondDraft;
}

function mergeDrafts(primaryDraft, fallbackDraft) {
  if (!primaryDraft) return fallbackDraft || null;
  if (!fallbackDraft) return primaryDraft;

  const createdAtValues = [primaryDraft.createdAt, fallbackDraft.createdAt]
    .map((value) => toValidDate(value))
    .filter(Boolean)
    .sort((first, second) => first.getTime() - second.getTime());
  const updatedAtValues = [
    primaryDraft.updatedAt,
    fallbackDraft.updatedAt,
    primaryDraft.createdAt,
    fallbackDraft.createdAt,
  ]
    .map((value) => toValidDate(value))
    .filter(Boolean)
    .sort((first, second) => first.getTime() - second.getTime());

  const primaryAuthor = String(primaryDraft.author || "").trim();
  const fallbackAuthor = String(fallbackDraft.author || "").trim();

  return normalizeDraft({
    id: primaryDraft.id || fallbackDraft.id || "",
    title: String(primaryDraft.title || "").trim() ? primaryDraft.title : fallbackDraft.title || "",
    image: String(primaryDraft.image || "").trim() ? primaryDraft.image : fallbackDraft.image || "",
    excerpt: String(primaryDraft.excerpt || "").trim()
      ? primaryDraft.excerpt
      : fallbackDraft.excerpt || "",
    content: String(primaryDraft.content || "").trim()
      ? primaryDraft.content
      : fallbackDraft.content || "",
    author:
      primaryAuthor && primaryAuthor !== "Admin"
        ? primaryDraft.author
        : fallbackAuthor || primaryDraft.author || "Admin",
    tags: combineDraftTags(primaryDraft.tags, fallbackDraft.tags),
    publishAt: String(primaryDraft.publishAt || "").trim()
      ? primaryDraft.publishAt
      : fallbackDraft.publishAt || "",
    allowComments:
      typeof primaryDraft.allowComments === "boolean"
        ? primaryDraft.allowComments
        : fallbackDraft.allowComments !== false,
    isFeatured:
      typeof primaryDraft.isFeatured === "boolean"
        ? primaryDraft.isFeatured
        : Boolean(fallbackDraft.isFeatured),
    seoEnabled:
      typeof primaryDraft.seoEnabled === "boolean"
        ? primaryDraft.seoEnabled
        : fallbackDraft.seoEnabled !== false,
    createdAt:
      createdAtValues[0]?.toISOString() ||
      primaryDraft.createdAt ||
      fallbackDraft.createdAt ||
      null,
    updatedAt:
      updatedAtValues[updatedAtValues.length - 1]?.toISOString() ||
      primaryDraft.updatedAt ||
      fallbackDraft.updatedAt ||
      null,
  });
}

function loadLocalBlogDraft() {
  const currentDraft = readLocalDraftByKey(BLOG_DRAFT_STORAGE_KEY, normalizeDraft);
  const legacyDraft = readLocalDraftByKey(LEGACY_BLOG_DRAFT_STORAGE_KEY, normalizeLegacyDraft);

  if (!currentDraft) return legacyDraft;
  if (!legacyDraft) return currentDraft;

  const preferredDraft = pickPreferredDraft(currentDraft, legacyDraft);
  const fallbackDraft = preferredDraft === currentDraft ? legacyDraft : currentDraft;
  return mergeDrafts(preferredDraft, fallbackDraft);
}

function saveLocalBlogDraft(draft) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BLOG_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    window.localStorage.removeItem(LEGACY_BLOG_DRAFT_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

function saveLocalBlogDraftMigrationBackup(payload) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BLOG_DRAFT_MIGRATION_BACKUP_KEY, JSON.stringify(payload));
  } catch {
    // Ignore local backup write failures.
  }
}

function clearLocalBlogDraft({ includeBackup = false } = {}) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(BLOG_DRAFT_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_BLOG_DRAFT_STORAGE_KEY);
    if (includeBackup) {
      window.localStorage.removeItem(BLOG_DRAFT_MIGRATION_BACKUP_KEY);
    }
  } catch {
    // Ignore local clear failures.
  }
}

async function getAuthenticatedAdminUserId() {
  if (!isSupabaseConfigured || !supabase) return "";

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw new Error(error.message || "Unable to verify the signed-in admin account.");
  }

  return String(data?.user?.id || "").trim();
}

function buildDraftPayload(input) {
  const publishAtIso = toPublishAtIso(input.publishAt);
  const allowComments =
    typeof input.allowComments === "boolean" ? input.allowComments : true;
  const isFeatured =
    typeof input.isFeatured === "boolean"
      ? input.isFeatured
      : input.featuredArticle === true;
  const seoEnabled =
    typeof input.seoEnabled === "boolean"
      ? input.seoEnabled
      : input.seoOptimized !== false;

  return {
    title: input.title?.trim() || "",
    image: input.image?.trim() || "",
    excerpt: input.excerpt?.trim() || "",
    content: input.content?.trim() || "",
    author: input.author?.trim() || "Admin",
    tags: Array.isArray(input.tags) ? input.tags : [],
    publish_at: publishAtIso,
    allow_comments: allowComments,
    is_featured: isFeatured,
    seo_enabled: seoEnabled,
    updated_at: new Date().toISOString(),
  };
}

function buildLocalBlogDraftSnapshot(input, existingDraft = null) {
  const payload = buildDraftPayload(input);

  return normalizeDraft({
    id: existingDraft?.id || "local-shared-draft",
    title: payload.title,
    image: payload.image,
    excerpt: payload.excerpt,
    content: payload.content,
    author: payload.author,
    tags: payload.tags,
    publish_at: payload.publish_at,
    allow_comments: payload.allow_comments,
    is_featured: payload.is_featured,
    seo_enabled: payload.seo_enabled,
    created_at: existingDraft?.createdAt || payload.updated_at,
    updated_at: payload.updated_at,
  });
}

function withLocalDraftBackupMessage(message, localSaved) {
  const baseMessage = String(message || "Unable to save the shared draft.").trim();
  if (!localSaved) return baseMessage;
  if (/local|backup/i.test(baseMessage)) return baseMessage;
  return `${baseMessage} A local backup was updated on this device.`;
}

async function upsertSupabaseBlogDraft(ownerUserId, input) {
  const payload = buildDraftPayload(input);

  const { data, error } = await supabase
    .from("blog_drafts")
    .upsert(
      {
        owner_user_id: ownerUserId,
        ...payload,
      },
      {
        onConflict: "owner_user_id",
      }
    )
    .select(BLOG_DRAFT_SELECT_FIELDS)
    .maybeSingle();

  if (!error && data) {
    return normalizeDraft(data);
  }

  if (error && isMissingBlogDraftTableError(error)) {
    throw new Error(
      'Add the "blog_drafts" table in Supabase before using shared drafts.'
    );
  }

  throw new Error(error?.message || "Unable to save the shared draft.");
}

async function migrateLocalDraftToSupabase(ownerUserId, remoteDraft = null) {
  const localDraft = loadLocalBlogDraft();
  if (!localDraft && !remoteDraft) return null;
  if (!localDraft) {
    saveLocalBlogDraft(remoteDraft);
    return remoteDraft;
  }

  const preferredDraft = remoteDraft
    ? pickPreferredDraft(localDraft, remoteDraft)
    : localDraft;
  const fallbackDraft = remoteDraft
    ? preferredDraft === localDraft
      ? remoteDraft
      : localDraft
    : null;
  const mergedDraft = fallbackDraft ? mergeDrafts(preferredDraft, fallbackDraft) : preferredDraft;
  const savedDraft = await upsertSupabaseBlogDraft(ownerUserId, mergedDraft);

  saveLocalBlogDraftMigrationBackup({
    migratedAt: new Date().toISOString(),
    localDraft,
    remoteDraft,
    mergedDraft: savedDraft,
  });
  saveLocalBlogDraft(savedDraft);
  return savedDraft;
}

function normalizeComment(comment) {
  return {
    id: comment.id,
    postId: comment.post_id || comment.postId,
    name: sanitizeCommentText(comment.name, COMMENT_NAME_MAX_LENGTH),
    message: sanitizeCommentText(comment.message, COMMENT_MESSAGE_MAX_LENGTH, {
      preserveNewLines: true,
    }),
    createdAt: comment.created_at || comment.createdAt,
    approved:
      typeof comment.is_approved === "boolean"
        ? comment.is_approved
        : typeof comment.approved === "boolean"
          ? comment.approved
          : true,
  };
}

function loadLocalBlogPosts() {
  if (typeof window === "undefined") return INITIAL_BLOG_POSTS;

  try {
    const saved = window.localStorage.getItem(BLOG_STORAGE_KEY);
    if (!saved) return INITIAL_BLOG_POSTS;

    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((post) => ({
        ...post,
        image: typeof post.image === "string" ? post.image : "",
      }));
    }
  } catch {
    // Ignore invalid local storage payloads.
  }

  return INITIAL_BLOG_POSTS;
}

function saveLocalBlogPosts(posts) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BLOG_STORAGE_KEY, JSON.stringify(posts));
}

const BLOG_POST_SELECT_FIELDS =
  "id,title,image,excerpt,content,author,tags,created_at,subscriber_notified_at,allow_comments,is_featured,seo_enabled";
const BLOG_POST_SELECT_FIELDS_LEGACY =
  "id,title,image,excerpt,content,author,tags,created_at,subscriber_notified_at";
const BLOG_DRAFT_SELECT_FIELDS =
  "id,title,image,excerpt,content,author,tags,publish_at,allow_comments,is_featured,seo_enabled,created_at,updated_at,owner_user_id";

function loadLocalCommentsMap() {
  if (typeof window === "undefined") return {};

  try {
    const saved = window.localStorage.getItem(BLOG_COMMENTS_STORAGE_KEY);
    if (!saved) return {};

    const parsed = JSON.parse(saved);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Ignore invalid local storage payloads.
  }

  return {};
}

function saveLocalCommentsMap(commentsMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BLOG_COMMENTS_STORAGE_KEY, JSON.stringify(commentsMap));
}

function getLocalCommentCountsMap({ approvedOnly = true } = {}) {
  const commentsMap = loadLocalCommentsMap();

  return Object.values(commentsMap).reduce((counts, list) => {
    if (!Array.isArray(list)) return counts;

    list.forEach((comment) => {
      const normalized = normalizeComment(comment);
      if (!normalized.postId) return;
      if (approvedOnly && !normalized.approved) return;

      const current = Number(counts[normalized.postId] || 0);
      counts[normalized.postId] = Number.isFinite(current) ? current + 1 : 1;
    });

    return counts;
  }, {});
}

function loadLocalLoveCountsMap() {
  if (typeof window === "undefined") return {};

  try {
    const saved = window.localStorage.getItem(BLOG_LOVE_REACTIONS_COUNT_KEY);
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch {
    // Ignore invalid local storage payloads.
  }

  return {};
}

function saveLocalLoveCountsMap(countsMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BLOG_LOVE_REACTIONS_COUNT_KEY, JSON.stringify(countsMap));
}

function getLocalLoveCountsSnapshot() {
  const countsMap = loadLocalLoveCountsMap();

  return Object.entries(countsMap).reduce((counts, [postId, value]) => {
    const nextCount = Number(value || 0);
    counts[postId] = Number.isFinite(nextCount) && nextCount > 0 ? nextCount : 0;
    return counts;
  }, {});
}

function loadLocalLovedPostsMap() {
  if (typeof window === "undefined") return {};

  try {
    const saved = window.localStorage.getItem(BLOG_LOVE_REACTED_POSTS_KEY);
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch {
    // Ignore invalid local storage payloads.
  }

  return {};
}

function saveLocalLovedPostsMap(postsMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BLOG_LOVE_REACTED_POSTS_KEY, JSON.stringify(postsMap));
}

function getLoveReactorToken() {
  if (typeof window === "undefined") return "server";

  const existing = window.localStorage.getItem(BLOG_LOVE_REACTOR_TOKEN_KEY);
  if (existing) return existing;

  const nextToken =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(BLOG_LOVE_REACTOR_TOKEN_KEY, nextToken);
  return nextToken;
}

async function hashLoveReactorToken(token) {
  const value = String(token || "").trim();
  if (!value) return "";

  if (typeof crypto !== "undefined" && crypto.subtle && typeof TextEncoder !== "undefined") {
    const input = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", input);
    return Array.from(new Uint8Array(digest))
      .map((part) => part.toString(16).padStart(2, "0"))
      .join("");
  }

  let hashA = 0x811c9dc5;
  let hashB = 0x9e3779b9;
  let hashC = 0x85ebca6b;
  let hashD = 0xc2b2ae35;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    hashA = Math.imul(hashA ^ code, 0x01000193) >>> 0;
    hashB = Math.imul(hashB ^ code, 0x85ebca77) >>> 0;
    hashC = Math.imul(hashC ^ code, 0xc2b2ae3d) >>> 0;
    hashD = Math.imul(hashD ^ code, 0x27d4eb2f) >>> 0;
  }

  return [hashA, hashB, hashC, hashD, hashA ^ hashC, hashB ^ hashD, hashA ^ hashD, hashB ^ hashC]
    .map((part) => (part >>> 0).toString(16).padStart(8, "0"))
    .join("");
}

function emitLoveReactionSignal() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BLOG_LOVE_REACTION_SIGNAL_KEY, String(Date.now()));
}

export function getBlogLoveReactionSignalKey() {
  return BLOG_LOVE_REACTION_SIGNAL_KEY;
}

function getLocalLoveStats(postId) {
  const countsMap = loadLocalLoveCountsMap();
  const lovedPostsMap = loadLocalLovedPostsMap();
  const count = Number(countsMap[postId] || 0);

  return {
    count: Number.isFinite(count) && count > 0 ? count : 0,
    hasReacted: Boolean(lovedPostsMap[postId]),
  };
}

export function sortBlogPosts(posts) {
  return [...posts].sort((a, b) => {
    if (Boolean(a.isFeatured) !== Boolean(b.isFeatured)) {
      return a.isFeatured ? -1 : 1;
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function formatBlogDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Draft";

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatCommentDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export async function fetchBlogPosts() {
  if (!isSupabaseConfigured || !supabase) {
    return sortBlogPosts(loadLocalBlogPosts());
  }

  const { data, error } = await supabase
    .from("blog_posts")
    .select(BLOG_POST_SELECT_FIELDS)
    .order("created_at", { ascending: false });

  if (!error) {
    return Array.isArray(data) ? data.map(normalizePost) : [];
  }

  if (!isMissingBlogPostOptionColumnError(error)) {
    throw new Error(error.message);
  }

  const { data: legacyData, error: legacyError } = await supabase
    .from("blog_posts")
    .select(BLOG_POST_SELECT_FIELDS_LEGACY)
    .order("created_at", { ascending: false });

  if (legacyError) {
    throw new Error(legacyError.message);
  }

  return Array.isArray(legacyData) ? legacyData.map(normalizePost) : [];
}

export async function fetchBlogDraft() {
  const localDraft = loadLocalBlogDraft();

  if (!isSupabaseConfigured || !supabase) {
    return localDraft;
  }

  try {
    const ownerUserId = await getAuthenticatedAdminUserId();
    if (!ownerUserId) return localDraft;

    const { data, error } = await supabase
      .from("blog_drafts")
      .select(BLOG_DRAFT_SELECT_FIELDS)
      .eq("owner_user_id", ownerUserId)
      .maybeSingle();

    if (!error) {
      const remoteDraft = data ? normalizeDraft(data) : null;
      if (!localDraft && !remoteDraft) return null;
      return await migrateLocalDraftToSupabase(ownerUserId, remoteDraft);
    }

    if (isMissingBlogDraftTableError(error)) {
      return localDraft;
    }

    throw new Error(error.message || "Unable to load the shared draft.");
  } catch (error) {
    if (localDraft) {
      return localDraft;
    }

    throw error;
  }
}

export async function fetchPublishedBlogPosts() {
  const posts = await fetchBlogPosts();
  return posts.filter((post) => isPostPublished(post));
}

export async function fetchBlogPostById(postId) {
  if (!postId) return null;

  if (!isSupabaseConfigured || !supabase) {
    return loadLocalBlogPosts().find((post) => String(post.id) === String(postId)) || null;
  }

  const { data, error } = await supabase
    .from("blog_posts")
    .select(BLOG_POST_SELECT_FIELDS)
    .eq("id", postId)
    .maybeSingle();

  if (!error) {
    return data ? normalizePost(data) : null;
  }

  if (!isMissingBlogPostOptionColumnError(error)) {
    throw new Error(error.message);
  }

  const { data: legacyData, error: legacyError } = await supabase
    .from("blog_posts")
    .select(BLOG_POST_SELECT_FIELDS_LEGACY)
    .eq("id", postId)
    .maybeSingle();

  if (legacyError) {
    throw new Error(legacyError.message);
  }

  return legacyData ? normalizePost(legacyData) : null;
}

export async function fetchPublishedBlogPostById(postId) {
  const post = await fetchBlogPostById(postId);
  if (!post || !isPostPublished(post)) return null;
  return post;
}

export async function createBlogPost(input) {
  const publishAtIso = toPublishAtIso(input.publishAt);
  const payload = {
    title: input.title.trim(),
    image: input.image?.trim() || "",
    excerpt: input.excerpt.trim(),
    content: input.content.trim(),
    author: input.author?.trim() || "Admin",
    tags: Array.isArray(input.tags) ? input.tags : [],
    created_at: publishAtIso || new Date().toISOString(),
    allow_comments: input.allowComments !== false,
    is_featured: input.isFeatured === true,
    seo_enabled: input.seoEnabled !== false,
  };

  if (!isSupabaseConfigured || !supabase) {
    const nextPost = {
      id: `post-${Date.now()}`,
      title: payload.title,
      image: payload.image,
      excerpt: payload.excerpt,
      content: payload.content,
      author: payload.author,
      tags: payload.tags,
      createdAt: payload.created_at,
      subscriberNotifiedAt: null,
      allowComments: payload.allow_comments,
      isFeatured: payload.is_featured,
      seoEnabled: payload.seo_enabled,
    };
    const posts = [nextPost, ...loadLocalBlogPosts()];
    saveLocalBlogPosts(posts);
    return nextPost;
  }

  const { data, error } = await supabase
    .from("blog_posts")
    .insert(payload)
    .select(BLOG_POST_SELECT_FIELDS)
    .maybeSingle();

  if (!error && data) {
    return normalizePost(data);
  }

  if (error && !isMissingBlogPostOptionColumnError(error)) {
    throw new Error(error.message);
  }

  const legacyPayload = {
    title: payload.title,
    image: payload.image,
    excerpt: payload.excerpt,
    content: payload.content,
    author: payload.author,
    tags: payload.tags,
    created_at: payload.created_at,
  };

  const { data: legacyData, error: legacyError } = await supabase
    .from("blog_posts")
    .insert(legacyPayload)
    .select(BLOG_POST_SELECT_FIELDS_LEGACY)
    .maybeSingle();

  if (legacyError) {
    throw new Error(legacyError.message);
  }

  if (!legacyData) {
    throw new Error(
      "Post was created but no row was returned. Check RLS/select policy on blog_posts."
    );
  }

  return normalizePost(legacyData);
}

export async function saveBlogDraft(input) {
  const localDraft = buildLocalBlogDraftSnapshot(input, loadLocalBlogDraft());
  const localSaved = saveLocalBlogDraft(localDraft);

  if (!isSupabaseConfigured || !supabase) {
    return localDraft;
  }

  try {
    const ownerUserId = await getAuthenticatedAdminUserId();
    if (!ownerUserId) {
      throw new Error("Sign in again before saving a shared draft.");
    }

    const savedDraft = await upsertSupabaseBlogDraft(ownerUserId, input);
    saveLocalBlogDraft(savedDraft);
    return savedDraft;
  } catch (error) {
    throw new Error(withLocalDraftBackupMessage(error?.message, localSaved));
  }
}

export async function updateBlogPost(postId, input) {
  if (!postId) {
    throw new Error("Missing post id.");
  }

  const publishAtIso = toPublishAtIso(input.publishAt);
  const existingCreatedAt = String(input.createdAt || "").trim();
  const payload = {
    title: input.title.trim(),
    image: input.image?.trim() || "",
    excerpt: input.excerpt.trim(),
    content: input.content.trim(),
    author: input.author?.trim() || "Admin",
    tags: Array.isArray(input.tags) ? input.tags : [],
    created_at: publishAtIso || existingCreatedAt || new Date().toISOString(),
    allow_comments: input.allowComments !== false,
    is_featured: input.isFeatured === true,
    seo_enabled: input.seoEnabled !== false,
  };

  if (!isSupabaseConfigured || !supabase) {
    const posts = loadLocalBlogPosts();
    const index = posts.findIndex((post) => String(post.id) === String(postId));
    if (index < 0) {
      throw new Error("Post not found.");
    }

    const updated = {
      ...posts[index],
      title: payload.title,
      image: payload.image,
      excerpt: payload.excerpt,
      content: payload.content,
      author: payload.author,
      tags: payload.tags,
      createdAt: payload.created_at,
      subscriberNotifiedAt: posts[index]?.subscriberNotifiedAt || null,
      allowComments: payload.allow_comments,
      isFeatured: payload.is_featured,
      seoEnabled: payload.seo_enabled,
    };
    const nextPosts = [...posts];
    nextPosts[index] = updated;
    saveLocalBlogPosts(nextPosts);
    return updated;
  }

  const { data, error } = await supabase
    .from("blog_posts")
    .update(payload)
    .eq("id", postId)
    .select(BLOG_POST_SELECT_FIELDS)
    .maybeSingle();

  if (!error && data) {
    return normalizePost(data);
  }

  if (error && !isMissingBlogPostOptionColumnError(error)) {
    throw new Error(error.message);
  }

  const legacyPayload = {
    title: payload.title,
    image: payload.image,
    excerpt: payload.excerpt,
    content: payload.content,
    author: payload.author,
    tags: payload.tags,
    created_at: payload.created_at,
  };

  const { data: legacyData, error: legacyError } = await supabase
    .from("blog_posts")
    .update(legacyPayload)
    .eq("id", postId)
    .select(BLOG_POST_SELECT_FIELDS_LEGACY)
    .maybeSingle();

  if (legacyError) {
    throw new Error(legacyError.message);
  }

  if (!legacyData) {
    throw new Error(
      "Update returned no row. The post may not exist, or RLS/select policy is blocking return data."
    );
  }

  return normalizePost(legacyData);
}

export async function deleteBlogDraft() {
  clearLocalBlogDraft();

  if (!isSupabaseConfigured || !supabase) {
    return;
  }

  const ownerUserId = await getAuthenticatedAdminUserId();
  if (!ownerUserId) return;

  const { error } = await supabase.from("blog_drafts").delete().eq("owner_user_id", ownerUserId);

  if (!error) {
    return;
  }

  if (isMissingBlogDraftTableError(error)) {
    return;
  }

  throw new Error(error.message || "Unable to clear the shared draft.");
}

export async function deleteBlogPost(postId) {
  if (!postId) return;

  if (!isSupabaseConfigured || !supabase) {
    const posts = loadLocalBlogPosts().filter((post) => String(post.id) !== String(postId));
    saveLocalBlogPosts(posts);
    const commentsMap = loadLocalCommentsMap();
    if (commentsMap[postId]) {
      delete commentsMap[postId];
      saveLocalCommentsMap(commentsMap);
    }
    return;
  }

  const { error } = await supabase.from("blog_posts").delete().eq("id", postId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchCommentsByPostId(postId, options = {}) {
  if (!postId) return [];
  const { includeUnapproved = false } = options;

  if (!isSupabaseConfigured || !supabase) {
    const commentsMap = loadLocalCommentsMap();
    const list = commentsMap[postId];
    const normalizedList = Array.isArray(list) ? list.map(normalizeComment) : [];
    return includeUnapproved ? normalizedList : normalizedList.filter((comment) => comment.approved);
  }

  let query = supabase
    .from("blog_comments")
    .select("id,post_id,name,message,created_at,is_approved")
    .eq("post_id", postId)
    .order("created_at", { ascending: false });

  if (!includeUnapproved) {
    query = query.eq("is_approved", true);
  }

  const { data, error } = await query;

  if (!error) {
    return Array.isArray(data) ? data.map(normalizeComment) : [];
  }

  if (!isMissingApprovedColumnError(error)) {
    throw new Error(error.message);
  }

  const { data: legacyData, error: legacyError } = await supabase
    .from("blog_comments")
    .select("id,post_id,name,message,created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: false });

  if (legacyError) {
    throw new Error(legacyError.message);
  }

  return Array.isArray(legacyData) ? legacyData.map(normalizeComment) : [];
}

export async function createBlogComment(postId, input) {
  if (!postId) {
    throw new Error("Missing post id.");
  }

  const targetPost = await fetchBlogPostById(postId);
  if (targetPost?.allowComments === false) {
    throw new Error("Comments are disabled for this post.");
  }

  enforceCommentRateLimit();
  const payload = prepareCommentPayload(postId, input);

  if (!isSupabaseConfigured || !supabase) {
    const comment = {
      id: `comment-${Date.now()}`,
      postId,
      name: payload.name,
      message: payload.message,
      createdAt: new Date().toISOString(),
      approved: false,
    };
    const commentsMap = loadLocalCommentsMap();
    const current = Array.isArray(commentsMap[postId]) ? commentsMap[postId] : [];
    commentsMap[postId] = [comment, ...current];
    saveLocalCommentsMap(commentsMap);
    markCommentSubmittedNow();
    return comment;
  }

  const { data, error } = await supabase.functions.invoke("submit-blog-comment", {
    body: {
      postId: payload.post_id,
      name: payload.name,
      message: payload.message,
      website: sanitizeCommentText(input?.website, 120),
    },
  });

  if (error) {
    let message = error.message || "Unable to submit the comment.";
    try {
      const responseBody = await error.context?.json();
      message = responseBody?.error || responseBody?.message || message;
    } catch {
      // Use the function error message when the response is not JSON.
    }

    throw new Error(message);
  }

  if (!data?.comment) {
    markCommentSubmittedNow();
    return normalizeComment({
      post_id: payload.post_id,
      name: payload.name,
      message: payload.message,
      is_approved: false,
      created_at: new Date().toISOString(),
    });
  }

  markCommentSubmittedNow();
  return normalizeComment(data.comment);
}

export async function fetchPendingBlogComments() {
  if (!isSupabaseConfigured || !supabase) {
    const commentsMap = loadLocalCommentsMap();
    return Object.values(commentsMap)
      .flatMap((list) => (Array.isArray(list) ? list.map(normalizeComment) : []))
      .filter((comment) => !comment.approved)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const { data, error } = await supabase
    .from("blog_comments")
    .select("id,post_id,name,message,created_at,is_approved")
    .eq("is_approved", false)
    .order("created_at", { ascending: false });

  if (error && !isMissingApprovedColumnError(error)) {
    throw new Error(error.message);
  }

  if (error && isMissingApprovedColumnError(error)) {
    return [];
  }

  return Array.isArray(data) ? data.map(normalizeComment) : [];
}

export async function fetchBlogCommentCounts({ approvedOnly = true } = {}) {
  if (!isSupabaseConfigured || !supabase) {
    return getLocalCommentCountsMap({ approvedOnly });
  }

  let query = supabase.from("blog_comments").select("post_id,is_approved");

  if (approvedOnly) {
    query = query.eq("is_approved", true);
  }

  const { data, error } = await query;

  if (!error) {
    return (Array.isArray(data) ? data : []).reduce((counts, row) => {
      const postId = row.post_id;
      if (!postId) return counts;

      const current = Number(counts[postId] || 0);
      counts[postId] = Number.isFinite(current) ? current + 1 : 1;
      return counts;
    }, {});
  }

  if (!isMissingApprovedColumnError(error)) {
    throw new Error(error.message);
  }

  const { data: legacyData, error: legacyError } = await supabase
    .from("blog_comments")
    .select("post_id");

  if (legacyError) {
    throw new Error(legacyError.message);
  }

  return (Array.isArray(legacyData) ? legacyData : []).reduce((counts, row) => {
    const postId = row.post_id;
    if (!postId) return counts;

    const current = Number(counts[postId] || 0);
    counts[postId] = Number.isFinite(current) ? current + 1 : 1;
    return counts;
  }, {});
}

export async function fetchBlogLoveCounts() {
  if (!isSupabaseConfigured || !supabase) {
    return getLocalLoveCountsSnapshot();
  }

  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc("get_blog_love_reaction_counts");

    if (!rpcError) {
      return (Array.isArray(rpcData) ? rpcData : []).reduce((counts, row) => {
        const postId = row.post_id;
        if (!postId) return counts;

        const nextCount = Number(row.reaction_count || 0);
        counts[postId] = Number.isFinite(nextCount) ? nextCount : 0;
        return counts;
      }, {});
    }

    const { data, error } = await supabase.from("blog_love_reactions").select("post_id");

    if (error || rpcError) {
      return getLocalLoveCountsSnapshot();
    }

    return (Array.isArray(data) ? data : []).reduce((counts, row) => {
      const postId = row.post_id;
      if (!postId) return counts;

      const current = Number(counts[postId] || 0);
      counts[postId] = Number.isFinite(current) ? current + 1 : 1;
      return counts;
    }, {});
  } catch {
    return getLocalLoveCountsSnapshot();
  }
}

export async function approveBlogComment(commentId) {
  if (!commentId) {
    throw new Error("Missing comment id.");
  }

  if (!isSupabaseConfigured || !supabase) {
    const commentsMap = loadLocalCommentsMap();
    let approvedComment = null;

    const nextMap = Object.fromEntries(
      Object.entries(commentsMap).map(([key, list]) => {
        if (!Array.isArray(list)) return [key, list];
        const nextList = list.map((comment) => {
          if (String(comment.id) !== String(commentId)) return comment;
          const normalized = normalizeComment(comment);
          approvedComment = { ...normalized, approved: true };
          return { ...comment, approved: true };
        });
        return [key, nextList];
      })
    );

    saveLocalCommentsMap(nextMap);

    if (!approvedComment) {
      throw new Error("Comment not found.");
    }

    return approvedComment;
  }

  const { data, error } = await supabase
    .from("blog_comments")
    .update({ is_approved: true })
    .eq("id", commentId)
    .select("id,post_id,name,message,created_at,is_approved")
    .maybeSingle();

  if (error && !isMissingApprovedColumnError(error)) {
    throw new Error(error.message);
  }

  if (error && isMissingApprovedColumnError(error)) {
    throw new Error(
      "Comment approval is unavailable because blog_comments.is_approved is missing. Add that column in Supabase."
    );
  }

  if (data) {
    return normalizeComment(data);
  }

  // Some RLS/select configurations allow update but block returning rows.
  // Treat this as success for admin moderation flow.
  const { error: updateOnlyError } = await supabase
    .from("blog_comments")
    .update({ is_approved: true })
    .eq("id", commentId);

  if (updateOnlyError) {
    throw new Error(updateOnlyError.message);
  }

  return {
    id: commentId,
    postId: null,
    name: "",
    message: "",
    createdAt: new Date().toISOString(),
    approved: true,
  };
}

export async function declineBlogComment(commentId) {
  if (!commentId) {
    throw new Error("Missing comment id.");
  }

  if (!isSupabaseConfigured || !supabase) {
    const commentsMap = loadLocalCommentsMap();
    let found = false;

    const nextMap = Object.fromEntries(
      Object.entries(commentsMap).map(([key, list]) => {
        if (!Array.isArray(list)) return [key, list];
        const nextList = list.filter((comment) => {
          const keep = String(comment.id) !== String(commentId);
          if (!keep) found = true;
          return keep;
        });
        return [key, nextList];
      })
    );

    if (!found) {
      throw new Error("Comment not found.");
    }

    saveLocalCommentsMap(nextMap);
    return;
  }

  const { error } = await supabase.from("blog_comments").delete().eq("id", commentId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchBlogLoveStats(postId) {
  if (!postId) {
    return { count: 0, hasReacted: false };
  }

  if (!isSupabaseConfigured || !supabase) {
    return getLocalLoveStats(postId);
  }

  try {
    const reactorToken = getLoveReactorToken();
    const reactorTokenHash = await hashLoveReactorToken(reactorToken);
    const { data: rpcData, error: rpcError } = await supabase.rpc("get_blog_love_reaction_stats", {
      target_post_id: postId,
      target_reactor_hash: reactorTokenHash,
    });

    if (!rpcError) {
      const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      return {
        count: Number.isFinite(Number(row?.reaction_count)) ? Number(row.reaction_count) : 0,
        hasReacted: Boolean(row?.has_reacted),
      };
    }

    const [{ count, error: countError }, { data: reactedData, error: reactedError }] =
      await Promise.all([
        supabase
          .from("blog_love_reactions")
          .select("id", { count: "exact", head: true })
          .eq("post_id", postId),
        supabase
          .from("blog_love_reactions")
          .select("id")
          .eq("post_id", postId)
          .eq("reactor_token", reactorToken)
          .limit(1),
      ]);

    if (countError || reactedError || rpcError) {
      return getLocalLoveStats(postId);
    }

    return {
      count: Number.isFinite(Number(count)) ? Number(count) : 0,
      hasReacted: Array.isArray(reactedData) && reactedData.length > 0,
    };
  } catch {
    return getLocalLoveStats(postId);
  }
}

export async function addBlogLoveReaction(postId) {
  if (!postId) {
    throw new Error("Missing post id.");
  }

  if (!isSupabaseConfigured || !supabase) {
    const countsMap = loadLocalLoveCountsMap();
    const lovedPostsMap = loadLocalLovedPostsMap();
    if (!lovedPostsMap[postId]) {
      const current = Number(countsMap[postId] || 0);
      countsMap[postId] = Number.isFinite(current) && current > 0 ? current + 1 : 1;
      lovedPostsMap[postId] = true;
      saveLocalLoveCountsMap(countsMap);
      saveLocalLovedPostsMap(lovedPostsMap);
      emitLoveReactionSignal();
    }
    return getLocalLoveStats(postId);
  }

  try {
    const reactorToken = getLoveReactorToken();
    const reactorTokenHash = await hashLoveReactorToken(reactorToken);
    const { error: rpcError } = await supabase.rpc("add_blog_love_reaction", {
      target_post_id: postId,
      target_reactor_hash: reactorTokenHash,
    });

    if (!rpcError) {
      emitLoveReactionSignal();
      return fetchBlogLoveStats(postId);
    }

    const { data: existing, error: existingError } = await supabase
      .from("blog_love_reactions")
      .select("id")
      .eq("post_id", postId)
      .eq("reactor_token", reactorToken)
      .limit(1);

    if (existingError || rpcError) {
      throw existingError || rpcError;
    }

    if (!Array.isArray(existing) || existing.length === 0) {
      const { error: insertError } = await supabase.from("blog_love_reactions").insert({
        post_id: postId,
        reactor_token: reactorToken,
      });

      if (insertError) {
        throw insertError;
      }
    }

    emitLoveReactionSignal();
    return fetchBlogLoveStats(postId);
  } catch {
    const countsMap = loadLocalLoveCountsMap();
    const lovedPostsMap = loadLocalLovedPostsMap();
    if (!lovedPostsMap[postId]) {
      const current = Number(countsMap[postId] || 0);
      countsMap[postId] = Number.isFinite(current) && current > 0 ? current + 1 : 1;
      lovedPostsMap[postId] = true;
      saveLocalLoveCountsMap(countsMap);
      saveLocalLovedPostsMap(lovedPostsMap);
      emitLoveReactionSignal();
    }
    return getLocalLoveStats(postId);
  }
}

export async function removeBlogLoveReaction(postId) {
  if (!postId) {
    throw new Error("Missing post id.");
  }

  if (!isSupabaseConfigured || !supabase) {
    const countsMap = loadLocalLoveCountsMap();
    const lovedPostsMap = loadLocalLovedPostsMap();
    if (lovedPostsMap[postId]) {
      const current = Number(countsMap[postId] || 0);
      countsMap[postId] = Math.max(0, Number.isFinite(current) ? current - 1 : 0);
      delete lovedPostsMap[postId];
      saveLocalLoveCountsMap(countsMap);
      saveLocalLovedPostsMap(lovedPostsMap);
      emitLoveReactionSignal();
    }
    return getLocalLoveStats(postId);
  }

  try {
    const reactorToken = getLoveReactorToken();
    const reactorTokenHash = await hashLoveReactorToken(reactorToken);
    const { error: rpcError } = await supabase.rpc("remove_blog_love_reaction", {
      target_post_id: postId,
      target_reactor_hash: reactorTokenHash,
    });

    if (!rpcError) {
      emitLoveReactionSignal();
      return fetchBlogLoveStats(postId);
    }

    const { error } = await supabase
      .from("blog_love_reactions")
      .delete()
      .eq("post_id", postId)
      .eq("reactor_token", reactorToken);

    if (error || rpcError) {
      throw error || rpcError;
    }

    emitLoveReactionSignal();
    return fetchBlogLoveStats(postId);
  } catch {
    const countsMap = loadLocalLoveCountsMap();
    const lovedPostsMap = loadLocalLovedPostsMap();
    if (lovedPostsMap[postId]) {
      const current = Number(countsMap[postId] || 0);
      countsMap[postId] = Math.max(0, Number.isFinite(current) ? current - 1 : 0);
      delete lovedPostsMap[postId];
      saveLocalLoveCountsMap(countsMap);
      saveLocalLovedPostsMap(lovedPostsMap);
      emitLoveReactionSignal();
    }
    return getLocalLoveStats(postId);
  }
}

export function isUsingSupabase() {
  return isSupabaseConfigured;
}

export async function uploadBlogImage(file) {
  if (!file) {
    throw new Error("No image file selected.");
  }

  if (!isSupabaseConfigured || !supabase) {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Unable to read image file locally."));
      reader.readAsDataURL(file);
    });
  }

  const cleanedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const filePath = `posts/${Date.now()}-${cleanedName}`;

  const { error: uploadError } = await supabase.storage
    .from(BLOG_IMAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(
      `Image upload failed: ${uploadError.message}. Confirm storage bucket "${BLOG_IMAGE_BUCKET}" exists with write policy.`
    );
  }

  const { data } = supabase.storage.from(BLOG_IMAGE_BUCKET).getPublicUrl(filePath);
  if (!data?.publicUrl) {
    throw new Error("Uploaded image but failed to generate public URL.");
  }

  return data.publicUrl;
}
