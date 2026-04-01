import useAdminBlog from "./useAdminBlog";

export default function VisitorsCard() {
  const { analyticsSummary } = useAdminBlog();
  const series = analyticsSummary?.dailyPageViews || [];
  const maxCount = Math.max(...series.map((item) => item.count), 1);
  const points = series
    .map((item, index) => {
      const totalPoints = Math.max(series.length - 1, 1);
      const x = (index / totalPoints) * 200;
      const y = 55 - (item.count / maxCount) * 45;
      return `${x},${y}`;
    })
    .join(" ");
  const linePath = points ? `M${points.replaceAll(" ", " L")}` : "M0,55 L200,55";
  const areaPath = `${linePath} L200,70 L0,70 Z`;
  const focusIndex = series.length > 0 ? series.length - 2 : 0;
  const focusPoint = series[focusIndex]
    ? {
        x: (focusIndex / Math.max(series.length - 1, 1)) * 200,
        y: 55 - (series[focusIndex].count / maxCount) * 45,
      }
    : { x: 130, y: 25 };
  const visitorsCard = analyticsSummary?.visitorsCard;

  return (
    <div className="blog-admin-stat-card">
      <div className="blog-admin-stat-card-label">
        <span>Visitors</span>
        <div className="blog-admin-stat-card-meta">
          <strong className="blog-admin-stat-card-value">{visitorsCard?.value || "0"}</strong>
          <button type="button" className="blog-admin-dots-button">
            ···
          </button>
        </div>
      </div>

      <div className="blog-admin-sparkline-wrap">
        <svg viewBox="0 0 200 70" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <linearGradient id="spark-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity=".15" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={linePath}
            stroke="#2563EB"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d={areaPath} fill="url(#spark-gradient)" />
          <circle cx={focusPoint.x} cy={focusPoint.y} r="4.5" fill="#2563EB" />
          <circle cx={focusPoint.x} cy={focusPoint.y} r="7" fill="#2563EB" opacity=".2" />
        </svg>
      </div>

      <div className="blog-admin-stat-foot">
        <span className="blog-admin-dot-blue" />
        <span>{visitorsCard?.footLabel || "Page Views"}</span>
        <strong>{visitorsCard?.footValue || "0"}</strong>
      </div>
    </div>
  );
}
