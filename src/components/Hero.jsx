import { Link } from "react-router-dom";
import Container from "./ui/Container";
import toiImage from "../assets/hero-image2.png";

const ASSETS = {
  gradientBg:
    "https://images.squarespace-cdn.com/content/v1/63b7280f1480f03182fa6b95/34057b75-9832-4b08-903a-6f156bbcd605/shutterstock_593374547_Gradient.png",
  mountain:
    "https://images.squarespace-cdn.com/content/v1/63b7280f1480f03182fa6b95/2298fa28-5f3a-4142-b7bf-a688bcf45415/Singularity_Mountain",
 
};

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes floatGlow {
          0%, 100% { transform: translateY(0); box-shadow: 0 0 18px rgba(255,140,0,0.55), 0 0 48px rgba(255,140,0,0.45); }
          50% { transform: translateY(-6px); box-shadow: 0 0 26px rgba(255,140,0,0.75), 0 0 70px rgba(255,140,0,0.6); }
        }

        /* Cleaner "blue background removal" for the bird (best-effort CSS) */
        .bird-clean {
          filter: grayscale(100%) contrast(1.25) brightness(1.1);
          mix-blend-mode: luminosity;
          transition: filter 300ms ease, mix-blend-mode 300ms ease;
        }
        .hero-bird:hover .bird-clean {
          filter: none;
          mix-blend-mode: normal;
        }
      `}</style>

      {/* Background image */}
      <div
        className="absolute inset-0 bg-center bg-cover"
        style={{ backgroundImage: `url(${ASSETS.gradientBg})` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-black/10" aria-hidden="true" />

      {/* Floating CTA */}
      <Link
        to="/event-details"
        className="
          fixed z-[60] top-20 right-10 -translate-y-1/2
          inline-flex items-center justify-center
          h-12 px-5
          rounded-full
          bg-orange-500 text-white
          font-bold uppercase tracking-wide
          border border-orange-300/60
          transition-transform hover:scale-[1.03] active:scale-[0.98]
        "
        style={{ animation: "floatGlow 2.6s ease-in-out infinite" }}
        aria-label="Go to event details"
      >
        Event Details
      </Link>

      {/* Marquee text BEHIND the mountain */}
      <div className="absolute inset-x-0 top-[30%] -translate-y-1/2 z-10">
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-28 bg-gradient-to-r to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-28 bg-gradient-to-l to-transparent" />

          <div
            className="flex w-[200%] whitespace-nowrap"
            style={{ animation: "marquee 22s linear infinite" }}
          >
            <MarqueeText />
          </div>
        </div>
      </div>

      {/* Foreground copy (empty in your code) */}
      <Container className="relative z-20 py-20 md:py-28">
        <div className="max-w-3xl">{/* your text/buttons if you want */}</div>
      </Container>

      {/* Mountain in FRONT — BIGGER + LEFT + blended */}
      <div className="relative z-30 -mt-28 md:-mt-44">
        <div className="relative w-full overflow-hidden">
          <img
            src={ASSETS.mountain}
            alt="Mountain"
            className="
              pointer-events-none select-none
              w-[220%] sm:w-[200%] md:w-[170%] lg:w-[150%]
              max-w-none
              -translate-x-[28%] sm:-translate-x-[30%] md:-translate-x-[26%] lg:-translate-x-[22%]
              object-cover
              brightness-[0.95] contrast-[1.05]
            "
            style={{
              WebkitMaskImage:
                "linear-gradient(to bottom, black 72%, transparent 98%)",
              maskImage: "linear-gradient(to bottom, black 72%, transparent 98%)",
            }}
            loading="lazy"
          />

          {/* blend top edge into hero */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/90 to-transparent" />

          {/* optional bottom fade */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent" />

          {/* 🕊️ HERO IMAGE — HUGE, BOTTOM CENTER */}
          <Link
            to="/gallery"
            className="hero-bird absolute z-50 bottom-0 left-1/2 -translate-x-1/2 block"
            aria-label="Open image gallery"
            title="View gallery"
          >
            <img
              src={toiImage}
              alt="Bird"
              className="
                bird-clean
                -scale-x-100
                w-[98vw] sm:w-[94vw] md:w-[78vw]
                max-w-none
                h-auto max-h-[70vh] sm:max-h-[75vh] object-contain
                drop-shadow-2xl
              "
              style={{
                WebkitMaskImage:
                  "radial-gradient(circle at 50% 55%, black 65%, transparent 92%)",
                maskImage:
                  "radial-gradient(circle at 50% 55%, black 65%, transparent 92%)",
              }}
              loading="lazy"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}

function MarqueeText() {
  return (
    <div className="relative overflow-hidden w-full">
      <div className="marquee-track flex w-max">
        <span className="marquee-text">
          GOD IS STILL MAKING PEOPLE!&nbsp;
        </span>
        <span className="marquee-text">
           GOD IS STILL MAKING PEOPLE!&nbsp;
        </span>
      </div>
    </div>
  );
}
