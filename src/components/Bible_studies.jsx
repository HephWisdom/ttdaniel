import Container from "./ui/Container";
import SectionTitle from "./ui/SectionTitle";

export default function Bible_studies() {
  return (
    <section id="bible_studies">
      <Container className="py-14 md:py-20">
        <div className="rounded-3xl border border-black/10 bg-white p-8 shadow-sm md:p-12">
          <SectionTitle

            title="Bible studies"
            desc="Gather, grow, and go deeper together."
          />

          <div className="mt-10 flex items-center justify-center">
            <div className="relative w-full max-w-2xl overflow-hidden text-center">
              <div
                className="pointer-events-none absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-emerald-400/30 blur-3xl"
                aria-hidden="true"
              />
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-black/50">
                Coming soon
              </p>
              <h3 className="mt-3 text-3xl font-extrabold tracking-tight text-black md:text-4xl">
                We’re preparing something special
              </h3>
              <p className="mt-4 text-sm text-black/70 md:text-base">
                New Bible studies are on the way. Stay tuned for dates, topics,
                and registration details.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
