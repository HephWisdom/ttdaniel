import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Container from "../components/ui/Container";
import blogFallbackImage from "../assets/ttdaniel1.png";
import {
  fetchPublishedBlogPosts,
  formatBlogDate,
  sortBlogPosts,
} from "../lib/blogStore";

const getExcerpt = (content = "", limit = 160) => {
  const text = content.replace(/[#*_`>[\]()!-]/g, " ").replace(/\s+/g, " ").trim();
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

export default function BlogAll() {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

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

  return (
    <section className="min-h-screen bg-[#ebebeb] text-[#0d1117]">
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
                    <Link to={`/blog/${post.id}`} className="block overflow-hidden bg-[#ececec]">
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
                      <Link
                        to={`/blog/${post.id}`}
                        className="mt-5 inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.1em] text-[#111827] transition hover:gap-3"
                      >
                        Read Blog Post
                        <span aria-hidden="true">→</span>
                      </Link>
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
