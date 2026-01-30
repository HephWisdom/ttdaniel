import Header from "./components/Header";
import Hero from "./components/Hero";
import Interlude from "./components/Interlude";
import Books from "./components/Books";
import Events from "./components/Events";
import Counselling from "./components/Counselling";
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
      </main>
      <Footer />
    </div>
  );
}
