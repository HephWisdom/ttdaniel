import { useMemo, useState } from "react";

const ASSETS = {
  gradientBg:
    "https://images.squarespace-cdn.com/content/v1/63b7280f1480f03182fa6b95/34057b75-9832-4b08-903a-6f156bbcd605/shutterstock_593374547_Gradient.png",
  mountain:
    "https://images.squarespace-cdn.com/content/v1/63b7280f1480f03182fa6b95/2298fa28-5f3a-4142-b7bf-a688bcf45415/Singularity_Mountain",
  portrait:
    "https://images.squarespace-cdn.com/content/v1/6840accb86e5321190dcf300/7f7c6d93-76c1-41bf-b6b2-f1c5d4574d83/Hus%2BBW.png",
  mantra:
    "https://images.squarespace-cdn.com/content/v1/6840accb86e5321190dcf300/f18ab204-fd23-42fd-a788-0d68023cd0ed/mantra.png",
  logo:
    "https://images.squarespace-cdn.com/content/v1/6840accb86e5321190dcf300/e76d2872-b6f1-4d84-9345-a1d71332a394/Hus%2BLogo.png",
  ring:
    "https://images.squarespace-cdn.com/content/v1/63b7280f1480f03182fa6b95/5c92c991-ba98-4ad7-8c3a-bc3158189a5d/Ellipse%2B36.png",
};

function Container({ children }) {
  return <div className="mx-auto max-w-6xl px-4">{children}</div>;
}

function cn(...c) {
  return c.filter(Boolean).join(" ");
}

export default function HomeExact() {
  const [menuOpen, setMenuOpen] = useState(false);

  const packages = useMemo(
    () => [
      { title: "Pitch-Deck Essentials", price: "€199.00", tag: "Pitch" },
      { title: "Financial-Model Precision", price: "€499.00", tag: "Forecast" },
      { title: "Deck + Model Synergy", price: "€699.00", tag: "Unify" },
      { title: "Strategic Blueprint", price: "€1,499.00", tag: "Blueprint" },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header (Squarespace-like) */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-black/10">
        <Container>
          <div className="h-16 flex items-center justify-between">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="text-sm"
              aria-expanded={menuOpen}
            >
              {menuOpen ? "Close Menu" : "Open Menu"}
            </button>

            <div className="text-sm font-medium">El Tayeb</div>

            <div className="hidden md:flex items-center gap-6 text-sm">
              <a href="#" onClick={(e) => e.preventDefault()} className="hover:underline">
                Login Account
              </a>
              <a href="#" onClick={(e) => e.preventDefault()} className="hover:underline">
                CART ( 0 )
              </a>
              <a href="#packages" className="hover:underline">
                Packages
              </a>
            </div>

            <div className="md:hidden text-sm">
              <a href="#packages" className="hover:underline">
                CART ( 0 )
              </a>
            </div>
          </div>

          {menuOpen && (
            <div className="md:hidden pb-4 text-sm">
              <div className="grid gap-2 border border-black/10 rounded-2xl p-3 bg-white">
                <a href="#packages" onClick={() => setMenuOpen(false)} className="py-2 hover:underline">
                  Packages
                </a>
                <a href="#" onClick={(e) => e.preventDefault()} className="py-2 hover:underline">
                  Login Account
                </a>
                <a href="#" onClick={(e) => e.preventDefault()} className="py-2 hover:underline">
                  CART ( 0 )
                </a>
              </div>
            </div>
          )}
        </Container>
      </header>

      {/* HERO with the exact background image */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-center bg-cover"
          style={{ backgroundImage: `url(${ASSETS.gradientBg})` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-black/10" aria-hidden="true" />

        <Container>
          <div className="py-20 md:py-28">
            <h1 className="text-4xl md:text-6xl font-semibold leading-[1.05]">
              Decisive Excellence with kindiness
            </h1>
            <p className="mt-6 max-w-2xl text-base md:text-lg text-black/80">
              Decisive strategy for ventures poised at the horizon of growth and good. With insight,
              rigor, and compassionate counsel
            </p>
          </div>
        </Container>
      </section>

      {/* ABOUT + mountain */}
      <section className="relative">
        <Container>
          <div className="py-12 md:py-16 grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-2xl font-semibold">el tayeb</h2>
              <ul className="mt-6 space-y-3 text-black/80">
                <li>• Crafting clarity from complexity, we guide capital toward purpose.</li>
                <li>
                  • From incisive business plans and investor-ready decks to precision financial models
                  and fractional CFO stewardship, El Tayeb turns ambition into measured impact.
                </li>
                <li>
                  • We stand where decisive finance meets quiet kindness—illuminating pathways for
                  ventures that aspire to profit and uplift in equal measure.
                </li>
              </ul>
            </div>

            <div className="relative">
              <div className="rounded-3xl overflow-hidden border border-black/10">
                <img
                  src={ASSETS.mountain}
                  alt="Black and white image of mountain"
                  className="w-full h-auto object-cover"
                  loading="lazy"
                />
              </div>
              <img
                src={ASSETS.ring}
                alt=""
                className="pointer-events-none absolute -bottom-6 -right-6 h-20 w-20 opacity-80"
                loading="lazy"
              />
            </div>
          </div>
        </Container>
      </section>

      {/* Divider (Squarespace shows a horizontal rule) */}
      <div className="border-t border-black/10" />

      {/* MANTRA + portrait/logo cluster + quote */}
      <section className="relative">
        <Container>
          <div className="py-10 md:py-14 grid gap-8 md:grid-cols-3 md:items-start">
            <div className="md:col-span-2 space-y-6">
              <div className="border border-black/10 rounded-2xl overflow-hidden bg-white">
                <img src={ASSETS.mantra} alt="Mantra" className="w-full h-auto" loading="lazy" />
              </div>

              <blockquote className="text-lg md:text-xl">
                “Let the beauty we love be what we do”
                <div className="mt-2 text-sm text-black/60">Jalāl al-Dīn Rūmī</div>
              </blockquote>
            </div>

            <div className="grid gap-4">
              <div className="border border-black/10 rounded-2xl overflow-hidden bg-white">
                <img src={ASSETS.logo} alt="Logo" className="w-full h-auto" loading="lazy" />
              </div>

              <div className="border border-black/10 rounded-2xl overflow-hidden bg-white">
                <img src={ASSETS.portrait} alt="Portrait" className="w-full h-auto" loading="lazy" />
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* PACKAGES */}
      <section id="packages" className="relative">
        <Container>
          <div className="py-12 md:py-16">
            <h3 className="text-xl md:text-2xl font-semibold">Investment Readiness Packages</h3>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {packages.map((p) => (
                <a
                  key={p.title}
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className={cn(
                    "rounded-3xl border border-black/10 p-6 bg-white",
                    "hover:border-black/20 hover:shadow-sm transition"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-base font-semibold leading-snug">{p.title}</div>
                  </div>

                  <div className="mt-4 text-sm text-black/70">{p.price}</div>

                  <div className="mt-6 inline-flex items-center rounded-full border border-black/15 px-3 py-1 text-xs">
                    {p.tag}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-black/10">
        <Container>
          <div className="py-10 text-center">
            <div className="text-2xl font-semibold">always grateful</div>
            <div className="mt-2 text-xs text-black/60">El Tayeb B.V.</div>
          </div>
        </Container>
      </footer>
    </div>
  );
}
