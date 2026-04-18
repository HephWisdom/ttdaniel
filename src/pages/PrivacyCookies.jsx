import { Link } from "react-router-dom";
import Container from "../components/ui/Container";
import { openCookiePreferences } from "../lib/cookieConsent";

const contactEmails = [
  "ttdanielplus@gmail.com",
  "talktottdaniel@ttdaniel525.live",
  "events.bookings@ttdaniel525.live",
];

const sections = [
  {
    title: "What we use",
    body: [
      "This site uses essential cookies and similar browser storage to keep core features working, including security, navigation, and your cookie preferences.",
      "If you choose to allow analytics, we also store limited browsing signals so we can understand page visits, article reads, and which sections of the site people find useful.",
    ],
  },
  {
    title: "How analytics works",
    body: [
      "Analytics on this site is used to measure page views, section views, blog article visits, and general site engagement. This helps us improve the experience, the structure of pages, and the content we publish.",
      "We do not need analytics cookies for the site to function. Analytics is optional and only runs after consent.",
    ],
  },
  {
    title: "Your choices",
    body: [
      "You can choose between accepting analytics cookies or using essential-only cookies. Essential cookies remain active because they are needed for the site to work properly.",
      "You can reopen cookie settings at any time from the footer or by using the cookie settings button on this page.",
    ],
  },
  {
    title: "Managing cookies in your browser",
    body: [
      "Most browsers allow you to block, clear, or inspect cookies from the browser settings menu. Clearing cookies may remove saved preferences, including your consent choice.",
      "If you decline analytics, we also clear this site's local analytics storage in your browser.",
    ],
  },
  {
    title: "Contact",
    body: [
      "If you have questions about privacy, cookies, or how this site handles visitor preferences, contact us using any of the email addresses below.",
    ],
  },
];

export default function PrivacyCookies() {
  return (
    <main className="bg-[#f4efe6] text-[#1f1810]">
      <section className="relative overflow-hidden border-b border-[#cfbb98]/60 bg-black text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(880px_420px_at_15%_0%,rgba(255,255,255,0.12),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(720px_300px_at_90%_0%,rgba(255,255,255,0.08),transparent_58%)]" />

        <Container className="relative py-14 md:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/70">
            Privacy And Cookies
          </p>
          <h1 className="mt-4 max-w-4xl font-serif text-4xl font-bold leading-tight text-white md:text-6xl">
            How this site handles cookies, consent, and analytics
          </h1>
          <p className="mt-6 max-w-3xl text-sm leading-relaxed text-white/80 md:text-base">
            TT Daniel&apos;s site uses essential cookies for functionality and optional analytics
            cookies for measurement. You remain in control of that analytics choice.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openCookiePreferences}
              className="inline-flex items-center justify-center rounded-full border border-[#d8c193] bg-[#f2ddad] px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#20160c] transition hover:bg-white"
            >
              Open cookie settings
            </button>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-full border border-white/25 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white transition hover:border-[#f2ddad] hover:text-[#f2ddad]"
            >
              Back to home
            </Link>
          </div>
        </Container>
      </section>

      <section className="border-b border-[#d2bf9e]/70 bg-[#f4efe6]">
        <Container className="py-10 md:py-14">
          <div className="grid gap-6 md:grid-cols-2">
            {sections.map((section) => (
              <article
                key={section.title}
                className="rounded-[26px] border border-[#d0bc98] bg-[#fffdf8] p-7 shadow-[0_30px_60px_-42px_rgba(41,27,10,0.35)] md:p-8"
              >
                <h2 className="font-serif text-2xl font-semibold leading-tight text-[#23180f]">
                  {section.title}
                </h2>
                <div className="mt-4 space-y-4">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="text-sm leading-8 text-[#4d3f30] md:text-[15px]">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-b border-[#d2bf9e]/70 bg-[#ece2cf]">
        <Container className="py-10 md:py-14">
          <div className="rounded-[28px] border border-[#cab489] bg-[#1b140d] p-7 text-[#f4e7cf] shadow-[0_32px_70px_-38px_rgba(0,0,0,0.55)] md:p-9">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d7b780]">
              Contact
            </p>
            <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight text-[#fff4de]">
              Questions about privacy or cookies
            </h2>
            <div className="mt-6 flex flex-wrap gap-3">
              {contactEmails.map((email) => (
                <a
                  key={email}
                  href={`mailto:${email}`}
                  className="rounded-full border border-white/20 px-4 py-2 text-sm text-[#f4e7cf] transition hover:border-[#f1d49e] hover:text-[#f1d49e]"
                >
                  {email}
                </a>
              ))}
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
