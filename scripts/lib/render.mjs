import { esc, inline, para, jsonLd } from "./html.mjs";
import { motifFor, motifSvg } from "./motifs.mjs";

export const SITE = "https://anupojuprudhvi.github.io";

/** The footer's copyright year. scripts/build.mjs sets it to the year of the
 *  newest content date, so the output never depends on the clock (a rebuild
 *  in January doesn't change every page) yet still moves on with the site. */
export const SITE_META = { year: "2026" };

/**
 * Security policy for every page. GitHub Pages can't send custom response
 * headers, so the Content-Security-Policy is delivered as a <meta> tag: scripts
 * only from this site (no inline or third-party JavaScript), and the only
 * outbound connection is the contact form's Web3Forms endpoint. No inline CSS
 * either: style="" attributes and <style> blocks are blocked, so put styling in
 * a stylesheet class. (Setting element.style from JavaScript is still allowed.)
 */
export const HEAD_SECURITY = `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://api.web3forms.com; form-action 'self' https://api.web3forms.com; base-uri 'self'; object-src 'none'" />
    <meta name="referrer" content="strict-origin-when-cross-origin" />`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-09-16" → <time datetime="2026-09-16">16 Sep 2026</time>; fixed format, never locale-dependent. */
function timeTag(iso) {
  const [y, m, d] = iso.split("-");
  return `<time datetime="${esc(iso)}">${Number(d)} ${MONTHS[Number(m) - 1]} ${y}</time>`;
}

/* ------------------------------------------------- "Case studies" nav dropdown */
/**
 * Used by siteTopNav, so every page shows the same menu. Counts and sector
 * names come straight from the
 * case-study data — never typed by hand — so a new case study or a renamed
 * sector can never leave the nav showing a stale number.
 *
 * `items` is any array of case-study-like objects carrying `.project` (id)
 * and `.projectName` (display name) — the parsed docs in build.mjs, or the
 * search-index entries `libraryPage` already has. `prefix` is the relative
 * path to case-studies/ from the calling page ("" from inside it,
 * "case-studies/" from the home page, "../case-studies/" from one level
 * down). `current: true` marks the trigger as the active nav item, for use
 * on the case-studies page itself.
 */
function caseStudiesNavDropdown(items = [], { prefix = "", current = false } = {}) {
  const sectors = [];
  const bySector = new Map();
  for (const item of (items || [])) {
    let sector = bySector.get(item.project);
    if (!sector) {
      sector = { id: item.project, name: item.projectName, count: 0 };
      bySector.set(item.project, sector);
      sectors.push(sector);
    }
    sector.count++;
  }

  const allHref = `${prefix}index.html`;
  const sectorLinks = sectors
    .map(
      (s) => `
              <a href="${prefix}index.html?filter=${encodeURIComponent(
                "project:" + s.id,
              )}" role="menuitem" class="nav-dropdown-item">
                <strong>${esc(s.name)}</strong>
                <small>${s.count} case ${s.count === 1 ? "study" : "studies"}</small>
              </a>`,
    )
    .join("");

  return `<div class="nav-dropdown">
            <a href="${allHref}" class="nav-dropdown-trigger" aria-haspopup="true" aria-expanded="false"${
              current ? ` aria-current="page"` : ""
            }
              >Case studies <span class="nav-arrow" aria-hidden="true">▾</span></a
            >
            <div class="nav-dropdown-menu" role="menu">
              <a href="${allHref}" role="menuitem" class="nav-dropdown-item">
                <strong>All Case Studies</strong>
                <small>${(items || []).length} case studies · full library &amp; filters</small>
              </a>
              <div class="nav-dropdown-divider" role="separator"></div>${sectorLinks}
            </div>
          </div>`;
}

/* ------------------------------------------------- "Learning paths" nav dropdown */
function learningPathsNavDropdown({ prefix = "", current = false } = {}) {
  const allHref = `${prefix}index.html`;
  return `<div class="nav-dropdown">
            <a href="${allHref}" class="nav-dropdown-trigger" aria-haspopup="true" aria-expanded="false"${
              current ? ` aria-current="page"` : ""
            }
              >Learning paths <span class="nav-arrow" aria-hidden="true">▾</span></a
            >
            <div class="nav-dropdown-menu" role="menu">
              <a href="${allHref}" role="menuitem" class="nav-dropdown-item">
                <strong>All Learning Paths</strong>
                <small>Curriculum overview &amp; tracks</small>
              </a>
              <div class="nav-dropdown-divider" role="separator"></div>
              <a href="${prefix}terraform/index.html" role="menuitem" class="nav-dropdown-item">
                <strong>Terraform for Enterprise</strong>
                <small>11 Modules · Modules, State &amp; Delivery</small>
              </a>
              <a href="${prefix}migration-journey/index.html" role="menuitem" class="nav-dropdown-item">
                <strong>Cloud Migration Journey</strong>
                <small>6 Modules · Assess, Mobilize &amp; Modernize</small>
              </a>
              <a href="${prefix}kubernetes-operations/index.html" role="menuitem" class="nav-dropdown-item">
                <strong>Kubernetes on Amazon EKS</strong>
                <small>20 Modules · Zero to Production</small>
              </a>
              <a href="${prefix}linux-for-devops/index.html" role="menuitem" class="nav-dropdown-item">
                <strong>Linux for DevOps</strong>
                <small>25 Modules · Labs &amp; Incident Reviews</small>
              </a>
              <a href="${prefix}my-ai-journey/index.html" role="menuitem" class="nav-dropdown-item">
                <strong>My AI Journey</strong>
                <small>11 Chapters · Copy-Paste to Agentic Workflows</small>
              </a>
            </div>
          </div>`;
}

