import { Routes, Route } from "react-router-dom";
import PageTransition from "./components/PageTransition";
import HomeMenu from "./components/HomeMenu";
import Skills from "./pages/Skills";
import Portfolio from "./pages/Portfolio";
import PortfolioProject from "./pages/PortfolioProject";
import AboutMe from "./pages/AboutMe";
import Music from "./pages/Music";

function Home() {
  return (
    <div className="bg-black">
      <HomeMenu />
    </div>
  );
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/skills" element={<Skills />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/portfolio/:slug" element={<PortfolioProject />} />
        <Route path="/about-me" element={<AboutMe />} />
        <Route path="/music" element={<Music />} />
      </Routes>
      <PageTransition />
    </>
  );
}

export default App;
