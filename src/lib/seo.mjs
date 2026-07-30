// The site's SEO route table and structured data, in one place, shared by:
//
//   - src/hooks/useRouteMeta.ts  — updates the live document on client-side
//                                  navigation (browser)
//   - scripts/build-seo.mjs      — writes the real per-route <head> into the
//                                  static HTML, plus sitemap.xml (node)
//
// Plain ESM for the same reason as frontmatter.mjs: build-seo.mjs runs under
// bare `node` after `vite build`, so shared code has to be directly runnable
// with no transpile step. Types live in seo.d.mts.
//
// Why both a build-time and a runtime path: injecting the head at build time
// is what actually matters, because the initial HTML is what non-JS consumers
// see — Bing, LinkedIn, Slack, iMessage, X — and what Google caches and builds
// snippets from. The runtime path exists so the browser tab and GA4's
// page_title stay correct across in-app navigation, where no new document is
// ever fetched.

import { cleanTitle } from "./frontmatter.mjs";

export const SITE = {
  origin: "https://sarangsuman.me",
  // Capitalized deliberately, unlike the site's lowercase on-page treatment:
  // <title>, meta descriptions and structured data are SERP and browser
  // chrome, not part of the page's visual design, and a lowercase name reads
  // as less authoritative in a result for a person's name.
  name: "Sarang Suman",
  jobTitle: "Software Developer",
  email: "sarangrsuman@gmail.com",
  locality: "Atlanta",
  region: "GA",
  country: "US",
  image: "/about/sarang.jpg",
  ogImage: "/og.png",
  ogImageAlt: "sarang suman — terminal-style menu on black",
  // Stable copy of the résumé, outside Vite's content-hashed assets. See
  // public/Sarang_Suman_Resume.pdf and the note in scripts/build-seo.mjs.
  resumePdf: "/Sarang_Suman_Resume.pdf",
  school: {
    name: "Georgia Institute of Technology",
    sameAs: "https://en.wikipedia.org/wiki/Georgia_Institute_of_Technology",
  },
  // The other half of entity resolution for a name with active collisions
  // ("Suman Sarang", "Sarang Samant", raga Sarang...). `sameAs` is the
  // machine-readable assertion that this domain and these profiles are one
  // person; it only carries weight alongside links pointing back here, which
  // is the manual half — see seo_manual_steps.md.
  sameAs: [
    "https://www.linkedin.com/in/sarangsuman",
    "https://github.com/flieger-panda",
    "https://www.instagram.com/sarangrsuman/",
  ],
  knowsAbout: [
    "Full-stack software development",
    "Python",
    "TypeScript",
    "C++",
    "React",
    "FastAPI",
    "Django REST Framework",
    "PostgreSQL",
    "Machine learning",
    "Internet of Things",
    "ESP32",
    "MQTT",
    "Docker",
    "REST APIs",
    "Linux system administration",
  ],
};

const PERSON_ID = `${SITE.origin}/#person`;
const WEBSITE_ID = `${SITE.origin}/#website`;

/** Joins a root-relative path onto the canonical origin. */
export function absolute(path) {
  return `${SITE.origin}${path}`;
}

// Routes whose copy isn't derived from a content file. Kept as data rather
// than composed from a template so each one can be written to read like a
// sentence — a description Google is willing to use as the snippet beats a
// formulaic one.
const STATIC_ROUTES = [
  {
    path: "/",
    title: "Sarang Suman — Software Developer | Georgia Tech CS",
    description:
      "Sarang Suman — software developer and third-year Computer Science student at Georgia Tech in Atlanta. Full-stack, Python/ML, and IoT work.",
    ogType: "profile",
    kind: "profile",
  },
  {
    path: "/about-me",
    title: "About — Sarang Suman, Software Developer in Atlanta",
    description:
      "About Sarang Suman: a software developer and Georgia Tech CS student in Atlanta, working across full-stack web, Python data/ML, and IoT systems.",
    ogType: "profile",
    kind: "about",
  },
  {
    path: "/skills",
    title: "Skills — Sarang Suman | Python, React, FastAPI, IoT",
    description:
      "The languages, frameworks, and tools Sarang Suman builds with: Python, TypeScript, React, FastAPI, PostgreSQL, ESP32/MQTT, TensorFlow, and Docker.",
    ogType: "website",
    kind: "page",
  },
  {
    path: "/projects",
    title: "Projects — Sarang Suman | Software Portfolio",
    description:
      "Software development projects by Sarang Suman: IoT presence detection, EKF sensor fusion for UAV flight control, full-stack web apps, and applied ML.",
    ogType: "website",
    kind: "collection",
  },
  {
    path: "/resume",
    title: "Resume — Sarang Suman, Software Developer",
    description:
      "Resume of Sarang Suman, software developer and Computer Science student at Georgia Tech in Atlanta. Readable in the browser or downloadable as a PDF.",
    ogType: "profile",
    kind: "resume",
  },
  {
    path: "/music",
    title: "Music — Sarang Suman",
    description:
      "What Sarang Suman is listening to — Spotify profile and the current playlist.",
    ogType: "website",
    kind: "page",
  },
];