/* ------------------------------------------------- Unified Site Top Navigation */
/**
 * One navigation bar for every page, with the same links everywhere. On the
 * homepage (`home: true`) they're in-page anchors; elsewhere they point back
 * to the homepage sections. On small screens the links collapse
 * behind a Menu button (wired in assets/theme.js); without JavaScript the
 * links simply stay visible, so navigation never depends on scripts.
 */
export function siteTopNav({
  docs = [],
  up = "",
  active = "", // "case-studies" | "learning-paths" | "work"
  home = false,
} = {}) {
  const a = (p) => `${up}${p}`;
  const page = home ? "" : a("index.html");
  const homeAnchors = `
          <a href="${page}#approach">Approach</a>
          <a href="${page}#background">About</a>`;
  return `    <nav class="topnav" aria-label="Main navigation">
      <div class="wrap nav-inner">
        <a class="brand" href="${home ? "#top" : a("index.html")}">Prudhvi Raj Anupoju</a>
        <div class="navlinks" id="siteNavLinks">
          <a href="${page}#work"${active === "work" ? ` aria-current="page"` : ""}>Selected work</a>
          ${caseStudiesNavDropdown(docs, { prefix: a("case-studies/"), current: active === "case-studies" })}
          ${learningPathsNavDropdown({ prefix: a("learning-paths/"), current: active === "learning-paths" })}${homeAnchors}
          <a href="${page}#contact" class="nav-cta">Let's connect</a>
        </div>
        <a class="nav-icon" href="https://www.linkedin.com/in/prudhvi-raj-anupoju/" target="_blank" rel="noopener noreferrer"><span aria-hidden="true">in</span><span class="sr-only">LinkedIn profile (opens in a new tab)</span></a>
        <button id="themeToggle" type="button" aria-label="Switch to light theme">☼</button>
        <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="siteNavLinks" aria-label="Open menu">
          <span class="nav-toggle-bars" aria-hidden="true"></span>
        </button>
      </div>
    </nav>`;
}

/* ------------------------------------------------------------ Homepage toolbox */
/**
 * Tools grouped by layer, each with the number of case studies that used it,
 * linking to the case-study library filtered to that tool. Built from
 * content/toolbox.json matched against case-study `stack` lists (build.mjs),
 * so every tool shown has evidence behind it.
 */
export function toolboxSection(toolbox) {
  if (!toolbox.length) return "";
  // Keep the homepage light: each layer shows its most-used tools, the rest
  // sit behind a native "+N more" toggle (works without JavaScript).
  const SHOWN_PER_LAYER = 4;
  const chip = (t) => {
    const n = t.studies.length;
    return `<li><a class="tool-chip" href="case-studies/index.html?tool=${esc(t.slug)}">${esc(t.name)}<span class="sr-only">, </span><span class="tool-count">${n}</span><span class="sr-only"> case ${n === 1 ? "study" : "studies"}</span></a></li>`;
  };
  const layers = toolbox
    .map((layer) => {
      // Most-used first; ties keep the order written in toolbox.json.
      const tools = layer.tools.map((t, i) => [t, i]).sort((a, b) => b[0].studies.length - a[0].studies.length || a[1] - b[1]).map(([t]) => t);
      const shown = tools.slice(0, SHOWN_PER_LAYER);
      const rest = tools.slice(SHOWN_PER_LAYER);
      return `            <div class="tool-layer">
              <h3>${esc(layer.name)}</h3>
              <ul class="tool-list">
                ${shown.map(chip).join("\n                ")}
              </ul>${rest.length ? `
              <details class="tool-more">
                <summary>+${rest.length} more</summary>
                <ul class="tool-list">
                  ${rest.map(chip).join("\n                  ")}
                </ul>
              </details>` : ""}
            </div>`;
    })
    .join("\n");
  return `      <section id="toolbox">
        <div class="wrap">
          <div class="section-head">
            <div>
              <p class="eyebrow">03 / Toolbox</p>
              <h2>Every tool here is backed<br />by a case study.</h2>
            </div>
            <p>
              Grouped by where it sits in the stack. The number is how many
              case studies used it; select a tool to read them.
            </p>
          </div>
          <p class="tool-hint" aria-hidden="true">Swipe for all ${toolbox.length} groups →</p>
          <div class="toolbox" role="group" aria-label="Toolbox, ${toolbox.length} groups">
${layers}
          </div>
        </div>
      </section>`;
}

/* ------------------------------------------------- "Latest case studies" strip */
/**
 * The three most recent case studies, shown inline on the homepage right
 * under the hero stats, in the page flow so it is always visible, never
 * overlaps other content, and needs no JavaScript.
 * Source of truth: content/recent-case-studies.json (see build.mjs).
 */
