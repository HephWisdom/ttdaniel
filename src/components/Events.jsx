import { useState } from "react";
import Container from "./ui/Container";
import progfeb from "../assets/26feb.jpeg";

const events = [
  {
    title: "(Session One) Open Door Prayer and Prophetic Expo February 2026",
    date: "26TH FEB 2026",
    price: "FREE",
    venue: "Online (Zoom)",
    desc: "A curated evening of art, conversation, and community.",
    img: progfeb,
    registerHref: "https://docs.google.com/forms/d/e/1FAIpQLScq-RMZqAfAWAYKQFJ4NPxPA9_10-faI_XswLP4TyP1raHLvw/viewform?usp=publish-editor",
  },
  {
    title: "(Session Two) Open Door Prayer and Prophetic Expo February 2026",
    date: "26TH FEB 2026",
    price: "20 USD",
    venue: "Online (Zoom)",
    desc: "A curated evening of art, conversation, and community.",
    img: progfeb,
    registerHref: "https://buy.stripe.com/test_aFabJ14vaecj5Jz2KHao800",
  },
];

export default function Events() {
  const [activeFormUrl, setActiveFormUrl] = useState("");
  const isModalOpen = Boolean(activeFormUrl);

  return (
    <section
      id="events"
      className="relative bg-black font-mono uppercase text-white overflow-hidden"
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
          className="absolute -top-40 -left-40 h-[420px] w-[420px] rounded-full bg-white/10 blur-3xl"
          style={{ animation: "slowPulse 14s ease-in-out infinite" }}
        />
        <div
          className="absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-white/8 blur-3xl"
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
            onClick={() => setActiveFormUrl("")}
          >
            <div
              className="relative w-full max-w-3xl overflow-hidden rounded-lg border border-white/20 bg-black"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="absolute right-3 top-3 z-10 rounded-full border border-white/30 bg-black/70 px-3 py-1 text-xs font-semibold text-white hover:bg-white hover:text-black transition"
                onClick={() => setActiveFormUrl("")}
                aria-label="Close registration form"
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

        <div className="max-w-2xl">
          <h2 className="text-3xl font-extrabold tracking-tight md:text-5xl">
            Events
          </h2>
          <p className="mt-4 text-sm md:text-base text-white/70">
            Join our events to connect, learn, and grow with like-minded individuals.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <article
              key={e.title}
              className="
                group relative overflow-hidden border border-white/15
                bg-white shadow-[0_12px_30px_rgba(0,0,0,0.25)]
                transition duration-300
                hover:-translate-y-[2px]
                hover:shadow-[0_18px_60px_rgba(255,255,255,0.35)]
              "
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
              <div className="absolute inset-0 bg-black/25" />

              {/* Card ratio */}
              <div className="relative aspect-[3/4]">
                {/* Price badge */}
                <div className="absolute left-4 top-4 bg-black/40 px-3 py-1 text-xs font-semibold backdrop-blur">
                  {e.price}
                </div>

                {/* Bottom overlay */}
                <div className="absolute inset-x-0 bottom-0">
                  <div className="border border-white/10 bg-black/70 backdrop-blur-sm p-4">
                    <p className="text-lg font-semibold text-white/70">{e.date}</p>

                    <h3 className="mt-2 text-lg font-extrabold tracking-tight">
                      {e.title}
                    </h3>

                    <p className="mt-1 text-xs text-white/70">{e.venue}</p>

                    <p className="mt-3 text-sm leading-relaxed text-white/75">
                      {e.desc}
                    </p>

                    <div className="mt-4 flex justify-center">
                      <a
                        href={e.registerHref}
                        onClick={(event) => {
                          if (e.price !== "FREE") return;
                          event.preventDefault();
                          setActiveFormUrl(e.registerHref);
                        }}
                        className="inline-flex items-center justify-center border border-black bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 hover:text-black transition"
                      >
                        Register
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* subtle hover highlight */}
              <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition">
                <div className="absolute inset-0 bg-white/8" />
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
