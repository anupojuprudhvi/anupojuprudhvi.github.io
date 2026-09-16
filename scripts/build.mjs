/**
 * Static generator for the use-case library.
 *
 *   content/usecases/<project>/<slug>.md   →  usecases/<project>/<slug>.html
 *                                          →  assets/usecases.json   (search index)
 *                                          →  usecases/index.html    (library)
 *
 * Deliberately dependency-free so CI is just `node scripts/build.mjs` —
 * no install step, nothing to audit on a public repo.
 *
 * Authoring format is a small, documented subset (see README):
 *   front matter  — key: value | key: [a, b] | key: | block | key: - list
 *   body          — "## Eyebrow · Title" starts a section
 *                   "### Heading" + list  becomes a collapsible notes block
 *                   raw HTML passes straight through
 */
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  statSync,
} from "node:fs";
import { join, relative, dirname } from "node:path";

const ROOT = process.cwd();
const CONTENT = join(ROOT, "content/usecases");
const SITE = "https://anupojuprudhvi.github.io";

/* ------------------------------------------------------------------ utils */
const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".md")) out.push(p);
  }
  return out;
}

/* ----------------------------------------------------- front-matter parser */
function parseFrontMatter(raw, file) {
  if (!raw.startsWith("---"))
    throw new Error(`${file}: missing front matter (--- on line 1)`);
  const end = raw.indexOf("\n---", 3);
  if (end === -1) throw new Error(`${file}: front matter not closed`);
  const head = raw.slice(4, end);
  const body = raw.slice(end + 4).replace(/^\n+/, "");

  const data = {};
  const lines = head.split("\n");
  let i = 0;

  const indentOf = (l) => l.match(/^\s*/)[0].length;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("#")) {
      i++;
      continue;
    }
    const m = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!m) throw new Error(`${file}: cannot parse front-matter line: ${line}`);
    const [, key, rest] = m;

    if (rest === "|" || rest === ">") {
      // block scalar
      const buf = [];
      i++;
      while (i < lines.length && (!lines[i].trim() || indentOf(lines[i]) >= 2)) {
        buf.push(lines[i].slice(2));
        i++;
      }
      data[key] = buf.join(rest === ">" ? " " : "\n").trim();
    } else if (rest.startsWith("[")) {
      // inline list
      data[key] = rest
        .replace(/^\[|\]$/g, "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      i++;
    } else if (rest === "") {
      // block list — either scalars or simple objects
      const arr = [];
      i++;
      while (i < lines.length && lines[i].trim().startsWith("-")) {
        const first = lines[i].trim().slice(1).trim();
        const kv = first.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
        if (kv) {
          const obj = { [kv[1]]: kv[2] };
          i++;
          while (
            i < lines.length &&
            !lines[i].trim().startsWith("-") &&
            lines[i].trim() &&
            indentOf(lines[i]) >= 4
          ) {
            const kv2 = lines[i].trim().match(/^([A-Za-z][\w-]*):\s*(.*)$/);
            if (kv2) obj[kv2[1]] = kv2[2];
            i++;
          }
          arr.push(obj);
        } else {
          arr.push(first);
          i++;
        }
      }
      data[key] = arr;
    } else {
      data[key] = rest;
      i++;
    }
  }
  return { data, body };
}

/* --------------------------------------------------------- inline markdown */
const inline = (s) =>
  s
    .replace(/`([^`]+)`/g, (_, c) => `<code>${esc(c)}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

