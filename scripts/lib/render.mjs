import { esc, inline, para, jsonLd } from "./html.mjs";
import { motifFor, motifSvg } from "./motifs.mjs";

export const SITE = "https://anupojuprudhvi.github.io";

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
                <small>6 Modules · Modules, State &amp; CI/CD</small>
              </a>
              <a href="${prefix}migration-journey/index.html" role="menuitem" class="nav-dropdown-item">
                <strong>Cloud Migration Journey</strong>
                <small>6 Modules · Assess, Mobilize &amp; Modernize</small>
              </a>
              <a href="${prefix}kubernetes-operations/index.html" role="menuitem" class="nav-dropdown-item">
                <strong>Kubernetes Ingress &amp; Operations on EKS</strong>
                <small>4 Modules · Ingress, RBAC &amp; Day-2 Ops</small>
              </a>
            </div>
          </div>`;
}

/* ------------------------------------------------- Unified Site Top Navigation */
/**
 * One navigation bar for every page. `home: true` swaps in the homepage's
 * in-page anchors (Approach, About). On small screens the links collapse
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
  const homeAnchors = home
    ? `
          <a href="#approach">Approach</a>
          <a href="#background">About</a>`
    : "";
  return `    <nav class="topnav" aria-label="Main navigation">
      <div class="wrap nav-inner">
        <a class="brand" href="${home ? "#top" : a("index.html")}">Prudhvi Raj Anupoju</a>
        <div class="navlinks" id="siteNavLinks">
          <a href="${page}#work"${active === "work" ? ` aria-current="page"` : ""}>Selected work</a>
          ${caseStudiesNavDropdown(docs, { prefix: a("case-studies/"), current: active === "case-studies" })}
          ${learningPathsNavDropdown({ prefix: a("learning-paths/"), current: active === "learning-paths" })}${homeAnchors}
          <a href="${page}#contact" class="nav-cta">Let's connect ↗</a>
        </div>
        <button id="themeToggle" type="button" aria-label="Switch to light theme">☼</button>
        <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="siteNavLinks" aria-label="Open menu">
          <span class="nav-toggle-bars" aria-hidden="true"></span>
        </button>
      </div>
    </nav>`;
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

/* ------------------------------------------------------------- page shell */
export function page(d, bodyHtml, { up, url, prev, next, docs = [] } = {}) {
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
    <link rel="alternate" type="application/rss+xml" title="Prudhvi Raj Anupoju — Case Studies" href="${SITE}/feed.xml" />
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
        "mainEntityOfPage": "${canonical}",
        "keywords": ${jsonLd((d.tags || []).concat(d.stack || []).join(", "))}
      }
    </script>
    <script src="${a("assets/theme.js")}"></script>
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
${rest.replace(/<pre(?![^>]*tabindex)/g, '<pre tabindex="0"')}
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
        <span>© 2026 Prudhvi Raj Anupoju</span
        ><a href="${a("learning-paths/index.html")}">Learning paths ↗</a
        ><a href="${a("case-studies/index.html")}">Case studies ↗</a
        ><a href="https://stats.uptimerobot.com/T37DqoPPMU" target="_blank" rel="noopener noreferrer" title="Live uptime monitoring, running since September 2026">Uptime status ↗</a
        ><a href="${a("index.html")}#work">Back to overview ↗</a
        ><a href="${a("privacy.html")}">Privacy</a>
      </div>
    </footer>
    <script src="${a("assets/assistant.js")}" defer></script>
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

export function libraryPage(items) {
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
      )}">
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
    <link rel="alternate" type="application/rss+xml" title="Prudhvi Raj Anupoju — Case Studies" href="${SITE}/feed.xml" />
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
          <p class="filter-status" id="ucStatus" role="status">
            ${items.length} case studies
          </p>
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
        <span>© 2026 Prudhvi Raj Anupoju</span
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
export function learningPathPage(d, bodyHtml, { up, url, prev, next, track, docs = [] } = {}) {
  const a = (p) => `${up}${p}`;
  const isOverview = !d.module;

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
    <link rel="canonical" href="${SITE}/${url}" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${esc(d.title)} — Prudhvi Raj Anupoju" />
    <meta property="og:description" content="${esc(d.summary || "")}" />
    <meta property="og:image" content="${SITE}/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="alternate" type="application/rss+xml" title="Prudhvi Raj Anupoju — Case Studies" href="${SITE}/feed.xml" />
    <link rel="icon" href="${a("assets/favicon.svg")}" type="image/svg+xml" />
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
        "url": "${SITE}/${url}",
        "image": "${SITE}/og-image.png",
        "mainEntityOfPage": "${SITE}/${url}",
        "keywords": ${jsonLd((d.tags || []).concat(d.stack || []).join(", "))}
      }
    </script>
    <script src="${a("assets/theme.js")}"></script>
    <link rel="stylesheet" href="${a("assets/site.css")}" />
    <link rel="stylesheet" href="${a("assets/deepdive.css")}" />
    <link rel="stylesheet" href="${a("assets/learning-path.css")}" />
    <link rel="stylesheet" href="${a("assets/assistant.css")}" />
  </head>
  <body class="deepdive">
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
      <article class="lp-content">
        <div class="wrap">
          ${bodyHtml.replace(/<pre(?![^>]*tabindex)/g, '<pre tabindex="0"')}
          ${!isOverview ? `<nav class="lp-nav" aria-label="Module navigation">${nav}</nav>` : ""}
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
        <span>© 2026 Prudhvi Raj Anupoju</span>
        <a href="${a("learning-paths/index.html")}">Learning paths ↗</a>
        <a href="${a("case-studies/index.html")}">Case studies ↗</a>
        <a href="https://stats.uptimerobot.com/T37DqoPPMU" target="_blank" rel="noopener noreferrer" title="Live uptime monitoring, running since September 2026">Uptime status ↗</a>
        <a href="${a("index.html")}#work">Selected work ↗</a>
        <a href="${a("privacy.html")}">Privacy</a>
      </div>
    </footer>
    <script src="${a("assets/assistant.js")}" defer></script>
  </body>
</html>
`;
}

