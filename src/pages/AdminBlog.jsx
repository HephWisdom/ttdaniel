import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Container from "../components/ui/Container";
import {
  getAdminSession,
  onAdminAuthStateChange,
  signInAdmin,
  signOutAdmin,
} from "../lib/supabaseClient";
import {
  approveBlogComment,
  createBlogPost,
  declineBlogComment,
  deleteBlogPost,
  fetchBlogPosts,
  fetchPendingBlogComments,
  formatBlogDate,
  formatCommentDate,
  isUsingSupabase,
  sortBlogPosts,
  updateBlogPost,
  uploadBlogImage,
} from "../lib/blogStore";

const BLOG_COMMENT_MODERATION_SIGNAL_KEY = "ttd_blog_comments_moderated_at";

function toDateTimeInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const localMs = date.getTime() - date.getTimezoneOffset() * 60 * 1000;
  return new Date(localMs).toISOString().slice(0, 16);
}

function isScheduledPost(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() > Date.now();
}

function isLikelyRlsErrorMessage(message = "") {
  const value = String(message || "").toLowerCase();
  return (
    value.includes("row-level security") ||
    value.includes("permission denied") ||
    value.includes("not allowed") ||
    value.includes("42501") ||
    value.includes("policy")
  );
}

export default function AdminBlog() {
  const requiresSupabaseAuth = isUsingSupabase();
  const [isVerified, setIsVerified] = useState(!requiresSupabaseAuth);
  const [isCheckingAuth, setIsCheckingAuth] = useState(requiresSupabaseAuth);
  const [authEmail, setAuthEmail] = useState("");
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");
  const [formError, setFormError] = useState("");
  const [posts, setPosts] = useState([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState("");
  const [isApprovingCommentId, setIsApprovingCommentId] = useState("");
  const [isDecliningCommentId, setIsDecliningCommentId] = useState("");
  const [isLoadingPendingComments, setIsLoadingPendingComments] = useState(false);
  const [pendingComments, setPendingComments] = useState([]);
  const [moderationDebug, setModerationDebug] = useState(null);
  const [editingPostId, setEditingPostId] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const contentInputRef = useRef(null);
  const [form, setForm] = useState({
    title: "",
    image: "",
    excerpt: "",
    content: "",
    author: "TT Daniel-The Revivalist",
    tags: "",
    publishAt: "",
  });

  const resetForm = () => {
    setForm({
      title: "",
      image: "",
      excerpt: "",
      content: "",
      author: "TT Daniel-The Revivalist ",
      tags: "",
      publishAt: "",
    });
    setImageFile(null);
    setImagePreview("");
  };

  const sortedPosts = useMemo(() => sortBlogPosts(posts), [posts]);
  const postTitleById = useMemo(
    () =>
      Object.fromEntries(
        posts.map((post) => [String(post.id), post.title || "Untitled Post"])
      ),
    [posts]
  );

  const refreshPendingComments = async () => {
    if (!isVerified) {
      setPendingComments([]);
      return [];
    }

    setIsLoadingPendingComments(true);
    try {
      const data = await fetchPendingBlogComments();
      setPendingComments(data);
      return data;
    } catch (error) {
      setFormError(error.message || "Unable to load pending comments.");
      setModerationDebug({
        status: "error",
        action: "Fetch pending comments",
        message: error.message || "Unknown error",
        rlsLikely: isLikelyRlsErrorMessage(error.message),
        time: new Date().toISOString(),
      });
      return [];
    } finally {
      setIsLoadingPendingComments(false);
    }
  };

  const notifyCommentModeration = () => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(BLOG_COMMENT_MODERATION_SIGNAL_KEY, String(Date.now()));
  };

  useEffect(() => {
    if (!imagePreview || !imagePreview.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  useEffect(() => {
    if (!requiresSupabaseAuth) return;

    let isMounted = true;

    const checkSession = async () => {
      try {
        const session = await getAdminSession();
        if (!isMounted) return;
        setIsVerified(Boolean(session));
        setAuthEmail(session?.user?.email || "");
      } catch (error) {
        if (!isMounted) return;
        setAuthError(error.message || "Unable to verify admin session.");
      } finally {
        if (isMounted) {
          setIsCheckingAuth(false);
        }
      }
    };

    checkSession();

    const { data } = onAdminAuthStateChange((session) => {
      setIsVerified(Boolean(session));
      setAuthEmail(session?.user?.email || "");
    });

    return () => {
      isMounted = false;
      data?.subscription?.unsubscribe();
    };
  }, [requiresSupabaseAuth]);

  useEffect(() => {
    let isMounted = true;

    const loadPosts = async () => {
      setIsLoadingPosts(true);
      try {
        const data = await fetchBlogPosts();
        if (isMounted) {
          setPosts(data);
        }
      } catch (error) {
        if (isMounted) {
          setFormError(error.message || "Unable to load posts.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingPosts(false);
        }
      }
    };

    loadPosts();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isVerified) {
      setPendingComments([]);
      return;
    }

    refreshPendingComments();
  }, [isVerified]);

  const handleVerifyAdmin = async (event) => {
    event.preventDefault();
    setAuthError("");

    if (!requiresSupabaseAuth) {
      setIsVerified(true);
      return;
    }

    if (!credentials.email.trim() || !credentials.password) {
      setAuthError("Email and password are required.");
      return;
    }

    setIsAuthSubmitting(true);

    try {
      const session = await signInAdmin(credentials.email, credentials.password);
      setIsVerified(Boolean(session));
      setAuthEmail(session?.user?.email || credentials.email.trim());
      setCredentials({ email: "", password: "" });
    } catch (error) {
      setAuthError(error.message || "Login failed.");
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handlePublish = async (event) => {
    event.preventDefault();

    if (!isVerified) {
      setFormError("Verify admin access before publishing.");
      return;
    }

    if (!form.title.trim() || !form.excerpt.trim() || !form.content.trim()) {
      setFormError("Title, excerpt, and content are required.");
      return;
    }

    setIsPublishing(true);
    setFormError("");

    try {
      let imageToSave = form.image || "";
      if (imageFile) {
        imageToSave = await uploadBlogImage(imageFile);
      }

      const payload = {
        title: form.title,
        image: imageToSave,
        excerpt: form.excerpt,
        content: form.content,
        author: form.author,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        publishAt: form.publishAt,
      };

      if (editingPostId) {
        const updatedPost = await updateBlogPost(editingPostId, payload);
        setPosts((prev) =>
          prev.map((post) => (String(post.id) === String(editingPostId) ? updatedPost : post))
        );
        setEditingPostId("");
      } else {
        const newPost = await createBlogPost(payload);
        setPosts((prev) => [newPost, ...prev]);
      }

      resetForm();
    } catch (error) {
      setFormError(error.message || "Unable to publish post.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeletePost = async (id) => {
    setIsDeletingId(id);
    setFormError("");

    try {
      await deleteBlogPost(id);
      setPosts((prev) => prev.filter((post) => post.id !== id));
    } catch (error) {
      setFormError(error.message || "Unable to delete post.");
    } finally {
      setIsDeletingId("");
    }
  };

  const handleEditPost = (post) => {
    setEditingPostId(post.id);
    setForm({
      title: post.title || "",
      image: post.image || "",
      excerpt: post.excerpt || "",
      content: post.content || "",
      author: post.author || "Admin",
      tags: Array.isArray(post.tags) ? post.tags.join(", ") : "",
      publishAt: toDateTimeInputValue(post.createdAt),
    });
    setImageFile(null);
    setImagePreview(post.image || "");
    setFormError("");
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  };

  const handleApproveComment = async (commentId) => {
    setIsApprovingCommentId(commentId);
    setFormError("");

    try {
      await approveBlogComment(commentId);
      const nextPending = await refreshPendingComments();
      const stillPending = nextPending.some(
        (comment) => String(comment.id) === String(commentId)
      );
      if (stillPending) {
        setModerationDebug({
          status: "warning",
          action: "Approve comment",
          message:
            "Approve request finished, but the comment is still pending after reload. This is usually an RLS update policy issue.",
          rlsLikely: true,
          time: new Date().toISOString(),
        });
      } else {
        setModerationDebug({
          status: "success",
          action: "Approve comment",
          message: "Comment approved and removed from pending queue.",
          rlsLikely: false,
          time: new Date().toISOString(),
        });
      }
      notifyCommentModeration();
    } catch (error) {
      setFormError(error.message || "Unable to approve comment.");
      setModerationDebug({
        status: "error",
        action: "Approve comment",
        message: error.message || "Unknown error",
        rlsLikely: isLikelyRlsErrorMessage(error.message),
        time: new Date().toISOString(),
      });
    } finally {
      setIsApprovingCommentId("");
    }
  };

  const handleDeclineComment = async (commentId) => {
    setIsDecliningCommentId(commentId);
    setFormError("");

    try {
      await declineBlogComment(commentId);
      const nextPending = await refreshPendingComments();
      const stillPending = nextPending.some(
        (comment) => String(comment.id) === String(commentId)
      );
      if (stillPending) {
        setModerationDebug({
          status: "warning",
          action: "Decline comment",
          message:
            "Decline request finished, but the comment is still pending after reload. This is usually an RLS delete policy issue.",
          rlsLikely: true,
          time: new Date().toISOString(),
        });
      } else {
        setModerationDebug({
          status: "success",
          action: "Decline comment",
          message: "Comment declined and removed from pending queue.",
          rlsLikely: false,
          time: new Date().toISOString(),
        });
      }
      notifyCommentModeration();
    } catch (error) {
      setFormError(error.message || "Unable to decline comment.");
      setModerationDebug({
        status: "error",
        action: "Decline comment",
        message: error.message || "Unknown error",
        rlsLikely: isLikelyRlsErrorMessage(error.message),
        time: new Date().toISOString(),
      });
    } finally {
      setIsDecliningCommentId("");
    }
  };

  const handleLockAdmin = async () => {
    setEditingPostId("");
    resetForm();
    setFormError("");
    setAuthError("");

    if (!requiresSupabaseAuth) {
      setIsVerified(false);
      return;
    }

    try {
      await signOutAdmin();
      setIsVerified(false);
      setAuthEmail("");
    } catch (error) {
      setAuthError(error.message || "Unable to sign out.");
    }
  };

  const updateContentWithSelection = (formatter) => {
    const textarea = contentInputRef.current;
    if (!textarea) return;

    const sourceValue = textarea.value;
    const selectionStart = textarea.selectionStart ?? 0;
    const selectionEnd = textarea.selectionEnd ?? selectionStart;
    const selectedText = sourceValue.slice(selectionStart, selectionEnd);
    const result = formatter(selectedText);
    if (!result) return;

    const nextValue =
      sourceValue.slice(0, selectionStart) + result.text + sourceValue.slice(selectionEnd);
    setForm((prev) => ({ ...prev, content: nextValue }));

    requestAnimationFrame(() => {
      textarea.focus();
      const start = selectionStart + result.selectionStart;
      const end = selectionStart + result.selectionEnd;
      textarea.setSelectionRange(start, end);
    });
  };

  const wrapSelectionWithTag = (tagName) => {
    updateContentWithSelection((selectedText) => {
      const openTag = `<${tagName}>`;
      const closeTag = `</${tagName}>`;
      const innerText = selectedText || "Text";
      const wrapped = `${openTag}${innerText}${closeTag}`;
      return {
        text: wrapped,
        selectionStart: openTag.length,
        selectionEnd: openTag.length + innerText.length,
      };
    });
  };

  const applyHeading = (level) => {
    const tag = level === 2 ? "h2" : "h3";
    wrapSelectionWithTag(tag);
  };

  const applyBulletList = () => {
    updateContentWithSelection((selectedText) => {
      const lines = (selectedText || "List item")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const listItems = lines.map((line) => `  <li>${line}</li>`).join("\n");
      const listText = `<ul>\n${listItems}\n</ul>`;
      return { text: listText, selectionStart: listText.length, selectionEnd: listText.length };
    });
  };

  const applyLink = () => {
    if (typeof window === "undefined") return;

    const urlInput = window.prompt("Enter URL (https://...)");
    if (!urlInput) return;
    const url = urlInput.trim();
    const safeUrl = /^(https?:|mailto:|tel:|\/|#)/i.test(url) ? url : "https://" + url;

    updateContentWithSelection((selectedText) => {
      const label = selectedText || "Link text";
      const linkText = `<a href="${safeUrl}">${label}</a>`;
      return {
        text: linkText,
        selectionStart: 0,
        selectionEnd: linkText.length,
      };
    });
  };

  return (
    <section className="min-h-screen bg-[#f3f3f3] text-[#1c160f]">
      <Container className="py-14 md:py-20">
        <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_30px_72px_-48px_rgba(0,0,0,0.45)] md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7a6242]">
                Admin Console
              </p>
              <h1 className="mt-3 text-3xl font-extrabold uppercase tracking-tight md:text-4xl">
                Blog Management
              </h1>
              <p className="mt-3 text-sm text-black/70">
                Publish, edit, and organize blog posts from one workspace.
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.1em] text-[#7a6242]">
                Storage: {isUsingSupabase() ? "Supabase" : "Local fallback"}
              </p>
              {requiresSupabaseAuth && authEmail ? (
                <p className="mt-1 text-xs uppercase tracking-[0.1em] text-[#7a6242]">
                  Logged in: {authEmail}
                </p>
              ) : null}
            </div>

            <Link
              to="/#blog"
              className="inline-flex h-11 items-center justify-center rounded-md border border-[#2b2116] bg-[#22180f] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#f7e9cc] transition hover:border-[#6d5530] hover:bg-[#f5ead2] hover:text-[#231a11]"
            >
              View Public Blog
            </Link>
          </div>
        </div>

        {isCheckingAuth ? (
          <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-black/10 bg-white p-6 text-sm text-black/70 shadow-[0_30px_72px_-48px_rgba(0,0,0,0.45)]">
            Checking admin session...
          </div>
        ) : !isVerified ? (
          <form
            onSubmit={handleVerifyAdmin}
            className="mx-auto mt-8 max-w-xl rounded-2xl border border-black/10 bg-white p-6 shadow-[0_30px_72px_-48px_rgba(0,0,0,0.45)]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7a6242]">
              Protected Access
            </p>
            {requiresSupabaseAuth ? (
              <>
                <p className="mt-2 text-sm text-black/65">
                  Sign in with your Supabase admin user account to manage posts.
                </p>
                <label className="mt-4 block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.1em] text-black/65">
                    Email
                  </span>
                  <input
                    type="email"
                    value={credentials.email}
                    onChange={(event) =>
                      setCredentials((prev) => ({ ...prev, email: event.target.value }))
                    }
                    className="h-11 w-full rounded-md border border-black/15 bg-white px-3 text-sm text-[#1f140b] outline-none transition focus:border-[#8f6b32]"
                    placeholder="admin@example.com"
                    autoComplete="email"
                  />
                </label>
                <label className="mt-3 block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.1em] text-black/65">
                    Password
                  </span>
                  <input
                    type="password"
                    value={credentials.password}
                    onChange={(event) =>
                      setCredentials((prev) => ({ ...prev, password: event.target.value }))
                    }
                    className="h-11 w-full rounded-md border border-black/15 bg-white px-3 text-sm text-[#1f140b] outline-none transition focus:border-[#8f6b32]"
                    placeholder="Enter password"
                    autoComplete="current-password"
                  />
                </label>
              </>
            ) : (
              <p className="mt-2 text-sm text-black/65">
                Supabase is not configured. Use local admin mode for development.
              </p>
            )}
            <button
              type="submit"
              disabled={isAuthSubmitting}
              className="mt-4 inline-flex h-11 items-center justify-center rounded-md border border-[#2b2116] bg-[#22180f] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#f7e9cc] transition hover:border-[#6d5530] hover:bg-[#f5ead2] hover:text-[#231a11]"
            >
              {requiresSupabaseAuth
                ? isAuthSubmitting
                  ? "Signing In..."
                  : "Sign In & Continue"
                : "Unlock Local Admin"}
            </button>
            {authError ? <p className="mt-3 text-sm text-[#8f1e1c]">{authError}</p> : null}
          </form>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(320px,420px)_1fr]">
            <form
              onSubmit={handlePublish}
              className="h-fit rounded-2xl border border-black/10 bg-white p-5 shadow-[0_28px_64px_-48px_rgba(0,0,0,0.5)] lg:sticky lg:top-24"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7a6242]">
                  {editingPostId ? "Edit Post" : "Create Post"}
                </p>
                {editingPostId ? (
                  <span className="rounded-full border border-[#c5aa79]/55 bg-[#f4ead6] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#604a2c]">
                    Editing
                  </span>
                ) : null}
              </div>

              <div className="mt-4 grid gap-3">
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  className="h-11 rounded-md border border-black/15 bg-white px-3 text-sm outline-none transition focus:border-[#8f6b32]"
                  placeholder="Post title"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const selected = event.target.files?.[0] || null;
                    setImageFile(selected);
                    if (selected) {
                      setImagePreview(URL.createObjectURL(selected));
                    } else {
                      setImagePreview(form.image || "");
                    }
                  }}
                  className="h-11 rounded-md border border-black/15 bg-white px-3 text-sm outline-none transition focus:border-[#8f6b32]"
                />
                {imagePreview || form.image ? (
                  <div className="overflow-hidden rounded-md border border-black/10 bg-[#f4f4f4]">
                    <img
                      src={imagePreview || form.image}
                      alt="Selected blog"
                      className="h-44 w-full object-contain"
                    />
                  </div>
                ) : null}
                <p className="text-xs text-black/65">
                  Upload an image file. {editingPostId ? "If you skip upload, current image is kept." : ""}
                </p>
                <input
                  type="text"
                  value={form.excerpt}
                  onChange={(event) => setForm((prev) => ({ ...prev, excerpt: event.target.value }))}
                  className="h-11 rounded-md border border-black/15 bg-white px-3 text-sm outline-none transition focus:border-[#8f6b32]"
                  placeholder="Short excerpt"
                />
                <textarea
                  ref={contentInputRef}
                  value={form.content}
                  onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                  className="min-h-[140px] rounded-md border border-black/15 bg-white p-3 text-sm outline-none transition focus:border-[#8f6b32]"
                  placeholder="Full post content (supports rich text HTML)"
                />
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  <button
                    type="button"
                    onClick={() => wrapSelectionWithTag("strong")}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-black/15 bg-white px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-black/75 transition hover:bg-black/5"
                  >
                    Bold
                  </button>
                  <button
                    type="button"
                    onClick={() => wrapSelectionWithTag("em")}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-black/15 bg-white px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-black/75 transition hover:bg-black/5"
                  >
                    Italic
                  </button>
                  <button
                    type="button"
                    onClick={() => wrapSelectionWithTag("u")}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-black/15 bg-white px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-black/75 transition hover:bg-black/5"
                  >
                    Underline
                  </button>
                  <button
                    type="button"
                    onClick={() => applyHeading(2)}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-black/15 bg-white px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-black/75 transition hover:bg-black/5"
                  >
                    H2
                  </button>
                  <button
                    type="button"
                    onClick={() => applyHeading(3)}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-black/15 bg-white px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-black/75 transition hover:bg-black/5"
                  >
                    H3
                  </button>
                  <button
                    type="button"
                    onClick={() => wrapSelectionWithTag("blockquote")}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-black/15 bg-white px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-black/75 transition hover:bg-black/5"
                  >
                    Quote
                  </button>
                  <button
                    type="button"
                    onClick={applyBulletList}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-black/15 bg-white px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-black/75 transition hover:bg-black/5"
                  >
                    List
                  </button>
                  <button
                    type="button"
                    onClick={applyLink}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-black/15 bg-white px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-black/75 transition hover:bg-black/5"
                  >
                    Link
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    value={form.author}
                    onChange={(event) => setForm((prev) => ({ ...prev, author: event.target.value }))}
                    className="h-11 rounded-md border border-black/15 bg-white px-3 text-sm outline-none transition focus:border-[#8f6b32]"
                    placeholder="Author"
                  />
                  <input
                    type="text"
                    value={form.tags}
                    onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
                    className="h-11 rounded-md border border-black/15 bg-white px-3 text-sm outline-none transition focus:border-[#8f6b32]"
                    placeholder="Tags (comma separated)"
                  />
                </div>
                <label className="grid gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-black/60">
                    Publish date & time
                  </span>
                  <input
                    type="datetime-local"
                    value={form.publishAt}
                    onChange={(event) => setForm((prev) => ({ ...prev, publishAt: event.target.value }))}
                    className="h-11 rounded-md border border-black/15 bg-white px-3 text-sm outline-none transition focus:border-[#8f6b32]"
                  />
                  <span className="text-[11px] text-black/55">
                    Leave empty to publish immediately.
                  </span>
                </label>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={isPublishing}
                  className="inline-flex h-11 items-center justify-center rounded-md border border-[#2b2116] bg-[#22180f] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#f7e9cc] transition hover:border-[#6d5530] hover:bg-[#f5ead2] hover:text-[#231a11] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPublishing
                    ? editingPostId
                      ? "Saving..."
                      : "Publishing..."
                    : editingPostId
                      ? "Save Changes"
                      : "Publish Post"}
                </button>
                {editingPostId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPostId("");
                      resetForm();
                      setFormError("");
                    }}
                    className="inline-flex h-11 items-center justify-center rounded-md border border-black/15 bg-white px-5 text-xs font-semibold uppercase tracking-[0.12em] text-black/70 transition hover:bg-black/5"
                  >
                    Cancel Edit
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleLockAdmin}
                  className="inline-flex h-11 items-center justify-center rounded-md border border-black/15 bg-white px-5 text-xs font-semibold uppercase tracking-[0.12em] text-black/70 transition hover:bg-black/5"
                >
                  {requiresSupabaseAuth ? "Sign Out" : "Lock Admin"}
                </button>
              </div>
              {formError ? <p className="mt-3 text-sm text-[#8f1e1c]">{formError}</p> : null}
            </form>

            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7a6242]">
                  Existing Posts
                </p>
                {isLoadingPosts ? <p className="text-sm text-black/60">Loading posts...</p> : null}
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {sortedPosts.map((post) => (
                  <article
                    key={post.id}
                    className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_20px_44px_-36px_rgba(0,0,0,0.5)]"
                  >
                    {post.image ? (
                      <img
                        src={post.image}
                        alt={post.title}
                        className="h-36 w-full border-b border-black/10 object-cover"
                      />
                    ) : (
                      <div className="h-36 w-full border-b border-black/10 bg-[#f2f2f2]" />
                    )}
                    <div className="p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7a6242]">
                        {formatBlogDate(post.createdAt)}
                      </p>
                      {isScheduledPost(post.createdAt) ? (
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8f6b32]">
                          Scheduled
                        </p>
                      ) : null}
                      <h2 className="mt-2 text-base font-bold leading-snug text-[#21170d]">
                        {post.title}
                      </h2>
                      <p className="mt-2 line-clamp-2 text-sm text-black/65">{post.excerpt}</p>
                      <p className="mt-3 text-xs uppercase tracking-[0.1em] text-black/50">
                        By {post.author || "Admin"}
                      </p>

                      <div className="mt-4 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditPost(post)}
                          disabled={isDeletingId === post.id}
                          className="inline-flex h-9 items-center justify-center rounded-md border border-[#8f6b32]/45 bg-[#faf4e8] px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5d472a] transition hover:bg-[#f3e5cb] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePost(post.id)}
                          disabled={isDeletingId === post.id}
                          className="inline-flex h-9 items-center justify-center rounded-md border border-[#7a3d30] px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f1e1c] transition hover:bg-[#7a3d30]/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isDeletingId === post.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-8 rounded-2xl border border-black/10 bg-white p-5 shadow-[0_20px_44px_-36px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7a6242]">
                    Pending Comments
                  </p>
                  <span className="rounded-full border border-[#c5aa79]/55 bg-[#f4ead6] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#604a2c]">
                    {pendingComments.length}
                  </span>
                </div>
                {moderationDebug ? (
                  <div
                    className={`mt-3 rounded-lg border p-3 text-xs ${
                      moderationDebug.status === "error"
                        ? "border-[#8f1e1c]/35 bg-[#fff1f0] text-[#7f1d1d]"
                        : moderationDebug.status === "warning"
                          ? "border-[#8a6a3f]/35 bg-[#fff8eb] text-[#6b4f24]"
                          : "border-[#2f5d29]/35 bg-[#f1fff0] text-[#1e4d1a]"
                    }`}
                  >
                    <p className="font-semibold uppercase tracking-[0.08em]">
                      {moderationDebug.action} • {moderationDebug.status}
                    </p>
                    <p className="mt-1">{moderationDebug.message}</p>
                    <p className="mt-1 opacity-80">
                      RLS likely: {moderationDebug.rlsLikely ? "Yes" : "No"} •{" "}
                      {new Date(moderationDebug.time).toLocaleString()}
                    </p>
                  </div>
                ) : null}

                {isLoadingPendingComments ? (
                  <p className="mt-4 text-sm text-black/60">Loading pending comments...</p>
                ) : pendingComments.length === 0 ? (
                  <p className="mt-4 text-sm text-black/60">No comments awaiting approval.</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {pendingComments.map((comment) => (
                      <article
                        key={comment.id}
                        className="rounded-xl border border-black/10 bg-[#f9f7f2] p-4"
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7a6242]">
                          {postTitleById[String(comment.postId)] || "Unknown Post"}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-[#2f2418]">{comment.name}</p>
                          <p className="text-[11px] uppercase tracking-[0.08em] text-[#7a6242]">
                            {formatCommentDate(comment.createdAt)}
                          </p>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-black/75">
                          {comment.message}
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleApproveComment(comment.id)}
                            disabled={
                              isApprovingCommentId === comment.id ||
                              isDecliningCommentId === comment.id
                            }
                            className="inline-flex h-9 items-center justify-center rounded-md border border-[#2b2116] bg-[#22180f] px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#f7e9cc] transition hover:border-[#6d5530] hover:bg-[#f5ead2] hover:text-[#231a11] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isApprovingCommentId === comment.id ? "Approving..." : "Approve"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeclineComment(comment.id)}
                            disabled={
                              isDecliningCommentId === comment.id ||
                              isApprovingCommentId === comment.id
                            }
                            className="inline-flex h-9 items-center justify-center rounded-md border border-[#7a3d30] px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f1e1c] transition hover:bg-[#7a3d30]/10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isDecliningCommentId === comment.id ? "Declining..." : "Decline"}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Container>
    </section>
  );
}
