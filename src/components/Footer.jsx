import Container from "./ui/Container";
import { openCookiePreferences } from "../lib/cookieConsent";
import { Link } from "react-router-dom";

const footerEmails = [
  "ttdanielplus@gmail.com",
  "talktottdaniel@ttdaniel525.live",
  "events.bookings@ttdaniel525.live",
];

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

          <div className="mt-8 w-full pt-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f1d49e]">
              Contact Us
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm">
              {footerEmails.map((email) => (
                <a
                  key={email}
                  href={`mailto:${email}`}
                  className="rounded-full border border-white/25 px-4 py-2 text-white/90 transition-colors duration-200 hover:border-[#f1d49e]/60 hover:text-[#f1d49e]"
                >
                  {email}
                </a>
              ))}
            </div>
            <div className="mt-5 flex justify-center">
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={openCookiePreferences}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-white/20 px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80 transition hover:border-[#f1d49e]/60 hover:text-[#f1d49e]"
                >
                  Cookie settings
                </button>
                <Link
                  to="/privacy-cookies"
                  className="inline-flex h-10 items-center justify-center rounded-full border border-white/20 px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80 transition hover:border-[#f1d49e]/60 hover:text-[#f1d49e]"
                >
                  Privacy and cookies
                </Link>
              </div>
            </div>
          </div>

          {/* SMALL PRINT */}
          <div className="mt-10 space-y-1 text-[18px] uppercase tracking-wide text-white/60">
            <p className="text-white normal-case">
              TT DANIEL - <em className="italic font-serif">The Revivalist</em>
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
