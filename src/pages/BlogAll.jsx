import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Container from "../components/ui/Container";
import blogFallbackImage from "../assets/ttdaniel1.png";
import {
  fetchPublishedBlogPosts,
  formatBlogDate,
  sortBlogPosts,
} from "../lib/blogStore";
import { toPlainBlogText } from "../lib/blogContent";

const getExcerpt = (content = "", limit = 160) => {
  const text = toPlainBlogText(content);
  if (!text) return "Read this blog post for ministry updates and practical insights.";
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).trimEnd()}...`;
};

const getTitle = (title = "", limit = 64) => {
  const value = title.trim();
  if (!value) return "Untitled Blog Post";
  if (value.length <= limit) return value;
  return `${value.slice(0, limit).trimEnd()}...`;
};

const buildPostUrl = (postId) => {
  const path = `/blog/${postId}`;
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
};

export default function BlogAll() {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [sharedPostId, setSharedPostId] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadPosts = async () => {
      setIsLoading(true);
      setError("");

      try {
        const data = await fetchPublishedBlogPosts();
        if (isMounted) setPosts(data);
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || "Unable to load blog posts.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadPosts();

    return () => {
      isMounted = false;
    };
  }, []);

  const sortedPosts = useMemo(() => sortBlogPosts(posts), [posts]);

  const handleShareLink = async (postId, postTitle) => {
    const postUrl = buildPostUrl(postId);

    try {
      if (navigator.share) {
        await navigator.share({ title: postTitle || "Blog post", url: postUrl });
        setSharedPostId(String(postId));
        window.setTimeout(() => setSharedPostId(""), 1800);
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(postUrl);
      } else {
        const fallbackInput = document.createElement("input");
        fallbackInput.value = postUrl;
        document.body.appendChild(fallbackInput);
        fallbackInput.select();
        document.execCommand("copy");
        fallbackInput.remove();
      }
      setSharedPostId(String(postId));
      window.setTimeout(() => setSharedPostId(""), 1800);
    } catch {
      window.open(postUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <section
      className="min-h-screen bg-[#ebebeb] text-[#0d1117]"
      data-analytics-section="blog-archive"
    >
      <Container className="py-14 md:py-20">
        <div className="mx-auto w-full max-w-6xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4e5a78]">Blog</p>
          <h1 className="mt-2 text-[38px] font-black uppercase leading-[0.95] tracking-tight sm:text-[52px] md:text-[68px]">
            View All Blog Posts
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-black/70 md:text-base">
            Browse every published blog post and open any post to read the full details.
          </p>

          {isLoading ? <p className="mt-8 text-sm text-black/70">Loading blog posts...</p> : null}
          {error ? <p className="mt-8 text-sm text-[#8f1e1c]">{error}</p> : null}

          {!isLoading && !error ? (
            sortedPosts.length > 0 ? (
              <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {sortedPosts.map((post) => (
                  <article
                    key={post.id}
                    className="overflow-hidden rounded-[16px] border border-black/10 bg-white shadow-[0_20px_40px_-34px_rgba(0,0,0,0.55)]"
                  >
                    <Link to={`/blog/${post.id}`} className="relative block overflow-hidden bg-[#ececec]">
                      {post.isFeatured ? (
                        <span className="absolute left-4 top-4 z-10 inline-flex rounded-full bg-[#0f172a] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white shadow-[0_8px_20px_-12px_rgba(15,23,42,0.8)]">
                          Featured
                        </span>
                      ) : null}
                      <img
                        src={post.image || blogFallbackImage}
                        alt={post.title}
                        onError={(event) => {
                          event.currentTarget.src = blogFallbackImage;
                        }}
                        className="h-[220px] w-full object-cover transition duration-300 hover:scale-[1.03]"
                        loading="lazy"
                      />
                    </Link>

                    <div className="p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5d6783]">
                        {formatBlogDate(post.createdAt)}
                      </p>
                      <h2 className="mt-2 text-[24px] font-black leading-tight text-[#131826]">
                        {getTitle(post.title)}
                      </h2>
                      <p className="mt-3 text-sm leading-relaxed text-black/70">{getExcerpt(post.content)}</p>
                      <div className="mt-5 flex items-center gap-3">
                        <Link
                          to={`/blog/${post.id}`}
                          className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.1em] text-[#111827] transition hover:gap-3"
                        >
                          Read Blog Post
                          <span aria-hidden="true">→</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleShareLink(post.id, post.title)}
                          className="inline-flex h-8 items-center justify-center rounded-full border border-black/20 px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#111827] transition hover:bg-[#111827] hover:text-white"
                        >
                          {sharedPostId === String(post.id) ? "Shared" : "Share Link"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-8 text-sm text-black/70">No blog posts published yet.</p>
            )
          ) : null}
        </div>
      </Container>
    </section>
  );
}