export function latestCaseStudies(recentItems, { prefix = "" } = {}) {
  const items = (recentItems || []).slice(0, 3);
  if (!items.length) return "";
  const cards = items
    .map(
      (item) => `            <li class="recent-card-item">
              <a href="${prefix}${esc(item.url)}" class="recent-card-link">
                <span class="recent-card-meta">
                  <span class="recent-card-tag">${esc(item.tag || item.layer || item.projectName || "Case study")}</span>
                  <span class="recent-card-badge">${esc(item.badge || "Latest")}</span>
                </span>
                <strong class="recent-card-title">${esc(item.title)}</strong>
                <span class="recent-card-desc">${esc(item.desc || item.summary || "")}</span>
                <span class="recent-card-cta">Read the case study <span aria-hidden="true">→</span></span>
              </a>
            </li>`,
    )
    .join("\n");
  return `      <section class="latest" aria-labelledby="latestTitle">
        <div class="wrap">
          <div class="latest-head">
            <h2 id="latestTitle">Latest case studies</h2>
            <a href="${prefix}case-studies/index.html" class="recent-all-link">Browse all case studies →</a>
          </div>
          <ul class="recent-list">
${cards}
          </ul>
        </div>
      </section>`;
}

/* ------------------------------------------------------- scaffold sections */
/**
 * The request path. Each step may be a bare string, or an object with a
 * `note` explaining what actually happens at that hop — which is the point,
 * since a row of unexplained labels tells the reader nothing. A step marked
 * `aside: true` is drawn off the main path (for things that aren't network
 * hops at all, like a role being assumed).
 */
function flowBlock(d) {
  if (!Array.isArray(d.flow) || !d.flow.length) return "";
  const steps = d.flow.map((s) => (typeof s === "string" ? { step: s } : s));
  let hop = 0; // asides sit off the path, so they don't consume a number
  const items = steps
    .map((s) => {
      const aside = String(s.aside) === "true";
      if (!aside) hop++;
      return `<li class="reqflow-step${aside ? " is-aside" : ""}">
<span class="reqflow-n">${aside ? "&bull;" : String(hop).padStart(2, "0")}</span>
<span class="reqflow-name">${esc(s.step)}</span>
${s.note ? `<span class="reqflow-note">${inline(s.note)}</span>` : ""}
</li>`;
    })
    .join("\n");
  return `<figure class="reqflow">
${d.flowLabel ? `<figcaption class="reqflow-title">${esc(d.flowLabel)}</figcaption>` : ""}
<ol class="reqflow-list">
${items}
</ol>
</figure>`;
}

function scaffold(d) {
  if (d.scaffold === "false") return "";
  if (!d.problem || !d.solution) return "";
  return `<div class="problem-solution">
<div>
<h3>The problem</h3>
${para(d.problem)}
</div>
<div>
<h3>The architectural solution</h3>
${para(d.solution)}
</div>
</div>
${flowBlock(d)}`;
}

/** Headline results, shown right under the hero so skimmers see them first. */
function keyResults(d) {
  if (!Array.isArray(d.outcomes) || !d.outcomes.length) return "";
  return `<section class="key-results" aria-labelledby="keyResultsTitle">
<div class="wrap">
<h2 class="section-eyebrow" id="keyResultsTitle">Key results</h2>
<div class="outcomes">
${d.outcomes
  .map(
    (o) =>
      `<div class="outcome"><div class="num">${esc(
        o.value,
      )}</div><div class="txt">${esc(o.label)}</div></div>`,
  )
  .join("\n")}
</div>
</div>
</section>`;
}

/** Rough reading time at ~220 words per minute, from the rendered text. */
function readingMinutes(...html) {
  const words = html
    .join(" ")
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

/** schema.org BreadcrumbList for search results ("Home › Case studies › …"). */
function breadcrumbLd(crumbs) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map(([name, url], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: url,
    })),
  }).replace(/</g, "\\u003c");
}

/** JSON-LD date fields for an article; each line ends with a comma, so place it before "keywords". */
function articleDates(d) {
  if (!d.date) return "";
  return `\n        "datePublished": "${esc(d.date)}",\n        "dateModified": "${esc(d.updated || d.date)}",`;
}

/**
 * Cross-links between learning-path modules and case studies, so each page
 * leads to its counterpart: the concept on one side, the real engagement on
 * the other. `items` are { href, eyebrow, title, summary }.
 */
function relatedLinks(heading, items) {
  return `<section class="related-links" aria-label="${esc(heading)}">
          <h2>${esc(heading)}</h2>
          <ul>
            ${items.map((i) => `<li><a href="${esc(i.href)}"><span class="related-eyebrow">${esc(i.eyebrow)}</span><strong>${esc(i.title)}</strong><small>${inline(i.summary || "")}</small></a></li>`).join("\n            ")}
          </ul>
        </section>`;
}

