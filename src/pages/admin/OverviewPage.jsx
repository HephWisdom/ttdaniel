import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ArticleCard from "../../components/admin/ArticleCard";
import StatsGrid from "../../components/admin/StatsGrid";
import useAdminBlog from "../../components/admin/useAdminBlog";
import { formatBlogDate } from "../../lib/blogStore";

export default function OverviewPage() {
  const navigate = useNavigate();
  const { adminDisplayName, posts, analyticsSummary, isLoadingPosts } = useAdminBlog();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsVisible(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  let sourcePosts = [];

  if (analyticsSummary?.topPosts?.length > 0) {
    sourcePosts = analyticsSummary.topPosts;
  } else if (Array.isArray(posts)) {
    sourcePosts = posts;
  }

  const featuredPosts = sourcePosts.slice(0, 4).map((post) => ({
    id: post.id,
    title: post.title || "Untitled Blog Post",
    date: formatBlogDate(post.createdAt),
    excerpt: post.excerpt || "Open the article to view the full post.",
    image: post.image || "",
    author: post.author || "Admin",
    views: post.views || 0,
    likes: post.likes || 0,
    comments: post.comments || 0,
    tag: Array.isArray(post.tags) && post.tags.length > 0 ? post.tags[0] : "",
    onEdit: () => navigate(`/admin/blog/create?edit=${post.id}`),
  }));

  return (
    <section className={`blog-admin-page ${isVisible ? "fade-in" : ""}`}>
      <div className="blog-admin-overview-header">
        <div>
          <h1>{adminDisplayName || "TT DANIEL"}</h1>
          <p>Track recent article performance and audience activity in one place.</p>
        </div>

        <button
          type="button"
          className="blog-admin-btn-create"
          onClick={() => navigate("/admin/blog/create")}
        >
          + Create Article
        </button>
      </div>

      <StatsGrid />

      {analyticsSummary && analyticsSummary.hasTraffic === false ? (
        <p className="blog-admin-empty-state">
          Public visits are not the same as admin dashboard visits. Open the website outside
          `/admin/blog` and browse a few pages to start populating these cards.
        </p>
      ) : null}

      <div className="blog-admin-articles-grid">
        {isLoadingPosts ? (
          <p className="blog-admin-empty-state">Loading your published blog posts...</p>
        ) : featuredPosts.length === 0 ? (
          <p className="blog-admin-empty-state">
            Publish a blog post and reader activity will start showing here.
          </p>
        ) : (
          featuredPosts.map((article) => <ArticleCard key={article.id} {...article} />)
        )}
      </div>
    </section>
  );
}
