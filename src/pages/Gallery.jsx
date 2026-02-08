import Container from "../components/ui/Container";

const galleryModules = import.meta.glob("../assets/gallery/*.{jpg,jpeg,png,webp}", {
  eager: true,
  import: "default",
});

const galleryImages = Object.entries(galleryModules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, src]) => {
    const filename = path.split("/").pop() || "gallery-image";
    const label = filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
    return { src, alt: `TT Daniel ${label}` };
  });

const TILE_PATTERNS = [
  "col-span-12 sm:col-span-6 lg:col-span-8 row-span-3 sm:row-span-4",
  "col-span-6 sm:col-span-3 lg:col-span-4 row-span-2 sm:row-span-3",
  "col-span-6 sm:col-span-3 lg:col-span-4 row-span-2 sm:row-span-3",
  "col-span-12 sm:col-span-6 lg:col-span-5 row-span-3 sm:row-span-4",
  "col-span-12 sm:col-span-6 lg:col-span-7 row-span-2 sm:row-span-3",
];

export default function Gallery() {
  return (
    <main className="bg-black text-white">
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 via-black to-black">
        <Container className="py-14 md:py-20">
          <p className="text-xs uppercase tracking-[0.2em] text-orange-300">Gallery</p>
          <h1 className="mt-3 text-4xl font-black uppercase tracking-tight md:text-6xl">
            TT Daniel Images
          </h1>
          <p className="mt-4 max-w-2xl text-white/75">
            A full collection of portraits. Tap any image to view details in your browser.
          </p>
        </Container>
      </section>

      <section>
        <Container className="py-10 md:py-14">
          <div className="grid auto-rows-[110px] grid-cols-12 gap-3 sm:auto-rows-[130px] md:auto-rows-[150px] md:gap-4">
            {galleryImages.map((image, index) => (
              <figure
                key={image.alt}
                className={`group relative overflow-hidden rounded-xl ${
                  TILE_PATTERNS[index % TILE_PATTERNS.length]
                }`}
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  loading="lazy"
                  className="h-full w-full object-contain transition duration-500 group-hover:scale-[1.03]"
                />
              </figure>
            ))}
          </div>
        </Container>
      </section>
    </main>
  );
}
