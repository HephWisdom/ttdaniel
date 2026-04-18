import { useEffect, useMemo, useState } from "react";
import useAdminBlog from "../../components/admin/useAdminBlog";

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function buildSubscriberStats(subscribers) {
  const total = subscribers.length;
  const active = subscribers.filter((subscriber) => subscriber.status === "active").length;
  const unsubscribed = subscribers.filter((subscriber) => subscriber.status === "unsubscribed")
    .length;
  const website = subscribers.filter((subscriber) => subscriber.source === "website").length;

  return [
    { label: "Total subscribers", value: total },
    { label: "Active", value: active },
    { label: "Unsubscribed", value: unsubscribed },
    { label: "Website signups", value: website },
  ];
}

export default function SubscribersPage() {
  const {
    subscribers,
    subscribersError,
    isLoadingSubscribers,
    refreshSubscribers,
  } = useAdminBlog();
  const [isVisible, setIsVisible] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsVisible(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    refreshSubscribers();
  }, [refreshSubscribers]);

  const stats = useMemo(() => buildSubscriberStats(subscribers), [subscribers]);
  const filteredSubscribers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return subscribers;

    return subscribers.filter((subscriber) =>
      [subscriber.name, subscriber.email, subscriber.status, subscriber.source]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [query, subscribers]);

  return (
    <section className={`blog-admin-page ${isVisible ? "fade-in" : ""}`}>
      <div className="blog-admin-analytics-header">
        <div>
          <h1>Subscribers</h1>
          <p>Keep the blog broadcast list separate from traffic analytics.</p>
        </div>
      </div>

      <div className="blog-admin-commerce-stats">
        {stats.map((stat) => (
          <div key={stat.label} className="blog-admin-analytics-stat">
            <div className="as-label">{stat.label}</div>
            <div className="as-val">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="blog-admin-analytics-big-card">
        <div className="blog-admin-panel-head">
          <div>
            <h3>Subscriber Directory</h3>
            <p>Search by name, email, status, or signup source.</p>
          </div>
          <span className="blog-admin-pill-count">{subscribers.length}</span>
        </div>

        <input
          className="blog-admin-form-input blog-admin-commerce-search"
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search subscribers"
        />

        {isLoadingSubscribers ? (
          <p className="blog-admin-empty-state">Loading subscribers...</p>
        ) : subscribersError ? (
          <p className="blog-admin-empty-state">{subscribersError}</p>
        ) : filteredSubscribers.length === 0 ? (
          <p className="blog-admin-empty-state">No subscribers match your search.</p>
        ) : (
          <div className="blog-admin-directory-list">
            {filteredSubscribers.map((subscriber) => (
              <article key={subscriber.id || subscriber.email} className="blog-admin-directory-row">
                <div className="blog-admin-directory-main">
                  <strong>{subscriber.name}</strong>
                  <a href={`mailto:${subscriber.email}`}>{subscriber.email}</a>
                </div>
                <div className="blog-admin-directory-meta">
                  <span className={`blog-admin-chip ${subscriber.status === "active" ? "is-success" : ""}`}>
                    {subscriber.status}
                  </span>
                  <span>Joined {formatDate(subscriber.createdAt)}</span>
                  <span>Source {subscriber.source || "website"}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
