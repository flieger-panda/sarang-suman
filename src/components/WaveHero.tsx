import { useEffect, useRef, type RefObject } from "react";
import { animate, stagger, onScroll } from "animejs";
import {
  LINE_COUNT,
  CHARS_PER_LINE,
  NAME,
  CENTER_ROW_INDEX,
  NAME_START,
} from "./waveHeroLayout";

const NAME_CENTER_COL = NAME_START + NAME.length / 2;

const NOISE_CHARS = ["_", "."];
const NEAR_NAME_CHARS = ["_", ".", " "];
const NOISE_MIN = 0.02;
const NOISE_MAX = 0.85;
const NOISE_FALLOFF = 3;
const SPACE_RADIUS = 0.3;

function nameDistance(row: number, col: number) {
  const rowDist = Math.abs(row - CENTER_ROW_INDEX) / (LINE_COUNT / 2);
  const colDist = Math.abs(col - NAME_CENTER_COL) / (CHARS_PER_LINE / 2);
  return Math.min(1, Math.hypot(rowDist, colDist));
}

function noiseChance(dist: number) {
  const falloff = Math.pow(1 - dist, NOISE_FALLOFF);
  return NOISE_MIN + (NOISE_MAX - NOISE_MIN) * falloff;
}

const ROW_CHARS = Array.from({ length: LINE_COUNT }, (_, row) =>
  Array.from({ length: CHARS_PER_LINE }, (_, col) => {
    if (
      row === CENTER_ROW_INDEX &&
      col >= NAME_START &&
      col < NAME_START + NAME.length
    ) {
      return NAME[col - NAME_START];
    }
    if (
      Math.abs(row - CENTER_ROW_INDEX) <= 1 &&
      col >= NAME_START - 1 &&
      col <= NAME_START + NAME.length
    ) {
      return " ";
    }
    const dist = nameDistance(row, col);
    if (Math.random() < noiseChance(dist)) {
      const pool = dist < SPACE_RADIUS ? NEAR_NAME_CHARS : NOISE_CHARS;
      return pool[Math.floor(Math.random() * pool.length)];
    }
    return ">";
  }),
);

const CENTER_ROW_BEFORE = ROW_CHARS[CENTER_ROW_INDEX].slice(0, NAME_START).join(" ");
const CENTER_ROW_NAME = ROW_CHARS[CENTER_ROW_INDEX]
  .slice(NAME_START, NAME_START + NAME.length)
  .join(" ");
const CENTER_ROW_AFTER = ROW_CHARS[CENTER_ROW_INDEX]
  .slice(NAME_START + NAME.length)
  .join(" ");

type Props = {
  sectionRef: RefObject<HTMLElement | null>;
};

export default function WaveHero({ sectionRef }: Props) {
  const handRef = useRef<HTMLDivElement>(null);
  const handGroupRef = useRef<HTMLDivElement>(null);

  const scrollToMenu = () => {
    const section = sectionRef.current;
    if (!section) return;
    const targetY =
      section.getBoundingClientRect().bottom +
      window.scrollY -
      window.innerHeight;
    animate(document.documentElement, {
      scrollTop: targetY,
      duration: 4000,
      ease: "inOut(2)",
    });
  };

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const lines = section.querySelectorAll("[data-line]");
    const noise = section.querySelectorAll("[data-noise]");

    const scrollTrigger = () =>
      onScroll({
        target: section,
        sync: true,
        enter: "start start",
        leave: "end end",
      });

    const entrance = animate(lines, {
      translateX: [-2000, 0],
      delay: stagger(15, { jitter: 30 }),
      ease: "outExpo",
      autoplay: scrollTrigger(),
    });

    const fadeNoise = animate(noise, {
      opacity: [{ to: 1, duration: 65 }, { to: 0, duration: 35 }],
      autoplay: scrollTrigger(),
    });

    return () => {
      entrance.revert();
      fadeNoise.revert();
    };
  }, [sectionRef]);

  useEffect(() => {
    const section = sectionRef.current;
    const hand = handRef.current;
    const handGroup = handGroupRef.current;
    if (!section || !hand || !handGroup) return;

    const rock = animate(hand, {
      rotate: [-6, 6],
      duration: 900,
      loop: true,
      alternate: true,
      ease: "inOutSine",
    });

    const hide = animate(handGroup, {
      translateY: [0, 400],
      ease: "inOut(2)",
      autoplay: onScroll({
        target: section,
        sync: true,
        enter: "start start",
        leave: "end end",
      }),
    });

    return () => {
      rock.revert();
      hide.revert();
    };
  }, [sectionRef]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      const section = sectionRef.current;
      if (!section) return;
      const targetY =
        section.getBoundingClientRect().bottom +
        window.scrollY -
        window.innerHeight;
      // Only fire while the hand is still showing (i.e. we haven't
      // already scrolled past the point where it hides itself).
      if (window.scrollY >= targetY) return;
      scrollToMenu();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sectionRef]);

  return (
    <>
      <div
        ref={handGroupRef}
        className="pointer-events-none fixed inset-x-0 bottom-4 z-10 flex items-center justify-center gap-2"
      >
        <span className="animate-blink font-mono text-lg text-white [text-shadow:0_0_14px_rgba(255,255,255,1)]">
          &gt;
        </span>
        <div
          ref={handRef}
          onClick={scrollToMenu}
          className="origin-bottom cursor-pointer text-4xl pointer-events-auto [text-shadow:0_0_14px_rgba(255,255,255,1)]"
        >
          👋🏾
        </div>
      </div>
      <section ref={sectionRef} className="relative h-[300vh]">
        <div className="sticky top-0 flex h-svh flex-col items-center justify-center overflow-hidden">
          {ROW_CHARS.map((chars, i) =>
            i === CENTER_ROW_INDEX ? (
              <div
                key={i}
                data-line
                className="whitespace-pre font-mono text-lg text-white"
              >
                <span data-noise>{CENTER_ROW_BEFORE}</span>{" "}
                <span className="[text-shadow:0_0_14px_rgba(255,255,255,1)]">
                  {CENTER_ROW_NAME}
                </span>{" "}
                <span data-noise>{CENTER_ROW_AFTER}</span>
              </div>
            ) : (
              <div
                key={i}
                data-line
                data-noise
                className="whitespace-pre font-mono text-lg text-white"
              >
                {chars.join(" ")}
              </div>
            ),
          )}
        </div>
      </section>
    </>
  );
}
