// Post-build step: turn the single-page bundle into one real HTML file per
// route, each with its own <head>, plus sitemap.xml.
//
// Runs after `vite build`, under bare `node` with no transpile step — which is
// why the shared route table (src/lib/seo.mjs) and frontmatter parser
// (src/lib/frontmatter.mjs) are plain ESM.
//
// Why this exists at all: the app is a BrowserRouter SPA, so every URL used to
// be served the same index.html, which meant all 15 indexable URLs shared one
// <title> and one <meta description>. Updating them client-side isn't enough —
// the initial HTML is what non-JS consumers see (Bing, LinkedIn, Slack,
// iMessage, X) and what Google caches and generates snippets from.
//
// This is head injection, not prerendering: the <body> is still the empty
// #root the SPA hydrates into. Full SSR was considered and rejected — the app
// leans on useLayoutEffect, requestAnimationFrame, ResizeObserver, and pdf.js
// at mount, so rendering it on the server would mean reworking the animation
// system for a body a JS-capable crawler already sees.
//
// Flat `skills.html` rather than `skills/index.html` on purpose: GitHub Pages
// resolves /skills → skills.html directly, whereas a directory would 301 to
// /skills/ and leave the canonical URL disagreeing with the linked one.
// Nested project routes get dist/projects/<slug>.html, which coexists fine
// with dist/projects.html.
//
// Strictly additive: dist/404.html stays a copy of the generic index.html, so
// any route this script misses behaves exactly as it did before.

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseFrontmatter,
  splitList,
  titleFromMarkdown,
} from "../src/lib/frontmatter.mjs";
import {
  NOT_FOUND_ROUTE,
  SITE,
  absolute,
  allRoutes,
  jsonLdForRoute,
} from "../src/lib/seo.mjs";
import { stampPdfMetadata } from "./pdf-metadata.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const CONTENT = join(ROOT, "content", "projects");
const RESUME_SRC = join(ROOT, "content", "Sarang_Suman_Resume.pdf");

// Mirrors src/lib/content.ts, which gets the same data through Vite's
// import.meta.glob. Same parser, same sort, so the generated <head> can't
// disagree with the page the app renders.
function loadProjects() {
  return readdirSync(CONTENT)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const raw = readFileSync(join(CONTENT, file), "utf8");
      const { data, content } = parseFrontmatter(raw);
      const slug = file.replace(/\.md$/, "");
      return {
        slug,
        title: titleFromMarkdown(content, slug),
        date: data.date ?? "",
        description: data.description ?? "",
        keywords: splitList(data.keywords),
        content,
      };
    })
    .sort((a, b) =>
      (b.date.toLowerCase() === "present" ? "9999-99" : b.date).localeCompare(
        a.date.toLowerCase() === "present" ? "9999-99" : a.date,
      ),
    );
}

function escapeAttr(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Replaces the *content* of a tag matched by attribute, leaving the rest of
// index.html untouched. Deliberately fails loudly: a silent no-op here would
// ship a page with the wrong title and look like a working build.
function replaceMetaContent(html, selectorAttr, value, file) {
  const pattern = new RegExp(
    `(<meta\\s+[^>]*${selectorAttr}[^>]*content=")[^"]*(")`,
    "i",
  );
  if (!pattern.test(html)) {
    throw new Error(`build-seo: no <meta ${selectorAttr}> to rewrite for ${file}`);
  }
  return html.replace(pattern, `$1${escapeAttr(value)}$2`);
}

// Verifies the substitutions actually landed on real elements, by re-reading
// the output with HTML comments stripped.
//
// This exists because of a bug worth not repeating: index.html's own comment
// described the title element and spelled the tag out literally, so the
// `<title>...</title>` pattern matched from *inside the comment* through to the
// real closing tag. The replacement then ate the comment's terminator, leaving
// the entire head — title, description, canonical, every og: and twitter: tag —
// commented out. Every grep of the raw HTML still reported the right values,
// because the bytes were all present; the parsed document had none of them.
// (It looked fine in a browser too, since assigning document.title creates a
// title element when the document has none.) Only checking the parsed result
// catches that, so this asserts rather than trusting the regexes.
function assertHead(html, route) {
  const parsed = html.replace(/<!--[\s\S]*?-->/g, "");

  const title = parsed.match(/<title>([\s\S]*?)<\/title>/i);
  if (!title || title[1] !== escapeAttr(route.title)) {
    throw new Error(
      `build-seo: ${route.path} — expected title ${JSON.stringify(route.title)}, ` +
        `found ${title ? JSON.stringify(title[1]) : "no title element"}`,
    );
  }

  const required = [
    ['meta[name=description]', /<meta\s+name="description"[\s\S]{0,40}?content="([^"]*)"/i, route.description],
    ['meta[og:title]', /<meta\s+property="og:title"[\s\S]{0,40}?content="([^"]*)"/i, route.title],
    ['meta[og:url]', /<meta\s+property="og:url"[\s\S]{0,40}?content="([^"]*)"/i, absolute(route.path)],
  ];
  for (const [label, pattern, expected] of required) {
    const found = parsed.match(pattern);
    if (!found || found[1] !== escapeAttr(expected)) {
      throw new Error(
        `build-seo: ${route.path} — ${label} is ${found ? JSON.stringify(found[1]) : "missing"}, ` +
          `expected ${JSON.stringify(expected)}`,
      );
    }
  }

  const ld = parsed.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/i,
  );
  if (!ld) throw new Error(`build-seo: ${route.path} — JSON-LD block missing`);
  const graph = JSON.parse(ld[1].replace(/\\u003c/g, "<"));
  if (!Array.isArray(graph["@graph"]) || graph["@graph"].length !== 3) {
    throw new Error(`build-seo: ${route.path} — JSON-LD @graph is malformed`);
  }
}

