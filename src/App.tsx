import { lazy, Suspense, useCallback, useMemo, useRef, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import PageTransition from "./components/PageTransition";
import HomeMenu from "./components/HomeMenu";
import MouseGlow from "./components/MouseGlow";
import { RevealProvider } from "./components/RevealContext";
import {
  TransitionProvider,
  type PageTransitionHandle,
} from "./components/TransitionContext";
import Skills from "./pages/Skills";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import AboutMe from "./pages/AboutMe";
import Music from "./pages/Music";

// Lazy specifically because of pdf.js: bundled eagerly it roughly doubles
// the main chunk, and every page but this one loads it for nothing. The
// page transition's curtain is already covering the screen while the chunk
// arrives, so a null Suspense fallback is invisible rather than a flash.
const Resume = lazy(() => import("./pages/Resume"));

function Home({ onToggleGlow }: { onToggleGlow: () => void }) {
  return (
    <div className="bg-black">
      <HomeMenu onToggleGlow={onToggleGlow} />
    </div>
  );
}

function App() {
  const location = useLocation();
  const [revealed, setRevealed] = useState(false);
  const transitionRef = useRef<PageTransitionHandle>(null);

  // Hidden toggle: Enter on the home page's name row (see HomeMenu). Lives
  // up here rather than in HomeMenu so the glow keeps following the pointer
  // across route changes once it's on.
  const [glowEnabled, setGlowEnabled] = useState(false);
  const toggleGlow = useCallback(() => setGlowEnabled((on) => !on), []);

  // Reset synchronously on every route change, before any descendant
  // (PageTransition, the routed page) renders with the new location —
  // the React-sanctioned "adjust state during render" pattern. Without
  // this, a revisited route could briefly read a stale `true` left over
  // from a previous visit, since PageTransition only sets it back to
  // true once the curtain has actually finished fading.
  const lastPathname = useRef(location.pathname);
  if (lastPathname.current !== location.pathname) {
    lastPathname.current = location.pathname;
    if (revealed) setRevealed(false);
  }

  const revealContextValue = useMemo(
    () => ({ revealed, setRevealed }),
    [revealed],
  );

  return (
    <RevealProvider value={revealContextValue}>
      <TransitionProvider value={transitionRef}>
        <MouseGlow enabled={glowEnabled} />
        <PageTransition ref={transitionRef} />
        <Routes>
          <Route path="/" element={<Home onToggleGlow={toggleGlow} />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:slug" element={<ProjectDetail />} />
          <Route
            path="/resume"
            element={
              <Suspense fallback={null}>
                <Resume />
              </Suspense>
            }
          />
          <Route path="/about-me" element={<AboutMe />} />
          <Route path="/music" element={<Music />} />
        </Routes>
      </TransitionProvider>
    </RevealProvider>
  );
}

export default App;
