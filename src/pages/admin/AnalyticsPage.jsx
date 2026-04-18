import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import blogFallbackImage from "../../assets/ttdaniel1.png";
import useAdminBlog from "../../components/admin/useAdminBlog";
import { sortBlogPosts } from "../../lib/blogStore";

function formatPostDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Draft";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function isScheduledPost(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() > Date.now();
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0);
}

function AnalyticsList({ emptyLabel = "Awaiting data.", items = [], valueLabel = "count" }) {
  if (!items.length) {
    return <p className="blog-admin-empty-state">{emptyLabel}</p>;
  }

  return (
    <div className="blog-admin-analytics-detail-list">
      {items.map((item) => (
        <div key={`${item.label}-${item.rawLabel || item.path || item.count}`} className="blog-admin-analytics-detail-row">
          <span>{item.label}</span>
          <strong>
            {formatCompactNumber(item.count)} {valueLabel}
            {typeof item.percentage === "number" ? ` · ${item.percentage}%` : ""}
          </strong>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const {
    posts,
    analyticsSummary,
    pendingComments,
    pendingCommentsError,
    isLoadingAnalytics,
    isLoadingPosts,
    isLoadingPendingComments,
    isDeletingId,
    isSendingPostId,
    isApprovingCommentId,
    isDecliningCommentId,
    deletePost,
    sendPost,
    approveComment,
    declineComment,
    refreshPendingComments,
  } = useAdminBlog();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsVisible(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    refreshPendingComments();
  }, [refreshPendingComments]);

  const sortedPosts = useMemo(() => sortBlogPosts(posts), [posts]);
  const analyticsPostMap = useMemo(
    () =>
      new Map(
        (analyticsSummary?.topPosts || []).map((post) => [String(post.id), post])
      ),
    [analyticsSummary?.topPosts]
  );
  const enrichedPosts = useMemo(
    () =>
      sortedPosts.map((post) => ({
        ...post,
        views: analyticsPostMap.get(String(post.id))?.views || 0,
        likes: analyticsPostMap.get(String(post.id))?.likes || 0,
        comments: analyticsPostMap.get(String(post.id))?.comments || 0,
      })),
    [analyticsPostMap, sortedPosts]
  );
  const trafficSeries = analyticsSummary?.dailyPageViews || [];
  const chartMax = Math.max(...trafficSeries.map((item) => item.count), 1);
  const trafficPoints = trafficSeries
    .map((item, index) => {
      const totalPoints = Math.max(trafficSeries.length - 1, 1);
      const x = (index / totalPoints) * 500;
      const y = 130 - (item.count / chartMax) * 90;
      return `${x},${y}`;
    })
    .join(" ");
  const trafficLine = trafficPoints ? `M${trafficPoints.replaceAll(" ", " L")}` : "M0,130 L500,130";
  const trafficFill = `${trafficLine} L500,160 L0,160 Z`;
  const focusIndex = trafficSeries.reduce(
    (bestIndex, item, index, source) =>
      item.count > (source[bestIndex]?.count || 0) ? index : bestIndex,
    0
  );
  const focusPoint = trafficSeries[focusIndex]
    ? {
        x: (focusIndex / Math.max(trafficSeries.length - 1, 1)) * 500,
        y: 130 - (trafficSeries[focusIndex].count / chartMax) * 90,
      }
    : { x: 310, y: 60 };
  const behaviorCards = analyticsSummary?.behaviorCards || [];
  const topPages = analyticsSummary?.topPages || [];
  const trafficSources = analyticsSummary?.trafficSources || [];
  const referrers = analyticsSummary?.referrers || [];
  const deviceBreakdown = analyticsSummary?.deviceBreakdown || [];
  const browserBreakdown = analyticsSummary?.browserBreakdown || [];
  const osBreakdown = analyticsSummary?.osBreakdown || [];
  const languageBreakdown = analyticsSummary?.languageBreakdown || [];
  const timezoneBreakdown = analyticsSummary?.timezoneBreakdown || [];
  const scrollDepth = analyticsSummary?.scrollDepth || [];
  const engagementTime = analyticsSummary?.engagementTime || [];
  const topClickTargets = analyticsSummary?.topClickTargets || [];
  const topJourneys = analyticsSummary?.sessionInsights?.topJourneys || [];
  const hourlyActivity = analyticsSummary?.hourlyActivity || [];
  const hourlyMax = Math.max(...hourlyActivity.map((item) => item.count), 1);

  return (
    <section className={`blog-admin-page ${isVisible ? "fade-in" : ""}`}>
      <div className="blog-admin-analytics-header">
        <h1>Analytics</h1>
        <p>Track how readers move through the site and respond to each article.</p>
      </div>

      <div className="blog-admin-analytics-cards">
        {(analyticsSummary?.analyticsCards || []).map((stat) => (
          <div key={stat.label} className="blog-admin-analytics-stat">
            <div className="as-label">{stat.label}</div>
            <div className="as-val">{stat.value}</div>
            <div className={`as-change ${stat.tone}`}>{stat.change}</div>
          </div>
        ))}
      </div>

      <div className="blog-admin-analytics-cards">
        {behaviorCards.map((stat) => (
          <div key={stat.label} className="blog-admin-analytics-stat">
            <div className="as-label">{stat.label}</div>
            <div className="as-val">{stat.value}</div>
            <div className={`as-change ${stat.tone}`}>{stat.change}</div>
          </div>
        ))}
      </div>

      <div className="blog-admin-analytics-row">
        <div className="blog-admin-analytics-big-card">
          <h3>Recent Traffic Overview</h3>
          <svg viewBox="0 0 500 160" width="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <linearGradient id="analytics-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563EB" stopOpacity=".18" />
                <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={trafficLine}
              stroke="#2563EB"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={trafficFill}
              fill="url(#analytics-gradient)"
            />
            <circle cx={focusPoint.x} cy={focusPoint.y} r="5" fill="#2563EB" />
          </svg>
          <div className="blog-admin-analytics-months">
            {(trafficSeries.length > 0 ? trafficSeries : []).map((item) => (
              <span key={item.label}>{item.label}</span>
            ))}
          </div>
        </div>

        <div className="blog-admin-analytics-big-card">
          <h3>Top Articles</h3>
          <div className="blog-admin-top-articles">
            {(analyticsSummary?.topPosts || []).slice(0, 4).map((article) => (
              <div key={article.id} className="blog-admin-top-article-row">
                <span>{article.title}</span>
                <span>{formatCompactNumber(article.views)} reads</span>
              </div>
            ))}
            {!isLoadingAnalytics && (analyticsSummary?.topPosts || []).length === 0 ? (
              <p className="blog-admin-empty-state">Top articles will appear once readers open your posts.</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="blog-admin-analytics-detail-grid">
        <div className="blog-admin-analytics-big-card">
          <div className="blog-admin-panel-head">
            <div>
              <h3>Top Pages</h3>
              <p>Pages with the most views and unique visitor sessions.</p>
            </div>
          </div>

          {topPages.length === 0 ? (
            <p className="blog-admin-empty-state">Top pages will appear once visitors browse the site.</p>
          ) : (
            <div className="blog-admin-analytics-table-wrap">
              <table className="blog-admin-analytics-table">
                <thead>
                  <tr>
                    <th>Page</th>
                    <th>Views</th>
                    <th>Visitors</th>
                    <th>Views / visitor</th>
                  </tr>
                </thead>
                <tbody>
                  {topPages.slice(0, 10).map((page) => (
                    <tr key={page.path}>
                      <td>
                        <strong>{page.label}</strong>
                        <span>{page.path}</span>
                      </td>
                      <td>{formatCompactNumber(page.views)}</td>
                      <td>{formatCompactNumber(page.visitors)}</td>
                      <td>{page.viewsPerVisitor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="blog-admin-analytics-big-card">
          <div className="blog-admin-panel-head">
            <div>
              <h3>Traffic Sources</h3>
              <p>Where visitors came from before entering the site.</p>
            </div>
          </div>
          <AnalyticsList items={trafficSources.slice(0, 8)} valueLabel="views" />
        </div>

        <div className="blog-admin-analytics-big-card">
          <div className="blog-admin-panel-head">
            <div>
              <h3>Referrers</h3>
              <p>External domains sending traffic to the website.</p>
            </div>
          </div>
          <AnalyticsList
            emptyLabel="No external referrers recorded yet."
            items={referrers.slice(0, 8)}
            valueLabel="views"
          />
        </div>

        <div className="blog-admin-analytics-big-card">
          <div className="blog-admin-panel-head">
            <div>
              <h3>Devices</h3>
              <p>Breakdown of browsing sessions by device type.</p>
            </div>
          </div>
          <AnalyticsList items={deviceBreakdown.slice(0, 6)} valueLabel="views" />
        </div>

        <div className="blog-admin-analytics-big-card">
          <div className="blog-admin-panel-head">
            <div>
              <h3>Browsers And Systems</h3>
              <p>Browser and operating system signals from anonymous sessions.</p>
            </div>
          </div>
          <div className="blog-admin-analytics-split">
            <AnalyticsList items={browserBreakdown.slice(0, 5)} valueLabel="views" />
            <AnalyticsList items={osBreakdown.slice(0, 5)} valueLabel="views" />
          </div>
        </div>

        <div className="blog-admin-analytics-big-card">
          <div className="blog-admin-panel-head">
            <div>
              <h3>Locale Signals</h3>
              <p>Language and timezone hints from visitor browsers.</p>
            </div>
          </div>
          <div className="blog-admin-analytics-split">
            <AnalyticsList items={languageBreakdown.slice(0, 5)} valueLabel="views" />
            <AnalyticsList items={timezoneBreakdown.slice(0, 5)} valueLabel="views" />
          </div>
        </div>

        <div className="blog-admin-analytics-big-card">
          <div className="blog-admin-panel-head">
            <div>
              <h3>Engagement Depth</h3>
              <p>How far visitors scroll and how long they stay active.</p>
            </div>
          </div>
          <div className="blog-admin-analytics-split">
            <AnalyticsList items={scrollDepth} valueLabel="events" />
            <AnalyticsList items={engagementTime} valueLabel="events" />
          </div>
        </div>

        <div className="blog-admin-analytics-big-card">
          <div className="blog-admin-panel-head">
            <div>
              <h3>Outbound And Contact Clicks</h3>
              <p>External sites, email links, and phone links visitors open.</p>
            </div>
          </div>
          <AnalyticsList
            emptyLabel="No outbound or contact clicks tracked yet."
            items={topClickTargets.slice(0, 8)}
            valueLabel="clicks"
          />
        </div>
      </div>

      <div className="blog-admin-analytics-row">
        <div className="blog-admin-analytics-big-card">
          <div className="blog-admin-panel-head">
            <div>
              <h3>User Journeys</h3>
              <p>Anonymous session paths ranked by activity and time spent.</p>
            </div>
          </div>

          {topJourneys.length === 0 ? (
            <p className="blog-admin-empty-state">Journey paths will appear after visitors browse more than one page or engage with content.</p>
          ) : (
            <div className="blog-admin-journey-list">
              {topJourneys.map((journey) => (
                <article key={journey.token} className="blog-admin-journey-row">
                  <div>
                    <strong>{journey.entryLabel}</strong>
                    <span>to</span>
                    <strong>{journey.exitLabel}</strong>
                  </div>
                  <small>
                    {journey.pageViews} page view{journey.pageViews === 1 ? "" : "s"} ·{" "}
                    {journey.events} events · {journey.durationLabel} ·{" "}
                    {journey.source} · {journey.deviceType}
                  </small>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="blog-admin-analytics-big-card">
          <div className="blog-admin-panel-head">
            <div>
              <h3>Hourly Activity</h3>
              <p>Page views by visitor local browser time.</p>
            </div>
          </div>
          <div className="blog-admin-hourly-list">
            {hourlyActivity.map((item) => (
              <div key={item.hour} className="blog-admin-hourly-row">
                <span>{item.label}</span>
                <div>
                  <i style={{ width: `${Math.max((item.count / hourlyMax) * 100, item.count ? 6 : 0)}%` }} />
                </div>
                <strong>{formatCompactNumber(item.count)}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="blog-admin-ops-grid">
        <div className="blog-admin-analytics-big-card">
          <div className="blog-admin-panel-head">
            <div>
              <h3>Manage Posts</h3>
              <p>Send, resend, edit, or remove published content.</p>
            </div>
          </div>

          {isLoadingPosts ? (
            <p className="blog-admin-empty-state">Loading posts...</p>
          ) : enrichedPosts.length === 0 ? (
            <p className="blog-admin-empty-state">No blog posts have been published yet.</p>
          ) : (
            <div className="blog-admin-manage-posts">
              {enrichedPosts.map((post) => {
                const scheduled = isScheduledPost(post.createdAt);
                const emailed = Boolean(post.subscriberNotifiedAt);

                return (
                  <article key={post.id} className="blog-admin-manage-post-card">
                    <div className="blog-admin-manage-post-media">
                      <img
                        src={post.image || blogFallbackImage}
                        alt={post.title}
                        className="blog-admin-manage-post-image"
                        onError={(event) => {
                          event.currentTarget.src = blogFallbackImage;
                        }}
                      />
                    </div>

                    <div className="blog-admin-manage-post-content">
                      <div className="blog-admin-manage-post-copy">
                        <div className="blog-admin-manage-post-meta">
                          <span>{formatPostDate(post.createdAt)}</span>
                          <span className={`blog-admin-chip ${scheduled ? "is-warning" : "is-info"}`}>
                            {scheduled ? "Scheduled" : "Live"}
                          </span>
                          {post.isFeatured ? (
                            <span className="blog-admin-chip is-success">Featured</span>
                          ) : null}
                          <span className={`blog-admin-chip ${emailed ? "is-success" : ""}`}>
                            {emailed ? "Email Sent" : "Email Pending"}
                          </span>
                          {post.allowComments === false ? (
                            <span className="blog-admin-chip is-warning">Comments Off</span>
                          ) : null}
                          {post.seoEnabled === false ? (
                            <span className="blog-admin-chip">SEO Off</span>
                          ) : null}
                          <span className="blog-admin-chip is-info">
                            {formatCompactNumber(post.views)} reads
                          </span>
                          <span className="blog-admin-chip">
                            {formatCompactNumber(post.likes)} likes
                          </span>
                          <span className="blog-admin-chip">
                            {formatCompactNumber(post.comments)} comments
                          </span>
                        </div>
                        <h4>{post.title}</h4>
                        <p>{post.excerpt}</p>
                      </div>

                      <div className="blog-admin-manage-post-actions">
                        <button
                          type="button"
                          className="blog-admin-btn-outline"
                          onClick={() => navigate(`/admin/blog/create?edit=${post.id}`)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="blog-admin-btn-outline"
                          onClick={() => sendPost(post)}
                          disabled={
                            isSendingPostId === String(post.id) ||
                            isDeletingId === String(post.id)
                          }
                        >
                          {isSendingPostId === String(post.id)
                            ? emailed
                              ? "Resending..."
                              : "Sending..."
                            : emailed
                              ? "Resend"
                              : "Send"}
                        </button>
                        <button
                          type="button"
                          className="blog-admin-btn-outline is-danger"
                          onClick={() => deletePost(post.id)}
                          disabled={isDeletingId === String(post.id)}
                        >
                          {isDeletingId === String(post.id) ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="blog-admin-right-stack">
          <div className="blog-admin-analytics-big-card">
            <div className="blog-admin-panel-head">
              <div>
                <h3>Pending Comments</h3>
                <p>Approve or decline incoming moderation requests.</p>
              </div>
              <span className="blog-admin-pill-count">{pendingComments.length}</span>
            </div>

            {isLoadingPendingComments ? (
              <p className="blog-admin-empty-state">Loading pending comments...</p>
            ) : pendingCommentsError ? (
              <p className="blog-admin-empty-state">{pendingCommentsError}</p>
            ) : pendingComments.length === 0 ? (
              <p className="blog-admin-empty-state">No comments are waiting for moderation.</p>
            ) : (
              <div className="blog-admin-comment-list">
                {pendingComments.map((comment) => (
                  <article key={comment.id} className="blog-admin-comment-card">
                    <div className="blog-admin-comment-meta">
                      <strong>{comment.name}</strong>
                      <span>{formatPostDate(comment.createdAt)}</span>
                    </div>
                    <p>{comment.message}</p>
                    <div className="blog-admin-comment-actions">
                      <button
                        type="button"
                        className="blog-admin-btn-primary blog-admin-btn-small"
                        onClick={() => approveComment(comment.id)}
                        disabled={
                          isApprovingCommentId === String(comment.id) ||
                          isDecliningCommentId === String(comment.id)
                        }
                      >
                        {isApprovingCommentId === String(comment.id) ? "Approving..." : "Approve"}
                      </button>
                      <button
                        type="button"
                        className="blog-admin-btn-outline blog-admin-btn-small is-danger"
                        onClick={() => declineComment(comment.id)}
                        disabled={
                          isDecliningCommentId === String(comment.id) ||
                          isApprovingCommentId === String(comment.id)
                        }
                      >
                        {isDecliningCommentId === String(comment.id) ? "Declining..." : "Decline"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
