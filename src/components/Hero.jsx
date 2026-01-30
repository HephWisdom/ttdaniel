import Container from "./ui/Container";
import Button from "./ui/Button";

const ASSETS = {
  gradientBg:
    "https://images.squarespace-cdn.com/content/v1/63b7280f1480f03182fa6b95/34057b75-9832-4b08-903a-6f156bbcd605/shutterstock_593374547_Gradient.png",
  mountain:
    "https://images.squarespace-cdn.com/content/v1/63b7280f1480f03182fa6b95/2298fa28-5f3a-4142-b7bf-a688bcf45415/Singularity_Mountain",
  toiImage:
    "/src/assets/bird.png",
};

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        /* Cleaner "blue background removal" for the bird (best-effort CSS) */
        .bird-clean {
          filter: grayscale(100%) contrast(1.25) brightness(1.1);
          mix-blend-mode: luminosity;
        }
      `}</style>

      {/* Background image */}
      <div
        className="absolute inset-0 bg-center bg-cover"
        style={{ backgroundImage: `url(${ASSETS.gradientBg})` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-black/10" aria-hidden="true" />

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

          {/* 🕊️ BIRD IMAGE — CENTERED, BACKGROUND REMOVED, IN FRONT */}
          <div className="pointer-events-none absolute z-50 bottom-32 left-1/2 -translate-x-1/2">
            <img
              src={ASSETS.toiImage}
              alt="Bird"
              className="
                bird-clean
                -scale-x-100
                + scale-110
                bird-clean
                -scale-x-100
                w-80 sm:w-96 md:w-[28rem] lg:w-[34rem] xl:w-[40rem]
                drop-shadow-[0_18px_40px_rgba(0,0,0,0.35)]
              "
              style={{
                WebkitMaskImage:
                  "radial-gradient(circle at 50% 55%, black 65%, transparent 92%)",
                maskImage:
                  "radial-gradient(circle at 50% 55%, black 65%, transparent 92%)",
              }}
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function MarqueeText() {
  return (
    <div className="flex items-center gap-[6vw] pr-[6vw]">
      <span
        className="
          font-semibold tracking-[-0.02em]
          text-white
          leading-none
          text-[22vw]
          sm:text-[20vw]
          md:text-[18vw]
          lg:text-[25vw]
        "
      >
        EXCELLENCE KINDNESS GLORY ROYALY 
      </span>
    </div>
  );
}
