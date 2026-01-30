import Container from "./ui/Container";

const ASSETS = {
  portrait: "/assets/tt daniel.jpeg",
};

export default function AboutInterludeExact() {
  return (
    <section id="about" className="relative overflow-hidden bg-[#0b0b0b]">

      {/* ===== BACKGROUND (matches reference) ===== */}
      {/* Base charcoal */}
      <div className="absolute inset-0 bg-[#0b0b0b]" />

      {/* Soft top light */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-black/[0.65]" />

      {/* Left-side light source */}
      <div className="pointer-events-none absolute inset-0
        bg-[radial-gradient(1200px_700px_at_30%_15%,rgba(255,255,255,0.06),transparent_60%)]"
      />

      {/* Vignette */}
      <div className="pointer-events-none absolute inset-0
        bg-[radial-gradient(900px_600px_at_70%_60%,rgba(0,0,0,0.6),transparent_55%)]"
      />


      {/* ===== CONTENT ===== */}
      <Container className="relative py-14 md:py-20 text-white">
        <div className="grid md:grid-cols-12 gap-10">

          {/* LEFT COLUMN */}
          <div className="md:col-span-6">
            <h2 className="text-6xl font-extrabold tracking-tight md:text-7xl">
              TT DANIEL
            </h2>

            <ul className="mt-8 max-w-md list-disc space-y-5 pl-5 text-sm leading-relaxed text-white/80">
              <li>Crafting clarity from complexity, we guide capital toward purpose.</li>
              <li>
                From incisive business plans and investor-ready decks to precision
                financial models and fractional CFO stewardship, TT Daneil turns
                ambition into measured impact.
              </li>
              <li>
                We stand where decisive finance meets quiet kindness—illuminating
                pathways for ventures that aspire to profit and uplift in equal
                measure.
              </li>
            </ul>
          </div>

          {/* RIGHT COLUMN (portrait + mantra) */}
          <div className="md:col-span-6 relative">
            <div
              className="
                relative z-10
                mt-12 sm:mt-16 md:mt-28
                w-[clamp(100%,110vw,120%)]
                pr-[clamp(80px,8vw,80px)]
              "
            >
              <div className="relative overflow-hidden bg-zinc-900 shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
                <div className="h-[420px] sm:h-[520px] md:h-[700px] lg:h-[950px]">
                  <img
                    src={ASSETS.portrait}
                    alt="Portrait"
                    className="
                      w-full h-full
                      object-cover object-top
                      grayscale
                      contrast-125
                      brightness-95
                      hover:grayscale-0
                      transition duration-700
                    "
                    loading="lazy"
                  />
                </div>

                {/* MANTRA — face-safe, bottom anchored */}
                <div className="pointer-events-none absolute inset-0 z-[40] flex items-end justify-start">
                  <div
                    className="
                      bg-white text-black shadow-[0_30px_90px_rgba(0,0,0,0.55)]
                      px-4 py-4 sm:px-6 sm:py-6 md:px-10 md:py-8
                      mb-10 sm:mb-12 md:mb-14 lg:mb-16
                    "
                  >
                    <p className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-extrabold leading-none tracking-tight">
                      FATHER
                      <br /><br />
                      PRIEST
                      <br /><br />
                      KING
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </Container>
    </section>
  );
}
