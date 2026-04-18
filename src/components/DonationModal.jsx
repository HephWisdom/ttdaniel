import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import previewImage from "../assets/donate-img.png";
import Container from "./ui/Container";
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
  { value: "one_time", label: "One-time", cadence: "Single gift" },
  { value: "month", label: "Monthly", cadence: "Recurring monthly support" },
  { value: "week", label: "Weekly", cadence: "Recurring weekly support" },
  { value: "year", label: "Yearly", cadence: "Recurring yearly support" },
];

function HeartIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12 20.3 4.9 13.4a4.8 4.8 0 0 1 6.8-6.8l.3.3.3-.3a4.8 4.8 0 0 1 6.8 6.8L12 20.3Z" />
    </svg>
  );
}

function LockIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path
        d="M8 10V7.8A4 4 0 0 1 12 4a4 4 0 0 1 4 3.8V10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <rect
        x="6"
        y="10"
        width="12"
        height="10"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M12 14.2v1.9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ChevronDownIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path
        d="m7 10 5 5 5-5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CloseIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

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

export default function DonationPage() {
  const location = useLocation();
  const checkoutContainerRef = useRef(null);
  const embeddedCheckoutRef = useRef(null);
  const [frequency, setFrequency] = useState("one_time");
  const [selectedAmount, setSelectedAmount] = useState(20);
  const [customAmount, setCustomAmount] = useState("");
  const [viewStep, setViewStep] = useState("selection");
  const [isPreparingCheckout, setIsPreparingCheckout] = useState(false);
  const [donationError, setDonationError] = useState("");
  const [statusToast, setStatusToast] = useState(null);

  const presetAmounts = useMemo(() => [...DONATION_AMOUNTS].sort((a, b) => b - a), []);

  const resolvedAmount = useMemo(() => {
    if (selectedAmount === "custom") {
      return normalizeDonationAmount(customAmount);
    }
    return normalizeDonationAmount(selectedAmount);
  }, [customAmount, selectedAmount]);

  const displayAmountInput = selectedAmount === "custom"
    ? customAmount
    : resolvedAmount
      ? String(resolvedAmount)
      : "";

  const destroyEmbeddedCheckout = useCallback(() => {
    if (embeddedCheckoutRef.current) {
      embeddedCheckoutRef.current.destroy();
      embeddedCheckoutRef.current = null;
    }
  }, []);

  const resetCheckoutState = useCallback(() => {
    destroyEmbeddedCheckout();
    setViewStep("selection");
    setDonationError("");
    setIsPreparingCheckout(false);
  }, [destroyEmbeddedCheckout]);

  useEffect(() => {
    if (viewStep !== "checkout" || !embeddedCheckoutRef.current || !checkoutContainerRef.current) {
      return undefined;
    }

    embeddedCheckoutRef.current.mount(checkoutContainerRef.current);

    return () => {
      embeddedCheckoutRef.current?.unmount();
    };
  }, [viewStep]);

  useEffect(() => {
    if (viewStep !== "checkout") return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        resetCheckoutState();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [resetCheckoutState, viewStep]);

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

  const handleDonationComplete = useCallback(
    async (sessionId) => {
      destroyEmbeddedCheckout();
      setDonationError("");
      setViewStep("success");

      if (!sessionId) {
        setStatusToast({
          tone: "success",
          title: "Donation received",
          message: "Your donation was received successfully. Thank you for supporting TT Daniel.",
        });
        return;
      }

      try {
        const session = await fetchDonationSessionStatus(sessionId);
        const amount = session.amountTotal > 0 ? session.amountTotal / 100 : 0;
        const returnedFrequency = normalizeDonationFrequency(
          session.mode === "subscription" ? session.frequency : "one_time"
        );

        setFrequency(returnedFrequency);

        setStatusToast({
          tone: "success",
          title: "Donation received",
          message: amount
            ? `${formatUsdAmount(amount)} donation received successfully. ${
                session.emailSent
                  ? "A thank-you email has been sent to your inbox."
                  : "Thank you for supporting TT Daniel."
              }`
            : session.emailSent
              ? "Your donation was received successfully. A thank-you email has been sent to your inbox."
              : "Your donation was received successfully. Thank you for supporting TT Daniel.",
        });
      } catch (error) {
        setStatusToast({
          tone: "warning",
          title: "Donation received",
          message:
            error instanceof Error
              ? error.message
              : "Your payment was received, but we could not confirm the thank-you email yet.",
        });
      }
    },
    [destroyEmbeddedCheckout]
  );

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
        const returnedFrequency = normalizeDonationFrequency(
          session.mode === "subscription" ? session.frequency : "one_time"
        );
        const frequencyLabel = formatFrequencyLabel(returnedFrequency);
        const isComplete =
          session.status === "complete" ||
          session.paymentStatus === "paid" ||
          session.paymentStatus === "no_payment_required";

        setFrequency(returnedFrequency);

        if (amount > 0) {
          if (DONATION_AMOUNTS.includes(amount)) {
            setSelectedAmount(amount);
            setCustomAmount("");
          } else {
            setSelectedAmount("custom");
            setCustomAmount(String(amount));
          }
        }

        if (isComplete) {
          setViewStep("success");
        }

        setStatusToast(
          isComplete
            ? {
                tone: "success",
                title: "Donation received",
                message: amount
                  ? `${formatUsdAmount(amount)} donation received successfully. ${
                      session.emailSent
                        ? "A thank-you email has been sent to your inbox."
                        : "Thank you for supporting TT Daniel."
                    }`
                  : session.emailSent
                    ? "Your donation was received successfully. A thank-you email has been sent to your inbox."
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
        "Donation payments are not configured yet. Please try again later."
      );
      return;
    }

    setIsPreparingCheckout(true);
    destroyEmbeddedCheckout();

    try {
      const stripe = await getStripeClient();
      if (!stripe) {
        throw new Error("Secure donation form failed to load.");
      }

      const pagePath = buildCurrentPagePath(location);
      const nextFrequency = normalizeDonationFrequency(frequency);
      let checkoutSessionId = "";

      embeddedCheckoutRef.current = await stripe.initEmbeddedCheckout({
        fetchClientSecret: async () => {
          const session = await createDonationCheckoutSession({
            amount,
            frequency: nextFrequency,
            pagePath,
          });
          checkoutSessionId = session.sessionId;
          return session.clientSecret;
        },
        onComplete: () => {
          handleDonationComplete(checkoutSessionId);
        },
      });

      setViewStep("checkout");
    } catch (error) {
      destroyEmbeddedCheckout();
      setViewStep("selection");
      setDonationError(
        error instanceof Error ? error.message : "Unable to open the secure donation form."
      );
    } finally {
      setIsPreparingCheckout(false);
    }
  };

  return (
    <>
      <main className="bg-[#f7f5f1] py-6 sm:py-8 md:py-10">
        <Container className="max-w-[1380px] px-4 sm:px-6 lg:px-8">
          {viewStep === "success" ? (
            <section className="mx-auto max-w-3xl rounded-[32px] border border-[#e3ddd6] bg-white px-5 py-8 text-center shadow-[0_28px_70px_-36px_rgba(0,0,0,0.18)] sm:px-8 sm:py-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8c7962]">
                Thank you
              </p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#201b17] sm:text-4xl">
                Your gift has been received
              </h1>
              <p className="mx-auto mt-4 max-w-[34rem] text-sm leading-relaxed text-[#62584d] sm:text-base">
                Your {formatFrequencyLabel(frequency).toLowerCase()} support helps TT Daniel&apos;s
                ministry continue its teaching, outreach, and care efforts.
              </p>
              <div className="mx-auto mt-8 max-w-xl rounded-[24px] border border-[#ece5db] bg-[#faf8f4] px-5 py-5 text-left">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8c7962]">
                  Donation summary
                </p>
                <div className="mt-4 flex items-center justify-between gap-4 text-sm text-[#62584d]">
                  <span>Amount</span>
                  <span className="font-semibold text-[#201b17]">
                    {formatUsdAmount(resolvedAmount)}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-4 text-sm text-[#62584d]">
                  <span>Cadence</span>
                  <span className="font-semibold text-[#201b17]">
                    {formatFrequencyLabel(frequency)}
                  </span>
                </div>
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setViewStep("selection");
                    setDonationError("");
                  }}
                  className="inline-flex h-12 items-center justify-center rounded-[14px] bg-[#201b17] px-6 text-sm font-semibold text-white transition hover:bg-[#342b23]"
                >
                  Give again
                </button>
                <Link
                  to="/"
                  className="inline-flex h-12 items-center justify-center rounded-[14px] border border-[#d8d1c8] px-6 text-sm font-semibold text-[#201b17] transition hover:bg-[#f3efe9]"
                >
                  Back home
                </Link>
              </div>
            </section>
          ) : (
            <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-12">
              <div className="pt-3 sm:pt-6 lg:pt-10">
                <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#8a7a66]">
                  TT Daniel Ministries
                </p>
                <h1 className="mt-4 whitespace-nowrap text-[clamp(1.75rem,6vw,3.45rem)] font-semibold tracking-tight text-[#1f1b17]">
                  Support The Ministry
                </h1>
                <div className="mt-10 h-px w-24 bg-[#d9d1c7] sm:mt-14" />
                <div className="mt-8 max-w-[58ch] space-y-8 text-base leading-[1.7] text-[#40372e] sm:mt-12 sm:text-[1.15rem]">
                  <p>
                    Every gift helps sustain TT Daniel&apos;s teaching, outreach, counseling, and
                    ministry programs across the community and beyond.
                  </p>
                  <p>
                    Use the support panel to choose a one-time or recurring gift, then complete the
                    payment in the secure checkout popup.
                  </p>
                </div>
              </div>

              <aside className="lg:sticky lg:top-24">
                <div className="rounded-[28px] border border-[#e2dcd4] bg-white p-5 shadow-[0_28px_70px_-36px_rgba(0,0,0,0.18)] sm:p-6">
                  <div className="grid grid-cols-2 gap-2">
                    {frequencyOptions.map((option) => {
                      const isActive = frequency === option.value;
                      const isRecurring = option.value !== "one_time";

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setFrequency(option.value)}
                          className={joinClasses(
                            "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[12px] border px-4 py-3 text-sm font-semibold transition",
                            isActive
                              ? "border-[#26221e] bg-[#faf7f3] text-[#1f1b17]"
                              : "border-[#d9d2ca] bg-white text-[#2f2923] hover:border-[#bdb4aa]"
                          )}
                        >
                          {isRecurring ? <HeartIcon className="h-4 w-4" /> : null}
                          <span>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <p className="mt-7 text-center text-[1.05rem] font-medium text-[#24201b]">
                    Choose your gift
                  </p>

                  <div className="mt-5 grid grid-cols-3 gap-2">
                    {presetAmounts.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => {
                          setSelectedAmount(amount);
                          setCustomAmount("");
                        }}
                        className={joinClasses(
                          "rounded-[12px] border px-3 py-3 text-center text-[1rem] font-medium transition",
                          selectedAmount === amount
                            ? "border-[#26221e] bg-[#faf7f3] text-[#1f1b17]"
                            : "border-[#d9d2ca] bg-white text-[#2f2923] hover:border-[#bdb4aa]"
                        )}
                      >
                        {formatUsdAmount(amount)}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSelectedAmount("custom")}
                      className={joinClasses(
                        "rounded-[12px] border px-3 py-3 text-center text-[1rem] font-medium transition",
                        selectedAmount === "custom"
                          ? "border-[#26221e] bg-[#faf7f3] text-[#1f1b17]"
                          : "border-[#d9d2ca] bg-white text-[#2f2923] hover:border-[#bdb4aa]"
                      )}
                    >
                      Other
                    </button>
                  </div>

                  {selectedAmount === "custom" ? (
                    <label className="mt-4 block">
                      <span className="sr-only">Donation amount</span>
                      <div className="flex items-center justify-between gap-3 rounded-[14px] border border-[#d7d0c9] bg-white px-4 py-3">
                        <div className="flex min-w-0 flex-1 items-baseline gap-2">
                          <span className="text-[1.45rem] font-medium text-[#201b17]">$</span>
                          <input
                            type="number"
                            min={DONATION_MIN_AMOUNT}
                            max={DONATION_MAX_AMOUNT}
                            step="1"
                            value={displayAmountInput}
                            onChange={(event) => {
                              setSelectedAmount("custom");
                              setCustomAmount(event.target.value);
                            }}
                            className="min-w-0 flex-1 bg-transparent text-[2rem] font-medium tracking-tight text-[#201b17] outline-none placeholder:text-[#a89f95]"
                            placeholder="0"
                            inputMode="numeric"
                          />
                        </div>
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-[#6f665b]">
                          USD
                          <ChevronDownIcon className="h-4 w-4" />
                        </span>
                      </div>
                    </label>
                  ) : null}

                  {donationError ? (
                    <div className="mt-4 rounded-[14px] border border-[#edcabd] bg-[#fff5f1] px-4 py-3 text-sm text-[#8b3c26]">
                      {donationError}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleStartCheckout}
                    disabled={isPreparingCheckout}
                    className="mt-5 inline-flex h-14 w-full items-center justify-center rounded-[14px] bg-[#23201d] px-6 text-base font-semibold text-white transition hover:bg-[#34302c] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPreparingCheckout ? "Opening secure form..." : "Support"}
                  </button>
                </div>
              </aside>
            </section>
          )}

        </Container>
      </main>

      {viewStep === "checkout" ? (
        <div
          className="fixed inset-0 z-[140] overflow-y-auto bg-black/50 p-3 backdrop-blur-[2px] sm:p-6"
          onClick={resetCheckoutState}
          role="dialog"
          aria-modal="true"
          aria-label="Secure donation"
        >
          <div className="flex min-h-full items-center justify-center">
            <div
              className="relative grid w-full max-w-5xl overflow-hidden rounded-[32px] bg-white shadow-[0_36px_110px_-40px_rgba(0,0,0,0.55)] lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,420px)]"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={resetCheckoutState}
                className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-[#3b342d] shadow-[0_14px_30px_-18px_rgba(0,0,0,0.35)] transition hover:bg-white"
              >
                <CloseIcon className="h-4 w-4" />
              </button>

              <div className="hidden bg-[#f4f1ec] lg:flex lg:min-h-[720px] lg:flex-col">
                <img src={previewImage} alt="" className="h-[300px] w-full object-cover" />
                <div className="flex flex-1 flex-col px-8 py-8">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#ddd5cb] bg-white text-[#221d18]">
                    <HeartIcon className="h-4 w-4" />
                  </div>
                  <h2 className="mt-6 text-[2rem] font-semibold tracking-tight text-[#201b17]">
                    Support in progress
                  </h2>
                  <p className="mt-4 text-[15px] leading-relaxed text-[#5e564d]">
                    You&apos;re completing a secure gift. The amount and cadence you selected on the
                    donate page are shown here for confirmation before payment.
                  </p>

                  <div className="mt-auto rounded-[24px] border border-[#e4ddd4] bg-white p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8c7962]">
                      Selected gift
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-4 text-sm text-[#655b51]">
                      <span>Amount</span>
                      <span className="font-semibold text-[#201b17]">
                        {formatUsdAmount(resolvedAmount)}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-4 text-sm text-[#655b51]">
                      <span>Cadence</span>
                      <span className="font-semibold text-[#201b17]">
                        {formatFrequencyLabel(frequency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex min-h-[640px] min-w-0 flex-col bg-white">
                <div className="lg:hidden">
                  <img src={previewImage} alt="" className="h-44 w-full object-cover" />
                </div>

                <div className="border-b border-[#ece6de] px-5 py-5 sm:px-6">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#eff8f1] text-[#08a36a]">
                      <LockIcon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[1.05rem] font-semibold text-[#201b17]">
                        Secure donation
                      </p>
                      <p className="text-sm text-[#6a6157]">
                        Review your gift and complete payment.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <div className="rounded-[14px] border border-[#d8d1c8] px-4 py-3 text-sm font-semibold text-[#201b17]">
                      {formatFrequencyLabel(frequency)}
                    </div>
                    <div className="rounded-[14px] border border-[#d8d1c8] px-4 py-3 text-sm font-semibold text-[#201b17]">
                      {formatUsdAmount(resolvedAmount)}
                    </div>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                  <div
                    ref={checkoutContainerRef}
                    className="min-h-[520px] overflow-hidden rounded-[22px] border border-[#ebe5dc] bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {statusToast ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-3 z-[150] px-3 sm:bottom-5 sm:right-5 sm:left-auto sm:w-full sm:max-w-sm sm:px-4">
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
}
