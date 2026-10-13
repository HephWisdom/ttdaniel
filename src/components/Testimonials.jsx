import { useEffect, useRef, useState } from "react";
import Container from "./ui/Container";
import MotionReveal from "./ui/MotionReveal";
import "./Testimonials.css";
import bookTestimonyOne from "../assets/testimonials/1.mp4";
import bookTestimonyTwo from "../assets/testimonials/2.mp4";
import bookTestimonyThree from "../assets/testimonials/3.mp4";
import bookTestimonyFour from "../assets/testimonials/4.mp4";
import bookTestimonyFive from "../assets/testimonials/5.mp4";
import bookTestimonySix from "../assets/testimonials/6.mp4";
import newBookTestimony from "../assets/testimonials/newtestimonials.mp4";
import posterOne from "../assets/testimonials/1.jpg";
import posterTwo from "../assets/testimonials/2.jpg";
import posterThree from "../assets/testimonials/3.jpg";
import posterFour from "../assets/testimonials/4.jpg";
import posterFive from "../assets/testimonials/5.jpg";
import posterSix from "../assets/testimonials/6.jpg";
import posterNew from "../assets/testimonials/newtestimonials.jpg";

const BOOK_VIDEO_TESTIMONIALS = [
  {
    id: "book-testimony-new",
    video: newBookTestimony,
    poster: posterNew,
    title: "Featured Testimony",
  },
  {
    id: "book-testimony-6",
    video: bookTestimonySix,
    poster: posterSix,
    title: "Life Changing",
  },
  {
    id: "book-testimony-3",
    video: bookTestimonyThree,
    poster: posterThree,
    title: "Faith in Practice",
  },
  {
    id: "book-testimony-4",
    video: bookTestimonyFour,
    poster: posterFour,
    title: "Transforming Story",
  },
  {
    id: "book-testimony-2",
    video: bookTestimonyTwo,
    poster: posterTwo,
    title: "Life-Giving Insight",
  },
  {
    id: "book-testimony-5",
    video: bookTestimonyFive,
    poster: posterFive,
    title: "Featured Moment",
  },
  {
    id: "book-testimony-1",
    video: bookTestimonyOne,
    poster: posterOne,
    title: "Reader Reflection",
  },
];

const SCROLL_EDGE_TOLERANCE = 4;