function headFor(template, route) {
  const url = absolute(route.path);
  let html = template;

  // `[^<]*` rather than `[\s\S]*?`, so the pattern can't start at a `<title>`
  // written inside a comment and run to the real closing tag. See assertHead.
  html = html.replace(
    /<title>[^<]*<\/title>/i,
    `<title>${escapeAttr(route.title)}</title>`,
  );
  html = html.replace(
    /(<link\s+rel="canonical"\s+href=")[^"]*(")/i,
    `$1${url}$2`,
  );

  html = replaceMetaContent(html, 'name="description"', route.description, route.path);
  html = replaceMetaContent(html, 'property="og:title"', route.title, route.path);
  html = replaceMetaContent(html, 'property="og:description"', route.description, route.path);
  html = replaceMetaContent(html, 'property="og:url"', url, route.path);
  html = replaceMetaContent(html, 'property="og:type"', route.ogType, route.path);
  html = replaceMetaContent(html, 'name="twitter:title"', route.title, route.path);
  html = replaceMetaContent(html, 'name="twitter:description"', route.description, route.path);

  const jsonLd = JSON.stringify(jsonLdForRoute(route), null, 2);
  const ldPattern =
    /(<script type="application\/ld\+json">)[\s\S]*?(<\/script>)/i;
  if (!ldPattern.test(html)) {
    throw new Error(`build-seo: no JSON-LD block to rewrite for ${route.path}`);
  }
  // JSON-LD sits in a data block, so `<` is the only sequence that could end
  // the script early; escaping it keeps the document well-formed.
  html = html.replace(ldPattern, `$1\n${jsonLd.replace(/</g, "\\u003c")}\n    $2`);

  assertHead(html, route);
  return html;
}

// `/` already exists as dist/index.html; everything else becomes a flat file.
function outputPathFor(routePath) {
  return join(DIST, `${routePath.replace(/^\//, "")}.html`);
}

function sitemap(routes) {
  const urls = [
    ...routes.map((route) => absolute(route.path)),
    // The résumé PDF is a genuinely strong asset for the name query — a
    // one-page document with a 3,451-character text layer, dense with the
    // name, "Atlanta, GA", and "Georgia Institute of Technology".
    absolute(SITE.resumePdf),
  ];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => `  <url><loc>${url}</loc></url>`),
    "</urlset>",
    "",
  ].join("\n");
}

const template = readFileSync(join(DIST, "index.html"), "utf8");
const routes = allRoutes(loadProjects());

let written = 0;
for (const route of routes) {
  const html = headFor(template, route);
  const target =
    route.path === "/" ? join(DIST, "index.html") : outputPathFor(route.path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, html);
  written += 1;
}

writeFileSync(join(DIST, "sitemap.xml"), sitemap(routes));

// A stable, permanent URL for the résumé, with its Info metadata filled in.
//
// The viewer imports the PDF through Vite, so it ships as
// /assets/Sarang_Suman_Resume-<hash>.pdf — a filename that changes on every
// content edit, taking any accumulated ranking or inbound link with it. This
// copy is the linkable one (and the one in the sitemap); the hashed asset
// stays for the in-app viewer, which wants cache-busting.
const stampedResume = stampPdfMetadata(readFileSync(RESUME_SRC), {
  title: `${SITE.name} - ${SITE.jobTitle} Resume`,
  author: SITE.name,
});
writeFileSync(join(DIST, SITE.resumePdf.replace(/^\//, "")), stampedResume);

// The hashed asset gets the same treatment, so the file the download button
// hands you matches the one at the stable URL. Overwriting after Vite has
// hashed it means the hash no longer describes the contents — harmless, since
// nothing verifies it and the name only has to be unique per deploy.
const assets = join(DIST, "assets");
for (const file of readdirSync(assets)) {
  if (/^Sarang_Suman_Resume-.*\.pdf$/.test(file)) {
    writeFileSync(join(assets, file), stampedResume);
  }
}

// 404.html gets its own head rather than being a copy of index.html. Pages
// serves it with a real 404 status for any path without a generated file, so it
// must not claim `/` as its canonical or advertise itself as the home page —
// which is exactly what copying index.html did.
writeFileSync(
  join(DIST, "404.html"),
  headFor(template, NOT_FOUND_ROUTE).replace(
    /\s*<link\s+rel="canonical"[^>]*>/i,
    "",
  ),
);

console.log(
  `build-seo: ${written} routes with per-route <head>, sitemap.xml (${routes.length + 1} urls), 404.html`,
);
