import { useEffect, useState } from "react";
import Container from "./ui/Container";
import Button from "./ui/Button";

const nav = [
  { href: "#about", label: "About" },
  { href: "#books", label: "Books" },
  { href: "#events", label: "Events" },
  { href: "#counselling", label: "Counselling" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [open]);

  return (
    <header className="sticky top-0 z-50 bg-black">
      <Container>
        <div className="flex h-16 items-center justify-between">
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

          {/* Brand */}
          <a
            href="#"
            className="text-sm font-semibold tracking-[0.28em] uppercase text-white"
          >
            TT Daniel
          </a>

          {/* Desktop nav (no theme toggle) */}
          <div className="hidden items-center gap-4 md:flex">
            <a className="text-sm text-white/70 hover:text-white" href="#">
              Login
            </a>
            <Button
              as="a"
              href="#packages"
              variant="ghost"
              className="py-2 text-black border-white/20 hover:bg-white/10"
            >
              Cart (0)
            </Button>
          </div>

          {/* Mobile right */}
          <div className="md:hidden flex items-center">
            <Button
              as="a"
              href="#packages"
              variant="ghost"
              className="py-2 text-white border-white/20 hover:bg-white/10"
            >
              Cart
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden">
            <div
              className="fixed inset-0 z-40 bg-black/70"
              onClick={() => setOpen(false)}
            />
            <div
              className="fixed inset-x-4 top-20 z-50 rounded-3xl border border-white/10 bg-black p-4 shadow-xl"
              role="dialog"
              aria-label="Mobile navigation"
            >
              <div className="grid gap-2">
                {nav.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="rounded-2xl px-4 py-3 text-sm text-white hover:bg-white/10"
                  >
                    {item.label}
                  </a>
                ))}

                <div className="mt-2 grid gap-2 border-t border-white/10 pt-3">
                  <a
                    className="rounded-2xl px-4 py-3 text-sm text-white hover:bg-white/10"
                    href="#"
                  >
                    Login
                  </a>
                  <a
                    className="rounded-2xl px-4 py-3 text-sm text-white hover:bg-white/10"
                    href="#packages"
                  >
                    Cart (0)
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </Container>
    </header>
  );
}
