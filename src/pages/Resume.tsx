import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import * as pdfjs from "pdfjs-dist";
import type { PDFPageProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import SideWave from "../components/SideWave";
import PixelIcon, { type PixelBitmap } from "../components/PixelIcon";
import { PIXEL_ICONS } from "../components/pixelIcons";
import { useCharReveal } from "../hooks/useCharReveal";
import { useArrowKeyList } from "../hooks/useArrowKeyList";
import { revealChars } from "../lib/revealChars";
import resumeUrl from "../../content/Sarang_Suman_Resume.pdf?url";

// pdf.js runs its parser in a worker; Vite emits this as a same-origin
// asset so no CDN fetch is involved (the site stays fully static/offline).
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const DOWNLOAD_NAME = "Sarang_Suman_Resume.pdf";

// If pdf.js hasn't produced pages by now, stop waiting and show the
// browser's own renderer instead. A timeout is doing real work here rather
// than papering over slowness: when a module worker fails to *load* (a host
// serving .mjs as text/plain, a CSP worker-src rule, an extension blocking
// the script), the failure is asynchronous — `new Worker()` already
// returned, so pdf.js's own fallback-to-main-thread path never triggers and
// nothing ever rejects. Without a deadline that case is an infinite spinner.
const LOAD_TIMEOUT_MS = 12000;

// Zoom is a multiplier on "fits the pane's width", not an absolute pdf.js
// scale, so the document opens sensibly sized on any viewport and the
// buttons mean the same thing on a phone as on a wide monitor.
const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

// Breathing room between the page and the pane's edges, in CSS px, kept
// out of the fit calculation so a fitted page never touches the border.
const PAGE_MARGIN = 32;

// Cursor-list slots for this page, in the order they're laid out — back
// first (site convention: index 0), then the three controls. See
// website_design.md.
const BACK_INDEX = 0;
const ZOOM_OUT_INDEX = 1;
const ZOOM_IN_INDEX = 2;
const DOWNLOAD_INDEX = 3;
const FULLSCREEN_INDEX = 4;
const ENTRY_COUNT = 5;

// "native" is the guarantee that the resume is always readable: whatever
// stops pdf.js — a blocked worker, a browser too old for module workers, a
// host mis-serving an asset — the page falls back to the browser's own PDF
// renderer rather than to an apology and a download link. The custom zoom
// controls can't drive that renderer (it has its own), so they go inert,
// which is why the reason is shown rather than swallowed.
type LoadState =
  | { status: "loading" }
  | { status: "ready"; pages: PDFPageProxy[] }
  | { status: "native"; reason: string };

// Renders one page to its own canvas, re-rendering (rather than
// CSS-scaling an already-rasterized bitmap) whenever the scale changes so
// text stays crisp at every zoom level. Backed at devicePixelRatio so it's
// sharp on retina displays too.
function PdfPage({ page, scale }: { page: PDFPageProxy; scale: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const viewport = page.getViewport({ scale: scale * dpr });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = `${viewport.width / dpr}px`;
    canvas.style.height = `${viewport.height / dpr}px`;

    const task = page.render({ canvas, viewport });
    task.promise.catch((error: unknown) => {
      // Cancelling in the cleanup below is the normal path on every zoom
      // change, so the rejection it produces isn't an error worth surfacing.
      if ((error as { name?: string })?.name !== "RenderingCancelledException") {
        console.error(error);
      }
    });

    return () => {
      task.cancel();
    };
  }, [page, scale]);

  return <canvas ref={canvasRef} className="block bg-white" />;
}

