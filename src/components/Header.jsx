import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
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
      <path d="M20.5 3.5A11.2 11.2 0 0 0 2.8 17.1L1.5 22.5l5.5-1.3A11.2 11.2 0 1 0 20.5 3.5ZM12 21a9 9 0 0 1-4.6-1.3l-.3-.2-3.2.8.8-3.1-.2-.3a9 9 0 1 1 7.5 4.1Zm5-6.7c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2l-.6.9c-.2.2-.3.2-.6.1a7.3 7.3 0 0 1-3.6-3.2c-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.6l-.9-2c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.4a2.9 2.9 0 0 0-.9 2.2c0 1.3.9 2.5 1 2.6.2.2 1.9 2.9 4.7 4 .7.4 1.3.6 1.8.7.8.3 1.5.2 2.1.1.6-.1 1.8-.7 2.1-1.4.2-.6.2-1.2.1-1.3-.1-.1-.3-.2-.6-.4Z" />
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
  { href: "#bible_studies", label: "Bible studies" },
  // { href: "#blog_post", label: "Blog" },
];

const socialLinks = [
  {
    key: "facebook",
    label: "Facebook",
    handle: "@ttdanielplus",
    href: "https://facebook.com/ttdanielplus",
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
    href: "https://wa.me/?text=Hello%20TT%20Daniel",
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
    href: "https://instagram.com/ttdanielplus",
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
  const buildHref = (href) => (isHome ? href : `/${href}`);

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
    <header className="sticky top-0 z-50 bg-black">
      <Container>
        <div className="relative flex h-16 items-center justify-between">
          {/* Mobile-only Menu button ( + / X ) */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="
              inline-flex md:hidden
              items-center justify-center
              h-10 w-10
              rounded-full
              border border-white/20
              bg-black
              text-white
              hover:bg-white/10
              transition
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

          {/* Brand → scroll to top */}
          <a
            href={buildHref("#top")}
            className="text-sm font-semibold tracking-[0.28em] uppercase text-white"
          >
            TT Daniel
          </a>

          {/* Desktop social (centered) */}
          <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-3 md:flex">
            {socialLinks.map((item) => (
              <a
                key={item.key}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={item.label}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-300 hover:-translate-y-0.5 ${item.desktopClass}`}
              >
                <item.Icon className="h-4 w-4" />
                <span className="sr-only">{item.label}</span>
              </a>
            ))}
          </div>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-4 md:flex">
            {nav.map((item) => (
              <a
                key={item.href}
                href={buildHref(item.href)}
                className="text-sm text-white/70 hover:text-white transition"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden">
            <div
              className="fixed inset-0 z-40 bg-black/70"
              onClick={() => setOpen(false)}
            />
            <div
              id="mobile-navigation-menu"
              className="fixed inset-x-4 top-20 z-50 rounded-3xl border border-white/10 bg-black p-4 shadow-xl"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile navigation"
              ref={mobileDialogRef}
              tabIndex={-1}
            >
              <nav className="grid gap-2">
                {nav.map((item) => (
                  <a
                    key={item.href}
                    href={buildHref(item.href)}
                    onClick={() => setOpen(false)}
                    className="rounded-2xl px-4 py-3 text-sm text-white hover:bg-white/10 transition"
                  >
                    {item.label}
                  </a>
                ))}

                <div className="mt-2 border-t border-white/10 pt-3">
                  <a
                    href={buildHref("#top")}
                    onClick={() => setOpen(false)}
                    className="block rounded-2xl px-4 py-3 text-sm text-white hover:bg-white/10"
                  >
                    Back to top
                  </a>
                </div>

                <div className="mt-2 border-t border-white/10 pt-3">
                  {socialLinks.map((item) => (
                    <a
                      key={item.key}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-white hover:bg-white/10 transition ${item.mobileRowClass}`}
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
