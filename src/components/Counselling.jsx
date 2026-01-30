import Container from "./ui/Container";
import SectionTitle from "./ui/SectionTitle";

export default function Counselling() {
  return (
    <section
      id="counselling"
      className="border-y border-black/10 bg-black/[0.02]
                 dark:border-white/10 dark:bg-white/[0.03]"
    >
      <Container className="py-14 md:py-20">
        <SectionTitle
          eyebrow="Counselling"
          title="Guided conversations"
          desc="A safe space for clarity, healing, and direction."
        />

        <div className="mt-10 flex items-center justify-center">
          <div
            className=" border border-black/10 bg-white p-10 text-center shadow-sm
                       dark:border-white/10 dark:bg-zinc-900"
          >
            <p className="text-lg font-semibold text-black dark:text-white">
              Coming soon…
            </p>

          </div>
        </div>
      </Container>
    </section>
  );
}