/* ------------------------------------------------------------- page shell */
export function page(d, bodyHtml, { up, url, prev, next, docs = [], learning = [] } = {}) {
  const a = (p) => `${up}${p}`;
  const scripts = (d.scripts || [])
    .map((s) => `<script src="${a("assets/" + s)}" defer></script>`)
    .join("\n    ");

  const isStudy = Boolean(d.slug);
  // Case studies default from their layer; overviews show one only when given.
  const motifName = isStudy ? motifFor(d) : d.motif || "";
  const canonicalPath = url.replace(/index\.html$/, "");
  const canonical = `${SITE}/${canonicalPath}`;
  const ogImage = `${SITE}/${d.ogImage || "og-image.png"}`;
  const projectUrl = `${SITE}/case-studies/${d.project}/`;
  const crumbs = [
    ["Home", `${SITE}/`],
    ["Case studies", `${SITE}/case-studies/`],
    ...(d.project && isStudy ? [[d.projectName, projectUrl]] : []),
    [isStudy ? d.nav || d.title : d.title, canonical],
  ];
  const minutes = isStudy
    ? readingMinutes(bodyHtml, d.problem || "", d.solution || "", d.intro || "")
    : 0;

  const metaBits = [
    isStudy && d.projectName && `<div><b>Project</b><br />${esc(d.projectName)}</div>`,
    d.role && `<div><b>Role</b><br />${esc(d.role)}</div>`,
    d.scope && `<div><b>Scope</b><br />${esc(d.scope)}</div>`,
    d.layer && `<div><b>Capability</b><br />${esc(d.layer)}</div>`,
    Array.isArray(d.stack) && d.stack.length
      ? `<div><b>Stack</b><br />${d.stack.map(esc).join(" · ")}</div>`
      : "",
    Array.isArray(d.tags) && d.tags.length
      ? `<div><b>Tags</b><br />${d.tags.map(esc).join(" · ")}</div>`
      : "",
    minutes ? `<div><b>Reading time</b><br />${minutes} min</div>` : "",
    isStudy && d.date && `<div><b>${d.updated ? "Updated" : "Published"}</b><br />${timeTag(d.updated || d.date)}</div>`,
  ]
    .filter(Boolean)
    .join("\n            ");

  const nav = [
    prev
      ? `<a href="${a(prev.url)}">← ${esc(prev.nav || prev.title)}</a>`
      : `<a href="${a("case-studies/index.html")}">← Case studies</a>`,
    next ? `<a href="${a(next.url)}">${esc(next.nav || next.title)} →</a>` : "",
  ]
    .filter(Boolean)
    .join("\n        ");

  const enables = d.enables
    ? `<div class="callout"><b>What this enables:</b> ${inline(
        d.enables.replace(/\n/g, " ").trim(),
      )}</div>`
    : "";

  const scaf = scaffold(d);
  const leadSection =
    scaf || enables
      ? `<section>
<div class="wrap">
<div class="section-eyebrow">${esc(d.label || "Case study")}</div>
<h2>${esc(d.heading || "How it works")}</h2>
${scaf}
${bodyHtml && !bodyHtml.trimStart().startsWith("<section") ? bodyHtml : ""}
${enables}
</div>
</section>`
      : "";

  const rest =
    bodyHtml && bodyHtml.trimStart().startsWith("<section") ? bodyHtml : "";

  return `<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${HEAD_SECURITY}
    <title>${esc(d.title)} — Prudhvi Raj Anupoju</title>
    <meta name="description" content="${esc(d.summary || "")}" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:title" content="${esc(d.title)}" />
    <meta property="og:description" content="${esc(d.summary || "")}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="${ogImage}" />
    <link rel="alternate" type="application/rss+xml" title="Prudhvi Raj Anupoju — Case Studies &amp; Learning Paths" href="${SITE}/feed.xml" />
    <link rel="icon" href="${a("assets/favicon.svg")}" type="image/svg+xml" />
    <script type="application/ld+json">${breadcrumbLd(crumbs)}</script>
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        "headline": ${jsonLd(d.title)},
        "description": ${jsonLd(d.summary || "")},
        "author": {
          "@type": "Person",
          "name": "Prudhvi Raj Anupoju",
          "url": "${SITE}/",
          "sameAs": [
            "https://www.linkedin.com/in/prudhvi-raj-anupoju/",
            "https://github.com/anupojuprudhvi"
          ]
        },
        "publisher": {
          "@type": "Person",
          "name": "Prudhvi Raj Anupoju"
        },
        "url": "${canonical}",
        "image": "${ogImage}",
        "mainEntityOfPage": "${canonical}",${isStudy ? articleDates(d) : ""}
        "keywords": ${jsonLd((d.tags || []).concat(d.stack || []).join(", "))}
      }
    </script>
    <script src="${a("assets/theme.js")}"></script>
    <link rel="preload" href="${a("assets/fonts/inter-latin-wght-normal.woff2")}" as="font" type="font/woff2" crossorigin />
    <link rel="stylesheet" href="${a("assets/site.css")}" />
    <link rel="stylesheet" href="${a("assets/deepdive.css")}" />
    <link rel="stylesheet" href="${a("assets/case-study.css")}" />
    <link rel="stylesheet" href="${a("assets/assistant.css")}" />
  </head>
  <body class="deepdive">
    <a class="skip-link" href="#main">Skip to content</a>
${siteTopNav({ docs, up, active: "case-studies" })}
    <main id="main">
      <nav class="breadcrumb-bar" aria-label="Breadcrumb">
        <div class="wrap">
          <a class="back-link back" href="${a("case-studies/index.html")}">← All case studies</a>
        </div>
      </nav>
      <header class="hero">
        <div class="wrap">
          <div class="hero-split">
            <div>
              <div class="eyebrow">${esc(d.projectName || "")}${
                d.label ? " · " + esc(d.label) : ""
              }</div>
              <h1>${inline(d.heroTitle || d.title)}</h1>
              ${d.intro || d.summary ? `<p class="sub">${inline(d.intro || d.summary)}</p>` : ""}
            </div>${motifName ? `
            ${motifSvg(motifName)}` : ""}
          </div>${metaBits ? `
          <div class="meta">
            ${metaBits}
          </div>` : ""}
        </div>
      </header>
${keyResults(d)}
${leadSection}
${rest.replace(/<pre(?![^>]*tabindex)/g, '<pre tabindex="0"')}${learning.length ? `
      <div class="wrap">
        ${relatedLinks("Learn the concepts behind this", learning.map((m) => ({ href: a(m.url), eyebrow: `${m.trackTitle} · Module ${String(m.module).padStart(2, "0")}`, title: m.title, summary: m.summary })))}
      </div>` : ""}
      <aside class="next-study wrap">
        ${nav}
      </aside>
      <div class="closing">
        <div class="wrap">
          <h2>${isStudy ? "Questions about this case study?" : "Questions about this work?"}</h2>
          <p>
            ${d.closingText ? esc(d.closingText) : "Happy to go deeper on any part of this — the architecture, the\n            trade-offs, or the decisions behind it."}
          </p>
          <a class="cta" href="mailto:anupojuprudhvi@gmail.com"
            >anupojuprudhvi@gmail.com</a
          >
        </div>
      </div>
    </main>
    <footer>
      <div class="wrap footer-inner">
        <span>© ${SITE_META.year} Prudhvi Raj Anupoju</span
        ><a href="${a("learning-paths/index.html")}">Learning paths ↗</a
        ><a href="${a("case-studies/index.html")}">Case studies ↗</a
        ><a href="https://stats.uptimerobot.com/T37DqoPPMU" target="_blank" rel="noopener noreferrer" title="Live uptime monitoring, running since September 2026">Uptime status ↗</a
        ><a href="${a("index.html")}#work">Back to overview ↗</a
        ><a href="${a("privacy.html")}">Privacy</a>
      </div>
    </footer>
    <script src="${a("assets/assistant.js")}" defer></script>${bodyHtml.includes('<figure class="flow">') ? `
    <script src="${a("assets/flow-player.js")}" defer></script>` : ""}
    ${scripts}
  </body>
</html>
`;
}