/** Paragraph text that may contain inline markdown but no block structure. */
const para = (s) =>
  s
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p>${inline(p.replace(/\n/g, " ").trim())}</p>`)
    .join("\n");

/* ------------------------------------------------------- body → HTML blocks */
function renderBody(body) {
  if (!body.trim()) return "";
  // Rich pages hand us finished sections — pass them through untouched.
  if (body.trimStart().startsWith("<section")) return body.trim();

  const sections = [];
  let current = { eyebrow: "", title: "", lines: [] };
  const flush = () => {
    if (current.title || current.lines.some((l) => l.trim()))
      sections.push(current);
  };

  for (const line of body.split("\n")) {
    const h2 = line.match(/^##\s+(.*)$/);
    if (h2 && !line.startsWith("###")) {
      flush();
      const [eyebrow, ...rest] = h2[1].split("·");
      current = rest.length
        ? { eyebrow: eyebrow.trim(), title: rest.join("·").trim(), lines: [] }
        : { eyebrow: "", title: h2[1].trim(), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  flush();

  return sections.map(renderSection).join("\n");
}

function renderSection(sec) {
  const inner = renderBlocks(sec.lines.join("\n"));
  const head =
    (sec.eyebrow
      ? `<div class="section-eyebrow">${esc(sec.eyebrow)}</div>\n`
      : "") + (sec.title ? `<h2>${inline(sec.title)}</h2>\n` : "");
  if (!head && !inner.trim()) return "";
  return `<section>\n<div class="wrap">\n${head}${inner}\n</div>\n</section>`;
}

/** Block-level markdown inside a section. */
function renderBlocks(text) {
  const out = [];
  const lines = text.split("\n");
  let i = 0;

  const isList = (l) => /^\s*-\s+/.test(l);

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // raw HTML block — passes through until a blank line at zero indent
    if (/^\s*</.test(line)) {
      const buf = [];
      while (i < lines.length && lines[i].trim()) {
        buf.push(lines[i]);
        i++;
      }
      out.push(buf.join("\n"));
      continue;
    }

    // "### Heading" immediately followed by a list → collapsible notes
    const h3 = line.match(/^###\s+(.*)$/);
    if (h3) {
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      if (j < lines.length && isList(lines[j])) {
        const items = [];
        while (j < lines.length && (isList(lines[j]) || !lines[j].trim())) {
          if (isList(lines[j]))
            items.push(lines[j].replace(/^\s*-\s+/, "").trim());
          j++;
        }
        out.push(
          `<details class="implementation-notes">\n<summary>${inline(
            h3[1],
          )}</summary>\n<ul>\n${items
            .map((t) => `<li>${inline(t)}</li>`)
            .join("\n")}\n</ul>\n</details>`,
        );
        i = j;
        continue;
      }
      out.push(`<h3>${inline(h3[1])}</h3>`);
      i++;
      continue;
    }

    // plain list
    if (isList(line)) {
      const items = [];
      while (i < lines.length && (isList(lines[i]) || !lines[i].trim())) {
        if (isList(lines[i]))
          items.push(lines[i].replace(/^\s*-\s+/, "").trim());
        else if (!lines[i].trim() && items.length) {
          // blank line ends the list unless the next line continues it
          let k = i + 1;
          while (k < lines.length && !lines[k].trim()) k++;
          if (!(k < lines.length && isList(lines[k]))) break;
        }
        i++;
      }
      out.push(`<ul>\n${items.map((t) => `<li>${inline(t)}</li>`).join("\n")}\n</ul>`);
      continue;
    }

    // paragraph
    const buf = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !isList(lines[i]) &&
      !/^#{2,3}\s/.test(lines[i]) &&
      !/^\s*</.test(lines[i])
    ) {
      buf.push(lines[i].trim());
      i++;
    }
    if (buf.length) out.push(`<p>${inline(buf.join(" "))}</p>`);
  }
  return out.join("\n");
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
function page(d, bodyHtml, { up, url, prev, next }) {
  const a = (p) => `${up}${p}`;
  const scripts = (d.scripts || [])
    .map((s) => `<script src="${a("assets/" + s)}" defer></script>`)
    .join("\n    ");

  const metaBits = [
    d.projectName && `<div><b>Project</b><br />${esc(d.projectName)}</div>`,
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
      : `<a href="${a("usecases/index.html")}">← All use cases</a>`,
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
<div class="section-eyebrow">${esc(d.label || "Use case")}</div>
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
    <link rel="stylesheet" href="${a("assets/usecase.css")}" />
    <link rel="stylesheet" href="${a("assets/assistant.css")}" />
  </head>
  <body class="deepdive">
    <a class="skip-link" href="#main">Skip to content</a>
    <div class="topbar">
      <div class="wrap">
        <a class="back" href="${a("usecases/index.html")}">← All use cases</a>
        <button id="themeToggle" aria-label="Switch to light theme">☼</button>
      </div>
    </div>
    <main id="main">
      <header class="hero">
        <div class="wrap">
          <div class="eyebrow">${esc(d.projectName || "")}${
            d.label ? " · " + esc(d.label) : ""
          }</div>
          <h1>${inline(d.title)}</h1>
          ${d.summary ? `<p class="sub">${inline(d.summary)}</p>` : ""}
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
            I'm happy to go deeper on any part of this — the architecture, the
            trade-offs, or how it would adapt to a different environment.
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
        ><a href="${a("usecases/index.html")}">All use cases ↗</a
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
function libraryPage(items) {
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
          <h3><a href="${esc(i.url.replace(/^usecases\//, ""))}">${esc(
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
    <title>Use case library — Prudhvi Raj Anupoju</title>
    <meta
      name="description"
      content="A searchable library of cloud architecture use cases — governance, networking, resilience, integration and cost, drawn from enterprise AWS delivery."
    />
    <link rel="canonical" href="${SITE}/usecases/" />
    <meta property="og:title" content="Use case library — Prudhvi Raj Anupoju" />
    <meta
      property="og:description"
      content="A searchable library of cloud architecture use cases from enterprise AWS delivery."
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
          ><a href="index.html" aria-current="page">Use cases</a
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
          <p class="eyebrow">Use case library</p>
          <h1>Every problem, and how it was solved.</h1>
          <p class="uc-lede">
            Individual engineering problems from enterprise AWS delivery —
            each one written up with the constraint, the approach, and the
            trade-offs. Client details are anonymized; the engineering is not.
          </p>
          <div class="uc-controls">
            <label class="uc-search">
              <span class="visually-hidden">Search use cases</span>
              <input
                type="search"
                id="ucSearch"
                placeholder="Search by problem, service, or technology…"
                autocomplete="off"
              />
            </label>
            <div class="filters" role="group" aria-label="Filter use cases">
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
            ${items.length} use cases
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

/* ---------------------------------------------------------------- build */
const files = walk(CONTENT).sort();
if (!files.length) {
  console.error("No content found under content/usecases/");
  process.exit(1);
}

const docs = files.map((file) => {
  const { data, body } = parseFrontMatter(readFileSync(file, "utf8"), file);
  for (const req of ["title", "project", "summary"])
    if (!data[req]) throw new Error(`${file}: front matter missing "${req}"`);
  const slug = file.split("/").pop().replace(/\.md$/, "");
  const url = `usecases/${data.project}/${slug}.html`;
  return { ...data, slug, url, file, bodyHtml: renderBody(body) };
});

docs.sort(
  (a, b) =>
    (a.project || "").localeCompare(b.project || "") ||
    Number(a.order || 0) - Number(b.order || 0),
);

let written = 0;
docs.forEach((d, idx) => {
  const prev = docs[idx - 1]?.project === d.project ? docs[idx - 1] : null;
  const next = docs[idx + 1]?.project === d.project ? docs[idx + 1] : null;
  const out = join(ROOT, d.url);
  mkdirSync(dirname(out), { recursive: true });
  const depth = d.url.split("/").length - 1;
  const up = "../".repeat(depth);
  writeFileSync(out, page(d, d.bodyHtml, { up, url: d.url, prev, next }));
  written++;
  console.log("  page  ", d.url);
});

// Hand-written pages that aren't generated from content/ but should still be
// findable in the library and the assistant.
let extra = [];
try {
  extra = JSON.parse(readFileSync(join(CONTENT, "../extra-index.json"), "utf8"));
  console.log("  extra  ", extra.length, "hand-written pages indexed");
} catch {
  /* optional */
}

// search index — the single source of truth for the library and assistant
const index = docs.map((d) => ({
  title: d.title,
  nav: d.nav || d.title,
  summary: d.summary,
  project: d.project,
  projectName: d.projectName || d.project,
  layer: d.layer || "",
  stack: d.stack || [],
  tags: d.tags || [],
  url: d.url,
  problem: (d.problem || "").replace(/\s+/g, " ").trim(),
  solution: (d.solution || "").replace(/\s+/g, " ").trim(),
}));

const fullIndex = [...index, ...extra];
writeFileSync(
  join(ROOT, "assets/usecases.json"),
  JSON.stringify(fullIndex, null, 2) + "\n",
);
console.log("  index  assets/usecases.json", `(${fullIndex.length} entries)`);

mkdirSync(join(ROOT, "usecases"), { recursive: true });
writeFileSync(join(ROOT, "usecases/index.html"), libraryPage(fullIndex));
console.log("  page   usecases/index.html");

console.log(`\nBuilt ${written} use-case pages + library + index.`);
