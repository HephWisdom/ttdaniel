import Container from "./ui/Container";
import SectionTitle from "./ui/SectionTitle";
// demo / fallback images
import ttdaniel from "../assets/tt daniel.jpeg";

export default function Counselling() {
  const cards = [
    {
      key: "individual",
      title: "One‑on‑one Counseling",
      desc: "Private, focused sessions to explore personal challenges, growth and healing.",
      price: "$135",
      href: "https://calendly.com/your-calendly/individual",
      img: ttdaniel,
      cta: "Book Individual",
    },
    {
      key: "family",
      title: "Family Counseling",
      desc: "Guided family sessions to improve communication, resolve conflict and create connection.",
      price: "$195",
      href: "https://calendly.com/your-calendly/family",
      img: ttdaniel,
      cta: "Book Family",
    },
  ];

  return (
    <section
      id="counselling"
      className="border-y border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]"
    >
      <Container className="py-14 md:py-20">
        <SectionTitle
          eyebrow="Counselling"
          title="Guided conversations"
          desc="A safe space for clarity, healing, and direction."
        />

        <div className="mt-10 flex items-center justify-center">
          <div className="w-full max-w-5xl space-y-6 md:space-y-0 md:space-x-6 md:flex">
            {cards.map((c) => (
              <article
                key={c.key}
                className="group relative flex-1 bg-black text-white border border-white/10 overflow-hidden shadow-lg rounded-none"
              >
                {/* image behind — transparent -> frosty on hover */}
                <div className="absolute inset-0">
                  <img
                    src={c.img}
                    alt={c.title}
                    onError={(e) => { e.currentTarget.src = ttdaniel; }}
                    className="w-full h-full object-cover opacity-60 transform transition duration-500 group-hover:opacity-40 group-hover:scale-105 group-hover:blur-sm"
                  />
                  <div className="absolute inset-0 bg-white/0 backdrop-blur-0 transition-all duration-500 group-hover:bg-white/10 group-hover:backdrop-blur-sm pointer-events-none"></div>
                </div>

                {/* centered content */}
                <div className="relative z-10 flex items-center justify-center">
                  <div className="p-8 md:p-12 w-full max-w-xl flex flex-col justify-center items-center text-center">
                    <h3 className="text-2xl md:text-3xl font-extrabold uppercase">{c.title}</h3>
                    <p className="mt-3 text-sm text-white/90">{c.desc}</p>

                    <div className="mt-6">
                      <span className="text-2xl md:text-3xl font-extrabold">{c.price}</span>
                    </div>

                    <a
                      href={c.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-6 inline-flex items-center justify-center px-6 py-3 bg-white text-black border border-white/10 uppercase tracking-wide"
                    >
                      {c.cta}
                    </a>

                    <p className="mt-4 text-sm text-white/70">
                      Prefer email? <a href="mailto:hello@your-site.com" className="underline">hello@your-site.com</a>
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
