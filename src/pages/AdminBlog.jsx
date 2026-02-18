import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Container from "../components/ui/Container";
import {
  getAdminSession,
  onAdminAuthStateChange,
  signInAdmin,
  signOutAdmin,
} from "../lib/supabaseClient";
import {
  createBlogPost,
  deleteBlogPost,
  fetchBlogPosts,
  formatBlogDate,
  isUsingSupabase,
  sortBlogPosts,
  updateBlogPost,
  uploadBlogImage,
} from "../lib/blogStore";

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
  const [editingPostId, setEditingPostId] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
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
                  value={form.content}
                  onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                  className="min-h-[140px] rounded-md border border-black/15 bg-white p-3 text-sm outline-none transition focus:border-[#8f6b32]"
                  placeholder="Full post content"
                />
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
            </div>
          </div>
        )}
      </Container>
    </section>
  );
}
