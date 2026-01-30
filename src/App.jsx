import Header from "./components/Header";
import Hero from "./components/Hero";
import Events from "./components/Events";
import Books from "./components/Books";
import Process from "./components/Process";
import FAQ from "./components/FAQ";
import Quote from "./components/Quote";
import Footer from "./components/Footer";
import Interlude from "./components/Interlude";

export default function App() {
  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <Header />
      <main>
        <Hero />
        <Interlude />
        <Books />
        <Events />
      </main>
      <Footer />
    </div>
  );
}
