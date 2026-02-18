import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Container from "../components/ui/Container";
import blogFallbackImage from "../assets/ttdaniel1.png";
import {
  createBlogComment,
  fetchPublishedBlogPostById,
  fetchCommentsByPostId,
  formatBlogDate,
  formatCommentDate,
} from "../lib/blogStore";

function renderArticleBlocks(content = "", postId = "") {
  const lines = content.split("\n");
  const blocks = [];
  let paragraphBuffer = [];
  let listBuffer = [];

  const flushParagraph = () => {
    if (!paragraphBuffer.length) return;
    const text = paragraphBuffer.join(" ").trim();
    if (text) {
      blocks.push({ type: "paragraph", text });
    }
    paragraphBuffer = [];
  };

  const flushList = () => {
    if (!listBuffer.length) return;
    blocks.push({ type: "list", items: [...listBuffer] });
    listBuffer = [];
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      return;
    }

    if (line.startsWith("### ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "h3", text: line.replace(/^###\s+/, "") });
      return;
    }

    if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "h2", text: line.replace(/^##\s+/, "") });
      return;
    }

    if (line.startsWith("> ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "quote", text: line.replace(/^>\s+/, "") });
      return;
    }

    if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      listBuffer.push(line.replace(/^[-*]\s+/, ""));
      return;
    }

    flushList();
    paragraphBuffer.push(line);
  });

  flushParagraph();
  flushList();

  return blocks.map((block, index) => {
    if (block.type === "h2") {
      return (
        <h2 key={`${postId}-h2-${index}`} className="mt-8 font-serif text-[1.65rem] leading-tight text-[#1f160d]">
          {block.text}
        </h2>
      );
    }

    if (block.type === "h3") {
      return (
        <h3 key={`${postId}-h3-${index}`} className="mt-7 font-serif text-[1.35rem] leading-tight text-[#2b1f12]">
          {block.text}
        </h3>
      );
    }

    if (block.type === "quote") {
      return (
        <blockquote
          key={`${postId}-quote-${index}`}
          className="mt-7 border-l-2 border-[#b99a6a] pl-5 font-serif text-[1.08rem] italic leading-8 text-[#4a3824]"
        >
          {block.text}
        </blockquote>
      );
    }

    if (block.type === "list") {
      return (
        <ul key={`${postId}-list-${index}`} className="mt-5 list-disc space-y-2 pl-6 text-[1.04rem] leading-8 text-[#372a1c]">
          {block.items.map((item, itemIndex) => (
            <li key={`${postId}-list-${index}-${itemIndex}`}>{item}</li>
          ))}
        </ul>
      );
    }

    return (
      <p
        key={`${postId}-para-${index}`}
        className="mt-5 text-[1.08rem] leading-[2.05] tracking-[0.002em] text-[#332618]"
      >
        {block.text}
      </p>
    );
  });
}

