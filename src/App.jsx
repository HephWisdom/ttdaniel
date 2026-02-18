import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, Navigate, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Header from "./components/Header";
import ScrollToTop from "./components/ScrollToTop";
import Hero from "./components/Hero";
import Interlude from "./components/Interlude";
import Books from "./components/Books";
import Events from "./components/Events";
import Counselling from "./components/Counselling";
import BibleStudies from "./components/BibleStudies";
import Footer from "./components/Footer";
import Blog_post from "./components/Blog_post";

const EventDetails = lazy(() => import("./pages/Event-details"));
const BibleStudyDetails = lazy(() => import("./pages/BibleStudyDetails"));
const Gallery = lazy(() => import("./pages/Gallery"));
const NotFound = lazy(() => import("./pages/NotFound"));
const InterludeReadMore = lazy(() => import("./pages/InterludeReadMore"));
const AdminBlog = lazy(() => import("./pages/AdminBlog"));
const BlogDetails = lazy(() => import("./pages/BlogDetails"));
const BlogAll = lazy(() => import("./pages/BlogAll"));

function Home() {
  return (
    <main id="top">
      <Hero />
      <Interlude />
      <Books />
      <Events />
      <BibleStudies />
      <Counselling />
      <Blog_post/>
    </main>
  );
}

function DraggableEventButton() {
  const navigate = useNavigate();
  const bubbleRef = useRef(null);
  const dragRef = useRef({
    isDragging: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: false,
  });
  const preventClickRef = useRef(false);
  const [position, setPosition] = useState({ x: 20, y: 96 });
  const [isDragging, setIsDragging] = useState(false);

  const clampPosition = (x, y) => {
    const element = bubbleRef.current;
    const width = element?.offsetWidth || 140;
    const height = element?.offsetHeight || 44;
    const margin = 10;
    const maxX = Math.max(window.innerWidth - width - margin, margin);
    const maxY = Math.max(window.innerHeight - height - margin, margin);
    return {
      x: Math.min(Math.max(x, margin), maxX),
      y: Math.min(Math.max(y, margin), maxY),
    };
  };

  useEffect(() => {
    const setDefaultPosition = () => {
      const element = bubbleRef.current;
      const width = element?.offsetWidth || 140;
      const target = clampPosition(window.innerWidth - width - 20, 96);
      setPosition(target);
    };

    setDefaultPosition();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => clampPosition(prev.x, prev.y));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handlePointerDown = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    setIsDragging(true);
    dragRef.current = {
      isDragging: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
      moved: false,
    };
  };

  const handlePointerMove = (event) => {
    const state = dragRef.current;
    if (!state.isDragging || state.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - state.startX;
    const deltaY = event.clientY - state.startY;
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      state.moved = true;
    }

    const next = clampPosition(state.originX + deltaX, state.originY + deltaY);
    setPosition(next);
  };

  const handlePointerUp = (event) => {
    const state = dragRef.current;
    if (state.pointerId !== event.pointerId) return;
    preventClickRef.current = state.moved;
    setIsDragging(false);
    dragRef.current = {
      isDragging: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      originX: 0,
      originY: 0,
      moved: false,
    };
    requestAnimationFrame(() => {
      preventClickRef.current = false;
    });
  };

  const handleClick = () => {
    if (preventClickRef.current) return;
    navigate("/event-details");
  };

  return (
    <button
      ref={bubbleRef}
      type="button"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={handleClick}
      className="
        fixed z-[70]
        inline-flex items-center justify-center
        h-11 px-4
        rounded-full border border-orange-300/60
        bg-orange-500 text-white
        text-xs font-bold uppercase tracking-[0.14em]
        shadow-[0_12px_32px_-14px_rgba(249,115,22,0.75)]
        transition-transform hover:scale-[1.03] active:scale-[0.98]
        cursor-grab active:cursor-grabbing
      "
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: "none",
        transition: isDragging
          ? "none"
          : "left 220ms cubic-bezier(0.22, 1, 0.36, 1), top 220ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
      aria-label="Go to event details"
    >
      Event Details
    </button>
  );
}

export default function App() {
  const location = useLocation();
  const isEventDetails = location.pathname.includes("/event-details");
  const isBibleStudyDetails =
    location.pathname.includes("/bible-studies/") ||
    location.pathname.includes("/spirituality/");
  const isBlogRoute = location.pathname.startsWith("/blog");
  const isAdminBlog = location.pathname.startsWith("/admin/blog");
  const hideFooter = isEventDetails || isBibleStudyDetails || isAdminBlog;
  const hideHeader = isAdminBlog;
  const showFloatingEventButton = !isEventDetails && !isAdminBlog && !isBlogRoute;

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <ScrollToTop />
      {!hideHeader && <Header />}
      {showFloatingEventButton && <DraggableEventButton />}
      <Suspense
        fallback={
          <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-zinc-700">
            Loading page...
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/books" element={<Navigate to="/#books" replace />} />
          <Route path="/events" element={<Navigate to="/#events" replace />} />
          <Route path="/spirituality" element={<Navigate to="/#spirituality" replace />} />
          <Route path="/counselling" element={<Navigate to="/#counselling" replace />} />
          <Route path="/event-details" element={<EventDetails />} />
          <Route path="/spirituality/:studyKey" element={<BibleStudyDetails />} />
          <Route path="/bible-studies/:studyKey" element={<BibleStudyDetails />} />
          <Route path="/interlude-read-more" element={<InterludeReadMore />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/blog" element={<BlogAll />} />
          <Route path="/blog/:postId" element={<BlogDetails />} />
          <Route path="/admin/blog" element={<AdminBlog />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      {!hideFooter && <Footer />}
    </div>
  );
}
