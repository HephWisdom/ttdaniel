import { useEffect, useMemo, useState } from "react";
import { fetchAdminDonationReceipts } from "../../lib/adminCommerce";

function formatMoney(cents, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: String(currency || "usd").toUpperCase(),
  }).format(Number(cents || 0) / 100);
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatFrequency(value) {
  if (value === "week") return "Weekly";
  if (value === "month") return "Monthly";
  if (value === "year") return "Yearly";
  return "One-time";
}

function buildStats(donations) {
  const paidDonations = donations.filter((donation) => donation.paymentStatus === "paid");
  const totalCents = paidDonations.reduce((total, donation) => total + donation.amountTotal, 0);
  const recurringCount = paidDonations.filter((donation) => donation.frequency !== "one_time")
    .length;
  const failedEmails = donations.filter((donation) => donation.emailStatus === "failed").length;

  return [
    { label: "Paid donations", value: paidDonations.length },
    { label: "Total given", value: formatMoney(totalCents, paidDonations[0]?.currency || "usd") },
    { label: "Recurring gifts", value: recurringCount },
    { label: "Email issues", value: failedEmails },
  ];
}

export default function DonationsPage() {
  const [donations, setDonations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsVisible(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadDonations = async () => {
      setIsLoading(true);
      setError("");

      try {
        const data = await fetchAdminDonationReceipts();
        if (isMounted) setDonations(data);
      } catch (loadError) {
        if (isMounted) {
          setDonations([]);
          setError(loadError.message || "Unable to load donations.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadDonations();

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(() => buildStats(donations), [donations]);
  const filteredDonations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return donations;

    return donations.filter((donation) =>
      [
        donation.donorEmail,
        donation.paymentStatus,
        donation.checkoutStatus,
        donation.emailStatus,
        donation.frequency,
        donation.stripeSessionId,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [donations, query]);

  return (
    <section className={`blog-admin-page ${isVisible ? "fade-in" : ""}`}>
      <div className="blog-admin-analytics-header">
        <div>
          <h1>Donations</h1>
          <p>Review gifts, recurring support, and donor thank-you email status.</p>
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
            <h3>Donation Records</h3>
            <p>Showing the latest 500 confirmed donation receipt records.</p>
          </div>
          <span className="blog-admin-pill-count">{donations.length}</span>
        </div>

        <input
          className="blog-admin-form-input blog-admin-commerce-search"
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by donor, status, cadence, or session id"
        />

        {isLoading ? (
          <p className="blog-admin-empty-state">Loading donations...</p>
        ) : error ? (
          <p className="blog-admin-empty-state">{error}</p>
        ) : filteredDonations.length === 0 ? (
          <p className="blog-admin-empty-state">No donations match your search.</p>
        ) : (
          <div className="blog-admin-commerce-table-wrap">
            <table className="blog-admin-commerce-table">
              <thead>
                <tr>
                  <th>Donor</th>
                  <th>Amount</th>
                  <th>Cadence</th>
                  <th>Payment</th>
                  <th>Email</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredDonations.map((donation) => (
                  <tr key={donation.id || donation.stripeSessionId}>
                    <td>
                      <strong>{donation.donorEmail || "No email"}</strong>
                      <span>{donation.stripeSessionId ? donation.stripeSessionId.slice(0, 12) : "No session"}</span>
                    </td>
                    <td>{formatMoney(donation.amountTotal, donation.currency)}</td>
                    <td>{formatFrequency(donation.frequency)}</td>
                    <td>
                      <span className={`blog-admin-chip ${donation.paymentStatus === "paid" ? "is-success" : "is-warning"}`}>
                        {donation.paymentStatus || "unknown"}
                      </span>
                    </td>
                    <td>
                      <span className={`blog-admin-chip ${donation.emailStatus === "sent" ? "is-success" : donation.emailStatus === "failed" ? "is-warning" : ""}`}>
                        {donation.emailStatus || "pending"}
                      </span>
                      {donation.emailError ? <small>{donation.emailError}</small> : null}
                    </td>
                    <td>{formatDate(donation.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
