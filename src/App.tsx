import { useRef } from "react";
import { Routes, Route } from "react-router-dom";
import WaveHero from "./components/WaveHero";
import HomeMenu from "./components/HomeMenu";
import Skills from "./pages/Skills";
import Portfolio from "./pages/Portfolio";
import AboutMe from "./pages/AboutMe";
import Music from "./pages/Music";

function Home() {
  const sectionRef = useRef<HTMLElement>(null);

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
