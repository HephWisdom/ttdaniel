export default function SectionTitle({ eyebrow, title, desc }) {
  return (
    <div className="max-w-2xl">
      {eyebrow && (
        <p className="text-xs tracking-[0.25em] uppercase text-black/50">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
        {title}
      </h2>
      {desc && <p className="mt-3 text-sm leading-relaxed text-black/60">{desc}</p>}
    </div>
  );
}
