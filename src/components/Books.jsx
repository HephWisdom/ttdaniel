import Container from "./ui/Container";

const events = [
  { title: "PITCH-DECK\nESSENTIALS", price: "€199.00", cta: "Pitch" },
  { title: "FINANCIAL-MODEL\nPRECISION", price: "€499.00", cta: "Forecast" },
  { title: "DECK + MODEL\nSYNERGY", price: "€699.00", cta: "Unify" },
  { title: "STRATEGIC\nBLUEPRINT", price: "€1,499.00", cta: "Blueprint" },
];

export default function Books() {
  return (
    <section id="packages" className="bg-white text-black">
      <Container className="py-24">
        {/* SECTION TITLE */}
        <h2 className="text-[35px] font-extrabold uppercase tracking-tight">
          Books
        </h2>

        {/* TABLE GRID */}
        <div className="mt-16 border border-black">
          <div className="grid grid-cols-1 md:grid-cols-4">
            {events.map((pkg, i) => (
              <div
                key={pkg.title}
                className={[
                  "flex min-h-[300px] md:min-h-[380px] flex-col",
                  "px-12 py-14",
                  // mobile row dividers
                  i !== 0 ? "border-t border-black md:border-t-0" : "",
                  // desktop column dividers
                  i !== 0 ? "md:border-l md:border-black" : "",
                ].join(" ")}
              >
                {/* TOP CONTENT */}
                <div>
                  <h3 className="text-[26px] leading-[1.05] font-extrabold uppercase whitespace-pre-line">
                    {pkg.title}
                  </h3>

                  <p className="mt-4 text-[15px] font-mono">
                    {pkg.price}
                  </p>
                </div>

                {/* BUTTON (same baseline, same height) */}
                <div className="mt-auto pt-10">
                  <button
                    className="
                      font-mono
                      w-[240px] max-w-full
                      h-12
                      border border-black
                      text-[14px]
                      uppercase tracking-wide
                      bg-transparent
                      hover:bg-black hover:text-white
                      tracking-[0.18em]
                      transition-none
                    "
                  >
                    {pkg.cta}
                  </button>
                </div>
                
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
