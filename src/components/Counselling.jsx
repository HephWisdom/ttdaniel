import { useMemo } from "react";
import Container from "./ui/Container";
import MotionReveal from "./ui/MotionReveal";
import one_on_one from "../assets/one-on-one.jpg";
import family from "../assets/Counseling Center.png";
import free_session from "../assets/free-session.png";

function getUserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function detectAfricaTimezone(timezone) {
  return timezone.startsWith("Africa/");
}

export default function Counselling() {
  const userTimezone = useMemo(() => getUserTimezone(), []);
  const isAfricaUser = useMemo(() => detectAfricaTimezone(userTimezone), [userTimezone]);

  const cards = [
    {
      key: "free-intro",
      tag: "Free Session",
      title: "Free Counseling",
      desc: "A free first session to understand your needs, ask questions, and plan the right next step.",
      img: free_session,
      cta: "Schedule Now",
      globalLink: "https://calendly.com/ttdanielplus/15min",
    },
    {
      key: "individual",
      tag: "Private Session",
      title: "One‑on‑one Counseling",
      desc: "Private, focused sessions to explore personal challenges, growth and healing.",
      img: one_on_one,
      cta: "Book Now",
      globalLink: "https://calendly.com/ttdanielplus/private-talk-with-tt-daniel",
      africaLink: "https://paystack.com/buy/one-on-one-counseling-kcwznh",
    },
    {
      key: "family",
      tag: "Group Session",
      title: "Family Counseling",
      desc: "Guided family sessions to improve communication, resolve conflict and create connection.",
      img: family,
      cta: "Book Now",
      globalLink: "https://calendly.com/ttdanielplus/family-counseling-with-tt-daniel",
      africaLink: "https://paystack.com/buy/family-counseling-imkeke",
    },
  ];

  return (
    <section
      id="counselling"
      className="relative overflow-hidden border-y border-black/10 bg-[#0d0d0f] text-white"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-16 h-72 w-72 rounded-full bg-[#9ca3af]/20 blur-3xl" />
        <div className="absolute right-0 top-16 h-80 w-80 rounded-full bg-[#6b7280]/20 blur-3xl" />
        <div className="absolute -bottom-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
      </div>

      <Container className="py-14 md:py-20">
        <MotionReveal delay={40} distance={28}>
          <h2 className="text-[35px] font-extrabold uppercase tracking-tight text-white">
            Counseling
          </h2>
          <p className="mt-3 max-w-2xl text-md text-white/75">
            A calm and intentional space for healing, clarity, and restored direction.
          </p>
        </MotionReveal>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {cards.map((c, index) => {
            const activeLink = isAfricaUser ? c.africaLink || c.globalLink : c.globalLink;
            const activeCta = isAfricaUser && c.africaLink ? "Pay & Book" : c.cta;

            return (
              <MotionReveal
                key={c.key}
                as="article"
                delay={100 + index * 100}
                distance={34}
                className="group relative min-h-[440px] overflow-hidden rounded-3xl border border-white/20 bg-black/40 shadow-[0_25px_70px_-30px_rgba(0,0,0,0.7)] backdrop-blur-sm"
              >
                <div className="absolute inset-0">
                  <img
                    src={c.img}
                    alt={c.title}
                    onError={(e) => {
                      e.currentTarget.src = family;
                    }}
                    className="h-full w-full object-cover opacity-40 transition duration-700 group-hover:scale-[1.06] group-hover:opacity-30"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/20" />
                </div>

                <div className="relative z-10 flex h-full flex-col justify-end p-8 md:p-10">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e3c990]">
                    {c.tag}
                  </p>
                  <h3 className="mt-3 max-w-[16ch] text-3xl font-extrabold uppercase leading-tight md:text-4xl">
                    {c.title}
                  </h3>
                  <p className="mt-4 max-w-[46ch] text-sm leading-relaxed text-white/85 md:text-base">
                    {c.desc}
                  </p>

                  {activeLink ? (
                    <a
                      href={activeLink}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-7 inline-flex w-fit items-center border border-[#d4b06f]/70 bg-black/50 px-5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#f0d7a5] transition hover:bg-[#d4b06f]/20"
                    >
                      {activeCta}
                    </a>
                  ) : (
                    <div className="mt-7 inline-flex w-fit items-center border border-[#d4b06f]/70 bg-black/50 px-5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#f0d7a5]">
                      {c.cta}
                    </div>
                  )}
                </div>
              </MotionReveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
