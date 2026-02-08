import { Link } from "react-router-dom";
import Container from "./ui/Container";
import { featuredEvent } from "../data/events";

export default function Events() {
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
        @keyframes eventGlow {
          0% {
            box-shadow: 0 0 0 2px rgba(156, 163, 175, 0.35), 0 0 34px rgba(156, 163, 175, 0.45);
            border-color: rgba(156, 163, 175, 0.45);
            transform: scale(1);
          }
          33% {
            box-shadow: 0 0 0 2px rgba(107, 114, 128, 0.35), 0 0 34px rgba(107, 114, 128, 0.45);
            border-color: rgba(107, 114, 128, 0.45);
            transform: scale(1.01);
          }
          66% {
            box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.35), 0 0 34px rgba(255, 255, 255, 0.45);
            border-color: rgba(255, 255, 255, 0.45);
            transform: scale(1.005);
          }
          100% {
            box-shadow: 0 0 0 2px rgba(156, 163, 175, 0.35), 0 0 34px rgba(156, 163, 175, 0.45);
            border-color: rgba(156, 163, 175, 0.45);
            transform: scale(1);
          }
        }
      `}</style>

      {/* Background light blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-40 -left-40 h-[420px] w-[420px] rounded-full bg-[#9ca3af]/20 blur-3xl"
          style={{ animation: "slowPulse 14s ease-in-out infinite" }}
        />
        <div
          className="absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-[#6b7280]/20 blur-3xl"
          style={{ animation: "slowPulse 18s ease-in-out infinite" }}
        />
      </div>

      <Container className="relative py-14 md:py-20">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-extrabold tracking-tight md:text-5xl">
            Events
          </h2>

          <p className="mt-4 text-sm md:text-base text-white/75">
          Click on the poster below to register.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to={featuredEvent.detailsHref}
            aria-label={`View details for ${featuredEvent.title}`}
            className="
              group relative overflow-hidden border border-white/15
              bg-white shadow-[0_12px_30px_rgba(0,0,0,0.25)]
              transition duration-300 block
              hover:-translate-y-[2px]
              hover:shadow-[0_18px_60px_rgba(255,255,255,0.35)]
            "
            style={{ animation: "eventGlow 6.5s ease-in-out infinite" }}
          >
            <img
              src={featuredEvent.img}
              alt={featuredEvent.title}
              className="
                absolute inset-0 h-full w-full object-cover
                transition-transform duration-700
                group-hover:scale-[1.03]
              "
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/25" />

            <div className="relative aspect-[3/4]">
              <div className="absolute left-4 top-4 bg-black/40 px-3 py-1 text-xs font-semibold backdrop-blur">
                {featuredEvent.price}
              </div>

              <div className="absolute inset-x-0 bottom-0">
                <div className="border border-white/10 bg-black/70 backdrop-blur-sm p-4">
                  <p className="text-lg font-semibold text-white/70">
                    {featuredEvent.date}
                  </p>

                  <h3 className="mt-2 text-lg font-extrabold tracking-tight">
                    {featuredEvent.title}
                  </h3>

                  <p className="mt-1 text-xs text-white/70">{featuredEvent.venue}</p>

                  <p className="mt-3 text-sm leading-relaxed text-white/75">
                    {featuredEvent.desc}
                  </p>

                  <div className="mt-4 flex justify-center">
                    <span className="inline-flex items-center justify-center border border-black bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 hover:text-black transition">
                      Read more
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition">
              <div className="absolute inset-0 bg-white/8" />
            </div>
          </Link>
        </div>
      </Container>
    </section>
  );
}
