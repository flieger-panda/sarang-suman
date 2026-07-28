import { Routes, Route } from "react-router-dom";
import WaveHero from "./components/WaveHero";
import HomeMenu from "./components/HomeMenu";
import Skills from "./pages/Skills";
import Portfolio from "./pages/Portfolio";
import AboutMe from "./pages/AboutMe";
import Music from "./pages/Music";

function Home() {
  return (
    <div className="bg-black">
      <WaveHero />
      <HomeMenu />
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
