import { Routes, Route, useLocation } from "react-router-dom";
import Header from "./components/Header";
import ScrollToTop from "./components/ScrollToTop";
import Hero from "./components/Hero";
import Interlude from "./components/Interlude";
import Books from "./components/Books";
import Events from "./components/Events";
import EventDetails from "./pages/Event-details";
import Counselling from "./components/Counselling";
import BibleStudies from "./components/BibleStudies";
import BibleStudyDetails from "./pages/BibleStudyDetails";
import Footer from "./components/Footer";
import Gallery from "./pages/Gallery";
import NotFound from "./pages/NotFound";

function Home() {
  return (
    <main id="top">
      <Hero />
      <Interlude />
      <Books />
      <Events />
      <BibleStudies />
      <Counselling />
      {/* <Blog_post/> */}
    </main>
  );
}

export default function App() {
  const location = useLocation();
  const isEventDetails = location.pathname.includes("/event-details");
  const isBibleStudyDetails = location.pathname.includes("/bible-studies/");
  const hideFooter = isEventDetails || isBibleStudyDetails;

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <ScrollToTop />
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/event-details" element={<EventDetails />} />
        <Route path="/bible-studies/:studyKey" element={<BibleStudyDetails />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!hideFooter && <Footer />}
    </div>
  );
}
