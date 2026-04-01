import { useRef } from "react";
import { Link } from "react-router-dom";
import Container from "./ui/Container";
import mainPortrait from "../assets/ttdaniel1.png";
import thumbOne from "../assets/gallery/IMG-20260208-WA0015.jpg";
import thumbTwo from "../assets/gallery/IMG-20260208-WA0030.jpg";
import thumbThree from "../assets/gallery/IMG-20260208-WA0028.jpg";
import thumbFour from "../assets/gallery/IMG-20260208-WA0027.jpg";
import thumbFive from "../assets/gallery/IMG-20260206-WA0016.jpg";

const THUMBNAILS = [thumbOne, thumbTwo, thumbThree, thumbFour, thumbFive];
const HEADING_SEGMENTS = [
  { text: "GOD" },
  { text: "IS", breakBefore: true },
  { text: " STILL" },
  { text: "MAKING", breakBefore: true },
  { text: "PEOPLE!", breakBefore: true },
];
const SEGMENT_BASE_INDEX = HEADING_SEGMENTS.reduce(
  (acc, segment, index) => {
    const previous = index === 0 ? 0 : acc[index - 1] + HEADING_SEGMENTS[index - 1].text.replaceAll(" ", "").length;
    acc.push(previous);
    return acc;
  },
  []
);

export default function Hero() {
  const letterRefs = useRef([]);

  const handleHeadingMouseMove = (event) => {
    const influenceRadius = 120;
    const maxShift = 4;

    letterRefs.current.forEach((letter) => {
      if (!letter) return;

      const rect = letter.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = event.clientX - centerX;
      const deltaY = event.clientY - centerY;
      const distance = Math.hypot(deltaX, deltaY);

      if (distance > influenceRadius) {
        letter.style.transform = "translate3d(0, 0, 0)";
        return;
      }

      const strength = (1 - distance / influenceRadius) * 0.14;
      const moveX = Math.max(Math.min(deltaX * strength, maxShift), -maxShift);
      const moveY = Math.max(Math.min(deltaY * strength, maxShift), -maxShift);
      letter.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
    });
  };

  const handleHeadingMouseLeave = () => {
    letterRefs.current.forEach((letter) => {
      if (letter) {
        letter.style.transform = "translate3d(0, 0, 0)";
      }
    });
  };

  return (
    <section className="min-h-screen bg-[#d3d3d3]" data-analytics-section="home">
      <Container className="h-full max-w-none px-0">
        <div className="min-h-screen w-full bg-[#ececec] px-6 py-6 sm:px-10 sm:py-8 lg:px-12 lg:py-10">
          <div className="grid items-start gap-8 lg:grid-cols-[1fr_1fr] lg:gap-4">
            <div className="flex w-full items-start justify-center">
              <div
                className="mt-0 pt-2 lg:pt-4"
                onMouseMove={handleHeadingMouseMove}
                onMouseLeave={handleHeadingMouseLeave}
              >
            <h1 className="mx-auto max-w-[12ch] text-center font-serif text-[clamp(3rem,8.8vw,8.6rem)] leading-[0.8] tracking-[-0.02em] text-black">
                  {HEADING_SEGMENTS.map((segment, segmentIndex) => (
                    <span key={`${segment.text}-${segmentIndex}`}>
                      {segment.breakBefore ? <br /> : null}
                      <span
                        className={`whitespace-nowrap ${segment.italic ? "italic" : ""}`}
                      >
                        {segment.text.split("").map((char, charIndex) => {
                          const isSpace = char === " ";
                          const key = `${segmentIndex}-${charIndex}`;
                          const charsBefore = segment.text
                            .slice(0, charIndex)
                            .replaceAll(" ", "").length;
                          const currentLetterIndex =
                            SEGMENT_BASE_INDEX[segmentIndex] + charsBefore;
                          return isSpace ? (
                            <span key={key}> </span>
                          ) : (
                            <span
                              key={key}
                              ref={(node) => {
                                letterRefs.current[currentLetterIndex] = node;
                              }}
                              className="inline-block transition-transform duration-200 ease-out"
                            >
                              {char}
                            </span>
                          );
                        })}
                      </span>
                    </span>
                  ))}
                </h1>
              </div>
            </div>

            <div className="order-last lg:order-none lg:justify-self-stretch">
              <div className="h-[20rem] w-full max-w-[26rem] overflow-hidden bg-[#e5e5e5] sm:h-[24rem] lg:-ml-10 lg:h-[33rem] lg:w-[99%] lg:max-w-none">
                <img
                  src={mainPortrait}
                  alt="Main portrait"
                  className="h-full w-full object-cover object-center grayscale transition-all duration-1000 ease-out hover:grayscale-0"
                  loading="eager"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-end">
            <div className="max-w-[35rem]">
              <div className="mb-2 flex items-center justify-between text-[9px] uppercase tracking-[0.08em] text-black/60 sm:text-[10px]">
                <span>Recent Frames</span>
                <span className="inline-flex items-center gap-1">
                  Swipe to Scroll
                  <span aria-hidden="true">→</span>
                </span>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#ececec] to-transparent" />
                <div className="flex gap-3 overflow-x-auto pr-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4">
                  {THUMBNAILS.map((image) => (
                    <Link
                      key={image}
                      to="/gallery"
                      className="block basis-1/3 shrink-0 overflow-hidden bg-[#e4e4e4]"
                      aria-label="Open gallery"
                    >
                      <img
                        src={image}
                        alt="Gallery thumbnail"
                        className="h-28 w-full object-cover grayscale transition-all duration-1000 ease-out hover:scale-105 hover:grayscale-0 sm:h-40"
                        loading="lazy"
                      />
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="max-w-[22rem] justify-self-start text-[10px] uppercase leading-[1.52] tracking-[0.04em] text-black/88 lg:justify-self-end">
              <p>
                "Those from among you Shall build the old waste places;
                You shall raise up the foundations of many generations;
                And you shall be called the Repairer of the Breach, The Restorer of Streets to Dwell In.<br />
                (Isaiah 58:12, NKJV)"
              </p>
              <Link
                to="/gallery"
                className="mt-7 inline-block border-b border-black pb-[2px] text-[10px] font-semibold uppercase tracking-[0.06em]"
              >
                GALLERY
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
