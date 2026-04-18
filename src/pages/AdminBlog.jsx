import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AdminBlogProvider } from "../components/admin/AdminBlogContext.jsx";
import Sidebar from "../components/admin/Sidebar";
import Topbar from "../components/admin/Topbar";
import AnalyticsPage from "./admin/AnalyticsPage";
import CreatePage from "./admin/CreatePage";
import DonationsPage from "./admin/DonationsPage";
import DraftsPage from "./admin/DraftsPage";
import EbookPurchasesPage from "./admin/EbookPurchasesPage";
import OverviewPage from "./admin/OverviewPage";
import SubscribersPage from "./admin/SubscribersPage";
import {
  getAdminSession,
  onAdminAuthStateChange,
  requireAuthorizedAdmin,
  signInAdmin,
  signOutAdmin,
} from "../lib/supabaseClient";
import {
  fetchBlogSubscribers,
  sendBlogPostToSubscribers,
} from "../lib/blogSubscriptions";
import {
  approveBlogComment,
  createBlogPost,
  declineBlogComment,
  deleteBlogPost,
  fetchBlogCommentCounts,
  fetchBlogLoveCounts,
  fetchBlogPosts,
  getBlogLoveReactionSignalKey,
  fetchPendingBlogComments,
  isUsingSupabase,
  updateBlogPost,
  uploadBlogImage,
} from "../lib/blogStore";
import {
  fetchSiteAnalyticsSummary,
  getSiteAnalyticsSignalKey,
} from "../lib/siteAnalytics";
import { hasMeaningfulBlogContent } from "../lib/blogContent";

const DEFAULT_AUTHOR = "TT Daniel-The Revivalist";
const ADMIN_USER_NAME = "TT DANIEL";

function resolveAdminDisplayName() {
  return ADMIN_USER_NAME;
}

function isScheduledPost(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() > Date.now();
}

function FeedbackBanner({ error, notice }) {
  if (!error && !notice) return null;

  const tone = error ? "error" : notice?.tone || "success";
  const message = error || notice?.message || "";

  return (
    <div className={`blog-admin-feedback-banner ${tone}`}>
      <p className="blog-admin-feedback-title">
        {tone === "error" ? "Action Required" : tone === "warning" ? "Attention" : "Saved"}
      </p>
      <p>{message}</p>
    </div>
  );
}

function AdminAuthGate({
  requiresSupabaseAuth,
  isAuthSubmitting,
  authError,
  credentials,
  onCredentialsChange,
  onSubmit,
}) {
  return (
    <div className="blog-admin-auth-shell">
      <form className="blog-admin-auth-card" onSubmit={onSubmit}>
        <p className="blog-admin-auth-label">Protected Access</p>
        <h1>{requiresSupabaseAuth ? "Sign In" : "Local Admin"}</h1>
        <p>
          {requiresSupabaseAuth
            ? "Use your Supabase admin account to manage posts, subscribers, and comment moderation."
            : "Supabase is not configured, so this session can still manage posts locally for development work."}
        </p>

        {requiresSupabaseAuth ? (
          <>
            <label className="blog-admin-auth-field">
              <span>Email</span>
              <input
                type="email"
                value={credentials.email}
                onChange={(event) =>
                  onCredentialsChange((prev) => ({ ...prev, email: event.target.value }))
                }
                placeholder="admin@example.com"
                autoComplete="email"
              />
            </label>

            <label className="blog-admin-auth-field">
              <span>Password</span>
              <input
                type="password"
                value={credentials.password}
                onChange={(event) =>
                  onCredentialsChange((prev) => ({ ...prev, password: event.target.value }))
                }
                placeholder="Enter password"
                autoComplete="current-password"
              />
            </label>
          </>
        ) : null}

        <button
          type="submit"
          className="blog-admin-btn-primary blog-admin-auth-button"
          disabled={isAuthSubmitting}
        >
          {requiresSupabaseAuth
            ? isAuthSubmitting
              ? "Signing In..."
              : "Sign In & Continue"
            : "Unlock Local Admin"}
        </button>

        {authError ? <p className="blog-admin-auth-error">{authError}</p> : null}
      </form>
    </div>
  );
}

