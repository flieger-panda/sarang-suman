import { Link } from "react-router-dom";
import MarkdownContent from "../components/MarkdownContent";
import { aboutMeContent } from "../lib/content";

export default function AboutMe() {
  return (
    <div className="min-h-svh bg-black px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/"
          className="mb-8 inline-block font-mono text-white hover:[text-shadow:0_0_14px_rgba(255,255,255,1)]"
        >
          &lt; back
        </Link>
        <MarkdownContent>{aboutMeContent}</MarkdownContent>
      </div>
    </div>
  );
}
