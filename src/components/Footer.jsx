import Container from "./ui/Container";

export default function Footer() {
  return (
    <footer className="bg-black text-white overflow-hidden">
      {/* top divider */}
      <div className="border-t border-white/40" />

      {/* local keyframes */}
      <style>{`
        @keyframes footer-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      <Container className="py-24 md:py-32">
        <div className="flex flex-col items-center text-center">

          {/* MOVING LINE — EXTREMELY BIG */}
          <div className="relative mt-16 w-full overflow-hidden">
            {/* edge fades */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-48 bg-gradient-to-r from-black to-transparent z-10" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-48 bg-gradient-to-l from-black to-transparent z-10" />

            {/* track */}
            <div
              className="flex w-[200%] whitespace-nowrap"
              style={{ animation: "footer-marquee 40s linear infinite" }}
            >
              <FooterLineXL />
              <FooterLineXL />
            </div>
          </div>

          {/* SMALL PRINT */}
          <div className="mt-16 space-y-1 text-[11px] uppercase tracking-wide text-white/60">
            <p className="text-white normal-case">
              TT Daniel - <em className="italic font-serif">The Revivalist</em>
            </p>
            <p className="text-white">"God Is Still Making People!"</p>
          </div>
        </div>
      </Container>
    </footer>
  );
}

/* ===== EXTRA LARGE MOVING LINE ===== */
function FooterLineXL() {
  return (
    <div
      className="
        flex items-center gap-[6vw]
        px-[6vw]
        font-extrabold uppercase tracking-tight
        text-white/90
        text-[18vw]
        sm:text-[16vw]
        md:text-[14vw]
        leading-none
      "
    >
      <span>always grateful</span>
      <span className="mx-[2vw]">] [</span>

      {/* square marker */}
      <span className="inline-block h-[1.4vw] w-[1.4vw] border border-white translate-y-[0.3vw]" />

      <span>always grateful</span>
      <span className="mx-[2vw]">] [</span>
    </div>
  );
}
