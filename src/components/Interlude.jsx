import Container from "./ui/Container";
import { Link } from "react-router-dom";
import MotionReveal from "./ui/MotionReveal";

import portrait from "../assets/tt daniel.jpeg"

export default function AboutInterludeExact() {
  return (
    <section id="about" className="relative overflow-hidden bg-[#0b0b0b]">

      {/* ===== BACKGROUND (matches reference) ===== */}
      {/* Base charcoal */}
      <div className="absolute inset-0 bg-[#0b0b0b]" />

      {/* Soft top light */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-black/[0.65]" />

      {/* Left-side light source */}
      <div className="pointer-events-none absolute inset-0
        bg-[radial-gradient(1200px_700px_at_30%_15%,rgba(255,255,255,0.06),transparent_60%)]"
      />

      {/* Vignette */}
      <div className="pointer-events-none absolute inset-0
        bg-[radial-gradient(900px_600px_at_70%_60%,rgba(0,0,0,0.6),transparent_55%)]"
      />


      {/* ===== CONTENT ===== */}
      <Container className="relative py-14 md:py-20 text-white">
        <div className="grid md:grid-cols-12 gap-10">

          {/* LEFT COLUMN */}
          <MotionReveal as="div" delay={40} distance={36} className="md:col-span-6">
            <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
              TT Daniel - <em className="italic font-serif">The Revivalist</em>
            </h2>

            <ul className="mt-8 max-w-md list-disc space-y-5 pl-5 text-md leading-relaxed text-white/80">
              <li>
                TT Daniel is a vsionary faith-based leader, strategic organizer, a life coach with experience founding and leading organizations, training high-performing teams, individuals and executing large-scale community programs while driving operational excellence and stakeholder engagement.

              </li>
              <li>
               Recognized for designing and implementing impactful ministry initiatives, nonprofit organizations, coaching emerging leaders, and expanding individual and congregational reach through strategic vision and inclusive engagement. 

              </li>
              <li>
         Proficient in overseeing administrative operations, optimizing revenue streams, and executing policies that enhance organizational efficiency and compliance. 

              </li>
              <li>
Passionate about fostering cross-cultural collaborations, mediating conflicts, and delivering inspirational speeches to diverse audiences. 

              </li>
              <li>
Well-versed in data-driven & intuitive decision-making, corporate training, and program development that aligns with mission-driven objectives. 

              </li>
              <li>
                Track record of helping launch successful community events, securing stakeholder buy-in, and managing multi-faceted projects with measurable outcomes.

              </li>






            </ul>

            <div className="mt-8">
              <Link
                to="/interlude-read-more"
                className="inline-flex items-center gap-2 border border-[#d3b57f]/55 bg-white/[0.03] px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f2ddad] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#e6c98a] hover:bg-[#e6c98a]/12 hover:text-[#fff4d7]"
              >
                Read More
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </MotionReveal>

          {/* RIGHT COLUMN (portrait + mantra) */}
          <MotionReveal
            as="div"
            delay={180}
            distance={48}
            className="relative md:col-span-6"
          >
            <div
              className="
                relative z-10
                mt-12 sm:mt-16 md:mt-28
                w-[clamp(100%,110vw,120%)]
                pr-[clamp(80px,8vw,80px)]
              "
            >
              <div className="relative bg-zinc-900 shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
                <div className="overflow-hidden">
                  <div className="h-[420px] sm:h-[520px] md:h-[700px] lg:h-[950px]">
                    <img
                      src={portrait}
                      alt="Portrait"
                      className="
                        w-full h-full
                        object-cover object-top
                        grayscale
                        contrast-125
                        brightness-95
                        hover:grayscale-0
                        transition duration-700
                      "
                      loading="lazy"
                    />
                  </div>
                </div>

              </div>

              <div className="w-full bg-white px-4 py-4 sm:px-6 sm:py-6 md:px-10 md:py-8">
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[clamp(1.05rem,2.4vw,2rem)] font-extrabold uppercase tracking-[0.08em] leading-[1.1] text-black">
                  <span className="inline-flex items-center gap-2">APOSTLE</span>
                  <span className="inline-flex items-center gap-2">AUTHOR</span>
                  <span className="inline-flex items-center gap-2">KING</span>
                  <span className="inline-flex items-center gap-2">LIFE-COACH</span>
                </div>
              </div>
            </div>
          </MotionReveal>

        </div>
      </Container>
    </section>
  );
}
