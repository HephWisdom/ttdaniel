import useAdminBlog from "./useAdminBlog";

export default function GeneralResultsCard() {
  const { analyticsSummary } = useAdminBlog();
  const labels = analyticsSummary?.generalResults?.labels || [];
  const views = analyticsSummary?.generalResults?.views || [];
  const likes = analyticsSummary?.generalResults?.likes || [];
  const primaryLabel = analyticsSummary?.generalResults?.primaryLabel || "Views";
  const secondaryLabel = analyticsSummary?.generalResults?.secondaryLabel || "Likes";
  const peakLabel = analyticsSummary?.generalResults?.peakLabel || "No visits yet";
  const peakSubLabel = analyticsSummary?.generalResults?.peakSubLabel || "";
  const maxValue = Math.max(...views, ...likes, 1);
  const hasResults = labels.length > 0 && [...views, ...likes].some((value) => Number(value) > 0);

  return (
    <div className="blog-admin-stat-card">
      <div className="blog-admin-stat-card-label">
        <span>General results</span>
        <button type="button" className="blog-admin-dots-button">
          ···
        </button>
      </div>

      {hasResults ? (
        <>
          <div className="blog-admin-bar-chart-wrap">
            <svg
              className="blog-admin-bar-chart-svg"
              viewBox="0 0 340 80"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {labels.map((label, index) => {
                const viewsHeight = ((views[index] || 0) / maxValue) * 60;
                const likesHeight = ((likes[index] || 0) / maxValue) * 60;
                const x = index * 44;

                return (
                  <g key={`${label}-${index}`}>
                    <rect
                      x={x}
                      y={80 - viewsHeight}
                      width="14"
                      height={viewsHeight}
                      rx="3"
                      fill="#2563EB"
                    />
                    <rect
                      x={x + 18}
                      y={80 - likesHeight}
                      width="14"
                      height={likesHeight}
                      rx="3"
                      fill="#BFDBFE"
                    />
                  </g>
                );
              })}
              <rect x="134" y="0" width="80" height="22" rx="5" fill="#1E293B" />
              <text x="174" y="14" fontSize="11" fill="white" textAnchor="middle" fontFamily="DM Sans">
                {peakLabel}
              </text>
              <polygon points="174,22 168,28 180,28" fill="#1E293B" />
            </svg>
          </div>

          <div className="blog-admin-bar-chart-labels">
            {labels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="blog-admin-chart-legend">
            <span>
              <span className="blog-admin-legend-dot" style={{ background: "#2563EB" }} />
              {primaryLabel}
            </span>
            <span>
              <span className="blog-admin-legend-dot" style={{ background: "#BFDBFE" }} />
              {secondaryLabel}
            </span>
            {peakSubLabel ? <span className="blog-admin-chart-highlight">{peakSubLabel}</span> : null}
          </div>
        </>
      ) : (
        <p className="blog-admin-empty-state">
          Public site traffic will appear here once visitors move through the main website sections.
        </p>
      )}
    </div>
  );
}
