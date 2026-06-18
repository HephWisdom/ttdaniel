import Container from "./ui/Container";
import { Link } from "react-router-dom";
import MotionReveal from "./ui/MotionReveal";
import { bibleStudies } from "../data/bibleStudies";

export default function BibleStudies() {
  return (
    <section id="spirituality" className="bg-[#f3f3f3] text-black">
      <Container className="py-14 md:py-20">
        <MotionReveal delay={40} distance={28}>
          <h2 className="text-[35px] font-extrabold uppercase tracking-tight">
            SPIRITUALITY
          </h2>
          <p className="mt-3 max-w-2xl text-md text-black/70">
            Gather, grow, and go deeper together.
          </p>
        </MotionReveal>

        <MotionReveal
          delay={120}
          distance={34}
          className="mt-12 overflow-hidden rounded-2xl border border-black/15 bg-white shadow-[0_30px_70px_-45px_rgba(0,0,0,0.5)]"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3">
            {bibleStudies.map((study, index) => (
              <MotionReveal
                key={study.key}
                as="article"
                delay={180 + index * 100}
                distance={24}
                className={`group relative flex min-h-[280px] flex-col border-b border-black/10 bg-gradient-to-b from-white to-[#fcfcfc] p-8 transition-colors duration-300 hover:from-[#fffdf8] hover:to-white lg:border-b-0 lg:border-r lg:p-10 last:border-r-0 ${
                  study.key === "pray-together"
                    ? "lg:min-h-[380px]"
                    : "lg:min-h-[320px]"
                }`}
              >
                <span className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#c6a15f] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/45">
                  {study.status ||
                    (study.key === "pray-together" ? "Prayer Track" : "Study track")}
                </p>
                <h3 className="mt-4 max-w-[16ch] text-[34px] font-extrabold uppercase leading-[1.02] tracking-tight">
                  {study.title}
                </h3>
                <p className="mt-5 max-w-[34ch] text-sm leading-relaxed text-black/65">
                  {study.cardSummary || study.teaser || study.summary}
                </p>
                <div
                  className={`mt-auto flex flex-wrap gap-3 ${
                    study.key === "pray-together" ? "justify-center" : ""
                  }`}
                >
                  {study.registrationEnabled ? (
                    <Link
                      to={`/spirituality/${study.key}`}
                      className="inline-flex h-11 min-w-[190px] items-center justify-center border border-[#8f6b32] bg-black px-6 text-sm font-semibold uppercase tracking-[0.12em] text-[#efd9aa] transition hover:bg-[#8f6b32] hover:text-white"
                    >
                      Pre-register
                    </Link>
                  ) : study.key === "bible-studies" ? (
                    <span className="inline-flex h-11 min-w-[190px] cursor-not-allowed items-center justify-center border border-black/15 bg-black/5 px-6 text-sm font-semibold uppercase tracking-[0.12em] text-black/45">
                      Coming Soon
                    </span>
                  ) : (
                    <Link
                      to={`/spirituality/${study.key}`}
                      className="inline-flex h-11 min-w-[190px] items-center justify-center border border-[#8f6b32] bg-black px-6 text-sm font-semibold uppercase tracking-[0.12em] text-[#efd9aa] transition hover:bg-[#8f6b32] hover:text-white"
                    >
                      Read details
                    </Link>
                  )}
                  {study.zoomUrl ? (
                    <a
                      href={study.zoomUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-11 min-w-[190px] items-center justify-center border border-black/15 bg-[#f6f0e3] px-6 text-sm font-semibold uppercase tracking-[0.12em] text-[#3a2f1f] transition hover:border-[#8f6b32] hover:bg-[#fff7e7]"
                    >
                      Join on Zoom
                    </a>
                  ) : null}
                </div>
              </MotionReveal>
            ))}
          </div>
        </MotionReveal>
      </Container>
    </section>
  );
}
