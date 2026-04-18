import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import blogFallbackImage from "../../assets/ttdaniel1.png";
import useAdminBlog from "../../components/admin/useAdminBlog";
import { deleteBlogDraft, fetchBlogDraft } from "../../lib/blogStore";

function formatDraftDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Saved recently";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getPlainText(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|blockquote|h1|h2|h3|pre)>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countWords(value) {
  const plainText = getPlainText(value);
  if (!plainText) return 0;
  return plainText.split(/\s+/).filter(Boolean).length;
}

function isScheduled(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() > Date.now();
}

export default function DraftsPage() {
  const navigate = useNavigate();
  const { clearFeedback, setFeedbackNotice } = useAdminBlog();
  const [isVisible, setIsVisible] = useState(false);
  const [draft, setDraft] = useState(null);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const [isDeletingDraft, setIsDeletingDraft] = useState(false);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsVisible(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const loadDraft = useCallback(async () => {
    setIsLoadingDraft(true);

    try {
      const nextDraft = await fetchBlogDraft();
      setDraft(nextDraft);
    } catch (error) {
      setDraft(null);
      setFeedbackNotice({
        tone: "warning",
        message: error.message || "Unable to load the saved draft.",
      });
    } finally {
      setIsLoadingDraft(false);
    }
  }, [setFeedbackNotice]);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  const contentPreview = useMemo(() => {
    const plainText = getPlainText(draft?.content);
    if (!plainText) return "No body content has been saved yet.";
    return plainText.slice(0, 320) + (plainText.length > 320 ? "..." : "");
  }, [draft?.content]);

  const wordCount = useMemo(() => countWords(draft?.content), [draft?.content]);
  const hasScheduledPublish = isScheduled(draft?.publishAt);
  const primaryTag = Array.isArray(draft?.tags) && draft.tags.length > 0 ? draft.tags[0] : "";

  const handleDeleteDraft = async () => {
    clearFeedback();
    setIsDeletingDraft(true);

    try {
      await deleteBlogDraft();
      setDraft(null);
      setFeedbackNotice({
        tone: "success",
        message: "Draft deleted from shared storage and the local device backup.",
      });
    } catch (error) {
      setFeedbackNotice({
        tone: "warning",
        message: error.message || "Unable to delete the draft.",
      });
    } finally {
      setIsDeletingDraft(false);
    }
  };

  return (
    <section className={`blog-admin-page ${isVisible ? "fade-in" : ""}`}>
      <div className="blog-admin-overview-header blog-admin-drafts-header">
        <div>
          <h1>Drafts</h1>
          <p>Review the current saved draft, then reopen it in the editor when you are ready.</p>
        </div>

        <button
          type="button"
          className="blog-admin-btn-create"
          onClick={() => navigate("/admin/blog/create")}
        >
          Open Editor
        </button>
      </div>

      {isLoadingDraft ? (
        <p className="blog-admin-empty-state">Loading the current saved draft...</p>
      ) : !draft ? (
        <div className="blog-admin-panel blog-admin-drafts-empty-panel">
          <div className="blog-admin-panel-head">
            <div>
              <h3>No saved draft yet</h3>
              <p>Save a draft from the editor and it will appear here for quick review.</p>
            </div>
          </div>

          <div className="blog-admin-manage-post-actions">
            <button
              type="button"
              className="blog-admin-btn-primary"
              onClick={() => navigate("/admin/blog/create")}
            >
              Create or Resume Draft
            </button>
          </div>
        </div>
      ) : (
        <div className="blog-admin-drafts-layout">
          <article className="blog-admin-manage-post-card blog-admin-draft-card">
            <div className="blog-admin-manage-post-media blog-admin-draft-media">
              <img
                src={draft.image || blogFallbackImage}
                alt={draft.title || "Untitled draft"}
                className="blog-admin-manage-post-image"
                onError={(event) => {
                  event.currentTarget.src = blogFallbackImage;
                }}
              />
            </div>

            <div className="blog-admin-manage-post-content">
              <div className="blog-admin-manage-post-copy">
                <div className="blog-admin-manage-post-meta">
                  <span>Updated {formatDraftDate(draft.updatedAt || draft.createdAt)}</span>
                  <span className="blog-admin-chip is-warning">Draft</span>
                  <span className="blog-admin-chip is-info">Device Backup Active</span>
                  {hasScheduledPublish ? (
                    <span className="blog-admin-chip is-info">Scheduled</span>
                  ) : null}
                  {draft.isFeatured ? (
                    <span className="blog-admin-chip is-success">Featured</span>
                  ) : null}
                  {draft.allowComments === false ? (
                    <span className="blog-admin-chip is-warning">Comments Off</span>
                  ) : null}
                  {draft.seoEnabled === false ? (
                    <span className="blog-admin-chip">SEO Off</span>
                  ) : null}
                  <span className="blog-admin-chip">{wordCount} words</span>
                </div>

                <h4>{draft.title || "Untitled Draft"}</h4>
                <p>{draft.excerpt || "No excerpt saved yet. Open the editor to add one."}</p>
              </div>

              <div className="blog-admin-manage-post-actions">
                <button
                  type="button"
                  className="blog-admin-btn-primary"
                  onClick={() => navigate("/admin/blog/create")}
                >
                  Continue Editing
                </button>
                <button
                  type="button"
                  className="blog-admin-btn-outline is-danger"
                  onClick={handleDeleteDraft}
                  disabled={isDeletingDraft}
                >
                  {isDeletingDraft ? "Deleting..." : "Delete Draft"}
                </button>
              </div>
            </div>
          </article>

          <div className="blog-admin-panel blog-admin-draft-preview-panel">
            <div className="blog-admin-panel-head">
              <div>
                <h3>Draft Preview</h3>
                <p>Quick snapshot of the saved draft before reopening the editor.</p>
              </div>
              {primaryTag ? <span className="blog-admin-pill-count">{primaryTag}</span> : null}
            </div>

            <div className="blog-admin-draft-preview-copy">
              <div className="blog-admin-draft-preview-grid">
                <div>
                  <span className="blog-admin-draft-preview-label">Author</span>
                  <strong>{draft.author || "Admin"}</strong>
                </div>
                <div>
                  <span className="blog-admin-draft-preview-label">Publish At</span>
                  <strong>
                    {draft.publishAt ? formatDraftDate(draft.publishAt) : "Not scheduled"}
                  </strong>
                </div>
              </div>

              {Array.isArray(draft.tags) && draft.tags.length > 0 ? (
                <div className="blog-admin-draft-tag-list">
                  {draft.tags.map((tag) => (
                    <span key={tag} className="blog-admin-chip">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="blog-admin-draft-preview-section">
                <span className="blog-admin-draft-preview-label">Body Preview</span>
                <p>{contentPreview}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
