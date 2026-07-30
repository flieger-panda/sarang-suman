import { useRef } from "react";
import MarkdownContent from "../components/MarkdownContent";
import SideWave from "../components/SideWave";
import { musicContent } from "../lib/content";
import { useCharReveal } from "../hooks/useCharReveal";

export default function Music() {
  const containerRef = useRef<HTMLDivElement>(null);
  useCharReveal(containerRef);

  return (
    <div ref={containerRef} className="relative min-h-svh bg-black">
      <SideWave className="hidden md:flex md:w-40 lg:w-64" />
      {/* <main> landmark: the page's content column. `main` and `div`
          are both display:block, so this is a pure tag swap. */}
      <main className="relative z-10 mx-auto max-w-2xl px-6 py-16">
        <MarkdownContent
          navigableHeadings
          backHref="/"
          headingLinks={{
            "my spotify":
              "https://open.spotify.com/user/8jdc0prdtfksxp64jcfx92kec?si=fb60782834884fa8",
          }}
        >
          {musicContent}
        </MarkdownContent>
      </main>
    </div>
  );
}
