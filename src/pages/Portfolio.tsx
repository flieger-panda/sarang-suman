import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { portfolioProjects } from "../lib/content";

export default function Portfolio() {
  const navigate = useNavigate();
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, portfolioProjects.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, -1));
      } else if (e.key === "Enter") {
        if (selectedIndex === -1) return;
        e.preventDefault();
        navigate(`/portfolio/${portfolioProjects[selectedIndex].slug}`);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, navigate]);

  return (
    <div className="min-h-svh bg-black px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/"
          className="mb-8 inline-block font-mono text-white hover:[text-shadow:0_0_14px_rgba(255,255,255,1)]"
        >
          &lt; back
        </Link>
        <h1 className="font-heading mb-8 text-2xl font-bold text-white">
          portfolio
        </h1>
        <ul className="space-y-3">
          {portfolioProjects.map((project, index) => {
            const isSelected = selectedIndex === index;
            return (
              <li key={project.slug}>
                <Link
                  to={`/portfolio/${project.slug}`}
                  className="relative font-mono text-white"
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span
                    className={
                      "absolute right-full mr-2 " +
                      (isSelected
                        ? "animate-blink [text-shadow:0_0_14px_rgba(255,255,255,1)]"
                        : "invisible")
                    }
                  >
                    &gt;
                  </span>
                  <span
                    className={
                      isSelected
                        ? "font-bold [text-shadow:0_0_14px_rgba(255,255,255,1)]"
                        : ""
                    }
                  >
                    {project.title}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
