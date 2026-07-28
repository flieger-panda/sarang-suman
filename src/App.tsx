import { useRef } from "react";
import WaveHero from "./components/WaveHero";
import HomeMenu from "./components/HomeMenu";

function App() {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <div className="bg-black">
      <WaveHero sectionRef={sectionRef} />
      <HomeMenu sectionRef={sectionRef} />
    </div>
  );
}

export default App;
