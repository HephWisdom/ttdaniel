import { isSupabaseConfigured, supabase } from "./supabaseClient";

const BLOG_STORAGE_KEY = "ttd_blog_posts_v1";
const BLOG_COMMENTS_STORAGE_KEY = "ttd_blog_comments_v1";
const BLOG_IMAGE_BUCKET = "blog-images";

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
    name: comment.name,
    message: comment.message,
    createdAt: comment.created_at || comment.createdAt,
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

export async function fetchCommentsByPostId(postId) {
  if (!postId) return [];

  if (!isSupabaseConfigured || !supabase) {
    const commentsMap = loadLocalCommentsMap();
    const list = commentsMap[postId];
    return Array.isArray(list) ? list : [];
  }

  const { data, error } = await supabase
    .from("blog_comments")
    .select("id,post_id,name,message,created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return Array.isArray(data) ? data.map(normalizeComment) : [];
}

export async function createBlogComment(postId, input) {
  if (!postId) {
    throw new Error("Missing post id.");
  }

  const payload = {
    post_id: postId,
    name: input.name.trim(),
    message: input.message.trim(),
  };

  if (!isSupabaseConfigured || !supabase) {
    const comment = {
      id: `comment-${Date.now()}`,
      postId,
      name: payload.name,
      message: payload.message,
      createdAt: new Date().toISOString(),
    };
    const commentsMap = loadLocalCommentsMap();
    const current = Array.isArray(commentsMap[postId]) ? commentsMap[postId] : [];
    commentsMap[postId] = [comment, ...current];
    saveLocalCommentsMap(commentsMap);
    return comment;
  }

  const { data, error } = await supabase
    .from("blog_comments")
    .insert(payload)
    .select("id,post_id,name,message,created_at")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(
      "Comment was created but no row was returned. Check RLS/select policy on blog_comments."
    );
  }

  return normalizeComment(data);
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