export default function AdminBlog() {
  const requiresSupabaseAuth = isUsingSupabase();
  const [isVerified, setIsVerified] = useState(!requiresSupabaseAuth);
  const [isCheckingAuth, setIsCheckingAuth] = useState(requiresSupabaseAuth);
  const [authEmail, setAuthEmail] = useState("");
  const [adminDisplayName, setAdminDisplayName] = useState(ADMIN_USER_NAME);
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackNotice, setFeedbackNotice] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState("");
  const [isSendingPostId, setIsSendingPostId] = useState("");
  const [isApprovingCommentId, setIsApprovingCommentId] = useState("");
  const [isDecliningCommentId, setIsDecliningCommentId] = useState("");
  const [pendingComments, setPendingComments] = useState([]);
  const [isLoadingPendingComments, setIsLoadingPendingComments] = useState(false);
  const [pendingCommentsError, setPendingCommentsError] = useState("");
  const [subscribers, setSubscribers] = useState([]);
  const [isLoadingSubscribers, setIsLoadingSubscribers] = useState(false);
  const [subscribersError, setSubscribersError] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [analyticsSummary, setAnalyticsSummary] = useState(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  const clearFeedback = useCallback(() => {
    setFeedbackError("");
    setFeedbackNotice(null);
  }, []);

  const markPostSubscribersNotified = useCallback((postId, notifiedAt = new Date().toISOString()) => {
    setPosts((currentPosts) =>
      currentPosts.map((post) =>
        String(post.id) === String(postId)
          ? { ...post, subscriberNotifiedAt: notifiedAt }
          : post
      )
    );
  }, []);

  const refreshPosts = useCallback(async () => {
    setIsLoadingPosts(true);
    try {
      const data = await fetchBlogPosts();
      setPosts(data);
      return data;
    } catch (error) {
      setFeedbackError(error.message || "Unable to load posts.");
      return [];
    } finally {
      setIsLoadingPosts(false);
    }
  }, []);

  const refreshSubscribers = useCallback(async () => {
    if (!isVerified || !isUsingSupabase()) {
      setSubscribers([]);
      setSubscribersError("");
      return [];
    }

    setIsLoadingSubscribers(true);
    setSubscribersError("");
    try {
      const data = await fetchBlogSubscribers();
      setSubscribers(data.subscribers);
      setSubscribersError("");
      return data.subscribers;
    } catch (error) {
      setSubscribers([]);
      setSubscribersError(error.message || "Unable to load subscribers.");
      return [];
    } finally {
      setIsLoadingSubscribers(false);
    }
  }, [isVerified]);

  const refreshAnalytics = useCallback(
    async (currentPosts = posts) => {
      if (!isVerified) {
        setAnalyticsSummary(null);
        return null;
      }

      setIsLoadingAnalytics(true);

      try {
        const [loveCounts, commentCounts] = await Promise.all([
          fetchBlogLoveCounts(),
          fetchBlogCommentCounts({ approvedOnly: true }),
        ]);

        const summary = await fetchSiteAnalyticsSummary({
          posts: Array.isArray(currentPosts) ? currentPosts : [],
          loveCounts,
          commentCounts,
        });

        setAnalyticsSummary(summary);
        return summary;
      } catch {
        const fallback = await fetchSiteAnalyticsSummary({
          posts: Array.isArray(currentPosts) ? currentPosts : [],
          loveCounts: {},
          commentCounts: {},
        });
        setAnalyticsSummary(fallback);
        return fallback;
      } finally {
        setIsLoadingAnalytics(false);
      }
    },
    [isVerified, posts]
  );

  const refreshPendingComments = useCallback(async () => {
    if (!isVerified) {
      setPendingComments([]);
      setPendingCommentsError("");
      return [];
    }

    setIsLoadingPendingComments(true);
    setPendingCommentsError("");
    try {
      const data = await fetchPendingBlogComments();
      setPendingComments(data);
      setPendingCommentsError("");
      return data;
    } catch (error) {
      setPendingComments([]);
      setPendingCommentsError(error.message || "Unable to load pending comments.");
      return [];
    } finally {
      setIsLoadingPendingComments(false);
    }
  }, [isVerified]);

  useEffect(() => {
    if (!requiresSupabaseAuth) return;

    let isMounted = true;

    const checkSession = async () => {
      try {
        const session = await getAdminSession();
        if (!isMounted) return;
        if (!session) {
          setIsVerified(false);
          setAuthEmail("");
          setAdminDisplayName(ADMIN_USER_NAME);
          return;
        }

        const authorizedSession = await requireAuthorizedAdmin(session);
        if (!isMounted) return;
        setIsVerified(Boolean(authorizedSession));
        setAuthEmail(authorizedSession?.user?.email || "");
        setAdminDisplayName(resolveAdminDisplayName(authorizedSession));
      } catch (error) {
        if (!isMounted) return;
        await signOutAdmin().catch(() => {});
        setIsVerified(false);
        setAuthEmail("");
        setAuthError(error.message || "Unable to verify admin session.");
      } finally {
        if (isMounted) {
          setIsCheckingAuth(false);
        }
      }
    };

    checkSession();

    const { data } = onAdminAuthStateChange((session) => {
      if (!session) {
        setIsVerified(false);
        setAuthEmail("");
        setAdminDisplayName(ADMIN_USER_NAME);
        return;
      }

      requireAuthorizedAdmin(session)
        .then((authorizedSession) => {
          setIsVerified(Boolean(authorizedSession));
          setAuthEmail(authorizedSession?.user?.email || "");
          setAdminDisplayName(resolveAdminDisplayName(authorizedSession));
        })
        .catch(async (error) => {
          await signOutAdmin().catch(() => {});
          setIsVerified(false);
          setAuthEmail("");
          setAuthError(error.message || "Unable to verify admin session.");
        });
    });

    return () => {
      isMounted = false;
      data?.subscription?.unsubscribe();
    };
  }, [requiresSupabaseAuth]);

  useEffect(() => {
    refreshPosts();
  }, [refreshPosts]);

  useEffect(() => {
    if (!isVerified) {
      setPendingComments([]);
      setPendingCommentsError("");
      setSubscribers([]);
      setSubscribersError("");
      setAnalyticsSummary(null);
      return;
    }
  }, [isVerified]);

  useEffect(() => {
    if (!isVerified) return;
    refreshAnalytics(posts);
  }, [isVerified, posts, refreshAnalytics]);

  useEffect(() => {
    if (typeof window === "undefined" || !isVerified) return undefined;

    const analyticsSignalKey = getSiteAnalyticsSignalKey();
    const loveSignalKey = getBlogLoveReactionSignalKey();

    const onStorage = (event) => {
      if (event.key !== analyticsSignalKey && event.key !== loveSignalKey) return;
      refreshAnalytics(posts);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshAnalytics(posts);
      }
    };

    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isVerified, posts, refreshAnalytics]);

  const handleVerifyAdmin = async (event) => {
    event.preventDefault();
    setAuthError("");
    clearFeedback();

    if (!requiresSupabaseAuth) {
      setIsVerified(true);
      setIsCheckingAuth(false);
      return;
    }

    if (!credentials.email.trim() || !credentials.password) {
      setAuthError("Email and password are required.");
      return;
    }

    setIsAuthSubmitting(true);

    try {
      const session = await signInAdmin(credentials.email, credentials.password);
      const authorizedSession = await requireAuthorizedAdmin(session);
      setIsVerified(Boolean(authorizedSession));
      setAuthEmail(authorizedSession?.user?.email || credentials.email.trim());
      setAdminDisplayName(resolveAdminDisplayName(authorizedSession, credentials.email.trim()));
      setCredentials({ email: "", password: "" });
    } catch (error) {
      await signOutAdmin().catch(() => {});
      setIsVerified(false);
      setAuthError(error.message || "Login failed.");
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const savePost = useCallback(
    async ({ editingPostId, values, imageFile }) => {
      clearFeedback();

      if (!isVerified) {
        setFeedbackError("Verify admin access before publishing.");
        return null;
      }

      if (
        !values.title.trim() ||
        !values.excerpt.trim() ||
        !hasMeaningfulBlogContent(values.content)
      ) {
        setFeedbackError("Title, excerpt, and content are required.");
        return null;
      }

      setIsPublishing(true);

      try {
        const wasEditing = Boolean(editingPostId);
        let imageToSave = values.image || "";
        if (imageFile) {
          imageToSave = await uploadBlogImage(imageFile);
        }

        const payload = {
          title: values.title,
          image: imageToSave,
          excerpt: values.excerpt,
          content: values.content,
          author: values.author || DEFAULT_AUTHOR,
          tags: Array.isArray(values.tags) ? values.tags.filter(Boolean) : [],
          publishAt: values.publishAt || "",
          allowComments: values.allowComments !== false,
          isFeatured: values.featuredArticle === true,
          seoEnabled: values.seoOptimized !== false,
        };

        let savedPost;
        if (editingPostId) {
          savedPost = await updateBlogPost(editingPostId, payload);
          setPosts((currentPosts) =>
            currentPosts.map((post) =>
              String(post.id) === String(editingPostId) ? savedPost : post
            )
          );
        } else {
          savedPost = await createBlogPost(payload);
          setPosts((currentPosts) => [savedPost, ...currentPosts]);
        }

        const savedLabel = wasEditing ? "Post updated." : "Post published.";
        if (!values.notifySubscribers) {
          setFeedbackNotice({ tone: "success", message: savedLabel });
          return savedPost;
        }

        if (!isUsingSupabase()) {
          setFeedbackNotice({
            tone: "warning",
            message: `${savedLabel} Subscriber email requires Supabase and the broadcast function.`,
          });
          return savedPost;
        }

        if (isScheduledPost(savedPost.createdAt)) {
          setFeedbackNotice({
            tone: "warning",
            message:
              `${savedLabel} Subscriber email was skipped because this post is scheduled for the future.`,
          });
          return savedPost;
        }

        try {
          const result = await sendBlogPostToSubscribers(savedPost.id, {
            force: wasEditing,
          });

          if (result?.reason === "already_notified" && !wasEditing) {
            setFeedbackNotice({
              tone: "warning",
              message: `${savedLabel} Subscribers were not emailed because this post was already sent before.`,
            });
            return savedPost;
          }

          if (Number(result?.sentCount || 0) > 0) {
            const sentCount = Number(result.sentCount);
            markPostSubscribersNotified(savedPost.id);
            setFeedbackNotice({
              tone: "success",
              message: `${savedLabel} Email sent to ${sentCount} subscriber${sentCount === 1 ? "" : "s"}.`,
            });
            return savedPost;
          }

          setFeedbackNotice({
            tone: "success",
            message: `${savedLabel} There are no active subscribers yet.`,
          });
          return savedPost;
        } catch (broadcastError) {
          setFeedbackNotice({
            tone: "warning",
            message: `${savedLabel} Subscriber email failed: ${broadcastError.message || "Unknown error."}`,
          });
          return savedPost;
        }
      } catch (error) {
        setFeedbackError(error.message || "Unable to publish post.");
        return null;
      } finally {
        setIsPublishing(false);
      }
    },
    [clearFeedback, isVerified, markPostSubscribersNotified]
  );

  const handleDeletePost = useCallback(
    async (postId) => {
      clearFeedback();
      setIsDeletingId(String(postId));

      try {
        await deleteBlogPost(postId);
        setPosts((currentPosts) =>
          currentPosts.filter((post) => String(post.id) !== String(postId))
        );
        setFeedbackNotice({ tone: "success", message: "Post deleted." });
      } catch (error) {
        setFeedbackError(error.message || "Unable to delete post.");
      } finally {
        setIsDeletingId("");
      }
    },
    [clearFeedback]
  );

  const handleSendPost = useCallback(
    async (post) => {
      clearFeedback();

      if (!isVerified) {
        setFeedbackError("Verify admin access before sending subscriber email.");
        return;
      }

      if (!isUsingSupabase()) {
        setFeedbackNotice({
          tone: "warning",
          message: "Subscriber email requires Supabase and the broadcast function.",
        });
        return;
      }

      if (isScheduledPost(post.createdAt)) {
        setFeedbackNotice({
          tone: "warning",
          message: "Scheduled posts cannot be emailed until their publish date is reached.",
        });
        return;
      }

      const force = Boolean(post.subscriberNotifiedAt);
      setIsSendingPostId(String(post.id));

      try {
        const result = await sendBlogPostToSubscribers(post.id, { force });

        if (result?.reason === "already_notified" && !force) {
          setFeedbackNotice({
            tone: "warning",
            message: `"${post.title}" was already sent to subscribers earlier.`,
          });
          return;
        }

        if (Number(result?.sentCount || 0) > 0) {
          const sentCount = Number(result.sentCount);
          markPostSubscribersNotified(post.id);
          setFeedbackNotice({
            tone: "success",
            message: `${force ? "Subscriber email resent" : "Subscriber email sent"} for "${post.title}" to ${sentCount} subscriber${sentCount === 1 ? "" : "s"}.`,
          });
          return;
        }

        setFeedbackNotice({
          tone: "success",
          message: `"${post.title}" is ready, but there are no active subscribers yet.`,
        });
      } catch (error) {
        setFeedbackNotice({
          tone: "warning",
          message: `Subscriber email failed for "${post.title}": ${error.message || "Unknown error."}`,
        });
      } finally {
        setIsSendingPostId("");
      }
    },
    [clearFeedback, isVerified, markPostSubscribersNotified]
  );

  const handleApproveComment = useCallback(
    async (commentId) => {
      clearFeedback();
      setIsApprovingCommentId(String(commentId));

      try {
        await approveBlogComment(commentId);
        setPendingComments((currentComments) =>
          currentComments.filter((comment) => String(comment.id) !== String(commentId))
        );
        await refreshAnalytics(posts);
        setFeedbackNotice({
          tone: "success",
          message: "Comment approved and removed from the moderation queue.",
        });
      } catch (error) {
        setFeedbackError(error.message || "Unable to approve comment.");
      } finally {
        setIsApprovingCommentId("");
      }
    },
    [clearFeedback, posts, refreshAnalytics]
  );

  const handleDeclineComment = useCallback(
    async (commentId) => {
      clearFeedback();
      setIsDecliningCommentId(String(commentId));

      try {
        await declineBlogComment(commentId);
        setPendingComments((currentComments) =>
          currentComments.filter((comment) => String(comment.id) !== String(commentId))
        );
        await refreshAnalytics(posts);
        setFeedbackNotice({
          tone: "success",
          message: "Comment declined and removed from the moderation queue.",
        });
      } catch (error) {
        setFeedbackError(error.message || "Unable to decline comment.");
      } finally {
        setIsDecliningCommentId("");
      }
    },
    [clearFeedback, posts, refreshAnalytics]
  );

  const handleSignOut = useCallback(async () => {
    clearFeedback();
    setAuthError("");

    if (!requiresSupabaseAuth) {
      setIsVerified(false);
      setSubscribers([]);
      setPendingComments([]);
      setSubscribersError("");
      setPendingCommentsError("");
      setAnalyticsSummary(null);
      return;
    }

    try {
      await signOutAdmin();
      setIsVerified(false);
      setAuthEmail("");
      setAdminDisplayName(ADMIN_USER_NAME);
      setSubscribers([]);
      setPendingComments([]);
      setSubscribersError("");
      setPendingCommentsError("");
      setAnalyticsSummary(null);
    } catch (error) {
      setAuthError(error.message || "Unable to sign out.");
    }
  }, [clearFeedback, requiresSupabaseAuth]);

  const handleCloseSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarOpen((current) => !current);
  }, []);

  const providerValue = useMemo(
    () => ({
      authEmail,
      adminDisplayName,
      posts,
      subscribers,
      pendingComments,
      subscribersError,
      pendingCommentsError,
      analyticsSummary,
      requiresSupabaseAuth,
      isPublishing,
      isLoadingPosts,
      isLoadingSubscribers,
      isLoadingPendingComments,
      isLoadingAnalytics,
      isDeletingId,
      isSendingPostId,
      isApprovingCommentId,
      isDecliningCommentId,
      feedbackError,
      feedbackNotice,
      clearFeedback,
      setFeedbackNotice,
      savePost,
      deletePost: handleDeletePost,
      sendPost: handleSendPost,
      approveComment: handleApproveComment,
      declineComment: handleDeclineComment,
      refreshPosts,
      refreshSubscribers,
      refreshPendingComments,
      refreshAnalytics,
      signOut: handleSignOut,
    }),
    [
      adminDisplayName,
      analyticsSummary,
      authEmail,
      clearFeedback,
      feedbackError,
      feedbackNotice,
      handleApproveComment,
      handleDeletePost,
      handleDeclineComment,
      handleSendPost,
      handleSignOut,
      isApprovingCommentId,
      isDecliningCommentId,
      isDeletingId,
      isLoadingAnalytics,
      isLoadingPendingComments,
      isLoadingPosts,
      isLoadingSubscribers,
      isPublishing,
      isSendingPostId,
      pendingComments,
      pendingCommentsError,
      posts,
      refreshPendingComments,
      refreshAnalytics,
      refreshPosts,
      refreshSubscribers,
      requiresSupabaseAuth,
      subscribersError,
      savePost,
      subscribers,
    ]
  );

  if (isCheckingAuth) {
    return (
      <div className="blog-admin-auth-shell">
        <div className="blog-admin-auth-card blog-admin-auth-card-static">
          Checking admin session...
        </div>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <AdminAuthGate
        requiresSupabaseAuth={requiresSupabaseAuth}
        isAuthSubmitting={isAuthSubmitting}
        authError={authError}
        credentials={credentials}
        onCredentialsChange={setCredentials}
        onSubmit={handleVerifyAdmin}
      />
    );
  }

  return (
    <AdminBlogProvider value={providerValue}>
      <div className="blog-admin-root">
        <Sidebar isOpen={isSidebarOpen} onClose={handleCloseSidebar} />

        <div className="blog-admin-main">
          <Topbar onMenuToggle={handleToggleSidebar} />

          <div className="blog-admin-page-wrapper">
            <FeedbackBanner error={feedbackError} notice={feedbackNotice} />

            <main className="blog-admin-page-content">
              <Routes>
                <Route index element={<OverviewPage />} />
                <Route path="create" element={<CreatePage />} />
                <Route path="drafts" element={<DraftsPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="subscribers" element={<SubscribersPage />} />
                <Route path="ebooks" element={<EbookPurchasesPage />} />
                <Route path="donations" element={<DonationsPage />} />
                <Route path="*" element={<Navigate to="/admin/blog" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      </div>
    </AdminBlogProvider>
  );
}
