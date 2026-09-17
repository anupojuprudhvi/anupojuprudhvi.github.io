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
<h3>The solution I built</h3>
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
    d.role && `<div><b>My role</b><br />${esc(d.role)}</div>`,
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
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="icon" href="${a("assets/favicon.svg")}" type="image/svg+xml" />
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
${rest}
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
    <meta name="twitter:card" content="summary_large_image" />
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
          <a href="../index.html#work">Selected work</a
          ><a href="index.html" aria-current="page">Case studies</a
          ><a href="../index.html#contact" class="nav-cta">Let's connect ↗</a
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
            a project overview for the business context and my role, then open
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
        ><a href="../index.html#work">Selected work ↗</a>
      </div>
    </footer>
    <script src="../assets/library.js" defer></script>
    <script src="../assets/assistant.js" defer></script>
  </body>
</html>
`;
}
