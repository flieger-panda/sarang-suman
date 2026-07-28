import { useEffect, useRef } from "react";
import { Routes, Route } from "react-router-dom";
import WaveHero from "./components/WaveHero";
import HomeMenu from "./components/HomeMenu";
import Skills from "./pages/Skills";
import Portfolio from "./pages/Portfolio";
import AboutMe from "./pages/AboutMe";
import Music from "./pages/Music";

function Home() {
  const sectionRef = useRef<HTMLElement>(null);

  // Block user-driven scroll (wheel/touch/keys) without touching
  // html/body overflow — overflow: hidden breaks the wave hero's
  // position: sticky, causing its scroll-linked animation to drift off
  // screen instead of staying pinned to the viewport. Programmatic
  // scrollTop animation (used by the 👋🏾 click handler) is unaffected
  // since it isn't driven by these events.
  useEffect(() => {
    const preventScroll = (e: Event) => e.preventDefault();
    const scrollKeys = new Set([
      " ",
      "PageUp",
      "PageDown",
      "Home",
      "End",
      "ArrowUp",
      "ArrowDown",
    ]);
    const preventScrollKeys = (e: KeyboardEvent) => {
      if (scrollKeys.has(e.key)) e.preventDefault();
    };

    window.addEventListener("wheel", preventScroll, { passive: false });
    window.addEventListener("touchmove", preventScroll, { passive: false });
    window.addEventListener("keydown", preventScrollKeys);
    return () => {
      window.removeEventListener("wheel", preventScroll);
      window.removeEventListener("touchmove", preventScroll);
      window.removeEventListener("keydown", preventScrollKeys);
    };
  }, []);

  return (
    <div className="bg-black">
      <WaveHero sectionRef={sectionRef} />
      <HomeMenu sectionRef={sectionRef} />
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/skills" element={<Skills />} />
      <Route path="/portfolio" element={<Portfolio />} />
      <Route path="/about-me" element={<AboutMe />} />
      <Route path="/music" element={<Music />} />
    </Routes>
  );
}

export default App;
