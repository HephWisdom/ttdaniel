import Container from "./ui/Container";
import SectionTitle from "./ui/SectionTitle";

export default function Quote() {
  return (
    <section id="quote">
      <Container className="py-14 md:py-20">
        <div className="rounded-3xl border border-black/10 bg-white p-8 shadow-sm md:p-12">
          <SectionTitle
            eyebrow="Guiding idea"
            title="“Let the beauty we love be what we do.”"
            desc="— Jalāl al-Dīn Rūmī"
          />

          <div className="mt-10 grid gap-3 md:grid-cols-3">
            <Mini title="Clarity" text="Turn chaos into a simple path." />
            <Mini title="Rigor" text="Numbers that match the story." />
            <Mini title="Kindness" text="Honest feedback, delivered well." />
          </div>
        </div>
      </Container>
    </section>
  );
}

function Mini({ title, text }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-5">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm text-black/70">{text}</p>
    </div>
  );
}
