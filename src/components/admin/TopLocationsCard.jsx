import { useEffect, useState } from "react";
import useAdminBlog from "./useAdminBlog";

export default function TopLocationsCard() {
  const [animateBars, setAnimateBars] = useState(false);
  const { analyticsSummary } = useAdminBlog();
  const topSections = analyticsSummary?.topSections || [];

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setAnimateBars(true);
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <div className="blog-admin-stat-card">
      <div className="blog-admin-stat-card-label">
        <span>Sections Browsed</span>
        <button type="button" className="blog-admin-dots-button">
          ···
        </button>
      </div>

      <div className="blog-admin-location-list">
        {topSections.length === 0 ? (
          <p className="blog-admin-empty-state">
            Public sections will appear here after users browse the site. Admin dashboard visits are excluded.
          </p>
        ) : (
          topSections.map((location) => (
            <div key={location.label} className="blog-admin-location-row">
              <div className="blog-admin-location-top">
                <span>{location.label}</span>
                <span className="pct">{location.percentage}%</span>
              </div>
              <div className="blog-admin-bar-bg">
                <div
                  className="blog-admin-bar-fill"
                  style={{ width: animateBars ? `${location.percentage}%` : "0%" }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
