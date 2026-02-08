import { useState } from "react";
import Container from "../components/ui/Container";
import { eventDetailSessions } from "../data/events";

export default function EventDetails() {
  const [activeFormUrl, setActiveFormUrl] = useState("");
  const isModalOpen = Boolean(activeFormUrl);

  return (
    <section
      id="event-details"
      className="relative bg-white font-mono text-black overflow-hidden"
    >
      <style>{`
        @keyframes slowPulse {
          0%, 100% { transform: scale(1); opacity: 0.12; }
          50% { transform: scale(1.08); opacity: 0.18; }
        }
      `}</style>

      {/* Background light blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-40 -left-40 h-[420px] w-[420px] rounded-full bg-black/5 blur-3xl"
          style={{ animation: "slowPulse 14s ease-in-out infinite" }}
        />
        <div
          className="absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-black/5 blur-3xl"
          style={{ animation: "slowPulse 18s ease-in-out infinite" }}
        />
      </div>

      <Container className="relative py-14 md:py-20">
        {isModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Event registration form"
            onClick={() => {
              setActiveFormUrl("");
            }}
          >
            <div
              className="relative w-full max-w-3xl overflow-hidden rounded-lg border border-white/20 bg-black"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="absolute right-3 top-3 z-10 rounded-full border border-white/30 bg-black/70 px-3 py-1 text-xs font-semibold text-white hover:bg-white hover:text-black transition"
                onClick={() => {
                  setActiveFormUrl("");
                }}
                aria-label="Close dialog"
              >
                Close
              </button>

              <div className="h-[80vh] w-full max-h-[820px] md:h-[85vh]">
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

        <div className="max-w-2xl text-center mx-auto">
          <h2 className="text-3xl font-extrabold tracking-tight md:text-5xl text-purple-700">
            Open Door Prayer and Prophetic Expo February 2026          
          </h2>
     
          <p className="mt-4 text-base md:text-lg text-black/80 leading-relaxed">
            What is God doing this season in your personal life and in your land? Do you have the eyes that see what
            God is doing or the ears that hear what God is saying this year 2026? How different would your life be if
            you knew the mind of God for the year concerning you and your loved ones? You will discover these and many
            more at the Open Door Prayer and Prophetic Expo February 2026. This event is strictly by registration only.
          </p>
          <div className="mt-6 rounded-2xl border border-black/10 bg-black/[0.02] p-5 md:p-6 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-black/60">
              Select Your Session Below:
            </p>
            <ol className="mt-4 space-y-4 text-sm md:text-base text-black/80 leading-relaxed">
              <li>
                <span className="font-semibold text-black">
                  1. General Prayer and Prophetic Session. 
                </span>
                {" "}
                Join us online for a powerful session of prayer and prophetic ministration.
              </li>
              <li>
                <span className="font-semibold text-black">
                  2. Private Prophetic Consultation and Counseling .
                </span>
                {" "}
                Book a private session with our servants of God for personalized prayer and prophetic counsel(27TH FEB 2026)
              </li>
            </ol>
          </div>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {eventDetailSessions.map((e) => {
            const auraClass =
              e.kind === "donation"
                ? "border-2 border-pink-400/70 shadow-[0_0_0_2px_rgba(236,72,153,0.25),0_0_40px_rgba(236,72,153,0.45)] hover:shadow-[0_0_0_2px_rgba(236,72,153,0.35),0_0_60px_rgba(236,72,153,0.65)]"
                : e.kind === "one-on-one"
                  ? "border-2 border-amber-400/70 shadow-[0_0_0_2px_rgba(234,179,8,0.3),0_0_40px_rgba(234,179,8,0.5)] hover:shadow-[0_0_0_2px_rgba(234,179,8,0.4),0_0_60px_rgba(234,179,8,0.7)]"
                  : "border border-black/10";
            return (
            <article
              key={e.title}
              className={`group relative overflow-hidden ${auraClass}
                bg-white shadow-[0_12px_30px_rgba(0,0,0,0.18)]
                transition duration-300
                hover:-translate-y-[2px]
                hover:shadow-[0_18px_60px_rgba(0,0,0,0.2)]
                `}
            >
              {/* Full image background */}
              <img
                src={e.img}
                alt={e.title}
                className="
                  absolute inset-0 h-full w-full object-cover
                  transition-transform duration-700
                  group-hover:scale-[1.03]
                "
                loading="lazy"
              />

              {/* Dark tint for contrast */}
              <div className="absolute inset-0 bg-black/10" />

                {/* Card ratio */}
                <div className="relative aspect-[3/4]">
                  {/* Price badge */}
                  {e.kind !== "one-on-one" && (
                    <div className="absolute left-4 top-4 bg-black/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                      {e.price}
                    </div>
                  )}
                {/* Bottom overlay */}
                <div className="absolute inset-x-0 bottom-0">
                <div className="border border-black/10 bg-white/90 backdrop-blur-sm p-4">
                    <p className="text-base font-semibold text-black/70">{e.date}</p>

                    <h3 className="mt-2 text-lg font-extrabold tracking-tight">
                      {e.title}
                    </h3>

                    <p className="mt-1 text-sm text-black/70">{e.venue}</p>

                    <p className="mt-3 text-sm leading-relaxed text-black/80">
                      {e.desc}
                    </p>

                    <div className="mt-4 flex justify-center">
                      {e.kind === "donation" ? (
                        <div className="w-full space-y-3">
                          <a
                            href={e.formHref}
                            onClick={(event) => {
                              event.preventDefault();
                              setActiveFormUrl(e.formHref);
                            }}
                            className="inline-flex w-full items-center justify-center border border-black bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 hover:text-black"
                          >
                            Register + Donate
                          </a>

                        </div>
                      ) : e.kind === "one-on-one" ? (
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
                          className={`inline-flex items-center justify-center border px-4 py-2 text-sm font-semibold transition ${
                            e.formHref
                              ? "border-black bg-black text-white hover:bg-emerald-500 hover:text-black"
                              : "border-black/20 bg-white text-black/30 cursor-not-allowed"
                          }`}
                          aria-disabled={!e.formHref}
                          tabIndex={!e.formHref ? -1 : undefined}
                        >
                          Register
                        </a>
                      ) : (
                        <a
                          href={e.formHref}
                          onClick={(event) => {
                            event.preventDefault();
                            setActiveFormUrl(e.formHref);
                          }}
                          className="inline-flex items-center justify-center border border-black bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 hover:text-black transition"
                        >
                          Register
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* subtle hover highlight */}
              <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition">
                <div className="absolute inset-0 bg-black/5" />
              </div>
            </article>
          )})}
        </div>
      </Container>
    </section>
  );
}
