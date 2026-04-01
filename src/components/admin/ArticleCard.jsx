import blogFallbackImage from "../../assets/ttdaniel1.png";

function formatCompactNumber(value) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0);
}

function getInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return "A";
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

export default function ArticleCard({
  title,
  date,
  excerpt,
  image,
  author,
  views = 0,
  likes = 0,
  comments = 0,
  tag = "",
}) {
  return (
    <article className="blog-admin-article-card">
      <div className="blog-admin-article-images blog-admin-article-images-live">
        <img
          src={image || blogFallbackImage}
          alt={title}
          className="blog-admin-article-cover"
          onError={(event) => {
            event.currentTarget.src = blogFallbackImage;
          }}
        />
        <div className="blog-admin-img-count-badge">{formatCompactNumber(views)} reads</div>
        {tag ? <div className="blog-admin-article-tag-badge">{tag}</div> : null}
      </div>

      <div className="blog-admin-article-body">
        <div className="blog-admin-article-topline">
          <p className="blog-admin-article-date">{date}</p>
          <span className="blog-admin-article-chip">{formatCompactNumber(likes)} likes</span>
        </div>
        <h3 className="blog-admin-article-title">{title}</h3>
        <p className="blog-admin-article-excerpt">{excerpt}</p>

        <div className="blog-admin-article-footer">
          <div className="blog-admin-article-avatars">
            <span className="blog-admin-article-avatar">{getInitials(author)}</span>
            <span className="blog-admin-article-author">{author || "Admin"}</span>
          </div>

          <div className="blog-admin-article-metrics">
            <span className="blog-admin-article-metric">{formatCompactNumber(comments)} comments</span>
            <span className="blog-admin-article-responses">{formatCompactNumber(views)} views</span>
          </div>
        </div>
      </div>
    </article>
  );
}
