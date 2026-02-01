import Header from "./components/Header";
import Hero from "./components/Hero";
import Interlude from "./components/Interlude";
import Books from "./components/Books";
import Events from "./components/Events";
import Counselling from "./components/Counselling";
import Bible_studies from "./components/Bible_studies";
import Blog_post from "./components/Blog_post";
import Footer from "./components/Footer";

export default function App() {
  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <Header />
      <main>
        <Hero />
        <Interlude />
        <Books />
        <Events />
        <Counselling/>
        {/* <Bible_studies/> */}
        {/* <Blog_post/> */}
      </main>
      <Footer />
    </div>
  );
}