function ArrowIcon({ direction = "right" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      style={direction === "left" ? { transform: "rotate(180deg)" } : undefined}>
      <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function VideoCard({ item, index, onPlay }) {
  const videoRef = useRef(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [error, setError] = useState("");

  const playVideo = async () => {
    const video = videoRef.current;
    setError("");
    // Enable native controls immediately, including while the video buffers.
    video.controls = true;
    setHasStarted(true);
    if (video.error) video.load();
    video.focus({ preventScroll: true });
    try {
      await video.play();
    } catch (playError) {
      if (playError.name !== "AbortError") {
        setError("Unable to play. Please try again.");
        setHasStarted(false);
        video.controls = false;
      }
    }
  };

  return (
    <article className={`testimonial-card${hasStarted ? " is-started" : ""}`}
      aria-label={`${index + 1} of ${BOOK_VIDEO_TESTIMONIALS.length}: ${item.title}`}>
      <video
        ref={videoRef}
        src={item.video}
        poster={item.poster}
        controls={hasStarted}
        playsInline
        preload="none"
        aria-label={item.title}
        onPlay={(event) => onPlay(event.currentTarget)}
        onEnded={() => setHasStarted(false)}
        onError={() => {
          setError("Unable to load this video. Please try again.");
          setHasStarted(false);
        }}
      />
      {!hasStarted && (
        <>
          <div className="testimonial-card-shade" />
          <div className="testimonial-card-heading">
            <span className="testimonial-card-eyebrow">Reader story</span>
            <h3>{item.title}</h3>
          </div>
          <button type="button" className="testimonial-play" onClick={playVideo}
            aria-label={`Play ${item.title}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 4.5a1 1 0 0 1 1.5-.86l12 7.5a1 1 0 0 1 0 1.72l-12 7.5A1 1 0 0 1 8 19.5z" />
            </svg>
          </button>
          <div className="testimonial-card-footer">
            <span>Watch story</span>
            <span className="testimonial-video-badge">Video testimonial</span>
          </div>
        </>
      )}
      {error && <p className="testimonial-error" role="alert">{error}</p>}
    </article>
  );
}

export function BookTestimonials() {
  const trackRef = useRef(null);
  const [scrollState, setScrollState] = useState({ left: false, right: true, index: 0 });

  useEffect(() => {
    const track = trackRef.current;
    const videos = [...track.querySelectorAll("video")];
    const syncScrollState = () => {
      const maxScrollLeft = Math.max(track.scrollWidth - track.clientWidth, 0);
      const cards = [...track.children];
      const firstOffset = cards[0].offsetLeft;
      let nearest = 0;
      cards.forEach((card, index) => {
        if (Math.abs(card.offsetLeft - firstOffset - track.scrollLeft) <
            Math.abs(cards[nearest].offsetLeft - firstOffset - track.scrollLeft)) nearest = index;
      });
      setScrollState({
        left: track.scrollLeft > SCROLL_EDGE_TOLERANCE,
        right: track.scrollLeft < maxScrollLeft - SCROLL_EDGE_TOLERANCE,
        index: nearest,
      });
    };
    const frameId = window.requestAnimationFrame(syncScrollState);
    track.addEventListener("scroll", syncScrollState, { passive: true });
    const resizeObserver = new ResizeObserver(syncScrollState);
    resizeObserver.observe(track);

    // Stop audio when a story is swiped away or the section leaves the screen.
    const visibilityObserver = new IntersectionObserver((entries) => {
      entries.forEach(({ target, intersectionRatio }) => {
        if (intersectionRatio < 0.5) target.pause();
      });
    }, { threshold: [0, 0.5] });
    videos.forEach((video) => visibilityObserver.observe(video));
    const pauseWhenHidden = () => {
      if (document.hidden) videos.forEach((video) => video.pause());
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);

    return () => {
      window.cancelAnimationFrame(frameId);
      track.removeEventListener("scroll", syncScrollState);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      document.removeEventListener("visibilitychange", pauseWhenHidden);
    };
  }, []);

  const scrollToCard = (index) => {
    const track = trackRef.current;
    const card = track.children[Math.max(0, Math.min(index, track.children.length - 1))];
    track.scrollTo({
      left: card.offsetLeft - track.children[0].offsetLeft,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  };

  const handleTrackKeyDown = (event) => {
    if (event.target !== event.currentTarget) return;
    const destinations = {
      ArrowLeft: scrollState.index - 1,
      ArrowRight: scrollState.index + 1,
      Home: 0,
      End: BOOK_VIDEO_TESTIMONIALS.length - 1,
    };
    if (event.key in destinations) {
      event.preventDefault();
      scrollToCard(destinations[event.key]);
    }
  };

  const handlePlay = (activeVideo) => {
    trackRef.current.querySelectorAll("video").forEach((video) => {
      if (video !== activeVideo) video.pause();
    });
  };

  return (
    <section id="testimonials" className="testimonials-section" aria-labelledby="testimonials-heading">
      <Container>
        <MotionReveal distance={18}>
          <div className="testimonials-header">
            <div>
              <p className="testimonials-label">Book testimonials</p>
              <h2 id="testimonials-heading">Real stories.<br /><span>Lasting impact.</span></h2>
              <p className="testimonials-intro">Hear how these books are making a difference in the lives of readers.</p>
            </div>
            <a className="testimonials-link" href="#books">Explore the books <ArrowIcon /></a>
          </div>
        </MotionReveal>

        <div id="book-testimonials-track" ref={trackRef} className="testimonials-track"
          role="region" aria-roledescription="carousel" aria-label="Reader video testimonials"
          tabIndex={0} onKeyDown={handleTrackKeyDown}>
          {BOOK_VIDEO_TESTIMONIALS.map((item, index) => (
            <VideoCard key={item.id} item={item} index={index} onPlay={handlePlay} />
          ))}
        </div>

        <div className="testimonials-navigation">
          <div className="testimonials-controls">
            <span className="testimonials-count" aria-live="polite" aria-atomic="true">
              <span className="sr-only">First visible story </span>
              {String(scrollState.index + 1).padStart(2, "0")}<span aria-hidden="true"> / </span>
              <span className="sr-only"> of </span><span className="testimonials-total">{String(BOOK_VIDEO_TESTIMONIALS.length).padStart(2, "0")}</span>
            </span>
            <button type="button" className="testimonials-arrow" disabled={!scrollState.left}
              onClick={() => scrollToCard(scrollState.index - 1)} aria-controls="book-testimonials-track"
              aria-label="Previous testimonial"><ArrowIcon direction="left" /></button>
            <button type="button" className="testimonials-arrow" disabled={!scrollState.right}
              onClick={() => scrollToCard(scrollState.index + 1)} aria-controls="book-testimonials-track"
              aria-label="Next testimonial"><ArrowIcon /></button>
          </div>
        </div>
      </Container>
    </section>
  );
}
