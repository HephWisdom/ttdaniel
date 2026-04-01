import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Container from "./ui/Container";
import BlogSubscribeButton from "./BlogSubscribeButton";
import { fetchPublishedBlogPosts, sortBlogPosts } from "../lib/blogStore";
import { toPlainBlogText } from "../lib/blogContent";

const ARTICLE_CARD_STYLES = [
  {
    bg: "bg-[#ffe800]",
    deco: "bg-[#fff799]/75",
    text: "text-[#101010]",
    body: "text-[#2d2d2d]",
    shape: "border-[15px] border-[#fff8a8]/90",
  },
  {
    bg: "bg-[#b9a9f4]",
    deco: "bg-[#d7cbff]/75",
    text: "text-[#101010]",
    body: "text-[#262626]",
    shape: "border-[15px] border-[#cfc2ff]/85",
  },
  {
    bg: "bg-[#54d3d1]",
    deco: "bg-[#86e6e3]/75",
    text: "text-[#101010]",
    body: "text-[#1f3131]",
    shape: "border-[15px] border-[#81e1de]/85",
  },
];

const toExcerpt = (content = "", limit = 135) => {
  const plain = toPlainBlogText(content);
  if (!plain) return "Read this blog post for practical insights and ministry updates.";
  if (plain.length <= limit) return plain;
  return `${plain.slice(0, limit).trimEnd()}...`;
};

const buildPostUrl = (postId) => {
  const path = `/blog/${postId}`;
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
};

export default function BlogPost() {
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
        if (isMounted) {
          setPosts(data);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || "Unable to load blog posts.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPosts();

    return () => {
      isMounted = false;
    };
  }, []);

  const featuredPosts = useMemo(() => sortBlogPosts(posts).slice(0, 3), [posts]);

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
    <section id="blog" className="bg-[#dcdcdc] text-black">
      <Container className="py-14 md:py-20">
        <div className="mx-auto w-full max-w-6xl">
          <h2
            className="text-center text-[48px] font-black uppercase leading-[0.9] tracking-tight text-black sm:text-[64px] md:text-[94px]"
            style={{ fontFamily: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif" }}
          >
            Latest Blogs
          </h2>

          {isLoading ? <p className="mt-8 text-center text-sm text-black/70">Loading blog posts...</p> : null}
          {error ? <p className="mt-8 text-center text-sm text-[#8f1e1c]">{error}</p> : null}

          {!isLoading && !error ? (
            <>
              {featuredPosts.length > 0 ? (
                <div className="mt-10 grid grid-cols-1 overflow-hidden border border-black/10 sm:grid-cols-2 lg:grid-cols-3">
                  {featuredPosts.map((post, index) => {
                    const style = ARTICLE_CARD_STYLES[index % ARTICLE_CARD_STYLES.length];

                    return (
                      <article
                        key={post.id}
                        className={`group relative flex min-h-[360px] flex-col overflow-hidden p-6 sm:min-h-[380px] ${style.bg} ${style.text}`}
                      >
                        <div className={`pointer-events-none absolute -bottom-12 -left-10 h-40 w-40 rotate-[20deg] rounded-full ${style.shape}`} />
                        <div className={`pointer-events-none absolute -right-8 top-8 h-28 w-28 rotate-[30deg] rounded-full ${style.deco}`} />
                        {post.isFeatured ? (
                          <span className="relative z-10 inline-flex w-fit rounded-full border border-black/20 bg-white/65 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#101010] backdrop-blur">
                            Featured
                          </span>
                        ) : null}

                        <h3 className="relative z-10 mt-4 max-w-[14ch] text-[34px] font-black uppercase leading-[0.95] tracking-tight sm:text-[42px]">
                          {post.title}
                        </h3>

                        <p className={`relative z-10 mt-8 max-w-[33ch] text-[16px] italic leading-[1.45] ${style.body}`}>
                          {toExcerpt(post.content)}
                        </p>

                        <div className="relative z-10 mt-auto flex items-center gap-3 pt-7">
                          <Link
                            to={`/blog/${post.id}`}
                            className="inline-flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.06em] text-[#141414] transition-all duration-200 hover:gap-3"
                          >
                            Read More
                            <span aria-hidden="true">→</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleShareLink(post.id, post.title)}
                            className="inline-flex h-8 items-center justify-center rounded-full border border-black/25 px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#141414] transition hover:bg-black hover:text-white"
                          >
                            {sharedPostId === String(post.id) ? "Shared" : "Share Link"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-8 text-center text-sm text-black/70">No blog posts available yet.</p>
              )}

              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/blog"
                  className="inline-flex h-11 items-center justify-center rounded-full bg-[#0e1220] px-7 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition-colors duration-200 hover:bg-white hover:text-[#0f1320]"
                >
                  View All Blog Posts
                </Link>
                <BlogSubscribeButton
                  buttonLabel="Subscribe"
                  helperClassName="basis-full mt-1"
                  helperText="Subscribe for blog updates and receive a confirmation email immediately."
                />
              </div>
            </>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
