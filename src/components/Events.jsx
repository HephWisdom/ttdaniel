import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Container from "./ui/Container";
import { featuredEvents } from "../data/events";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function getCountdownLabel(deadline, now) {
  if (!deadline) return null;

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const deadlineDate = new Date(`${deadline}T00:00:00`);
  deadlineDate.setHours(0, 0, 0, 0);

  const daysLeft = Math.ceil((deadlineDate.getTime() - today.getTime()) / DAY_IN_MS);

  if (daysLeft < 0) return "Closed";
  if (daysLeft === 0) return "Last day";
  if (daysLeft === 1) return "1 day left";
  return `${daysLeft} days left`;
}

function isEventClosed(deadline, now) {
  if (!deadline) return false;

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const deadlineDate = new Date(`${deadline}T00:00:00`);
  deadlineDate.setHours(0, 0, 0, 0);

  return deadlineDate.getTime() < today.getTime();
}

function getQrImageSrc(event) {
  if (!event?.isExternal) return null;
  if (event.qrImage) return event.qrImage;
  if (!event.detailsHref) return null;

  const encoded = encodeURIComponent(event.detailsHref);
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&data=${encoded}`;
}

export default function Events() {
  const [now, setNow] = useState(() => Date.now());
  const [activeEvent, setActiveEvent] = useState(null);
  const sortedFeaturedEvents = useMemo(() => {
    return [...featuredEvents].sort((a, b) => {
      const aClosed = isEventClosed(a.deadline, now);
      const bClosed = isEventClosed(b.deadline, now);
      if (aClosed === bClosed) return 0;
      return aClosed ? 1 : -1;
    });
  }, [now]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 60 * 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!activeEvent) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") setActiveEvent(null);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeEvent]);

  const renderEventCard = (event, index) => {
    const ctaLabel = event.isExternal ? "Register now" : "View details";
    const detailsTarget = event.isExternal ? event.detailsHref : event.detailsHref || "/event-details";
    const countdown = getCountdownLabel(event.deadline, now);
    const closed = isEventClosed(event.deadline, now);
    const qrImageSrc = getQrImageSrc(event);
    const isPrimaryCard = index === 0 && !closed;
    const clampTitle = {
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical",
      overflow: "hidden",
    };
    const clampDesc = {
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical",
      overflow: "hidden",
    };

    return (
      <article
        key={event.title}
        aria-label={`View details for ${event.title}`}
        className="
          group flex flex-col self-start overflow-hidden rounded-2xl border border-white/20
          bg-[#0d0d0e]/80 shadow-[0_20px_55px_-26px_rgba(0,0,0,0.85)]
          transition duration-300 hover:-translate-y-1
          hover:border-white/45 hover:shadow-[0_28px_75px_-30px_rgba(255,255,255,0.35)]
        "
        style={
          closed
            ? {
                filter: "grayscale(1)",
                opacity: 0.82,
              }
            : isPrimaryCard
            ? {
                borderColor: "rgba(251, 191, 36, 0.52)",
                boxShadow:
                  "0 0 0 1px rgba(251,191,36,0.42), 0 0 22px rgba(245,158,11,0.34), 0 20px 55px -26px rgba(0,0,0,0.85)",
                animation: "primaryCardGlow 3.2s ease-in-out infinite",
              }
            : undefined
        }
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={event.img}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
            <span className="rounded-full border border-white/25 bg-black/55 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/90">
              {event.price}
            </span>
            {countdown ? (
              <span className="rounded-full border border-[#e8c985]/45 bg-[#0b0b0b]/75 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f3dca6]">
                {countdown}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
            {event.date}
          </p>

          <h3 className="mt-2 text-lg font-extrabold leading-tight tracking-tight normal-case" style={clampTitle}>
            {event.title}
          </h3>

          <p className="mt-2 text-xs text-white/75 normal-case">{event.venue}</p>

          {event.desc ? (
            <div className="mt-2">
              <p className="text-sm leading-relaxed text-white/75 normal-case" style={clampDesc}>
                {event.desc}
              </p>
              {event.isExternal && !closed ? (
                <button
                  type="button"
                  onClick={() => setActiveEvent(event)}
                  className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#f0d9a6] underline decoration-[#f0d9a6]/70 underline-offset-4 transition hover:text-white hover:decoration-white"
                >
                  Read more
                </button>
              ) : null}
            </div>
          ) : null}

          {qrImageSrc && !closed ? (
            <div className="mt-4 rounded-lg border border-white/15 bg-black/35 p-3">
              <div className="flex items-center gap-3">
                <img
                  src={qrImageSrc}
                  alt={`QR code for ${event.title} registration`}
                  className="h-14 w-14 rounded bg-white p-1 object-contain"
                  loading="lazy"
                />
                <p className="text-[11px] text-white/70 normal-case">
                  Scan to register
                </p>
              </div>
            </div>
          ) : null}

          <div className="mt-4">
            {closed ? (
              <span className="inline-flex h-11 w-full cursor-not-allowed items-center justify-center rounded-md border border-white/20 bg-[#1a1a1a]/70 px-4 text-sm font-semibold uppercase tracking-[0.1em] text-white/60">
                Registration closed
              </span>
            ) : event.isExternal ? (
              <a
                href={detailsTarget}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 w-full items-center justify-center rounded-md border border-[#d2b679]/45 bg-[#0f0f10]/85 px-4 text-sm font-semibold uppercase tracking-[0.1em] text-[#f0d9a6] transition hover:border-[#f0d9a6] hover:bg-[#f0d9a6] hover:text-[#111]"
              >
                {ctaLabel}
              </a>
            ) : (
              <Link
                to={detailsTarget}
                className="inline-flex h-11 w-full items-center justify-center rounded-md border border-[#d2b679]/45 bg-[#0f0f10]/85 px-4 text-sm font-semibold uppercase tracking-[0.1em] text-[#f0d9a6] transition hover:border-[#f0d9a6] hover:bg-[#f0d9a6] hover:text-[#111]"
              >
                {ctaLabel}
              </Link>
            )}
          </div>
        </div>
      </article>
    );
  };

  return (
    <section
      id="events"
      className="relative overflow-hidden bg-black text-white"
    >
      <style>{`
        @keyframes slowPulse {
          0%, 100% { transform: scale(1); opacity: 0.12; }
          50% { transform: scale(1.08); opacity: 0.18; }
        }
        @keyframes primaryCardGlow {
          0%, 100% {
            box-shadow:
              0 0 0 1px rgba(251,191,36,0.42),
              0 0 22px rgba(245,158,11,0.34),
              0 20px 55px -26px rgba(0,0,0,0.85);
          }
          50% {
            box-shadow:
              0 0 0 1px rgba(250,204,21,0.56),
              0 0 34px rgba(250,204,21,0.48),
              0 24px 70px -30px rgba(0,0,0,0.9);
          }
        }
      `}</style>

      {/* Background light blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-40 -left-40 h-[420px] w-[420px] rounded-full bg-[#9ca3af]/20 blur-3xl"
          style={{ animation: "slowPulse 14s ease-in-out infinite" }}
        />
        <div
          className="absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-[#6b7280]/20 blur-3xl"
          style={{ animation: "slowPulse 18s ease-in-out infinite" }}
        />
      </div>

      <Container className="relative py-14 md:py-20">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-extrabold uppercase tracking-tight md:text-5xl">
            Events
          </h2>

          <p className="mt-4 text-sm text-white/75 md:text-base">
            Click on a poster below to view details and complete registration.
          </p>
        </div>

        <div className="mt-12 grid items-start gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {sortedFeaturedEvents.map((event, index) => renderEventCard(event, index))}
        </div>
      </Container>

      {activeEvent ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${activeEvent.title} details`}
          onClick={() => setActiveEvent(null)}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/20 bg-[#121212] shadow-[0_24px_70px_-35px_rgba(0,0,0,0.95)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/15 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#f0d9a6]">
                Program details
              </p>
              <button
                type="button"
                onClick={() => setActiveEvent(null)}
                className="px-1 text-2xl leading-none text-white/85 transition hover:text-white"
                aria-label="Close dialog"
              >
                ×
              </button>
            </div>

            <div className="max-h-[80vh] overflow-y-auto p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                {activeEvent.date}
              </p>
              <h3 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight normal-case text-white">
                {activeEvent.title}
              </h3>
              <p className="mt-3 text-sm normal-case text-white/80">{activeEvent.venue}</p>
              <p className="mt-3 text-sm leading-relaxed normal-case text-white/75">
                {activeEvent.details || activeEvent.desc}
              </p>

              {getCountdownLabel(activeEvent.deadline, now) ? (
                <p className="mt-4 inline-flex rounded-full border border-[#e8c985]/45 bg-[#0b0b0b]/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f3dca6]">
                  {getCountdownLabel(activeEvent.deadline, now)}
                </p>
              ) : null}

              {getQrImageSrc(activeEvent) ? (
                <div className="mt-4 rounded-lg border border-white/20 bg-black/35 p-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={getQrImageSrc(activeEvent)}
                      alt={`QR code for ${activeEvent.title} registration`}
                      className="h-20 w-20 rounded bg-white p-1 object-contain"
                      loading="lazy"
                    />
                    <p className="text-xs text-white/75 normal-case">
                      Scan this QR code to open the registration form.
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="mt-5">
                <a
                  href={activeEvent.detailsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center justify-center rounded-md border border-[#d2b679]/45 bg-[#0f0f10]/85 px-5 text-sm font-semibold uppercase tracking-[0.1em] text-[#f0d9a6] transition hover:border-[#f0d9a6] hover:bg-[#f0d9a6] hover:text-[#111]"
                >
                  Register now
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
