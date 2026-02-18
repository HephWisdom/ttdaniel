import { useEffect, useState } from "react";
import Container from "../components/ui/Container";
import { eventDetailSessions } from "../data/events";

const KIND_STYLES = {
  donation:
    "border-2 border-rose-300/70 shadow-[0_18px_50px_-28px_rgba(244,63,94,0.45)] hover:shadow-[0_26px_72px_-30px_rgba(244,63,94,0.55)]",
  "one-on-one":
    "border-2 border-amber-300/80 shadow-[0_18px_50px_-28px_rgba(245,158,11,0.45)] hover:shadow-[0_26px_72px_-30px_rgba(245,158,11,0.58)]",
  free:
    "border border-white/45 shadow-[0_18px_50px_-30px_rgba(0,0,0,0.35)] hover:shadow-[0_26px_72px_-30px_rgba(0,0,0,0.45)]",
};

export default function EventDetails() {
  const [activeFormUrl, setActiveFormUrl] = useState("");
  const isModalOpen = Boolean(activeFormUrl);

  useEffect(() => {
    if (!isModalOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") setActiveFormUrl("");
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isModalOpen]);

  return (
    <section
      id="event-details"
      className="relative overflow-hidden bg-gradient-to-b from-[#f8f5ef] via-[#f3efe7] to-[#ece6db] text-[#1f1a14]"
    >
      <style>{`
        @keyframes ambientFloat {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.16; }
          50% { transform: translate3d(0, -10px, 0) scale(1.04); opacity: 0.24; }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -left-28 -top-24 h-[440px] w-[440px] rounded-full bg-[#8f6b32]/20 blur-3xl"
          style={{ animation: "ambientFloat 15s ease-in-out infinite" }}
        />
        <div
          className="absolute -bottom-24 -right-24 h-[500px] w-[500px] rounded-full bg-[#3a2a16]/15 blur-3xl"
          style={{ animation: "ambientFloat 18s ease-in-out infinite" }}
        />
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Event registration form"
          onClick={() => setActiveFormUrl("")}
        >
          <div
            className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/20 bg-[#0f0f10] shadow-[0_30px_90px_-40px_rgba(0,0,0,0.85)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-white md:px-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
                Registration Form
              </p>
              <button
                type="button"
                className="rounded-full border border-white/30 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white hover:text-black"
                onClick={() => setActiveFormUrl("")}
                aria-label="Close dialog"
              >
                Close
              </button>
            </div>

            <div className="h-[78vh] w-full max-h-[860px] md:h-[84vh]">
              <iframe
                title="Registration form"
                src={activeFormUrl}
                className="h-full w-full"
                frameBorder="0"
              />
            </div>
          </div>
        </div>
      )}

      <Container className="relative py-14 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center rounded-full border border-[#9f8357]/45 bg-[#fff9ef] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7e653d]">
            February 2026
          </p>
          <h2 className="mt-4 text-3xl font-black uppercase tracking-tight text-[#6d28d9] md:text-5xl">
            Open Door Prayer and Prophetic Expo
          </h2>

          <p className="mt-5 text-base leading-relaxed text-[#4a3c2c] md:text-lg">
            What is God doing this season in your life and in your land? Come into an atmosphere of prayer,
            prophetic direction, and clear spiritual insight for 2026. This event is strictly by registration.
          </p>

          <div className="mt-7 rounded-2xl border border-[#b89f77]/45 bg-[#fff8ec]/80 p-5 text-left shadow-[0_18px_45px_-35px_rgba(0,0,0,0.35)] md:p-6">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#735a35]">
              Select Your Session
            </p>
            <ol className="mt-4 space-y-4 text-sm leading-relaxed text-[#4b3d2d] md:text-base">
              <li>
                <span className="font-semibold text-[#2e2419]">1. General Prayer and Prophetic Session.</span>{" "}
                Join online for a powerful gathering of prayer and prophetic ministration.
              </li>
              <li>
                <span className="font-semibold text-[#2e2419]">2. Private Prophetic Consultation and Counseling.</span>{" "}
                Book a personal session for focused prayer and prophetic counsel (27TH FEB 2026).
              </li>
            </ol>
          </div>
        </div>

        <div className="mt-12 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {eventDetailSessions.map((e) => {
            const auraClass = KIND_STYLES[e.kind] || KIND_STYLES.free;
            const isDisabled = e.kind === "one-on-one" && !e.formHref;
            const actionLabel = e.kind === "donation" ? "Register + Donate" : "Register";

            return (
              <article
                key={e.title}
                className={`group relative overflow-hidden rounded-2xl bg-white/85 backdrop-blur-sm transition duration-500 hover:-translate-y-1 ${auraClass}`}
              >
                <div className="relative aspect-[16/11] overflow-hidden">
                  <img
                    src={e.img}
                    alt={e.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />
                  {e.kind !== "one-on-one" && (
                    <div className="absolute left-4 top-4 inline-flex rounded-full border border-white/40 bg-black/45 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
                      {e.price}
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="rounded-xl border border-white/25 bg-white/92 p-4 shadow-[0_18px_40px_-30px_rgba(0,0,0,0.45)] backdrop-blur-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#756145]">{e.date}</p>
                    <h3 className="mt-2 text-lg font-extrabold leading-tight tracking-tight text-[#231b12]">
                      {e.title}
                    </h3>
                    <p className="mt-1 text-sm text-[#5f4e3a]">{e.venue}</p>
                    <p className="mt-3 text-sm leading-relaxed text-[#4f4030]">{e.desc}</p>

                    <div className="mt-4 flex justify-center">
                      <a
                        href={e.formHref || "#"}
                        onClick={(event) => {
                          if (!e.formHref) {
                            event.preventDefault();
                            return;
                          }
                          event.preventDefault();
                          setActiveFormUrl(e.formHref);
                        }}
                        className={`inline-flex h-10 w-full items-center justify-center rounded-md border text-sm font-semibold uppercase tracking-[0.13em] transition ${
                          isDisabled
                            ? "cursor-not-allowed border-[#d2c2a8]/70 bg-[#ece1cf] text-[#8a7b65]"
                            : "border-[#2c2115] bg-[#22180f] text-[#f5e5c3] hover:border-[#6f5630] hover:bg-[#f2e4c8] hover:text-[#271d13]"
                        }`}
                        aria-disabled={isDisabled}
                        tabIndex={isDisabled ? -1 : undefined}
                      >
                        {actionLabel}
                      </a>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
