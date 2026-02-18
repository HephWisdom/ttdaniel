import { useMemo, useState } from "react";
import Container from "./ui/Container";
import { books, booksFallbackImage } from "../data/books";

const NEW_RELEASE_LINK = "https://buy.stripe.com/9B68wPe5K3xFb3T1GDao803";

export default function Books() {
  const [activeBook, setActiveBook] = useState(null);
  const modalDetails = useMemo(() => {
    if (!activeBook) return null;

    const { book, index } = activeBook;
    const actionLabel =
      index === 0
        ? "Ebook"
        : book.amazon
          ? "Amazon"
          : book.ebook
            ? "Ebook"
            : "Coming soon";
    const actionHref = index === 0 ? NEW_RELEASE_LINK : book.amazon || null;
    const description =
      book.details ||
      `${book.blurb} This book offers deeper biblical and practical guidance for personal transformation, growth, and daily Christian living.`;

    return { book, actionLabel, actionHref, description };
  }, [activeBook]);

  return (
    <section id="books" className="bg-[#f5f1e8] text-[#1b1711]">
      <style>{`
        @keyframes featuredGlow {
          0%, 100% {
            box-shadow: 0 24px 60px -36px rgba(0,0,0,0.42), 0 0 0 1px rgba(170,136,82,0.48), inset 0 0 0 1px rgba(255,255,255,0.45);
          }
          50% {
            box-shadow: 0 32px 85px -34px rgba(0,0,0,0.52), 0 0 0 1px rgba(170,136,82,0.65), inset 0 0 0 1px rgba(255,255,255,0.6);
          }
        }
      `}</style>
      <Container className="py-20 md:py-24">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7d6642]">
          Book Collection
        </p>
        <h2 className="mt-3 text-[36px] font-black uppercase tracking-tight md:text-[42px]">
          Books
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#4e4336] md:text-base">
          <span className="font-bold">Note:</span> Amazon prices may differ from
          the listed prices on this site. Grab your copy of the book at its
          original prices by email: ttdanielplus@gmail.com.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((pkg, idx) => {
            const isFeatured =
              idx === 0 &&
              pkg.title === "ACCESS PORTALS FOR SUPERNATURAL BREAKTHROUGHS";
            const priceTag =
              idx === 0 && typeof pkg.price === "string" && /coming soon/i.test(pkg.price)
                ? "New Release"
                : pkg.price;
            const label =
              idx === 0
                ? "Ebook"
                : pkg.amazon
                  ? "Amazon"
                  : pkg.ebook
                    ? "Ebook"
                    : "Coming soon";
            const href =
              idx === 0
                ? NEW_RELEASE_LINK
                : pkg.amazon || (pkg.ebook ? "#books" : null);
            const opensNewTab = idx === 0 || Boolean(pkg.amazon);

            return (
              <article
                key={pkg.title + idx}
                className={`group relative mx-auto flex w-full max-w-[340px] flex-col overflow-hidden rounded-[26px] border bg-gradient-to-b from-[#fbf8f2] to-[#efe4cf] transition-all duration-500 hover:-translate-y-1.5 ${
                  isFeatured
                    ? "border-[#aa8852]/80 shadow-[0_24px_60px_-36px_rgba(0,0,0,0.42)]"
                    : "border-[#cab28a]/70 shadow-[0_22px_56px_-36px_rgba(0,0,0,0.34)] hover:border-[#b79862]/70 hover:shadow-[0_32px_86px_-36px_rgba(0,0,0,0.45)]"
                }`}
                style={isFeatured ? { animation: "featuredGlow 2.8s ease-in-out infinite" } : undefined}
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  {isFeatured && (
                    <>
                      <span className="absolute right-[-50px] top-5 z-20 w-[190px] rotate-45 border-y border-[#f3deab] bg-[#8f1e1c] py-1 text-center text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#fff5da] shadow-[0_8px_22px_rgba(0,0,0,0.35)]">
                        New Release
                      </span>
                    </>
                  )}
                  <img
                    src={pkg.image}
                    alt={pkg.title.replace(/\n/g, " ")}
                    onError={(e) => {
                      e.currentTarget.src = booksFallbackImage;
                    }}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.05]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent" />
                  <span className="absolute left-4 top-4 inline-flex items-center rounded-full border border-[#f0d7a7]/60 bg-[#20170d]/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#f3d9a2] backdrop-blur-sm">
                    {priceTag}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <h3 className="whitespace-pre-line text-[15px] font-bold uppercase tracking-[0.02em] text-[#231a11]">
                    {pkg.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#5d4e3d]">
                    {pkg.blurb || "A timeless and practical guide. Add this title to your personal library."}
                    {" "}
                    <button
                      type="button"
                      onClick={() => setActiveBook({ book: pkg, index: idx })}
                      className="inline font-semibold text-[#8f6b32] underline decoration-[#8f6b32]/60 underline-offset-2 transition hover:text-[#3a2b15] hover:decoration-[#3a2b15]"
                    >
                      Read more
                    </button>
                  </p>

                  {href ? (
                    <a
                      href={href}
                      target={opensNewTab ? "_blank" : undefined}
                      rel={opensNewTab ? "noopener noreferrer" : undefined}
                      aria-label={`${pkg.title.replace(/\n/g, " ")} ${label}`}
                      className="mt-auto inline-flex h-11 w-full items-center justify-center rounded-md border border-[#2b2116] bg-[#22180f] text-sm font-semibold uppercase tracking-[0.12em] text-[#f7e9cc] transition hover:border-[#6d5530] hover:bg-[#f5ead2] hover:text-[#231a11]"
                    >
                      {label}
                    </a>
                  ) : (
                    <span className="mt-auto inline-flex h-11 w-full cursor-not-allowed items-center justify-center rounded-md border border-[#bfa785]/55 bg-[#e8dcc8] text-sm font-semibold uppercase tracking-[0.12em] text-[#7a6a55]">
                      {label}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </Container>
      {modalDetails ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/65 p-4 backdrop-blur-[2px]"
          onClick={() => setActiveBook(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="book-details-title"
        >
          <div
            className="flex h-[82vh] w-full max-w-2xl flex-col rounded-2xl border border-[#c4ac84] bg-[#fffaf0] p-6 shadow-[0_38px_88px_-42px_rgba(0,0,0,0.8)] md:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7a6242]">
                  Book Details
                </p>
                <h3
                  id="book-details-title"
                  className="mt-2 whitespace-pre-line text-xl font-extrabold uppercase leading-tight text-[#20160d] md:text-2xl"
                >
                  {modalDetails.book.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveBook(null)}
                className="inline-flex items-center justify-center text-3xl leading-none text-[#3b2a18] transition hover:text-black"
                aria-label="Close book details"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid min-h-0 flex-1 gap-4 sm:grid-cols-[180px_1fr]">
              <img
                src={modalDetails.book.image}
                alt={modalDetails.book.title.replace(/\n/g, " ")}
                onError={(e) => {
                  e.currentTarget.src = booksFallbackImage;
                }}
                className="hidden h-[230px] w-full rounded-xl border border-[#d8c59f] object-cover sm:block"
                loading="lazy"
              />
              <div className="flex min-h-0 flex-col">
                <p className="inline-flex rounded-full border border-[#d7c39f] bg-[#efe1c8] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#3a2b16]">
                  {modalDetails.book.price}
                </p>
                <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                  <p className="text-sm leading-relaxed text-[#4a3b2a]">
                    {modalDetails.description}
                  </p>
                </div>
                {modalDetails.actionHref ? (
                  <a
                    href={modalDetails.actionHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex h-10 items-center justify-center rounded-md border border-[#2b2116] bg-[#22180f] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#f7e9cc] transition hover:border-[#6d5530] hover:bg-[#f5ead2] hover:text-[#231a11]"
                  >
                    {modalDetails.actionLabel}
                  </a>
                ) : (
                  <span className="mt-5 inline-flex h-10 items-center justify-center rounded-md border border-[#bfa785]/55 bg-[#e8dcc8] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#7a6a55]">
                    {modalDetails.actionLabel}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