function ControlButton({
  icon,
  label,
  isSelected,
  onSelect,
  onPress,
  href,
  disabled = false,
}: {
  icon: PixelBitmap;
  label: string;
  isSelected: boolean;
  onSelect: () => void;
  onPress?: () => void;
  href?: string;
  disabled?: boolean;
}) {
  // The one visual difference from the rest of the site's cursor lists: no
  // leading `>`. These sit in a horizontal row rather than a stacked list,
  // where a chevron in front of each would read as part of the wave texture
  // rather than as a selection marker — so selection shows as the same glow
  // the `>` lists use on their labels, applied to the icon itself.
  const className =
    "inline-flex h-8 w-8 items-center justify-center text-white transition-opacity " +
    (disabled
      ? "cursor-default opacity-25 "
      : "cursor-pointer hover:opacity-100 ") +
    (isSelected && !disabled
      ? "opacity-100 [filter:drop-shadow(0_0_6px_rgba(255,255,255,0.9))]"
      : "opacity-60");
  const content = <PixelIcon bitmap={icon} className="h-4 w-4" />;

  if (href) {
    return (
      <a
        href={href}
        download={DOWNLOAD_NAME}
        aria-label={label}
        title={label}
        className={className}
        onMouseEnter={onSelect}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      className={className}
      onMouseEnter={onSelect}
      onClick={onPress}
    >
      {content}
    </button>
  );
}

export default function Resume() {
  const containerRef = useRef<HTMLDivElement>(null);
  useCharReveal(containerRef);

  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [zoom, setZoom] = useState(1);

  const paneRef = useRef<HTMLDivElement>(null);
  const [paneWidth, setPaneWidth] = useState(0);

  // Fullscreens the whole bordered box (toolbar + pane), not just the pane,
  // so the controls stay reachable while fullscreen. Tracked via the
  // `fullscreenchange` event rather than the click handler alone because
  // the browser's own Escape-to-exit (and multi-tab edge cases) bypass our
  // toggle entirely — the event is the only source of truth for whether
  // we're still in it.
  const viewerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === viewerRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void viewerRef.current?.requestFullscreen();
    }
  };

  useEffect(() => {
    let cancelled = false;
    let task: ReturnType<typeof pdfjs.getDocument> | undefined;

    const load = async () => {
      // Fetched here and handed to pdf.js as bytes rather than letting it
      // fetch `url` itself. This resume is a *linearized* PDF, which is
      // pdf.js's cue to pull it in pieces over HTTP Range requests and
      // stream-parse it — a whole networking path (range support, partial
      // responses, content-type sniffing, progressive parsing) that has to
      // behave across every server and proxy in between. For a 100 KB file
      // there is nothing to gain from it, and one plain request either
      // works or gives us a status code we can actually report.
      const response = await fetch(resumeUrl);
      if (!response.ok) {
        throw new Error(`fetch failed — ${response.status} ${response.statusText}`);
      }
      const data = await response.arrayBuffer();
      if (cancelled) return [];

      task = pdfjs.getDocument({ data });
      const doc = await task.promise;
      return Promise.all(
        Array.from({ length: doc.numPages }, (_, i) => doc.getPage(i + 1)),
      );
    };

    let timer: number | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timer = window.setTimeout(
        () => reject(new Error(`timed out after ${LOAD_TIMEOUT_MS}ms`)),
        LOAD_TIMEOUT_MS,
      );
    });

    Promise.race([load(), deadline])
      .then((pages) => {
        if (!cancelled && pages.length > 0) setState({ status: "ready", pages });
      })
      .catch((error: unknown) => {
        // The cleanup below aborts the in-flight load on unmount (and on
        // StrictMode's dev-only double-mount), which rejects this promise —
        // not a real failure, and `cancelled` is exactly that signal.
        if (cancelled) return;
        const reason = error instanceof Error ? error.message : String(error);
        console.error("[resume] pdf.js failed, using the browser viewer:", error);
        setState({ status: "native", reason });
      })
      .finally(() => window.clearTimeout(timer));

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      task?.destroy();
    };
  }, []);

  // Measured rather than assumed: the fit-to-width scale below depends on
  // the pane's real width, which changes with the viewport (and with the
  // wave gutter appearing at the lg breakpoint).
  useLayoutEffect(() => {
    const pane = paneRef.current;
    if (!pane) return;
    setPaneWidth(pane.clientWidth);
    const observer = new ResizeObserver(([entry]) => {
      setPaneWidth(entry.contentRect.width);
    });
    observer.observe(pane);
    return () => observer.disconnect();
  }, []);

  const zoomBy = (delta: number) =>
    setZoom((current) =>
      Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(current + delta).toFixed(2))),
    );

  // Same shortcuts a real PDF viewer has. Deliberately not routed through
  // useArrowKeyList: this page's list is `enabled: false` (see below), and
  // these are direct actions rather than cursor movement anyway.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomBy(ZOOM_STEP);
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        zoomBy(-ZOOM_STEP);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // `enabled: false` keeps the arrow keys doing what they should inside a
  // document viewer — scrolling the page — while hover still drives the
  // same selection styling every other list on the site uses. See the
  // `enabled` note in website_design.md.
  const { selectedIndex, hoverSelect } = useArrowKeyList({
    length: ENTRY_COUNT,
    enabled: false,
    initialIndex: BACK_INDEX,
  });

  const pages = state.status === "ready" ? state.pages : [];
  const baseWidth = pages[0]?.getViewport({ scale: 1 }).width ?? 0;
  const fitScale =
    baseWidth > 0 && paneWidth > 0
      ? Math.max(paneWidth - PAGE_MARGIN, 1) / baseWidth
      : 0;
  const scale = fitScale * zoom;
  const isBackSelected = selectedIndex === BACK_INDEX;
  // The browser's own renderer owns its zoom, so ours would be lying.
  const zoomDisabled = state.status !== "ready";

  return (
    <div ref={containerRef} className="relative min-h-svh bg-black">
      {/* Lives in the centered column's left margin rather than taking
          layout space of its own, so the viewer stays optically centered.
          Hidden below md, where there's no margin left to occupy and it
          would just sit behind the viewer. */}
      <SideWave className="hidden md:flex md:w-40 lg:w-64" />

      {/* <main> landmark: the page's content column. `main` and `div`
          are both display:block, so this is a pure tag swap. */}
      <main className="relative z-10 mx-auto max-w-4xl px-6 py-16">
        <Link
          to="/"
          className="relative mb-8 inline-block font-mono text-white"
          onMouseEnter={() => hoverSelect(BACK_INDEX)}
        >
          <span
            className={
              "absolute right-full mr-2 " +
              (isBackSelected
                ? "animate-blink [text-shadow:0_0_14px_rgba(255,255,255,1)]"
                : "invisible")
            }
          >
            &gt;
          </span>
          <span
            className={
              isBackSelected
                ? "font-bold [text-shadow:0_0_14px_rgba(255,255,255,1)]"
                : ""
            }
          >
            {revealChars("< back")}
          </span>
        </Link>

        {/* The only page not built from markdown, so it was the only one with
            no <h1> at all — the others get theirs from the content file's `#`
            heading. Same markup and position as Projects' heading (after the
            back link, `mb-8`), so this page now matches the rest of the site
            rather than being the exception. */}
        <h1 className="font-heading mb-8 text-2xl font-bold text-white">
          {revealChars("resume")}
        </h1>

        <div
          ref={viewerRef}
          className={
            "border border-white/20 bg-black " +
            // The Fullscreen API's UA stylesheet stretches the fullscreen
            // element to fill the viewport, but its children don't inherit
            // that — without `flex flex-col`, the pane below would keep its
            // normal-flow height and leave the rest of the screen black.
            (isFullscreen ? "flex h-full flex-col" : "")
          }
        >
          <div className="flex items-center justify-between gap-4 border-b border-white/20 px-3 py-2">
            <span className="truncate font-mono text-xs text-white/50">
              {revealChars(DOWNLOAD_NAME)}
              {/* Not swallowed: if the custom renderer bowed out, the
                  controls are visibly inert and this says why, rather than
                  leaving a dead-looking toolbar unexplained. */}
              {state.status === "native" && (
                <span className="text-white/30"> · browser viewer ({state.reason})</span>
              )}
            </span>
            <div className="flex shrink-0 items-center gap-1">
              <ControlButton
                icon={PIXEL_ICONS.zoomOut}
                label="zoom out"
                isSelected={selectedIndex === ZOOM_OUT_INDEX}
                onSelect={() => hoverSelect(ZOOM_OUT_INDEX)}
                onPress={() => zoomBy(-ZOOM_STEP)}
                disabled={zoomDisabled || zoom <= MIN_ZOOM}
              />
              <ControlButton
                icon={PIXEL_ICONS.zoomIn}
                label="zoom in"
                isSelected={selectedIndex === ZOOM_IN_INDEX}
                onSelect={() => hoverSelect(ZOOM_IN_INDEX)}
                onPress={() => zoomBy(ZOOM_STEP)}
                disabled={zoomDisabled || zoom >= MAX_ZOOM}
              />
              <ControlButton
                icon={PIXEL_ICONS.download}
                label="download"
                isSelected={selectedIndex === DOWNLOAD_INDEX}
                onSelect={() => hoverSelect(DOWNLOAD_INDEX)}
                href={resumeUrl}
              />
              <ControlButton
                icon={PIXEL_ICONS.fullscreen}
                label={isFullscreen ? "exit fullscreen" : "fullscreen"}
                isSelected={selectedIndex === FULLSCREEN_INDEX}
                onSelect={() => hoverSelect(FULLSCREEN_INDEX)}
                onPress={toggleFullscreen}
                disabled={!document.fullscreenEnabled}
              />
            </div>
          </div>

          <div
            ref={paneRef}
            className={
              (isFullscreen ? "flex-1 " : "h-[75svh] ") +
              "overscroll-contain " +
              // The native viewer fills the pane edge to edge and brings its
              // own scrolling, so the padding and scroll container that the
              // canvas stack needs would only double up on it.
              (state.status === "native" ? "" : "overflow-auto p-4")
            }
          >
            {state.status === "native" ? (
              <object
                data={resumeUrl}
                type="application/pdf"
                title={DOWNLOAD_NAME}
                className="h-full w-full"
              >
                {/* Reached only if the browser won't display PDFs inline
                    either (most mobile browsers) — the last resort. */}
                <p className="p-4 font-mono text-sm text-white/60">
                  your browser can't display pdfs inline —{" "}
                  <a
                    href={resumeUrl}
                    download={DOWNLOAD_NAME}
                    className="underline decoration-dotted"
                  >
                    download it instead
                  </a>
                  .
                </p>
              </object>
            ) : state.status === "loading" ? (
              <p className="font-mono text-sm text-white/40">loading resume…</p>
            ) : (
              // `w-max mx-auto` rather than `items-center`: a centered flex
              // child that outgrows its scroll container overflows equally
              // in both directions, and the part that spills past the
              // *start* edge is unreachable by scrolling — so zooming in
              // would permanently cut off the left of the page. Sizing the
              // stack to its content instead means `mx-auto` centers it
              // while it fits and collapses to zero margin once it doesn't.
              <div className="mx-auto flex w-max flex-col items-center gap-4">
                {scale > 0 &&
                  pages.map((page) => (
                    <PdfPage
                      key={page.pageNumber}
                      page={page}
                      scale={scale}
                    />
                  ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
