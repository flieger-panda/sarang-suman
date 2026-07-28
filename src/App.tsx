import WaveHero from "./components/WaveHero";
import type { ComponentType } from "react";

const WaveHeroComponent = WaveHero as unknown as ComponentType;

function App() {
  return (
    <div className="bg-black">
      <WaveHeroComponent />
    </div>
  );
}

export default App;
