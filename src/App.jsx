import { lazy, Suspense } from "react";
import { Navigate, Routes, Route, useLocation } from "react-router-dom";
import Header from "./components/Header";
import CookieConsent from "./components/CookieConsent";
import SiteAnalyticsTracker from "./components/SiteAnalyticsTracker";
import ScrollToTop from "./components/ScrollToTop";
import Hero from "./components/Hero";
import Interlude from "./components/Interlude";
import Books from "./components/Books";
import { BookTestimonials } from "./components/Testimonials";
import Events from "./components/Events";
import Counselling from "./components/Counselling";
import BibleStudies from "./components/BibleStudies";
import Footer from "./components/Footer";
import Blog_post from "./components/Blog_post";

const BibleStudyDetails = lazy(() => import("./pages/BibleStudyDetails"));
const Donate = lazy(() => import("./pages/Donate"));
const Gallery = lazy(() => import("./pages/Gallery"));
const NotFound = lazy(() => import("./pages/NotFound"));
const InterludeReadMore = lazy(() => import("./pages/InterludeReadMore"));
const AdminBlog = lazy(() => import("./pages/AdminBlog"));
const BlogDetails = lazy(() => import("./pages/BlogDetails"));
const BlogAll = lazy(() => import("./pages/BlogAll"));
const PrivacyCookies = lazy(() => import("./pages/PrivacyCookies"));

function Home() {
  return (
    <main id="top">
      <Hero />
      <Interlude />
      <Books />
      <BookTestimonials />
      <Events />
      <BibleStudies />
      <Counselling />
      <Blog_post />
    </main>
  );
}

export default function App() {
  const location = useLocation();
  const isBibleStudyDetails =
    location.pathname.includes("/bible-studies/") ||
    location.pathname.includes("/spirituality/");
  const isAdminBlog = location.pathname.startsWith("/admin/blog");
  const hideFooter = isBibleStudyDetails || isAdminBlog;
  const hideHeader = isAdminBlog;

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <ScrollToTop />
      <SiteAnalyticsTracker />
      {!hideHeader && <Header />}
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
          <Route path="/spirituality/:studyKey" element={<BibleStudyDetails />} />
          <Route path="/bible-studies/:studyKey" element={<BibleStudyDetails />} />
          <Route path="/interlude-read-more" element={<InterludeReadMore />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/blog" element={<BlogAll />} />
          <Route path="/blog/:postId" element={<BlogDetails />} />
          <Route path="/donate" element={<Donate />} />
          <Route path="/privacy-cookies" element={<PrivacyCookies />} />
          <Route path="/admin/blog/*" element={<AdminBlog />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      {!hideFooter && <Footer />}
      {!isAdminBlog && <CookieConsent />}
    </div>
  );
}
