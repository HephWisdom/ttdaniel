import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Container from "./ui/Container";

function FacebookIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M13.5 21v-7h2.3l.5-3h-2.8V9.2c0-.8.3-1.5 1.6-1.5H16V5.1c-.3 0-1.2-.1-2.2-.1-2.2 0-3.8 1.3-3.8 4V11H7.5v3H10v7h3.5Z" />
    </svg>
  );
}

function WhatsAppIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12 2.3A9.7 9.7 0 0 0 3.6 16.8L2 22l5.4-1.5A9.7 9.7 0 1 0 12 2.3Zm0 17.4a7.7 7.7 0 0 1-3.9-1.1l-.3-.2-2.7.8.8-2.6-.2-.3A7.7 7.7 0 1 1 12 19.7Zm4.2-5.8c-.2-.1-1.3-.7-1.5-.8-.2-.1-.4-.1-.5.1l-.4.6c-.1.2-.2.2-.4.1a6.3 6.3 0 0 1-3.1-2.7c-.1-.2 0-.3.1-.4l.3-.4c.1-.1.1-.3.2-.4.1-.1 0-.3 0-.4l-.7-1.5c-.1-.3-.3-.3-.4-.3h-.4c-.2 0-.4.1-.5.2-.2.2-.7.7-.7 1.8s.7 2 1 2.2c.2.2 1.5 2.4 3.7 3.2.5.2 1 .4 1.4.5.6.2 1.2.2 1.6.1.5-.1 1.3-.5 1.5-1.1.2-.5.2-1 .1-1.1-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  );
}

function InstagramIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12 7.2A4.8 4.8 0 1 0 12 16.8 4.8 4.8 0 0 0 12 7.2Zm0 7.9A3.1 3.1 0 1 1 12 9a3.1 3.1 0 0 1 0 6.2Zm6.1-8a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0Zm3.2 1.1c-.1-1.6-.5-3-1.7-4.1S17 2.2 15.4 2.1C13.8 2 10.2 2 8.6 2.1 7 2.2 5.6 2.6 4.5 3.8S2.6 6.2 2.5 7.8C2.4 9.4 2.4 13 2.5 14.6c.1 1.6.5 3 1.7 4.1S7 21.8 8.6 21.9c1.6.1 5.2.1 6.8 0 1.6-.1 3-.5 4.1-1.7s1.6-2.5 1.7-4.1c.1-1.6.1-5.2 0-6.8ZM19.3 16c-.1 1.3-.4 2.1-.9 2.7-.6.6-1.4.9-2.7.9-1.5.1-5.9.1-7.4 0-1.3 0-2.1-.3-2.7-.9-.5-.6-.8-1.4-.9-2.7-.1-1.5-.1-5.9 0-7.4.1-1.3.4-2.1.9-2.7.6-.6 1.4-.9 2.7-.9h7.4c1.3 0 2.1.3 2.7.9.5.6.8 1.4.9 2.7.1 1.5.1 5.9 0 7.4Z" />
    </svg>
  );
}

const nav = [
  { href: "#books", label: "Books" },
  { href: "#events", label: "Events" },
  { href: "#counselling", label: "Counselling" },
  { href: "#spirituality", label: "Spirituality" },
  { href: "#blog", label: "Blog" },
];

const DONATE_LINK =
  import.meta.env.VITE_DONATE_LINK || "https://buy.stripe.com/14AfZh9Pu2tBeg51GDao804";