export default function BlogDetails() {
  const { postId } = useParams();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", message: "" });
  const [commentError, setCommentError] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!postId) return;

      setIsLoading(true);
      setError("");

      try {
        const loadedPost = await fetchPublishedBlogPostById(postId);
        const loadedComments = loadedPost ? await fetchCommentsByPostId(postId) : [];

        if (!isMounted) return;
        setPost(loadedPost);
        setComments(loadedComments);
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || "Unable to load this blog post.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [postId]);

  const handleSubmitComment = async (event) => {
    event.preventDefault();

    if (!postId) return;
    if (!form.name.trim() || !form.message.trim()) {
      setCommentError("Name and comment are required.");
      return;
    }

    setIsSubmittingComment(true);
    setCommentError("");

    try {
      const newComment = await createBlogComment(postId, form);
      setComments((prev) => [newComment, ...prev]);
      setForm({ name: "", message: "" });
    } catch (submitError) {
      setCommentError(submitError.message || "Unable to post comment.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const downloadImage = async (imageUrl, title) => {
    if (!imageUrl) return;

    const safeName = (title || "blog-image")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error("Image request failed.");

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${safeName || "blog-image"}.jpg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(imageUrl, "_blank", "noopener,noreferrer");
    }
  };

  useEffect(() => {
    if (!isImageModalOpen) return;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsImageModalOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [isImageModalOpen]);

  if (isLoading) {
    return (
      <section className="min-h-screen bg-[#f4efe3] text-[#1c160f]">
        <Container className="py-16 md:py-20">
          <p className="text-sm text-[#5f4f3b]">Loading blog post...</p>
        </Container>
      </section>
    );
  }

  if (error) {
    return (
      <section className="min-h-screen bg-[#f4efe3] text-[#1c160f]">
        <Container className="py-16 md:py-20">
          <p className="text-sm text-[#8f1e1c]">{error}</p>
          <Link
            to="/#blog"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-md border border-[#2b2116] bg-[#22180f] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#f7e9cc] transition hover:border-[#6d5530] hover:bg-[#f5ead2] hover:text-[#231a11]"
          >
            Back to Blog
          </Link>
        </Container>
      </section>
    );
  }

  if (!post) {
    return (
      <section className="min-h-screen bg-[#f4efe3] text-[#1c160f]">
        <Container className="py-16 md:py-20">
          <p className="text-sm uppercase tracking-[0.12em] text-[#8a704a]">Blog</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Post not found</h1>
          <Link
            to="/#blog"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-md border border-[#2b2116] bg-[#22180f] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#f7e9cc] transition hover:border-[#6d5530] hover:bg-[#f5ead2] hover:text-[#231a11]"
          >
            Back to Blog
          </Link>
        </Container>
      </section>
    );
  }

  const imageSrc = post.image || blogFallbackImage;

  return (
    <section className="relative overflow-hidden bg-[#f6f1e8] text-[#20170f]">
      <div className="absolute inset-0 bg-[radial-gradient(950px_520px_at_50%_-10%,rgba(145,109,61,0.15),transparent_72%)]" />
      <Container className="relative py-14 md:py-20">
        <div className="mx-auto max-w-6xl">
          <Link
            to="/#blog"
            className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a5a2f] underline decoration-[#7a5a2f]/45 underline-offset-4 transition hover:text-[#2d2112] hover:decoration-[#2d2112]"
          >
            ← Back to Blog
          </Link>

          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
            <article className="rounded-[24px] border border-[#d8c4a1] bg-[#fffdf8] p-5 shadow-[0_30px_70px_-50px_rgba(0,0,0,0.4)] md:p-10">
              <header className="mx-auto max-w-2xl border-b border-[#e4d6bf] pb-8 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a6a3f]">
                  {formatBlogDate(post.createdAt)}
                </p>
                <h1 className="mt-4 font-serif text-3xl leading-tight text-[#1f160d] md:text-[2.7rem]">
                  {post.title}
                </h1>
                <p className="mt-3 text-sm italic text-[#6a5235]">
                  By {post.author || "Admin"}
                </p>
                {post.tags?.length ? (
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                    {post.tags.map((tag) => (
                      <span
                        key={`${post.id}-${tag}`}
                        className="rounded-full border border-[#d8c4a1] bg-[#f7eddb] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#47331d]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </header>

              <div className="mx-auto mt-8 max-w-[68ch] border-l border-[#e7dac5] pl-5 font-serif md:pl-7">
                {renderArticleBlocks(post.content, post.id)}
              </div>
            </article>

            <aside className="lg:sticky lg:top-24">
              <div className="rounded-[18px] border border-[#dbc8ab] bg-[#fff8eb] p-3 shadow-[0_20px_45px_-28px_rgba(0,0,0,0.55)]">
                <button
                  type="button"
                  onClick={() => setIsImageModalOpen(true)}
                  className="block w-full overflow-hidden rounded-[14px] border border-[#e0cfb3] bg-[#f4ead9] text-left transition hover:shadow-[0_14px_30px_-18px_rgba(0,0,0,0.5)]"
                  aria-label="Open image preview"
                >
                  <img
                    src={imageSrc}
                    alt={post.title}
                    onError={(event) => {
                      event.currentTarget.src = blogFallbackImage;
                    }}
                    className="h-[240px] w-full object-cover lg:h-[390px]"
                    loading="lazy"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => downloadImage(imageSrc, post.title)}
                  className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-md border border-[#2b2116] bg-[#2b2116] px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f5e9d2] transition-colors duration-200 hover:bg-[#f5e9d2] hover:text-[#2b2116]"
                >
                  Download Image
                </button>
              </div>
            </aside>
          </div>

          <section className="mt-8 rounded-[24px] border border-[#d8c4a1] bg-[#fffdf8] p-5 shadow-[0_24px_60px_-50px_rgba(0,0,0,0.45)] md:p-8 lg:mr-[352px]">
            <h2 className="font-serif text-3xl text-[#251a10]">Comments</h2>

            <form onSubmit={handleSubmitComment} className="mt-5 grid gap-3">
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="h-11 rounded-md border border-[#cab18a] bg-white px-3 text-sm outline-none transition focus:border-[#8a6a3f]"
                placeholder="Your name"
              />
              <textarea
                value={form.message}
                onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                className="min-h-[120px] rounded-md border border-[#cab18a] bg-white p-3 text-sm outline-none transition focus:border-[#8a6a3f]"
                placeholder="Write your comment"
              />
              <button
                type="submit"
                disabled={isSubmittingComment}
                className="inline-flex h-11 w-fit items-center justify-center rounded-md border border-[#2b2116] bg-[#2b2116] px-5 text-xs font-semibold uppercase tracking-[0.14em] text-[#f5e9d2] transition-colors duration-200 hover:bg-[#f5e9d2] hover:text-[#2b2116] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmittingComment ? "Posting..." : "Post Comment"}
              </button>
              {commentError ? <p className="text-sm text-[#8f1e1c]">{commentError}</p> : null}
            </form>

            <div className="mt-6 space-y-3">
              {comments.length === 0 ? (
                <p className="text-sm text-[#5f4f3b]">No comments yet. Be the first to comment.</p>
              ) : (
                comments.map((comment) => (
                  <article key={comment.id} className="rounded-xl border border-[#ddccb0] bg-[#fcf4e7] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-serif text-[17px] text-[#2f2418]">{comment.name}</p>
                      <p className="text-[11px] uppercase tracking-[0.08em] text-[#7a6242]">
                        {formatCommentDate(comment.createdAt)}
                      </p>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-[#4b3d2d]">{comment.message}</p>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </Container>

      {isImageModalOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setIsImageModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <div
            className="w-full max-w-4xl rounded-2xl border border-white/20 bg-[#111] p-3 md:p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="overflow-hidden rounded-xl">
              <img
                src={imageSrc}
                alt={post.title}
                onError={(event) => {
                  event.currentTarget.src = blogFallbackImage;
                }}
                className="max-h-[70vh] w-full object-contain"
              />
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-md border border-white/45 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-white hover:text-black"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => downloadImage(imageSrc, post.title)}
                className="inline-flex h-10 items-center justify-center rounded-md border border-[#d7bf95] bg-[#f5e9d2] px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#251a10] transition hover:bg-[#251a10] hover:text-[#f5e9d2]"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
