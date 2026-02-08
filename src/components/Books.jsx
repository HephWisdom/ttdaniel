import Container from "./ui/Container";
import { books, booksFallbackImage } from "../data/books";

export default function Books() {
  return (
    <section id="books" className="bg-[#f4f4f4] text-black">
      <style>{`
        @keyframes featuredGlow {
          0%, 100% {
            box-shadow: 0 22px 55px -35px rgba(0,0,0,0.55), 0 0 0 1px rgba(212,176,111,0.35), 0 0 24px rgba(212,176,111,0.3);
          }
          50% {
            box-shadow: 0 30px 70px -35px rgba(0,0,0,0.65), 0 0 0 1px rgba(212,176,111,0.55), 0 0 42px rgba(212,176,111,0.45);
          }
        }
      `}</style>
      <Container className="py-24">
        <h2 className="text-[35px] font-extrabold uppercase tracking-tight">
          Books
        </h2>
        <p className="mt-3 max-w-2xl text-md text-gray-700">
          <span className="font-bold">Note:</span> Amazon prices may differ from
          the listed prices on this site. Grab your copy of the book at its
          original prices by email: ttdanielplus@gmail.com.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((pkg, idx) => {
            const isFeatured =
              idx === 0 &&
              pkg.title === "ACCESS PORTALS FOR SUPERNATURAL BREAKTHROUGHS";
            const label = pkg.amazon ? "Amazon" : pkg.ebook ? "Email" : "Coming soon";
            const href = pkg.amazon || (pkg.ebook ? "#books" : null);

            return (
              <article
                key={pkg.title + idx}
                className={`group mx-auto flex w-full max-w-[330px] flex-col overflow-hidden rounded-3xl border bg-white transition-all duration-300 hover:-translate-y-1 ${
                  isFeatured
                    ? "border-[#d4b06f]/70 shadow-[0_22px_55px_-35px_rgba(0,0,0,0.55)]"
                    : "border-black/10 shadow-[0_22px_55px_-35px_rgba(0,0,0,0.55)] hover:shadow-[0_30px_70px_-35px_rgba(0,0,0,0.65)]"
                }`}
                style={isFeatured ? { animation: "featuredGlow 2.8s ease-in-out infinite" } : undefined}
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  {isFeatured && (
                    <span className="absolute right-[-48px] top-5 z-20 w-[180px] rotate-45 border-y border-red-300/80 bg-red-600 py-1 text-center text-[10px] font-extrabold uppercase tracking-[0.18em] text-white shadow-[0_8px_22px_rgba(0,0,0,0.35)]">
                      New Release
                    </span>
                  )}
                  <img
                    src={pkg.image}
                    alt={pkg.title.replace(/\n/g, " ")}
                    onError={(e) => {
                      e.currentTarget.src = booksFallbackImage;
                    }}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                  <span className="absolute left-4 top-4 inline-flex items-center rounded-full border border-white/40 bg-black/55 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                    {pkg.price}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-[15px] font-semibold uppercase tracking-[0.02em] text-black whitespace-pre-line">
                    {pkg.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-black/60">
                    Grab your copy of the book now!!!
                  </p>

                  {href ? (
                    <a
                      href={href}
                      target={pkg.amazon ? "_blank" : undefined}
                      rel={pkg.amazon ? "noopener noreferrer" : undefined}
                      aria-label={`${pkg.title.replace(/\n/g, " ")} ${label}`}
                      className="mt-auto inline-flex h-11 w-full items-center justify-center border border-black bg-black text-sm font-medium uppercase tracking-wide text-white transition hover:bg-white hover:text-black"
                    >
                      {label}
                    </a>
                  ) : (
                    <span className="mt-auto inline-flex h-11 w-full cursor-not-allowed items-center justify-center border border-black/20 bg-[#f3f3f3] text-sm font-medium uppercase tracking-wide text-black/40">
                      {label}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
