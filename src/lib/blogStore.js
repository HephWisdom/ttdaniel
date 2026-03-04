import { isSupabaseConfigured, supabase } from "./supabaseClient";

const BLOG_STORAGE_KEY = "ttd_blog_posts_v1";
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

function isMissingLoveReactionsTableError(error) {
  const message = String(error?.message || "").toLowerCase();
  return error?.code === "42P01" || message.includes("blog_love_reactions");
}

function isLoveReactionFallbackError(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    isMissingLoveReactionsTableError(error) ||
    message.includes("row-level security") ||
    message.includes("permission denied") ||
    message.includes("not allowed")
  );
}

function sanitizeCommentText(value, maxLength, { preserveNewLines = false } = {}) {
  if (typeof value !== "string") return "";

  let sanitized = value.normalize("NFKC");
  sanitized = sanitized.replace(/[<>&]/g, "");
  sanitized = sanitized.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
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
    tags: Array.isArray(post.tags) ? post.tags : [],
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

function emitLoveReactionSignal() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BLOG_LOVE_REACTION_SIGNAL_KEY, String(Date.now()));
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
  return [...posts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
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
    .select("id,title,image,excerpt,content,author,tags,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return Array.isArray(data) ? data.map(normalizePost) : [];
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
    .select("id,title,image,excerpt,content,author,tags,created_at")
    .eq("id", postId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? normalizePost(data) : null;
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
    };
    const posts = [nextPost, ...loadLocalBlogPosts()];
    saveLocalBlogPosts(posts);
    return nextPost;
  }

  const { data, error } = await supabase
    .from("blog_posts")
    .insert(payload)
    .select("id,title,image,excerpt,content,author,tags,created_at")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(
      "Post was created but no row was returned. Check RLS/select policy on blog_posts."
    );
  }

  return normalizePost(data);
}

export async function updateBlogPost(postId, input) {
  if (!postId) {
    throw new Error("Missing post id.");
  }

  const publishAtIso = toPublishAtIso(input.publishAt);
  const payload = {
    title: input.title.trim(),
    image: input.image?.trim() || "",
    excerpt: input.excerpt.trim(),
    content: input.content.trim(),
    author: input.author?.trim() || "Admin",
    tags: Array.isArray(input.tags) ? input.tags : [],
    created_at: publishAtIso || new Date().toISOString(),
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
    .select("id,title,image,excerpt,content,author,tags,created_at")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(
      "Update returned no row. The post may not exist, or RLS/select policy is blocking return data."
    );
  }

  return normalizePost(data);
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

  const { data, error } = await supabase
    .from("blog_comments")
    .insert(payload)
    .select("id,post_id,name,message,created_at,is_approved")
    .maybeSingle();

  if (error && !isMissingApprovedColumnError(error)) {
    throw new Error(error.message);
  }

  if (error && isMissingApprovedColumnError(error)) {
    const legacyPayload = {
      post_id: payload.post_id,
      name: payload.name,
      message: payload.message,
    };
    const { data: legacyData, error: legacyError } = await supabase
      .from("blog_comments")
      .insert(legacyPayload)
      .select("id,post_id,name,message,created_at")
      .maybeSingle();

    if (legacyError) {
      throw new Error(legacyError.message);
    }

    if (!legacyData) {
      throw new Error(
        "Comment was created but no row was returned. Check RLS/select policy on blog_comments."
      );
    }

    markCommentSubmittedNow();
    return normalizeComment(legacyData);
  }

  if (!data) {
    throw new Error(
      "Comment was created but no row was returned. Check RLS/select policy on blog_comments."
    );
  }

  markCommentSubmittedNow();
  return normalizeComment(data);
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

  const reactorToken = getLoveReactorToken();

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

  if (countError || reactedError) {
    const mergedError = countError || reactedError;
    if (isLoveReactionFallbackError(mergedError)) {
      return getLocalLoveStats(postId);
    }
    throw new Error(mergedError.message || "Unable to load love reactions.");
  }

  return {
    count: Number.isFinite(Number(count)) ? Number(count) : 0,
    hasReacted: Array.isArray(reactedData) && reactedData.length > 0,
  };
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

  const reactorToken = getLoveReactorToken();
  const { data: existing, error: existingError } = await supabase
    .from("blog_love_reactions")
    .select("id")
    .eq("post_id", postId)
    .eq("reactor_token", reactorToken)
    .limit(1);

  if (existingError) {
    if (isLoveReactionFallbackError(existingError)) {
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
    throw new Error(existingError.message || "Unable to submit love reaction.");
  }

  if (!Array.isArray(existing) || existing.length === 0) {
    const { error: insertError } = await supabase.from("blog_love_reactions").insert({
      post_id: postId,
      reactor_token: reactorToken,
    });

    if (insertError) {
      if (isLoveReactionFallbackError(insertError)) {
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
      throw new Error(insertError.message || "Unable to submit love reaction.");
    }
  }

  emitLoveReactionSignal();
  return fetchBlogLoveStats(postId);
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

  const reactorToken = getLoveReactorToken();
  const { error } = await supabase
    .from("blog_love_reactions")
    .delete()
    .eq("post_id", postId)
    .eq("reactor_token", reactorToken);

  if (error) {
    if (isLoveReactionFallbackError(error)) {
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
    throw new Error(error.message || "Unable to remove love reaction.");
  }

  emitLoveReactionSignal();
  return fetchBlogLoveStats(postId);
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
