import { esc, inline, para } from "./html.mjs";

export const SITE = "https://anupojuprudhvi.github.io";

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

function outcomesBlock(d) {
  if (!Array.isArray(d.outcomes) || !d.outcomes.length) return "";
  return `<section>
<div class="wrap">
<div class="section-eyebrow">Outcome</div>
<h2>What changed</h2>
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

/* ------------------------------------------------------------- page shell */
export function page(d, bodyHtml, { up, url, prev, next }) {
  const a = (p) => `${up}${p}`;
  const scripts = (d.scripts || [])
    .map((s) => `<script src="${a("assets/" + s)}" defer></script>`)
    .join("\n    ");

  const metaBits = [
    d.projectName && `<div><b>Project</b><br />${esc(d.projectName)}</div>`,
    d.role && `<div><b>Role</b><br />${esc(d.role)}</div>`,
    d.scope && `<div><b>Scope</b><br />${esc(d.scope)}</div>`,
    d.layer && `<div><b>Layer</b><br />${esc(d.layer)}</div>`,
    Array.isArray(d.stack) && d.stack.length
      ? `<div><b>Stack</b><br />${d.stack.map(esc).join(" · ")}</div>`
      : "",
    Array.isArray(d.tags) && d.tags.length
      ? `<div><b>Tags</b><br />${d.tags.map(esc).join(" · ")}</div>`
      : "",
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
    <title>${esc(d.title)} — Prudhvi Raj Anupoju</title>
    <meta name="description" content="${esc(d.summary || "")}" />
    <link rel="canonical" href="${SITE}/${url}" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${esc(d.title)}" />
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
        "headline": ${JSON.stringify(d.title)},
        "description": ${JSON.stringify(d.summary || "")},
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
        "keywords": ${JSON.stringify((d.tags || []).concat(d.stack || []).join(", "))}
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
    <div class="topbar">
      <div class="wrap">
        <a class="back" href="${a("case-studies/index.html")}">← All case studies</a>
        <button id="themeToggle" aria-label="Switch to light theme">☼</button>
      </div>
    </div>
    <main id="main">
      <header class="hero">
        <div class="wrap">
          <div class="eyebrow">${esc(d.projectName || "")}${
            d.label ? " · " + esc(d.label) : ""
          }</div>
          <h1>${inline(d.heroTitle || d.title)}</h1>
          ${d.intro || d.summary ? `<p class="sub">${inline(d.intro || d.summary)}</p>` : ""}
          <div class="meta">
            ${metaBits}
          </div>
        </div>
      </header>
${leadSection}
${rest.replace(/<pre(?![^>]*tabindex)/g, '<pre tabindex="0"')}
${outcomesBlock(d)}
      <aside class="next-study wrap">
        ${nav}
      </aside>
      <div class="closing">
        <div class="wrap">
          <h2>Want to talk through how this would apply to your environment?</h2>
          <p>
            ${d.closingText ? esc(d.closingText) : "I'm happy to go deeper on any part of this — the architecture, the\n            trade-offs, or how it would adapt to a different environment."}
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
        ><a href="${a("index.html")}#work">Back to overview ↗</a>
      </div>
    </footer>
    <script src="${a("assets/assistant.js")}" defer></script>
    ${scripts}
  </body>
</html>
`;
}

