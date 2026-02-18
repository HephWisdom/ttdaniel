import { useEffect, useMemo, useRef, useState } from "react";
import Container from "../components/ui/Container";

const galleryModules = import.meta.glob("../assets/gallery/*.{jpg,jpeg,png,webp}", {
  eager: true,
  import: "default",
});

const galleryImages = Object.entries(galleryModules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, src]) => {
    const filename = path.split("/").pop() || "gallery-image";
    const label = filename
      .replace(/\.[^.]+$/, "")
      .replace(/[-_]+/g, " ")
      .replace(/\bwa\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    return { src, alt: `TT Daniel ${label}`, label };
  });

const TILE_PATTERNS = [
  "col-span-12 sm:col-span-6 lg:col-span-7 row-span-3 sm:row-span-4",
  "col-span-6 sm:col-span-3 lg:col-span-5 row-span-2 sm:row-span-3",
  "col-span-6 sm:col-span-3 lg:col-span-5 row-span-2 sm:row-span-3",
  "col-span-12 sm:col-span-6 lg:col-span-8 row-span-3 sm:row-span-4",
  "col-span-12 sm:col-span-6 lg:col-span-4 row-span-2 sm:row-span-3",
];

export default function Gallery() {
  const [activeIndex, setActiveIndex] = useState(null);
  const galleryGridRef = useRef(null);

  const activeImage = useMemo(
    () => (activeIndex === null ? null : galleryImages[activeIndex]),
    [activeIndex]
  );

  useEffect(() => {
    if (!activeImage) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setActiveIndex(null);
      } else if (event.key === "ArrowRight") {
        setActiveIndex((prev) => (prev + 1) % galleryImages.length);
      } else if (event.key === "ArrowLeft") {
        setActiveIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeImage]);

  useEffect(() => {
    const grid = galleryGridRef.current;
    if (!grid) return undefined;

    const tiles = Array.from(grid.querySelectorAll("[data-reveal-tile]"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { root: null, threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
    );

    tiles.forEach((tile) => observer.observe(tile));
    return () => observer.disconnect();
  }, []);

  const handleTileMove = (event) => {
    const tile = event.currentTarget;
    const image = tile.querySelector("img");
    if (!image) return;

    const rect = tile.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const dx = (x - rect.width / 2) / rect.width;
    const dy = (y - rect.height / 2) / rect.height;
    const tx = dx * 18;
    const ty = dy * 18;
    const rz = dx * 2.2;

    image.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(1.065) rotate(${rz}deg)`;
  };

  const resetTileMove = (event) => {
    const image = event.currentTarget.querySelector("img");
    if (!image) return;
    image.style.transform = "translate3d(0, 0, 0) scale(1) rotate(0deg)";
  };

  const showPrev = () => {
    setActiveIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  const showNext = () => {
    setActiveIndex((prev) => (prev + 1) % galleryImages.length);
  };

  return (
    <main className="bg-black text-white">
      <section className="relative overflow-hidden bg-gradient-to-b from-zinc-950 via-black to-black">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 top-8 h-56 w-56 rounded-full bg-orange-500/18 blur-3xl md:h-72 md:w-72" />
          <div className="absolute right-[-40px] top-10 h-56 w-56 rounded-full bg-cyan-400/14 blur-3xl md:h-72 md:w-72" />
          <div className="absolute left-1/3 top-1/2 h-52 w-52 -translate-y-1/2 rounded-full bg-violet-500/12 blur-3xl md:h-64 md:w-64" />
        </div>
        <Container className="relative py-14 md:py-20">
          <p className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/85">
            Curated Collection
          </p>
          <h1 className="mt-4 text-4xl font-black uppercase tracking-tight md:text-6xl">
            Gallery
          </h1>
          <p className="mt-4 max-w-2xl text-white/75 md:text-lg">
            A premium visual archive of portraits and moments. Hover for color, click any image for fullscreen view.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-white/80">
              {galleryImages.length} Images
            </span>
            <span className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-white/80">
              Interactive View
            </span>
          </div>
        </Container>
      </section>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 top-16 h-72 w-72 rounded-full bg-orange-500/16 blur-3xl md:h-96 md:w-96" />
          <div className="absolute right-[-60px] top-1/3 h-72 w-72 rounded-full bg-cyan-400/14 blur-3xl md:h-[28rem] md:w-[28rem]" />
          <div className="absolute bottom-[-40px] left-1/3 h-64 w-64 rounded-full bg-rose-500/12 blur-3xl md:h-80 md:w-80" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:34px_34px] opacity-[0.18]" />
        </div>

        <Container className="relative py-6 md:py-8">
          <div
            ref={galleryGridRef}
            className="grid auto-rows-[100px] grid-cols-12 gap-1.5 sm:auto-rows-[125px] md:auto-rows-[145px] md:gap-2"
          >
            {galleryImages.map((image, index) => (
              <figure
                key={image.alt}
                data-reveal-tile
                onMouseMove={handleTileMove}
                onMouseLeave={resetTileMove}
                onClick={() => setActiveIndex(index)}
                className={`group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] ${
                  TILE_PATTERNS[index % TILE_PATTERNS.length]
                }`}
                style={{
                  opacity: 0,
                  transform: "translate3d(0, 36px, 0) scale(0.985)",
                  transition:
                    "opacity 650ms cubic-bezier(0.22, 1, 0.36, 1), transform 650ms cubic-bezier(0.22, 1, 0.36, 1)",
                  transitionDelay: `${(index % 6) * 70}ms`,
                }}
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  loading="lazy"
                  className="h-full w-full cursor-zoom-in object-cover grayscale-[95%] transition-[transform,filter] duration-500 ease-out will-change-transform group-hover:grayscale-0"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/20 opacity-0 transition duration-300 group-hover:opacity-100" />
                <figcaption className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-end justify-between opacity-0 transition duration-300 group-hover:opacity-100">
                  <p className="line-clamp-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/90">
                    {image.label || "Portrait"}
                  </p>
                  <span className="rounded-full border border-white/30 bg-black/45 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/95">
                    View
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </Container>
      </section>

      <style>{`
        [data-reveal-tile].is-visible {
          opacity: 1 !important;
          transform: translate3d(0, 0, 0) scale(1) !important;
        }
      `}</style>

      {activeImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/94 p-4"
          onClick={() => setActiveIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_50%)]" />

          <button
            type="button"
            onClick={() => setActiveIndex(null)}
            className="absolute right-5 top-5 rounded-full border border-white/30 bg-black/50 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
            aria-label="Close image viewer"
          >
            Close
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              showPrev();
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/25 bg-black/45 px-3 py-2 text-xl font-semibold text-white transition hover:bg-white/20"
            aria-label="Previous image"
          >
            ‹
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              showNext();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/25 bg-black/45 px-3 py-2 text-xl font-semibold text-white transition hover:bg-white/20"
            aria-label="Next image"
          >
            ›
          </button>

          <div
            onClick={(event) => event.stopPropagation()}
            className="relative w-full max-w-6xl rounded-2xl border border-white/20 bg-black/40 p-3 backdrop-blur-md md:p-4"
          >
            <img
              src={activeImage.src}
              alt={activeImage.alt}
              className="max-h-[80vh] w-full rounded-xl object-contain"
            />
            <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs uppercase tracking-[0.16em] text-white/75">
              <span>{activeImage.label || "Portrait"}</span>
              <span>
                {activeIndex + 1} / {galleryImages.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