/* --------------------------------------------------------- library page */
/** The capability taxonomy used by every case study's `layer:` field. */
export const LAYER_ORDER = [
  "Foundation & governance",
  "Networking & security",
  "Data & storage",
  "Resilience & DR",
  "Platform & delivery",
  "Applications & integration",
  "Operations & incidents",
  "Migration & strategy",
  "Product engineering",
];

export function libraryPage(items, { toolbox = [], toolsByUrl = new Map() } = {}) {
  // Tool slug → display name, for the ?tool= filter the homepage toolbox links to.
  const toolNames = Object.fromEntries(toolbox.flatMap((l) => l.tools.map((t) => [t.slug, t.name])));
  const projects = [...new Set(items.map((i) => i.projectName))];
  // Capability filters in a fixed, meaningful order; any unknown layer is
  // appended so a new value is never silently hidden.
  const found = new Set(items.map((i) => i.layer).filter(Boolean));
  const layers = [...LAYER_ORDER.filter((l) => found.has(l)), ...[...found].filter((l) => !LAYER_ORDER.includes(l))];

  const cards = items
    .map(
      (i) => `        <article class="uc-card" data-project="${esc(
        i.project,
      )}" data-layer="${esc(i.layer || "")}" data-tags="${esc(
        (i.tags || []).join(" "),
      )}" data-tools="${esc((toolsByUrl.get(i.url) || []).join(" "))}">
          <div class="uc-meta"><span>${esc(i.projectName)}</span><span>${esc(
            i.layer || "",
          )}</span></div>
          <h3><a href="${esc(i.url.replace(/^case-studies\//, ""))}">${esc(
            i.title,
          )}</a></h3>
          <p>${esc(i.summary || "")}</p>
          <p class="uc-stack">${(i.stack || []).map(esc).join(" · ")}</p>
        </article>`,
    )
    .join("\n");

  // The count is visual only; the button's accessible name stays the label
  // (the live status line announces how many studies are shown).
  const filterBtn = (val, text, pressed = false, count) =>
    `<button class="filter" data-uc-filter="${esc(val)}" aria-pressed="${pressed}">${esc(
      text,
    )}${count ? ` <span class="filter-count" aria-hidden="true">${count}</span>` : ""}</button>`;

  return `<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${HEAD_SECURITY}
    <title>Case studies — Prudhvi Raj Anupoju</title>
    <meta
      name="description"
      content="A searchable collection of cloud architecture case studies — governance, networking, resilience, integration and cost, drawn from enterprise AWS delivery."
    />
    <link rel="canonical" href="${SITE}/case-studies/" />
    <meta property="og:title" content="Case studies — Prudhvi Raj Anupoju" />
    <meta
      property="og:description"
      content="A searchable collection of cloud architecture case studies from enterprise AWS delivery."
    />
    <meta property="og:image" content="${SITE}/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="alternate" type="application/rss+xml" title="Prudhvi Raj Anupoju — Case Studies &amp; Learning Paths" href="${SITE}/feed.xml" />
    <link rel="icon" href="../assets/favicon.svg" type="image/svg+xml" />
    <script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Case studies — Prudhvi Raj Anupoju",
      url: `${SITE}/case-studies/`,
      author: { "@type": "Person", name: "Prudhvi Raj Anupoju", url: `${SITE}/` },
      hasPart: items.map((i) => ({ "@type": "TechArticle", headline: i.title, url: `${SITE}/${i.url}` })),
    }).replace(/</g, "\\u003c")}</script>
    <script type="application/ld+json">${breadcrumbLd([["Home", `${SITE}/`], ["Case studies", `${SITE}/case-studies/`]])}</script>
    <script src="../assets/theme.js"></script>
    <link rel="preload" href="../assets/fonts/inter-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="stylesheet" href="../assets/site.css" />
    <link rel="stylesheet" href="../assets/library.css" />
    <link rel="stylesheet" href="../assets/assistant.css" />
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to content</a>
${siteTopNav({ docs: items, up: "../", active: "case-studies" })}
    <main id="main">
      <section class="uc-head">
        <div class="wrap">
          <p class="eyebrow">Case study library</p>
          <h1>How the difficult parts were solved.</h1>
          <p class="uc-lede">
            Project case studies from enterprise AWS delivery — each one written
            up with the context, constraint, approach, and trade-offs. Start with
            a project overview for the business context and architecture scope, then open
            the linked technical detail for the architecture depth. Client details
            are anonymized; the engineering is not.
          </p>
          <div class="uc-controls">
            <label class="uc-search">
                <span class="visually-hidden">Search case studies</span>
              <input
                type="search"
                id="ucSearch"
                placeholder="Search by problem, service, or technology…"
                autocomplete="off"
              />
            </label>
            <div class="filter-groups">
              <div class="filters" role="group" aria-labelledby="filterIndustry">
                <span class="filter-label" id="filterIndustry">Industry</span>
                ${filterBtn("all", "All", true)}
                ${projects
                  .map((p) =>
                    filterBtn(
                      "project:" + items.find((i) => i.projectName === p).project,
                      p,
                    ),
                  )
                  .join("\n                ")}
              </div>
              <div class="filters" role="group" aria-labelledby="filterCapability">
                <span class="filter-label" id="filterCapability">Capability</span>
                ${layers
                  .map((l) => filterBtn("layer:" + l, l, false, items.filter((i) => i.layer === l).length))
                  .join("\n                ")}
              </div>
            </div>
          </div>
          <p class="uc-tool-filter" id="ucToolFilter" hidden></p>
          <p class="filter-status" id="ucStatus" role="status">
            ${items.length} case studies
          </p>
          <script type="application/json" id="ucToolNames">${JSON.stringify(toolNames).replace(/</g, "\\u003c")}</script>
        </div>
      </section>
      <section class="uc-list" aria-labelledby="ucListTitle">
        <div class="wrap">
          <h2 class="visually-hidden" id="ucListTitle">Case studies</h2>
          <div class="uc-grid" id="ucGrid">
${cards}
          </div>
          <p class="uc-empty" id="ucEmpty" hidden>
            Nothing matched that. Try a different term, or <a href="index.html">clear the filters</a>.
          </p>
        </div>
      </section>
    </main>
    <footer>
      <div class="wrap footer-inner">
        <span>© ${SITE_META.year} Prudhvi Raj Anupoju</span
        ><a href="../learning-paths/index.html">Learning paths ↗</a
        ><a href="https://stats.uptimerobot.com/T37DqoPPMU" target="_blank" rel="noopener noreferrer" title="Live uptime monitoring, running since September 2026">Uptime status ↗</a
        ><a href="../index.html#work">Selected work ↗</a
        ><a href="../privacy.html">Privacy</a>
      </div>
    </footer>
    <script src="../assets/library.js" defer></script>
    <script src="../assets/assistant.js" defer></script>
  </body>
</html>
`;
}

