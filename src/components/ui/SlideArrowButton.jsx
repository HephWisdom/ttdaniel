function ChevronIcon({ direction = "right", className = "" }) {
  const rotationClass = direction === "left" ? "rotate-180" : "";

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`${rotationClass} ${className}`.trim()}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

export default function SlideArrowButton({ direction = "right", onClick, ariaLabel }) {
  const sideClass = direction === "left" ? "left-3" : "right-3";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`group absolute top-1/2 z-20 inline-flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white shadow-[0_22px_45px_-24px_rgba(0,0,0,0.9)] backdrop-blur-md transition duration-200 hover:scale-[1.04] hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/35 ${sideClass}`.trim()}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full border border-white/20"
      />
      <span
        aria-hidden="true"
        className="absolute inset-[6px] rounded-full bg-black/45 ring-1 ring-white/10 transition duration-200 group-hover:bg-black/60"
      />
      <ChevronIcon direction={direction} className="relative z-10 h-5 w-5" />
    </button>
  );
}
