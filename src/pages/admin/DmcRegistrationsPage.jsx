import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchDmcMessageHistory,
  fetchDmcRegistrations,
  sendDmcMessage,
} from "../../lib/dmcRegistrations";

const INVOLVEMENT_LABELS = {
  exploring: "Exploring purpose",
  "sensing-a-call": "Sensing a call",
  "currently-serving": "Currently serving",
  "ministry-leader": "Ministry leader",
  other: "Other",
};
const MAX_MESSAGE_RECIPIENTS = 100;

function formatDate(value, includeTime = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date);
}

function buildStats(registrations) {
  const countries = new Set(registrations.map((registration) => registration.country).filter(Boolean));
  const confirmed = registrations.filter(
    (registration) => registration.confirmationEmailSentAt
  ).length;
  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);
  const thisMonth = registrations.filter(
    (registration) => new Date(registration.createdAt).getTime() >= currentMonth.getTime()
  ).length;

  return [
    { label: "Total registrations", value: registrations.length },
    { label: "Emails confirmed", value: confirmed },
    { label: "Countries", value: countries.size },
    { label: "This month", value: thisMonth },
  ];
}

export default function DmcRegistrationsPage() {
  const composerRef = useRef(null);
  const messageRequestIdRef = useRef("");
  const [registrations, setRegistrations] = useState([]);
  const [messageHistory, setMessageHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendFeedback, setSendFeedback] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const [registrationData, historyData] = await Promise.all([
        fetchDmcRegistrations(),
        fetchDmcMessageHistory(),
      ]);
      setRegistrations(registrationData);
      setMessageHistory(historyData);
    } catch (error) {
      setLoadError(error.message || "Unable to load DMC registrations.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => buildStats(registrations), [registrations]);
  const filteredRegistrations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return registrations;

    return registrations.filter((registration) =>
      [
        registration.fullName,
        registration.email,
        registration.phone,
        registration.country,
        INVOLVEMENT_LABELS[registration.ministryInvolvement],
        registration.discernmentFocus,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [query, registrations]);

  const visibleIds = filteredRegistrations.map((registration) => registration.id);
  const selectableVisibleIds = visibleIds.slice(0, MAX_MESSAGE_RECIPIENTS);
  const allVisibleSelected =
    selectableVisibleIds.length > 0 &&
    selectableVisibleIds.every((id) => selectedIds.has(id));

  const toggleSelected = (registrationId) => {
    messageRequestIdRef.current = "";
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(registrationId)) next.delete(registrationId);
      else if (next.size < MAX_MESSAGE_RECIPIENTS) next.add(registrationId);
      return next;
    });
  };

  const toggleAllVisible = () => {
    messageRequestIdRef.current = "";
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) selectableVisibleIds.forEach((id) => next.delete(id));
      else {
        for (const id of selectableVisibleIds) {
          if (next.size >= MAX_MESSAGE_RECIPIENTS) break;
          next.add(id);
        }
      }
      return next;
    });
  };

  const targetRegistrant = (registration) => {
    messageRequestIdRef.current = "";
    setSelectedIds(new Set([registration.id]));
    setSendFeedback(null);
    window.requestAnimationFrame(() => {
      composerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleSend = async (event) => {
    event.preventDefault();
    setSendFeedback(null);

    if (!selectedIds.size) {
      setSendFeedback({ tone: "error", message: "Select at least one registrant." });
      return;
    }
    if (!subject.trim() || !message.trim()) {
      setSendFeedback({ tone: "error", message: "Subject and message are required." });
      return;
    }

    setIsSending(true);
    try {
      const requestId = messageRequestIdRef.current || crypto.randomUUID();
      messageRequestIdRef.current = requestId;
      const result = await sendDmcMessage({
        requestId,
        registrationIds: Array.from(selectedIds),
        subject: subject.trim(),
        message: message.trim(),
      });
      if (!result.processing) {
        messageRequestIdRef.current = "";
      }
      setSendFeedback({
        tone: result.failedCount || result.processing ? "warning" : "success",
        message:
          result.message ||
          `Message sent to ${result.sentCount} of ${result.recipientCount} registrants.`,
      });
      if (!result.failedCount && !result.processing) {
        setSubject("");
        setMessage("");
        setSelectedIds(new Set());
      }
      setMessageHistory(await fetchDmcMessageHistory());
    } catch (error) {
      setSendFeedback({
        tone: "error",
        message: error.message || "Unable to send the message.",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="blog-admin-page fade-in">
      <div className="blog-admin-analytics-header">
        <div>
          <h1>DMC Registrations</h1>
          <p>Review pre-registrations and communicate with selected applicants.</p>
        </div>
        <button type="button" className="blog-admin-btn-outline" onClick={loadData}>
          Refresh
        </button>
      </div>

      <div className="blog-admin-commerce-stats">
        {stats.map((stat) => (
          <div key={stat.label} className="blog-admin-analytics-stat">
            <div className="as-label">{stat.label}</div>
            <div className="as-val">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="blog-admin-dmc-layout">
        <div className="blog-admin-analytics-big-card">
          <div className="blog-admin-panel-head">
            <div>
              <h3>Registration Directory</h3>
              <p>Search form answers, select people, or target one registration.</p>
            </div>
            <span className="blog-admin-pill-count">{registrations.length}</span>
          </div>

          <div className="blog-admin-dmc-directory-tools">
            <input
              className="blog-admin-form-input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, country, email, or discernment response"
            />
            <button type="button" className="blog-admin-btn-outline" onClick={toggleAllVisible}>
              {allVisibleSelected ? "Clear visible" : "Select visible"}
            </button>
            {selectedIds.size ? (
              <button
                type="button"
                className="blog-admin-btn-outline"
                onClick={() => {
                  messageRequestIdRef.current = "";
                  setSelectedIds(new Set());
                }}
              >
                Clear all
              </button>
            ) : null}
          </div>

          <p className="blog-admin-dmc-selected-count">
            {selectedIds.size} selected for messaging (maximum {MAX_MESSAGE_RECIPIENTS})
          </p>

          {isLoading ? (
            <p className="blog-admin-empty-state">Loading DMC registrations...</p>
          ) : loadError ? (
            <p className="blog-admin-empty-state">{loadError}</p>
          ) : filteredRegistrations.length === 0 ? (
            <p className="blog-admin-empty-state">No registrations match your search.</p>
          ) : (
            <div className="blog-admin-dmc-list">
              {filteredRegistrations.map((registration) => (
                <article
                  key={registration.id}
                  className={`blog-admin-dmc-registration ${
                    selectedIds.has(registration.id) ? "is-selected" : ""
                  }`}
                >
                  <div className="blog-admin-dmc-registration-head">
                    <label className="blog-admin-dmc-check">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(registration.id)}
                        onChange={() => toggleSelected(registration.id)}
                      />
                      <span className="sr-only">Select {registration.fullName}</span>
                    </label>
                    <div className="blog-admin-dmc-person">
                      <strong>{registration.fullName}</strong>
                      <a href={`mailto:${registration.email}`}>{registration.email}</a>
                      <span>
                        {registration.phone || "No phone"} | {registration.country}
                      </span>
                    </div>
                    <div className="blog-admin-dmc-registration-actions">
                      <span
                        className={`blog-admin-chip ${
                          registration.confirmationEmailSentAt
                            ? "is-success"
                            : "is-warning"
                        }`}
                      >
                        {registration.confirmationEmailSentAt
                          ? "Confirmation sent"
                          : "Email pending"}
                      </span>
                      <button
                        type="button"
                        className="blog-admin-btn-outline blog-admin-btn-small"
                        onClick={() => targetRegistrant(registration)}
                      >
                        Message
                      </button>
                    </div>
                  </div>

                  <div className="blog-admin-dmc-answer-grid">
                    <div>
                      <span>Ministry journey</span>
                      <strong>
                        {INVOLVEMENT_LABELS[registration.ministryInvolvement] ||
                          registration.ministryInvolvement}
                      </strong>
                    </div>
                    <div>
                      <span>Registered</span>
                      <strong>{formatDate(registration.createdAt, true)}</strong>
                    </div>
                  </div>

                  <div className="blog-admin-dmc-focus">
                    <span>What they want clarity about</span>
                    <p>
                      {registration.discernmentFocus ||
                        "No additional discernment note was provided."}
                    </p>
                  </div>

                  {registration.confirmationEmailError ? (
                    <p className="blog-admin-dmc-email-error">
                      Confirmation error: {registration.confirmationEmailError}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="blog-admin-dmc-side">
          <form
            ref={composerRef}
            className="blog-admin-panel blog-admin-dmc-composer"
            onSubmit={handleSend}
          >
            <div className="blog-admin-panel-head">
              <div>
                <h3>Send a Message</h3>
                <p>Each selected person receives a private email.</p>
              </div>
              <span className="blog-admin-pill-count">{selectedIds.size}</span>
            </div>

            <label className="blog-admin-form-group">
              <span className="blog-admin-form-label">Subject</span>
              <input
                className="blog-admin-form-input"
                type="text"
                value={subject}
                onChange={(event) => {
                  messageRequestIdRef.current = "";
                  setSubject(event.target.value);
                }}
                placeholder="DMC class update"
                maxLength={160}
              />
            </label>

            <label className="blog-admin-form-group">
              <span className="blog-admin-form-label">Message</span>
              <textarea
                className="blog-admin-form-textarea blog-admin-dmc-message-input"
                value={message}
                onChange={(event) => {
                  messageRequestIdRef.current = "";
                  setMessage(event.target.value);
                }}
                placeholder="Write the message registrants should receive..."
                maxLength={5000}
              />
            </label>

            {sendFeedback ? (
              <div className={`blog-admin-dmc-send-feedback ${sendFeedback.tone}`}>
                {sendFeedback.message}
              </div>
            ) : null}

            <button
              type="submit"
              className="blog-admin-btn-primary blog-admin-dmc-send-button"
              disabled={isSending || !selectedIds.size}
            >
              {isSending
                ? "Sending..."
                : `Send to ${selectedIds.size} selected`}
            </button>
          </form>

          <div className="blog-admin-panel blog-admin-dmc-history">
            <div className="blog-admin-panel-head">
              <div>
                <h3>Recent Messages</h3>
                <p>Latest DMC email activity.</p>
              </div>
            </div>

            {messageHistory.length ? (
              <div className="blog-admin-dmc-history-list">
                {messageHistory.map((entry) => (
                  <article key={entry.id}>
                    <strong>{entry.subject}</strong>
                    <p>{entry.message}</p>
                    <span>
                      {entry.sentCount}/{entry.recipientCount} sent |{" "}
                      {formatDate(entry.createdAt, true)}
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <p className="blog-admin-empty-state">No DMC messages have been sent yet.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
