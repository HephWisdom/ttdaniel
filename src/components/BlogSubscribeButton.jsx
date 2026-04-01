import { useEffect, useState } from "react";
import { createBlogSubscriber } from "../lib/blogSubscriptions";

function joinClasses(...values) {
  return values.filter(Boolean).join(" ");
}

export default function BlogSubscribeButton({
  buttonLabel = "Subscribe",
  buttonClassName = "",
  helperText = "",
  helperClassName = "",
}) {
  const [isSubscribeModalOpen, setIsSubscribeModalOpen] = useState(false);
  const [subscriptionForm, setSubscriptionForm] = useState({ name: "", email: "" });
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState("");
  const [subscriptionToast, setSubscriptionToast] = useState(null);

  useEffect(() => {
    if (!isSubscribeModalOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsSubscribeModalOpen(false);
        setSubscriptionError("");
        setSubscriptionForm({ name: "", email: "" });
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isSubscribeModalOpen]);

  useEffect(() => {
    if (!subscriptionToast) return undefined;

    const timeoutId = window.setTimeout(() => {
      setSubscriptionToast(null);
    }, 4200);

    return () => window.clearTimeout(timeoutId);
  }, [subscriptionToast]);

  const handleSubscribe = async (event) => {
    event.preventDefault();
    setSubscriptionError("");
    setIsSubscribing(true);

    try {
      const result = await createBlogSubscriber(subscriptionForm);
      setSubscriptionForm({ name: "", email: "" });
      setIsSubscribeModalOpen(false);
      setSubscriptionToast(
        result.alreadySubscribed
          ? {
              tone: "info",
              title: "Already subscribed",
              message: result.message || "This email is already subscribed to blog updates.",
            }
          : result.confirmationEmailSent
            ? {
                tone: "success",
                title: "Subscription confirmed",
                message:
                  result.message ||
                  "You are subscribed. Check your inbox for the confirmation email.",
              }
            : {
                tone: "warning",
                title: "Subscription saved",
                message:
                  result.message ||
                  "Your subscription was saved. Confirmation email is not enabled right now.",
              }
      );
    } catch (submitError) {
      setSubscriptionError(submitError.message || "Unable to subscribe right now.");
    } finally {
      setIsSubscribing(false);
    }
  };

  const openSubscribeModal = () => {
    setSubscriptionError("");
    setIsSubscribeModalOpen(true);
  };

  const closeSubscribeModal = () => {
    setIsSubscribeModalOpen(false);
    setSubscriptionError("");
    setSubscriptionForm({ name: "", email: "" });
  };

  return (
    <>
      <button
        type="button"
        onClick={openSubscribeModal}
        className={joinClasses(
          "inline-flex h-11 items-center justify-center rounded-full border border-[#0e1220] bg-white px-7 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0f1320] transition-colors duration-200 hover:bg-[#0e1220] hover:text-white",
          buttonClassName
        )}
      >
        {buttonLabel}
      </button>

      {helperText ? (
        <p className={joinClasses("mt-4 text-center text-sm text-black/60", helperClassName)}>
          {helperText}
        </p>
      ) : null}

      {isSubscribeModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
          onClick={closeSubscribeModal}
        >
          <div
            className="relative w-full max-w-xl overflow-hidden rounded-[30px] border border-black/10 bg-[#fffdf7] shadow-[0_38px_120px_-35px_rgba(0,0,0,0.65)]"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Subscribe to blog updates"
          >
            <div className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-[#ffe800]/55 blur-3xl" />
            <div className="pointer-events-none absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-[#54d3d1]/28 blur-3xl" />

            <div className="relative p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8f6b32]">
                    Subscribe
                  </p>
                  <h3 className="mt-2 max-w-[14ch] text-3xl font-black uppercase leading-[0.95] tracking-tight text-[#181410]">
                    Get Blog Updates
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={closeSubscribeModal}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-black/70 transition hover:bg-black hover:text-white"
                >
                  Close
                </button>
              </div>

              <p className="mt-4 max-w-[44ch] text-sm leading-relaxed text-black/65">
                Save your name and email to receive future blog updates. A confirmation email
                will be sent as soon as you subscribe.
              </p>

              <form onSubmit={handleSubscribe} className="mt-8 grid gap-4">
                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-black/55">
                    Name
                  </span>
                  <input
                    type="text"
                    value={subscriptionForm.name}
                    onChange={(event) =>
                      setSubscriptionForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm text-[#151515] outline-none transition focus:border-[#8f6b32]"
                    placeholder="Your name"
                    autoComplete="name"
                    minLength={2}
                    maxLength={80}
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-black/55">
                    Email
                  </span>
                  <input
                    type="email"
                    value={subscriptionForm.email}
                    onChange={(event) =>
                      setSubscriptionForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                    className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm text-[#151515] outline-none transition focus:border-[#8f6b32]"
                    placeholder="you@example.com"
                    autoComplete="email"
                    maxLength={160}
                    required
                  />
                </label>

                {subscriptionError ? (
                  <div className="rounded-2xl border border-[#c4604d]/25 bg-[#fff3ef] px-4 py-3 text-sm text-[#8f1e1c]">
                    {subscriptionError}
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSubscribing}
                    className="inline-flex h-12 items-center justify-center rounded-full bg-[#0f1320] px-6 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#ffe800] hover:text-[#111] disabled:cursor-not-allowed disabled:opacity-65"
                  >
                    {isSubscribing ? "Subscribing..." : "Subscribe"}
                  </button>
                  <p className="text-xs leading-relaxed text-black/55">
                    Your confirmation email will arrive after a successful subscription.
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {subscriptionToast ? (
        <div className="pointer-events-none fixed bottom-5 right-5 z-50 w-full max-w-sm px-4">
          <div
            className={`pointer-events-auto rounded-[24px] border px-5 py-4 shadow-[0_28px_70px_-34px_rgba(0,0,0,0.55)] ${
              subscriptionToast.tone === "warning"
                ? "border-[#d5b17f] bg-[#fff7e8] text-[#5c411f]"
                : subscriptionToast.tone === "info"
                  ? "border-[#cfd3dc] bg-white text-[#1b2230]"
                  : "border-[#b7d4a0] bg-[#f5ffef] text-[#23512e]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                  {subscriptionToast.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed">{subscriptionToast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setSubscriptionToast(null)}
                className="inline-flex h-8 items-center justify-center rounded-full border border-current/15 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] opacity-80 transition hover:opacity-100"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
