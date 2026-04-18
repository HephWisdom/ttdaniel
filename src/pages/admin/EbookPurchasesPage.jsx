import { useEffect, useMemo, useState } from "react";
import { fetchAdminEbookOrders } from "../../lib/adminCommerce";

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

function getOrderBooks(order) {
  return order.items.length
    ? order.items.map((item) => item.title).join(", ")
    : "No item details stored";
}

function buildStats(orders) {
  const paidOrders = orders.filter((order) => order.paymentStatus === "paid");
  const revenueCents = paidOrders.reduce((total, order) => total + order.amountTotal, 0);
  const booksSold = paidOrders.reduce((total, order) => total + order.itemCount, 0);
  const failedDeliveries = orders.filter((order) => order.fulfillmentStatus === "failed").length;

  return [
    { label: "Paid orders", value: paidOrders.length },
    { label: "Books sold", value: booksSold },
    { label: "Revenue", value: formatMoney(revenueCents, paidOrders[0]?.currency || "usd") },
    { label: "Delivery issues", value: failedDeliveries },
  ];
}

export default function EbookPurchasesPage() {
  const [orders, setOrders] = useState([]);
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

    const loadOrders = async () => {
      setIsLoading(true);
      setError("");

      try {
        const data = await fetchAdminEbookOrders();
        if (isMounted) setOrders(data);
      } catch (loadError) {
        if (isMounted) {
          setOrders([]);
          setError(loadError.message || "Unable to load e-book purchases.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(() => buildStats(orders), [orders]);
  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return orders;

    return orders.filter((order) =>
      [
        order.customerEmail,
        order.paymentStatus,
        order.checkoutStatus,
        order.fulfillmentStatus,
        order.stripeSessionId,
        getOrderBooks(order),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [orders, query]);

  return (
    <section className={`blog-admin-page ${isVisible ? "fade-in" : ""}`}>
      <div className="blog-admin-analytics-header">
        <div>
          <h1>E-book Purchases</h1>
          <p>Review completed checkouts, delivered books, and fulfillment issues.</p>
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
            <h3>Purchased Books</h3>
            <p>Showing the latest 500 e-book checkout records.</p>
          </div>
          <span className="blog-admin-pill-count">{orders.length}</span>
        </div>

        <input
          className="blog-admin-form-input blog-admin-commerce-search"
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by customer, book, status, or session id"
        />

        {isLoading ? (
          <p className="blog-admin-empty-state">Loading e-book purchases...</p>
        ) : error ? (
          <p className="blog-admin-empty-state">{error}</p>
        ) : filteredOrders.length === 0 ? (
          <p className="blog-admin-empty-state">No e-book purchases match your search.</p>
        ) : (
          <div className="blog-admin-commerce-table-wrap">
            <table className="blog-admin-commerce-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Books</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Delivery</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id || order.stripeSessionId}>
                    <td>
                      <strong>{order.customerEmail || "No email"}</strong>
                      <span>{order.stripeSessionId ? order.stripeSessionId.slice(0, 12) : "No session"}</span>
                    </td>
                    <td>
                      <strong>{getOrderBooks(order)}</strong>
                      <span>{order.itemCount} book{order.itemCount === 1 ? "" : "s"}</span>
                    </td>
                    <td>{formatMoney(order.amountTotal, order.currency)}</td>
                    <td>
                      <span className={`blog-admin-chip ${order.paymentStatus === "paid" ? "is-success" : "is-warning"}`}>
                        {order.paymentStatus || "unknown"}
                      </span>
                    </td>
                    <td>
                      <span className={`blog-admin-chip ${order.fulfillmentStatus === "sent" ? "is-success" : order.fulfillmentStatus === "failed" ? "is-warning" : ""}`}>
                        {order.fulfillmentStatus || "pending"}
                      </span>
                      {order.deliveryError ? <small>{order.deliveryError}</small> : null}
                    </td>
                    <td>{formatDate(order.createdAt)}</td>
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
