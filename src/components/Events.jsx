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
    moreHref: "#",
    registerHref: "#",
  },
  {
    title: "(Session Two) Open Door Prayer and Prophetic Expo February 2026",
    date: "26TH FEB 2026",
    price: "20 USD",
    venue: "Online (Zoom)",
    desc: "A curated evening of art, conversation, and community.",
    img: progfeb,
    moreHref: "#",
    registerHref: "#",
  },
];

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

                    <div className="mt-4 flex gap-3">
                      <a
                        href={e.moreHref}
                        className="inline-flex w-full items-center justify-center border border-black/20 bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-500 hover:text-white transition"
                      >
                        More
                      </a>

                      <a
                        href={e.registerHref}
                        className="inline-flex w-full items-center justify-center border border-black bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 hover:text-black transition"
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
