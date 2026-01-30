import Container from "./ui/Container";
import SectionTitle from "./ui/SectionTitle";

const steps = [
  { n: "01", t: "Choose a package", d: "Start with deck, model, or both — depending on where you are." },
  { n: "02", t: "Share your materials", d: "Deck drafts, metrics, notes, and context — we keep it simple." },
  { n: "03", t: "Refine & align", d: "We improve the story, tighten assumptions, and match claims to numbers." },
  { n: "04", t: "Deliver investor-ready", d: "You receive clean deliverables and guidance for presenting confidently." },
];

export default function Process() {
  return (
    <section id="process" className="relative overflow-hidden">
      {/* Continue the same background language */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-zinc-50 via-white to-zinc-100
                   dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900"
      />
      <div
        className="absolute -top-28 left-[-120px] h-80 w-80 rounded-full bg-black/5 blur-3xl
                   dark:bg-white/10"
      />
      <div
        className="absolute -bottom-28 right-[-120px] h-80 w-80 rounded-full bg-black/5 blur-3xl
                   dark:bg-white/10"
      />

      <Container className="relative py-14 md:py-20">
        {/* soft divider to keep structure without breaking the glow */}
        <div className="mb-10 h-px w-full bg-black/10 dark:bg-white/10" />

        <SectionTitle
          eyebrow="Process"
          title="Simple, calm, effective"
          desc="A straightforward workflow — no chaos, no confusion."
        />

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {steps.map((s) => (
            <div
              key={s.n}
              className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-sm backdrop-blur
                         transition hover:shadow-md
                         dark:border-white/10 dark:bg-zinc-900/70 dark:hover:shadow-none"
            >
              <div className="flex items-start justify-between">
                <p className="text-xs tracking-[0.25em] uppercase text-black/50 dark:text-white/50">
                  {s.n}
                </p>
                <span
                  className="h-10 w-10 rounded-full border border-black/10 bg-black/[0.03]
                             dark:border-white/10 dark:bg-white/5"
                />
              </div>

              <h3 className="mt-4 text-lg font-semibold text-black dark:text-white">
                {s.t}
              </h3>
              <p className="mt-2 text-sm text-black/70 dark:text-white/70">
                {s.d}
              </p>
            </div>
          ))}
        </div>

        {/* optional: divider at the end for a clean handoff */}
        <div className="mt-14 h-px w-full bg-black/10 dark:bg-white/10" />
      </Container>
    </section>
  );
}