/* --------------------------------------------------------- library page */
export function libraryPage(items) {
  const projects = [...new Set(items.map((i) => i.projectName))];
  const layers = [...new Set(items.map((i) => i.layer).filter(Boolean))];

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

  const filterBtn = (val, text, pressed = false) =>
    `<button class="filter" data-uc-filter="${esc(val)}" aria-pressed="${pressed}">${esc(
      text,
    )}</button>`;

  return `<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
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
    <script src="../assets/theme.js"></script>
    <link rel="stylesheet" href="../assets/site.css" />
    <link rel="stylesheet" href="../assets/library.css" />
    <link rel="stylesheet" href="../assets/assistant.css" />
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to content</a>
    <nav class="topnav" aria-label="Main navigation">
      <div class="wrap nav-inner">
        <a class="brand" href="../index.html"
          ><span class="monogram" aria-hidden="true">PA</span>Prudhvi Raj
          Anupoju</a
        >
        <div class="navlinks">
          <a href="../index.html#work">Selected work</a>
          <div class="nav-dropdown">
            <a href="index.html" class="nav-dropdown-trigger" aria-haspopup="true" aria-expanded="false" aria-current="page"
              >Case studies <span class="nav-arrow" aria-hidden="true">▾</span></a
            >
            <div class="nav-dropdown-menu" role="menu">
              <a href="index.html" role="menuitem" class="nav-dropdown-item">
                <strong>All Case Studies</strong>
                <small>21 case studies · full library &amp; filters</small>
              </a>
              <div class="nav-dropdown-divider" role="separator"></div>
              <a href="index.html?filter=project%3Atelecom" role="menuitem" class="nav-dropdown-item">
                <strong>Telecom &amp; Secure Communications</strong>
                <small>5 case studies</small>
              </a>
              <a href="index.html?filter=project%3Atolling" role="menuitem" class="nav-dropdown-item">
                <strong>Tolling Infrastructure</strong>
                <small>10 case studies</small>
              </a>
              <a href="index.html?filter=project%3Ahealthcare" role="menuitem" class="nav-dropdown-item">
                <strong>Healthcare &amp; Cost Architecture</strong>
                <small>1 case study</small>
              </a>
              <a href="index.html?filter=project%3Apartner-engagements" role="menuitem" class="nav-dropdown-item">
                <strong>AWS APN &amp; Migration Engagements</strong>
                <small>5 case studies</small>
              </a>
            </div>
          </div>
          <div class="nav-dropdown">
            <a href="../learning-paths/index.html" class="nav-dropdown-trigger" aria-haspopup="true" aria-expanded="false"
              >Learning paths <span class="nav-arrow" aria-hidden="true">▾</span></a
            >
            <div class="nav-dropdown-menu" role="menu">
              <a href="../learning-paths/index.html" role="menuitem" class="nav-dropdown-item">
                <strong>All Learning Paths</strong>
                <small>Curriculum overview &amp; tracks</small>
              </a>
              <div class="nav-dropdown-divider" role="separator"></div>
              <a href="../learning-paths/terraform/index.html" role="menuitem" class="nav-dropdown-item">
                <strong>Terraform for Enterprise</strong>
                <small>6 Modules · Modules, State &amp; CI/CD</small>
              </a>
              <a href="../learning-paths/migration-journey/index.html" role="menuitem" class="nav-dropdown-item">
                <strong>Cloud Migration Journey</strong>
                <small>6 Modules · Assess, Mobilize &amp; Modernize</small>
              </a>
            </div>
          </div>
          <a href="../index.html#contact" class="nav-cta">Let's connect ↗</a
          ><button id="themeToggle" aria-label="Switch to light theme">
            ☼
          </button>
        </div>
      </div>
    </nav>
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
            <div class="filters" role="group" aria-label="Filter case studies">
              ${filterBtn("all", "All", true)}
              ${projects
                .map((p) =>
                  filterBtn(
                    "project:" + items.find((i) => i.projectName === p).project,
                    p,
                  ),
                )
                .join("\n              ")}
              ${layers
                .map((l) => filterBtn("layer:" + l, l))
                .join("\n              ")}
            </div>
          </div>
          <p class="filter-status" id="ucStatus" role="status">
            ${items.length} case studies
          </p>
        </div>
      </section>
      <section class="uc-list">
        <div class="wrap">
          <div class="uc-grid" id="ucGrid">
${cards}
          </div>
          <p class="uc-empty" id="ucEmpty" hidden>
            Nothing matched that. <a href="mailto:anupojuprudhvi@gmail.com">Ask me directly ↗</a>
          </p>
        </div>
      </section>
    </main>
    <footer>
      <div class="wrap footer-inner">
        <span>© 2026 Prudhvi Raj Anupoju</span
        ><a href="../learning-paths/index.html">Learning paths ↗</a
        ><a href="../index.html#work">Selected work ↗</a>
      </div>
    </footer>
    <script src="../assets/library.js" defer></script>
    <script src="../assets/assistant.js" defer></script>
  </body>
</html>
`;
}

/* --------------------------------------------------------- learning path page */
export function learningPathPage(d, bodyHtml, { up, url, prev, next, track }) {
  const a = (p) => `${up}${p}`;
  const isOverview = !d.module;

  const breadcrumb = isOverview
    ? `<a href="${a("learning-paths/index.html")}">← All learning paths</a>`
    : `<a href="${a(`learning-paths/${track.id}/index.html`)}">← ${esc(track.title)}</a>`;

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
  ]
    .filter(Boolean)
    .join("\n            ");

  return `<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
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
        "headline": ${JSON.stringify(d.title)},
        "description": ${JSON.stringify(d.summary || "")},
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
        "keywords": ${JSON.stringify((d.tags || []).concat(d.stack || []).join(", "))}
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
    <div class="topbar">
      <div class="wrap">
        <div class="back">${breadcrumb}</div>
        <button id="themeToggle" aria-label="Switch to light theme">☼</button>
      </div>
    </div>
    <main id="main">
      <header class="lp-hero">
        <div class="wrap">
          <span class="lp-badge">${esc(d.level || track.badge || "Production Playbook")}</span>
          <h1>${esc(d.title)}</h1>
          ${d.summary ? `<p class="sub">${inline(d.summary)}</p>` : ""}
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
          <h2>Want to discuss enterprise Terraform architecture?</h2>
          <p>
            I'm happy to dive deeper into any of these patterns — module abstraction trade-offs, state migration runbooks, or CI/CD security scanning.
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
        <a href="${a("index.html")}#work">Selected work ↗</a>
      </div>
    </footer>
    <script src="${a("assets/assistant.js")}" defer></script>
  </body>
</html>
`;
}

