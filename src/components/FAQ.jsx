import Container from "./ui/Container";
import SectionTitle from "./ui/SectionTitle";

const faqs = [
  {
    q: "Is this production-ready?",
    a: "This is a polished MVP UI. Payments, authentication, and CMS can be added later.",
  },
  {
    q: "Can we connect a real cart?",
    a: "Yes — we can add a simple cart with localStorage, then Stripe when ready.",
  },
  {
    q: "Can you make it match the original site more closely?",
    a: "Yes. If you want pixel-perfect, we’ll mirror spacing, fonts, and images precisely.",
  },
  {
    q: "Will this work on mobile?",
    a: "Yes. Layout is mobile-first with responsive breakpoints.",
  },
];

export default function FAQ() {
  return (
    <section
      id="faq"
      className="border-y border-black/10 bg-black/[0.02]
                 dark:border-white/10 dark:bg-white/[0.03]"
    >
      <Container className="py-14 md:py-20">
        <SectionTitle
          eyebrow="FAQ"
          title="Quick answers"
          desc="Keep it simple. Build fast. Upgrade when the product proves itself."
        />

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {faqs.map((f) => (
            <details
              key={f.q}
              className="group rounded-3xl border border-black/10 bg-white p-6 shadow-sm transition
                         hover:shadow-md
                         dark:border-white/10 dark:bg-zinc-900 dark:hover:bg-zinc-900/90"
            >
              <summary className="cursor-pointer list-none text-sm font-semibold">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-black dark:text-white">
                    {f.q}
                  </span>

                  <span
                    className="rounded-full border border-black/10 px-3 py-1 text-xs text-black/60
                               group-open:hidden
                               dark:border-white/10 dark:text-white/60"
                  >
                    Open
                  </span>

                  <span
                    className="rounded-full border border-black/10 px-3 py-1 text-xs text-black/60
                               hidden group-open:inline
                               dark:border-white/10 dark:text-white/60"
                  >
                    Close
                  </span>
                </div>
              </summary>

              <p className="mt-3 text-sm text-black/70 dark:text-white/70">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
