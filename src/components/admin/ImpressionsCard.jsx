import useAdminBlog from "./useAdminBlog";

export default function ImpressionsCard() {
  const { analyticsSummary } = useAdminBlog();
  const donut = analyticsSummary?.donut;
  const total = Math.max((donut?.primaryValue || 0) + (donut?.secondaryValue || 0), 1);
  const circumference = 2 * Math.PI * 48;
  const primaryArc = (Number(donut?.primaryValue || 0) / total) * circumference;
  const secondaryArc = circumference - primaryArc;

  return (
    <div className="blog-admin-stat-card blog-admin-impressions-card">
      <div className="blog-admin-stat-card-label">
        <span>Impressions</span>
      </div>

      <div className="blog-admin-donut-wrap">
        <div className="blog-admin-donut-center">
          <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="60" cy="60" r="48" fill="none" stroke="#E2E8F0" strokeWidth="12" />
            <circle
              cx="60"
              cy="60"
              r="48"
              fill="none"
              stroke="#2563EB"
              strokeWidth="12"
              strokeDasharray={`${primaryArc} ${circumference - primaryArc}`}
              strokeDashoffset="75"
              strokeLinecap="round"
            />
            <circle
              cx="60"
              cy="60"
              r="48"
              fill="none"
              stroke="#BFDBFE"
              strokeWidth="12"
              strokeDasharray={`${secondaryArc} ${circumference - secondaryArc}`}
              strokeDashoffset={-primaryArc}
              strokeLinecap="round"
            />
          </svg>

          <div className="blog-admin-donut-label">
            <div className="num">{donut?.centerValue || "0"}</div>
            <div className="sub">{donut?.centerLabel || "Page Views"}</div>
          </div>
        </div>

        <div className="blog-admin-donut-legend">
          <span>
            <span className="blog-admin-legend-dot" style={{ background: "#2563EB" }} />
            {donut?.primaryLabel || "Blog Reads"}
          </span>
          <span>
            <span className="blog-admin-legend-dot" style={{ background: "#BFDBFE" }} />
            {donut?.secondaryLabel || "Other Pages"}
          </span>
        </div>
      </div>
    </div>
  );
}