// Shapes the head of dist/404.html, which GitHub Pages serves (with a real
// 404 status) for any path without a generated file. Deliberately kept out of
// allRoutes: it must not appear in the sitemap, and it must not claim `/` as
// its canonical the way a plain copy of index.html would.
export const NOT_FOUND_ROUTE = {
  path: "/404",
  title: `Page not found — ${SITE.name}`,
  description: `That page doesn't exist. ${SITE.name} — software developer and Computer Science student at Georgia Tech in Atlanta.`,
  ogType: "website",
  kind: "notFound",
};

/** One route entry per project markdown file. */
export function projectRoutes(projects) {
  return projects.map((project) => ({
    path: `/projects/${project.slug}`,
    title: `${cleanTitle(project.title)} — ${SITE.name}`,
    // Falls back to a generic line rather than emitting an empty description
    // if a new project file ever lands without one.
    description:
      project.description ||
      `${cleanTitle(project.title)} — a project by ${SITE.name}.`,
    ogType: "article",
    kind: "project",
    project,
  }));
}

/** Every indexable route on the site, in sitemap order. */
export function allRoutes(projects) {
  return [...STATIC_ROUTES, ...projectRoutes(projects)];
}

/**
 * Looks a pathname up in the route table. Tolerates a trailing slash so a
 * canonical `/skills` still resolves if a host or a pasted link adds one.
 */
export function metaForPath(routes, pathname) {
  const normalized =
    pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return routes.find((route) => route.path === normalized);
}

function personNode() {
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: SITE.name,
    url: absolute("/"),
    image: absolute(SITE.image),
    jobTitle: SITE.jobTitle,
    description:
      "Software developer and third-year Computer Science student at Georgia Tech, working in full-stack development, Python/ML, and IoT.",
    email: `mailto:${SITE.email}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: SITE.locality,
      addressRegion: SITE.region,
      addressCountry: SITE.country,
    },
    affiliation: {
      "@type": "CollegeOrUniversity",
      name: SITE.school.name,
      sameAs: SITE.school.sameAs,
    },
    knowsAbout: SITE.knowsAbout,
    sameAs: SITE.sameAs,
  };
}

// A project's `date` is YYYY-MM (or "present"). schema.org wants a valid
// date, so "present" contributes nothing rather than an invented one.
function projectDate(date) {
  return /^\d{4}-\d{2}$/.test(date) ? date : undefined;
}

function pageNode(route) {
  const url = absolute(route.path);

  if (route.kind === "project") {
    return {
      "@type": ["WebPage", "CreativeWork"],
      "@id": url,
      url,
      name: cleanTitle(route.project.title),
      headline: cleanTitle(route.project.title),
      description: route.description,
      keywords: route.project.keywords,
      author: { "@id": PERSON_ID },
      isPartOf: { "@id": WEBSITE_ID },
      ...(projectDate(route.project.date)
        ? { dateCreated: projectDate(route.project.date) }
        : {}),
    };
  }

  if (route.kind === "resume") {
    return {
      "@type": "WebPage",
      "@id": url,
      url,
      name: route.title,
      description: route.description,
      isPartOf: { "@id": WEBSITE_ID },
      mainEntity: {
        "@type": "DigitalDocument",
        name: `${SITE.name} — Resume`,
        url: absolute(SITE.resumePdf),
        encodingFormat: "application/pdf",
        about: { "@id": PERSON_ID },
        author: { "@id": PERSON_ID },
      },
    };
  }

  // No @id and no self-referencing url: this node describes a page that
  // doesn't exist, so it shouldn't be an addressable thing in the graph.
  if (route.kind === "notFound") {
    return {
      "@type": "WebPage",
      name: route.title,
      description: route.description,
      isPartOf: { "@id": WEBSITE_ID },
    };
  }

  // The home and About pages are the two that should resolve to the person
  // themselves, so they're ProfilePage with the Person as mainEntity —
  // that's the pairing Google documents for "this page is about this person".
  const isProfile = route.kind === "profile" || route.kind === "about";
  return {
    "@type": isProfile ? "ProfilePage" : "WebPage",
    "@id": url,
    url,
    name: route.title,
    description: route.description,
    isPartOf: { "@id": WEBSITE_ID },
    ...(isProfile ? { mainEntity: { "@id": PERSON_ID } } : {}),
    ...(route.kind === "collection" ? { about: { "@id": PERSON_ID } } : {}),
  };
}

/**
 * The JSON-LD graph for one route: the Person (identical on every page, tied
 * together by @id), the WebSite, and a node for the page itself.
 */
export function jsonLdForRoute(route) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      personNode(),
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: absolute("/"),
        name: SITE.name,
        inLanguage: "en",
        about: { "@id": PERSON_ID },
        publisher: { "@id": PERSON_ID },
      },
      pageNode(route),
    ],
  };
}
