import { useEffect, useRef, useState } from "react";
import Container from "./ui/Container";
import MotionReveal from "./ui/MotionReveal";
import SlideArrowButton from "./ui/SlideArrowButton";
import bookTestimonyOne from "../assets/testimonials/1.mp4";
import bookTestimonyTwo from "../assets/testimonials/2.mp4";
import bookTestimonyThree from "../assets/testimonials/3.mp4";
import bookTestimonyFour from "../assets/testimonials/4.mp4";
import bookTestimonyFive from "../assets/testimonials/5.mp4";
import bookTestimonySix from "../assets/testimonials/6.mp4";
import newBookTestimony from "../assets/testimonials/newtestimonials.mp4";

const BOOK_VIDEO_TESTIMONIALS = [
  {
    id: "book-testimony-new",
    video: newBookTestimony,
    title: "Featured Testimony",
  },
  {
    id: "book-testimony-6",
    video: bookTestimonySix,
    title: "Life Changing",
  },
  {
    id: "book-testimony-3",
    video: bookTestimonyThree,
    title: "Faith in Practice",
  },
  {
    id: "book-testimony-4",
    video: bookTestimonyFour,
    title: "Transforming Story",
  },
  {
    id: "book-testimony-2",
    video: bookTestimonyTwo,
    title: "Life-Giving Insight",
  },
  {
    id: "book-testimony-5",
    video: bookTestimonyFive,
    title: "Featured Moment",
  },
  {
    id: "book-testimony-1",
    video: bookTestimonyOne,
    title: "Reader Reflection",
  },
];

const SCROLL_EDGE_TOLERANCE = 12;

function VideoCard({ item, index }) {
  return (
    <MotionReveal
      as="article"
      delay={90 + index * 80}
      distance={28}
      className="group flex w-[188px] shrink-0 snap-start flex-col overflow-hidden rounded-[24px] border border-[#cfb284]/65 bg-[#17110c] text-[#f8eed8] shadow-[0_24px_54px_-40px_rgba(0,0,0,0.72)] sm:w-[208px]"
    >
      <div className="relative aspect-[9/16] overflow-hidden bg-black">
        <video
          src={item.video}
          controls
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
        />
      </div>

      <div className="flex flex-1 flex-col gap-2 px-4 py-3">
        <h3 className="text-sm font-extrabold uppercase tracking-[0.08em] text-[#fff6e8] sm:text-base">
          {item.title}
        </h3>
      </div>
    </MotionReveal>
  );
}

export function BookTestimonials() {
  const trackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const track = trackRef.current;

    if (!track) {
      return undefined;
    }

    const syncScrollState = () => {
      const maxScrollLeft = Math.max(track.scrollWidth - track.clientWidth, 0);

      setCanScrollLeft(track.scrollLeft > SCROLL_EDGE_TOLERANCE);
      setCanScrollRight(track.scrollLeft < maxScrollLeft - SCROLL_EDGE_TOLERANCE);
    };

    const frameId = window.requestAnimationFrame(syncScrollState);
    track.addEventListener("scroll", syncScrollState, { passive: true });

    let resizeObserver;

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(syncScrollState);
      resizeObserver.observe(track);
    }

    window.addEventListener("resize", syncScrollState);

    return () => {
      window.cancelAnimationFrame(frameId);
      track.removeEventListener("scroll", syncScrollState);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", syncScrollState);
    };
  }, []);

  const scrollVideos = (direction) => {
    const track = trackRef.current;

    if (!track) {
      return;
    }

    track.scrollBy({
      left: direction * Math.max(track.clientWidth * 0.86, 220),
      behavior: "smooth",
    });
  };

  return (
    <section className="relative overflow-hidden border-t border-black/10 bg-[#ece2cf] text-[#1f1811]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-[#f8f0df] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#d4b06f]/25 blur-3xl" />
      </div>

      <Container className="relative py-14 md:py-18">
        <MotionReveal delay={40} distance={24}>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#806747]">
              Reader Voices
            </p>
            <h2 className="mt-3 text-[34px] font-black uppercase tracking-tight md:text-[40px]">
              Book Testimonials
            </h2>
          </div>
        </MotionReveal>

        <div className="relative mt-8">
          {canScrollLeft ? (
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#ece2cf] via-[#ece2cf]/88 to-transparent" />
          ) : null}
          {canScrollRight ? (
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-14 bg-gradient-to-l from-[#ece2cf] via-[#ece2cf]/90 to-transparent" />
          ) : null}

          <div
            id="book-testimonials-track"
            ref={trackRef}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-3 pr-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {BOOK_VIDEO_TESTIMONIALS.map((item, index) => (
              <VideoCard key={item.id} item={item} index={index} />
            ))}
          </div>

          {canScrollLeft ? (
            <SlideArrowButton
              direction="left"
              onClick={() => scrollVideos(-1)}
              ariaLabel="Scroll to previous testimonial videos"
            />
          ) : null}

          {canScrollRight ? (
            <SlideArrowButton
              direction="right"
              onClick={() => scrollVideos(1)}
              ariaLabel="Scroll to more testimonial videos"
            />
          ) : null}
        </div>
      </Container>
    </section>
  );
}
