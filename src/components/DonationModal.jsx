import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import {
  createDonationCheckoutSession,
  DONATION_AMOUNTS,
  DONATION_MAX_AMOUNT,
  DONATION_MIN_AMOUNT,
  fetchDonationSessionStatus,
  normalizeDonationAmount,
  normalizeDonationFrequency,
  validateDonationAmount,
} from "../lib/donations";

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
let stripeClientPromise = null;

const frequencyOptions = [
  { value: "one_time", label: "One-time", cadence: "One-time donation" },
  { value: "week", label: "Weekly", cadence: "Weekly recurring donation" },
  { value: "month", label: "Monthly", cadence: "Monthly recurring donation" },
  { value: "year", label: "Yearly", cadence: "Yearly recurring donation" },
];

function formatFrequencyLabel(value) {
  return frequencyOptions.find((option) => option.value === value)?.label || "One-time";
}

function joinClasses(...values) {
  return values.filter(Boolean).join(" ");
}

function formatUsdAmount(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

function buildCurrentPagePath(location) {
  const params = new URLSearchParams(location.search);
  params.delete("donation_session_id");
  params.delete("donation_status");
  const search = params.toString();
  return `${location.pathname}${search ? `?${search}` : ""}`;
}

async function getStripeClient() {
  if (!STRIPE_PUBLISHABLE_KEY) return null;

  if (!stripeClientPromise) {
    stripeClientPromise = import("@stripe/stripe-js").then(({ loadStripe }) =>
      loadStripe(STRIPE_PUBLISHABLE_KEY)
    );
  }

  return stripeClientPromise;
}

export default function DonationModal({ isOpen, onClose }) {
  const location = useLocation();
  const checkoutContainerRef = useRef(null);
  const embeddedCheckoutRef = useRef(null);
  const [frequency, setFrequency] = useState("one_time");
  const [selectedAmount, setSelectedAmount] = useState(20);
  const [customAmount, setCustomAmount] = useState("");
  const [modalStep, setModalStep] = useState("selection");
  const [isPreparingCheckout, setIsPreparingCheckout] = useState(false);
  const [donationError, setDonationError] = useState("");
  const [statusToast, setStatusToast] = useState(null);

  const resolvedAmount = useMemo(() => {
    if (selectedAmount === "custom") {
      return normalizeDonationAmount(customAmount);
    }
    return normalizeDonationAmount(selectedAmount);
  }, [customAmount, selectedAmount]);

  const destroyEmbeddedCheckout = useCallback(() => {
    if (embeddedCheckoutRef.current) {
      embeddedCheckoutRef.current.destroy();
      embeddedCheckoutRef.current = null;
    }
  }, []);

  const resetModalState = useCallback(() => {
    destroyEmbeddedCheckout();
    setModalStep("selection");
    setDonationError("");
    setIsPreparingCheckout(false);
  }, [destroyEmbeddedCheckout]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        resetModalState();
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose, resetModalState]);

  useEffect(() => {
    if (!isOpen || modalStep !== "checkout" || !embeddedCheckoutRef.current || !checkoutContainerRef.current) {
      return undefined;
    }

    embeddedCheckoutRef.current.mount(checkoutContainerRef.current);

    return () => {
      embeddedCheckoutRef.current?.unmount();
    };
  }, [isOpen, modalStep]);

  useEffect(() => {
    return () => {
      destroyEmbeddedCheckout();
    };
  }, [destroyEmbeddedCheckout]);

  useEffect(() => {
    if (!statusToast) return undefined;

    const timeoutId = window.setTimeout(() => {
      setStatusToast(null);
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [statusToast]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sessionId = params.get("donation_session_id");
    const donationStatus = params.get("donation_status");

    if (!sessionId || donationStatus !== "return") {
      return undefined;
    }

    let isCancelled = false;

    const handleReturnedSession = async () => {
      try {
        const session = await fetchDonationSessionStatus(sessionId);
        if (isCancelled) return;

        const amount = session.amountTotal > 0 ? session.amountTotal / 100 : 0;
        const frequencyLabel = formatFrequencyLabel(
          session.mode === "subscription" ? session.frequency : "one_time"
        );
        const isComplete =
          session.status === "complete" ||
          session.paymentStatus === "paid" ||
          session.paymentStatus === "no_payment_required";

        setStatusToast(
          isComplete
            ? {
                tone: "success",
                title: "Donation received",
                message: amount
                  ? `${formatUsdAmount(amount)} donation received successfully. Thank you for supporting TT Daniel.`
                  : "Your donation was received successfully. Thank you for supporting TT Daniel.",
              }
            : {
                tone: "info",
                title: "Donation update",
                message:
                  session.mode === "subscription"
                    ? `${frequencyLabel} donation setup is still processing.`
                    : "Your donation is still processing. If payment was interrupted, you can try again.",
              }
        );
      } catch (error) {
        if (isCancelled) return;
        setStatusToast({
          tone: "warning",
          title: "Donation status unavailable",
          message: error instanceof Error ? error.message : "Unable to confirm the donation status.",
        });
      } finally {
        const nextParams = new URLSearchParams(location.search);
        nextParams.delete("donation_session_id");
        nextParams.delete("donation_status");
        const nextSearch = nextParams.toString();
        const nextUrl = `${location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
        window.history.replaceState({}, "", nextUrl);
      }
    };

    handleReturnedSession();

    return () => {
      isCancelled = true;
    };
  }, [location.pathname, location.search]);

  const handleClose = () => {
    resetModalState();
    onClose();
  };

  const handleStartCheckout = async () => {
    setDonationError("");

    let amount;
    try {
      amount = validateDonationAmount(resolvedAmount);
    } catch (error) {
      setDonationError(error instanceof Error ? error.message : "Enter a valid donation amount.");
      return;
    }

    if (!STRIPE_PUBLISHABLE_KEY) {
      setDonationError(
        "Set VITE_STRIPE_PUBLISHABLE_KEY on the site and STRIPE_SECRET_KEY in the Supabase function secrets to enable secure embedded donations."
      );
      return;
    }

    setIsPreparingCheckout(true);
    destroyEmbeddedCheckout();

    try {
      const stripe = await getStripeClient();
      if (!stripe) {
        throw new Error("Stripe failed to load in the browser.");
      }

      const pagePath = buildCurrentPagePath(location);
      const nextFrequency = normalizeDonationFrequency(frequency);

      embeddedCheckoutRef.current = await stripe.initEmbeddedCheckout({
        fetchClientSecret: async () => {
          const session = await createDonationCheckoutSession({
            amount,
            frequency: nextFrequency,
            pagePath,
          });
          return session.clientSecret;
        },
        onComplete: () => {
          destroyEmbeddedCheckout();
          setModalStep("success");
        },
      });

      setModalStep("checkout");
    } catch (error) {
      destroyEmbeddedCheckout();
      setModalStep("selection");
      setDonationError(
        error instanceof Error ? error.message : "Unable to open the secure donation form."
      );
    } finally {
      setIsPreparingCheckout(false);
    }
  };

  if (!isOpen && !statusToast) {
    return null;
  }

  const donationUi = (
    <>
      {isOpen ? (
        <div
          className="fixed inset-0 z-[140] overflow-y-auto bg-black/70 p-3 backdrop-blur-[2px] sm:p-4 md:p-6"
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
          aria-label="Donate to TT Daniel"
        >
          <div className="flex min-h-full items-start justify-center">
            <div
              className="relative my-auto flex w-full max-w-4xl flex-col overflow-hidden rounded-[30px] border border-[#d7bf95]/25 bg-[linear-gradient(180deg,#14110d_0%,#0e0c09_100%)] text-[#f8edd4] shadow-[0_40px_110px_-40px_rgba(0,0,0,0.9)] max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] md:max-h-[calc(100vh-3rem)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="pointer-events-none absolute -left-16 top-0 h-48 w-48 rounded-full bg-[#f0c372]/15 blur-3xl" />
              <div className="pointer-events-none absolute -right-20 bottom-0 h-56 w-56 rounded-full bg-[#7c5e30]/18 blur-3xl" />

              <div className="relative shrink-0 flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6 sm:py-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d7b780]">
                    Give
                  </p>
                  <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-[#fff4de] sm:text-3xl">
                    Support The Ministry
                  </h2>
                  <p className="mt-3 max-w-[44ch] text-sm leading-relaxed text-[#dbc7a4]">
                    Choose a one-time or recurring donation and complete the payment securely inside
                    the site through Stripe.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-white/15 px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f6ead2] transition hover:border-[#d7b780] hover:bg-[#f6ead2] hover:text-[#1d160f]"
                >
                  Close
                </button>
              </div>

              {modalStep === "selection" ? (
                <div className="relative min-h-0 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
                  <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
                    <div>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {frequencyOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setFrequency(option.value)}
                            className={joinClasses(
                              "rounded-[20px] border px-4 py-4 text-left transition",
                              frequency === option.value
                                ? "border-[#f0c372] bg-[#f0c372]/12 text-[#fff6e6]"
                                : "border-white/10 bg-white/[0.03] text-[#e3d1af] hover:border-[#f0c372]/45 hover:bg-[#f0c372]/8"
                            )}
                          >
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                              {option.label}
                            </p>
                            <p className="mt-2 text-sm text-current/75">{option.cadence}</p>
                          </button>
                        ))}
                      </div>

                      <div className="mt-6">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d7b780]">
                          Select amount
                        </p>
                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                          {DONATION_AMOUNTS.map((amount) => (
                            <button
                              key={amount}
                              type="button"
                              onClick={() => {
                                setSelectedAmount(amount);
                                setCustomAmount("");
                              }}
                              className={joinClasses(
                                "rounded-[18px] border px-4 py-4 text-center text-sm font-semibold transition",
                                selectedAmount === amount
                                  ? "border-[#f0c372] bg-[#fff3db] text-[#24180f]"
                                  : "border-white/10 bg-white/[0.03] text-[#f8edd4] hover:border-[#f0c372]/45 hover:bg-[#f0c372]/8"
                              )}
                            >
                              {formatUsdAmount(amount)}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setSelectedAmount("custom")}
                            className={joinClasses(
                              "rounded-[18px] border px-4 py-4 text-center text-sm font-semibold transition",
                              selectedAmount === "custom"
                                ? "border-[#f0c372] bg-[#fff3db] text-[#24180f]"
                                : "border-white/10 bg-white/[0.03] text-[#f8edd4] hover:border-[#f0c372]/45 hover:bg-[#f0c372]/8"
                            )}
                          >
                            Custom
                          </button>
                        </div>
                      </div>

                      {selectedAmount === "custom" ? (
                        <div className="mt-4 max-w-xs">
                          <label className="block">
                            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d7b780]">
                              Custom amount
                            </span>
                            <div className="flex h-12 items-center rounded-2xl border border-white/12 bg-black/20 px-4">
                              <span className="mr-3 text-sm font-semibold text-[#d7b780]">$</span>
                              <input
                                type="number"
                                min={DONATION_MIN_AMOUNT}
                                max={DONATION_MAX_AMOUNT}
                                step="1"
                                value={customAmount}
                                onChange={(event) => setCustomAmount(event.target.value)}
                                className="w-full bg-transparent text-sm text-[#fff4de] outline-none"
                                placeholder="Enter amount"
                                inputMode="numeric"
                              />
                            </div>
                          </label>
                        </div>
                      ) : null}

                      {donationError ? (
                        <div className="mt-4 rounded-2xl border border-[#d08d73]/25 bg-[#3b221d] px-4 py-3 text-sm text-[#ffd4c9]">
                          {donationError}
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d7b780]">
                        Donation summary
                      </p>
                      <div className="mt-4 rounded-[20px] border border-[#f0c372]/20 bg-black/20 p-4">
                        <p className="text-sm text-[#d9c7a4]">Amount</p>
                        <p className="mt-2 text-3xl font-black text-[#fff6e6]">
                          {resolvedAmount ? formatUsdAmount(resolvedAmount) : "$0"}
                        </p>
                        <p className="mt-3 text-sm text-[#d9c7a4]">
                          {formatFrequencyLabel(frequency)}
                        </p>
                      </div>
                      <ul className="mt-5 space-y-3 text-sm leading-relaxed text-[#d9c7a4]">
                        <li>Card details stay inside Stripe-hosted iframes and never hit your server.</li>
                        <li>Donation amount and billing cadence are validated again on the server.</li>
                        <li>Preset amounts and custom donations stay inside the $5 to $5000 range.</li>
                      </ul>
                      <button
                        type="button"
                        onClick={handleStartCheckout}
                        disabled={isPreparingCheckout}
                        className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#f0c372] px-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#23170d] transition hover:bg-[#fff1d1] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isPreparingCheckout
                          ? "Preparing secure checkout..."
                          : "Continue to secure checkout"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : modalStep === "checkout" ? (
                <div className="relative min-h-0 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d7b780]">
                        Secure checkout
                      </p>
                      <p className="mt-2 text-sm text-[#dbc7a4]">
                        {formatUsdAmount(resolvedAmount)} · {formatFrequencyLabel(frequency)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        resetModalState();
                      }}
                      className="inline-flex h-10 items-center justify-center rounded-full border border-white/12 px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f6ead2] transition hover:border-[#d7b780] hover:bg-[#f6ead2] hover:text-[#1d160f]"
                    >
                      Back
                    </button>
                  </div>
                  <div
                    ref={checkoutContainerRef}
                    className="min-h-[420px] overflow-hidden rounded-[24px] border border-white/10 bg-white sm:min-h-[520px] md:min-h-[560px]"
                  />
                </div>
              ) : (
                <div className="relative min-h-0 overflow-y-auto px-5 py-8 text-center sm:px-6 sm:py-10">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d7b780]">
                    Thank you
                  </p>
                  <h3 className="mt-3 text-3xl font-black uppercase tracking-tight text-[#fff6e6]">
                    Donation received
                  </h3>
                  <p className="mx-auto mt-4 max-w-[34rem] text-sm leading-relaxed text-[#dbc7a4]">
                    Your {formatFrequencyLabel(frequency).toLowerCase()} support helps TT Daniel’s
                    ministry continue its outreach, teaching, and revival work.
                  </p>
                  <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="inline-flex h-11 items-center justify-center rounded-full bg-[#f0c372] px-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#23170d] transition hover:bg-[#fff1d1]"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalStep("selection");
                        setDonationError("");
                      }}
                      className="inline-flex h-11 items-center justify-center rounded-full border border-white/12 px-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f6ead2] transition hover:border-[#d7b780] hover:bg-[#f6ead2] hover:text-[#1d160f]"
                    >
                      Give again
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {statusToast ? (
        <div className="pointer-events-none fixed bottom-5 right-5 z-[150] w-full max-w-sm px-4">
          <div
            className={`pointer-events-auto rounded-[24px] border px-5 py-4 shadow-[0_28px_70px_-34px_rgba(0,0,0,0.55)] ${
              statusToast.tone === "warning"
                ? "border-[#d5b17f] bg-[#fff7e8] text-[#5c411f]"
                : statusToast.tone === "info"
                  ? "border-[#cfd3dc] bg-white text-[#1b2230]"
                  : "border-[#b7d4a0] bg-[#f5ffef] text-[#23512e]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                  {statusToast.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed">{statusToast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setStatusToast(null)}
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

  if (typeof document === "undefined") {
    return donationUi;
  }

  return createPortal(donationUi, document.body);
}