const socialLinks = [
  {
    key: "facebook",
    label: "Facebook",
    handle: "@ttdanielplus",
    href: "https://www.facebook.com/dtsokpor/",
    Icon: FacebookIcon,
    desktopClass:
      "border-white/25 bg-white/5 text-white/80 hover:border-[#1877F2]/70 hover:bg-[#1877F2]/35 hover:text-[#d3e9ff] hover:shadow-[0_0_18px_rgba(24,119,242,0.55)]",
    mobileIconClass: "text-white/80 transition-colors group-hover:text-[#8ec5ff]",
    mobileRowClass: "hover:shadow-[0_0_14px_rgba(24,119,242,0.35)]",
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    handle: "Chat on WhatsApp",
    href: "https://wa.me/17634854409",
    Icon: WhatsAppIcon,
    desktopClass:
      "border-white/25 bg-white/5 text-white/80 hover:border-[#25D366]/70 hover:bg-[#25D366]/35 hover:text-[#d8ffe7] hover:shadow-[0_0_18px_rgba(37,211,102,0.55)]",
    mobileIconClass: "text-white/80 transition-colors group-hover:text-[#89f0b2]",
    mobileRowClass: "hover:shadow-[0_0_14px_rgba(37,211,102,0.35)]",
  },
  {
    key: "instagram",
    label: "Instagram",
    handle: "@ttdanielplus",
    href: "https://www.instagram.com/pleasantarians/reels/?hl=en",
    Icon: InstagramIcon,
    desktopClass:
      "border-white/25 bg-white/5 text-white/80 hover:border-[#E1306C]/70 hover:bg-[#E1306C]/35 hover:text-[#ffd6e5] hover:shadow-[0_0_18px_rgba(225,48,108,0.55)]",
    mobileIconClass: "text-white/80 transition-colors group-hover:text-[#ff9fbe]",
    mobileRowClass: "hover:shadow-[0_0_14px_rgba(225,48,108,0.35)]",
  },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const mobileDialogRef = useRef(null);
  const location = useLocation();
  const isHome = location.pathname === "/";
  const buildTo = (href) => (isHome ? href : `/${href}`);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const dialog = mobileDialogRef.current;
    if (!dialog) return;

    const selectors =
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = Array.from(dialog.querySelectorAll(selectors));
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 bg-black backdrop-blur-xl">
      <Container>
        <div className="relative flex h-16 items-center justify-between lg:h-[74px]">
          {/* Brand → scroll to top */}
          <Link
            to={buildTo("#top")}
            className="text-sm font-bold tracking-[0.3em] uppercase text-[#f7e5bf] lg:text-[13px]"
          >
            TT Daniel
          </Link>

          {/* Mobile-only Menu button ( + / X ) */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="
              inline-flex lg:hidden
              items-center justify-center
              h-10 w-10
              rounded-full
              border border-[#c7a468]/35
              bg-[#141210]
              text-[#f5e4c2]
              shadow-[0_10px_24px_-12px_rgba(0,0,0,0.8)]
              hover:border-[#d9b271]/55 hover:bg-[#1c1814]
              transition-all
            "
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-controls="mobile-navigation-menu"
          >
            <span
              className={[
                "text-2xl leading-none",
                open ? "rotate-45" : "rotate-0",
                "transition-transform duration-200",
              ].join(" ")}
            >
              +
            </span>
          </button>

          {/* Desktop social */}
          <div className="ml-4 hidden items-center gap-2 lg:flex xl:gap-3">
            {socialLinks.map((item) => (
              <a
                key={item.key}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={item.label}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d3b57f]/35 bg-white/[0.04] transition-all duration-300 hover:-translate-y-0.5 ${item.desktopClass}`}
              >
                <item.Icon className="h-4 w-4" />
                <span className="sr-only">{item.label}</span>
              </a>
            ))}
          </div>

          {/* Desktop nav */}
          <nav className="ml-auto hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1 lg:flex xl:gap-2 xl:p-1.5">
            {nav.map((item) => (
              <Link
                key={item.href}
                to={buildTo(item.href)}
                className="rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-white/10 hover:text-white xl:px-4 xl:text-xs xl:tracking-[0.16em]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <a
            href={DONATE_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-3 hidden h-10 items-center justify-center rounded-full border border-[#d3b57f]/70 bg-[#f1d49e] px-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#22170d] transition-colors duration-200 hover:bg-[#22170d] hover:text-[#f1d49e] lg:inline-flex"
          >
            Donate
          </a>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="lg:hidden">
            <div
              className="fixed inset-0 z-40 bg-black/70"
              onClick={() => setOpen(false)}
            />
            <div
              id="mobile-navigation-menu"
              className="fixed inset-x-4 top-20 z-50 rounded-3xl border border-[#d3b57f]/25 bg-[linear-gradient(180deg,rgba(16,14,12,0.98)_0%,rgba(8,8,8,0.98)_100%)] p-4 shadow-[0_30px_80px_-35px_rgba(0,0,0,0.9)]"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile navigation"
              ref={mobileDialogRef}
              tabIndex={-1}
            >
              <nav className="grid gap-2">
                {nav.map((item) => (
                  <Link
                    key={item.href}
                    to={buildTo(item.href)}
                    onClick={() => setOpen(false)}
                    className="rounded-2xl border border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:border-white/40 hover:bg-white/10 transition"
                  >
                    {item.label}
                  </Link>
                ))}
                <a
                  href={DONATE_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="rounded-2xl border border-[#d3b57f]/60 bg-[#f1d49e] px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-[#22170d] transition-colors duration-200 hover:bg-[#22170d] hover:text-[#f1d49e]"
                >
                  Donate
                </a>

                <div className="mt-2 border-t border-white/10 pt-3">
                  <Link
                    to={buildTo("#top")}
                    onClick={() => setOpen(false)}
                    className="block rounded-2xl border border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:border-white/40 hover:bg-white/10"
                  >
                    Back to top
                  </Link>
                </div>

                <div className="mt-2 border-t border-white/10 pt-3">
                  {socialLinks.map((item) => (
                    <a
                      key={item.key}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`group flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm text-white hover:border-[#d3b57f]/35 hover:bg-[#f1d49e]/10 transition ${item.mobileRowClass}`}
                    >
                      <item.Icon className={`h-4 w-4 ${item.mobileIconClass}`} />
                      {item.label}: <span className="text-white/70">{item.handle}</span>
                    </a>
                  ))}
                </div>
              </nav>
            </div>
          </div>
        )}
      </Container>
    </header>
  );
}