/* --------------------------------------------------------- learning path page */
/** Plain-text slug for heading ids ("Two layers of autoscaling" → "two-layers-of-autoscaling"). */
const slugify = (html) =>
  html.replace(/<[^>]+>/g, "").replace(/&[a-z#0-9]+;/gi, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";

/**
 * Module sidebar: every module in the track (grouped into parts when the track
 * defines them), the current one marked, with links to its own sections.
 * Rendered twice: a sticky sidebar on wide screens and a collapsible
 * "All modules" menu on narrow ones (CSS shows one or the other).
 */
function moduleToc({ d, track, modules, sections, label }) {
  const pad = (n) => String(n).padStart(2, "0");
  const groups = track.parts
    ? track.parts.map((part) => ({ title: part.title, mods: modules.filter((m) => part.modules.includes(m.module)) }))
    : [{ title: "", mods: modules }];
  const item = (m) => {
    const current = m.slug === d.slug;
    const onPage = current && sections.length
      ? `\n                <ol class="lp-toc-sections">${sections.map((s) => `<li><a href="#${s.id}">${s.text}</a></li>`).join("")}</ol>`
      : "";
    return `<li${current ? ' class="is-current"' : ""}><a href="${esc(m.slug)}.html"${current ? ' aria-current="page"' : ""}><span class="lp-toc-num">${pad(m.module)}</span><span>${esc(m.title)}</span></a>${onPage}</li>`;
  };
  return `<nav class="lp-toc" aria-label="${esc(label)}">
              <a class="lp-toc-track" href="index.html">${esc(track.title)}</a>
              ${groups.map((g) => `${g.title ? `<p class="lp-toc-part">${esc(g.title)}</p>\n              ` : ""}<ol class="lp-toc-list">
                ${g.mods.map(item).join("\n                ")}
              </ol>`).join("\n              ")}
            </nav>`;
}

export function learningPathPage(d, bodyHtml, { up, url, prev, next, track, docs = [], modules = [], related = [] } = {}) {
  const a = (p) => `${up}${p}`;
  const isOverview = !d.module;
  const canonical = `${SITE}/${url}`;
  const trackUrl = `${SITE}/learning-paths/${track.id}/index.html`;
  const crumbs = [
    ["Home", `${SITE}/`],
    ["Learning paths", `${SITE}/learning-paths/`],
    [track.title, trackUrl],
    ...(isOverview ? [] : [[d.title, canonical]]),
  ];
  // Modules point up to their track; the track overview lists its modules in order.
  const structure = isOverview
    ? modules.length ? `
        "hasPart": ${jsonLd(modules.map((m) => ({ "@type": "TechArticle", position: m.module, name: m.title, url: `${SITE}/${m.url}` })))},` : ""
    : `
        "isPartOf": ${jsonLd({ "@type": "CreativeWorkSeries", name: track.title, url: trackUrl })},
        "position": ${Number(d.module)},`;
  const seeAlso = related.length
    ? relatedLinks("See it in practice", related.map((doc) => ({ href: a(doc.url), eyebrow: `Case study · ${doc.projectName}`, title: doc.nav || doc.title, summary: doc.summary })))
    : "";

  // Give each section heading an id so the sidebar can link to it.
  const sections = [];
  if (!isOverview) {
    const used = new Set();
    bodyHtml = bodyHtml.replace(/<h2>([\s\S]*?)<\/h2>/g, (_, inner) => {
      let id = slugify(inner);
      for (let n = 2; used.has(id); n++) id = `${slugify(inner)}-${n}`;
      used.add(id);
      sections.push({ id, text: inner.replace(/<[^>]+>/g, "") });
      return `<h2 id="${id}">${inner}</h2>`;
    });
  }
  const withSidebar = !isOverview && modules.length > 1;

  const breadcrumb = isOverview
    ? `<a class="back-link back" href="${a("learning-paths/index.html")}">← All learning paths</a>`
    : `<a class="back-link back" href="${a(`learning-paths/${track.id}/index.html`)}">← ${esc(track.title)}</a>`;

  const nav = [
    prev
      ? `<a class="lp-nav-link prev" href="${a(prev.url)}">
          <span class="lp-nav-label">← Module ${String(prev.module).padStart(2, "0")}</span>
          <span class="lp-nav-title">${esc(prev.title)}</span>
        </a>`
      : `<a class="lp-nav-link prev" href="${a(`learning-paths/${track.id}/index.html`)}">
          <span class="lp-nav-label">← Curriculum</span>
          <span class="lp-nav-title">Track Overview</span>
        </a>`,
    next
      ? `<a class="lp-nav-link next" href="${a(next.url)}">
          <span class="lp-nav-label">Module ${String(next.module).padStart(2, "0")} →</span>
          <span class="lp-nav-title">${esc(next.title)}</span>
        </a>`
      : `<a class="lp-nav-link next" href="${a("learning-paths/index.html")}">
          <span class="lp-nav-label">Track Complete →</span>
          <span class="lp-nav-title">All Learning Paths</span>
        </a>`,
  ]
    .filter(Boolean)
    .join("\n");

  const metaBits = [
    d.module && `<span><b>Module:</b> ${String(d.module).padStart(2, "0")} of ${String(d.totalModules || 6).padStart(2, "0")}</span>`,
    d.level && `<span><b>Level:</b> ${esc(d.level)}</span>`,
    d.readingTime && `<span><b>Time:</b> ${esc(d.readingTime)}</span>`,
    d.duration && `<span><b>Duration:</b> ${esc(d.duration)}</span>`,
    d.date && `<span><b>${d.updated ? "Updated" : "Published"}:</b> ${timeTag(d.updated || d.date)}</span>`,
  ]
    .filter(Boolean)
    .join("\n            ");

  return `<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${HEAD_SECURITY}
    <title>${esc(d.title)} — Prudhvi Raj Anupoju</title>
    <meta name="description" content="${esc(d.summary || "")}" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:title" content="${esc(d.title)} — Prudhvi Raj Anupoju" />
    <meta property="og:description" content="${esc(d.summary || "")}" />
    <meta property="og:image" content="${SITE}/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="alternate" type="application/rss+xml" title="Prudhvi Raj Anupoju — Case Studies &amp; Learning Paths" href="${SITE}/feed.xml" />
    <link rel="icon" href="${a("assets/favicon.svg")}" type="image/svg+xml" />
    <script type="application/ld+json">${breadcrumbLd(crumbs)}</script>
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        "headline": ${jsonLd(d.title)},
        "description": ${jsonLd(d.summary || "")},
        "author": {
          "@type": "Person",
          "name": "Prudhvi Raj Anupoju",
          "url": "${SITE}/",
          "sameAs": [
            "https://www.linkedin.com/in/prudhvi-raj-anupoju/",
            "https://github.com/anupojuprudhvi"
          ]
        },
        "publisher": {
          "@type": "Person",
          "name": "Prudhvi Raj Anupoju"
        },
        "url": "${canonical}",
        "image": "${SITE}/og-image.png",
        "mainEntityOfPage": "${canonical}",${articleDates(d)}${structure}
        "keywords": ${jsonLd((d.tags || []).concat(d.stack || []).join(", "))}
      }
    </script>
    <script src="${a("assets/theme.js")}"></script>
    <link rel="preload" href="${a("assets/fonts/inter-latin-wght-normal.woff2")}" as="font" type="font/woff2" crossorigin />
    <link rel="stylesheet" href="${a("assets/site.css")}" />
    <link rel="stylesheet" href="${a("assets/deepdive.css")}" />
    <link rel="stylesheet" href="${a("assets/learning-path.css")}" />
    <link rel="stylesheet" href="${a("assets/assistant.css")}" />
  </head>
  <body class="deepdive${withSidebar ? " lp-with-sidebar" : ""}">
    <a class="skip-link" href="#main">Skip to content</a>
${siteTopNav({ docs, up, active: "learning-paths" })}
    <main id="main">
      <nav class="breadcrumb-bar" aria-label="Breadcrumb">
        <div class="wrap">
          <div class="back">${breadcrumb}</div>
        </div>
      </nav>
      <header class="lp-hero">
        <div class="wrap">
          <div class="hero-split">
            <div>
              <span class="lp-badge">${esc(d.level || track.badge || "Production Playbook")}</span>
              <h1>${esc(d.title)}</h1>
              ${d.summary ? `<p class="sub">${inline(d.summary)}</p>` : ""}
            </div>${track.motif ? `
            ${motifSvg(track.motif)}` : ""}
          </div>
          <div class="lp-meta-bar">
            ${metaBits}
          </div>
        </div>
      </header>
      <article class="lp-content" data-track="${esc(track.id)}" data-total="${modules.length}"${isOverview ? "" : ` data-module="${d.module}" data-slug="${esc(d.slug)}"${next ? ` data-next-title="${esc(next.title)}"` : ""}`}>
        <div class="${withSidebar ? "lp-layout" : "wrap"}">${withSidebar ? `
          <aside class="lp-sidebar">
            ${moduleToc({ d, track, modules, sections, label: "Modules in this track" })}
          </aside>
          <div class="lp-main">
            <details class="lp-toc-mobile">
              <summary>All modules in this track (${modules.length})</summary>
              ${moduleToc({ d, track, modules, sections: [], label: "All modules" })}
            </details>` : ""}
          ${bodyHtml.replace(/<pre(?![^>]*tabindex)/g, '<pre tabindex="0"')}${seeAlso ? `
          ${seeAlso}` : ""}
          ${!isOverview ? `<nav class="lp-nav" aria-label="Module navigation">${nav}</nav>` : ""}${withSidebar ? `
          </div>` : ""}
        </div>
      </article>
      <div class="closing">
        <div class="wrap">
          <h2>${esc(track.closingQuestion || `Want to discuss ${track.title}?`)}</h2>
          <p>
            ${esc(track.closingBody || "I'm happy to dive deeper into any of these patterns.")}
          </p>
          <a class="cta" href="mailto:anupojuprudhvi@gmail.com"
            >anupojuprudhvi@gmail.com</a
          >
        </div>
      </div>
    </main>
    <footer>
      <div class="wrap footer-inner">
        <span>© ${SITE_META.year} Prudhvi Raj Anupoju</span>
        <a href="${a("learning-paths/index.html")}">Learning paths ↗</a>
        <a href="${a("case-studies/index.html")}">Case studies ↗</a>
        <a href="https://stats.uptimerobot.com/T37DqoPPMU" target="_blank" rel="noopener noreferrer" title="Live uptime monitoring, running since September 2026">Uptime status ↗</a>
        <a href="${a("index.html")}#work">Selected work ↗</a>
        <a href="${a("privacy.html")}">Privacy</a>
      </div>
    </footer>
    <script src="${a("assets/assistant.js")}" defer></script>${bodyHtml.includes('<figure class="flow">') ? `
    <script src="${a("assets/flow-player.js")}" defer></script>` : ""}${bodyHtml.includes("data-quiz") ? `
    <script src="${a("assets/quiz.js")}" defer></script>` : ""}
    <script src="${a("assets/reading-progress.js")}" defer></script>
  </body>
</html>
`;
}


/* ------------------------------------------------------------ redirect stub */
/**
 * A moved page. GitHub Pages can't send a 301, so the old URL keeps a tiny
 * page that points search engines at the new one (canonical + noindex) and
 * sends people there (meta refresh, plus a plain link that works without it).
 * `to` is the new page's path relative to the old one.
 */
export function redirectPage({ title, to, canonical }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${HEAD_SECURITY}
    <title>${esc(title)} — Prudhvi Raj Anupoju</title>
    <meta name="robots" content="noindex" />
    <link rel="canonical" href="${esc(canonical)}" />
    <meta http-equiv="refresh" content="0; url=${esc(to)}" />
  </head>
  <body>
    <p>This page has moved to <a href="${esc(to)}">${esc(title)}</a>.</p>
  </body>
</html>
`;
}
