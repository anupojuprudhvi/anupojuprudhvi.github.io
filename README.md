# Prudhvi Raj Anupoju — Cloud & DevOps Portfolio

Static portfolio and a growing collection of cloud architecture case studies.
The site is a plain static output that can be
served by GitHub Pages or Vercel; `vercel.json` defines the Vercel build
configuration. There are no runtime dependencies and no build-time dependencies
for the generator — it is plain Node.

Live at: https://anupojuprudhvi.github.io/

## How the site is put together

There are two layers, on purpose:

- **Narrative** — `index.html` and the engagement pages under `usecases/`.
  This is the pitch: who I am, three engagements, why they mattered.
- **Reference** — `usecases/index.html`, the searchable case-study library.
  This is the depth: one page per technical case study, filterable by project,
  layer, and technology.

The library, the search index, and the "Ask about my work" panel are all driven
by a single generated file, `assets/usecases.json`, so they can never disagree
with each other.

## Adding a case study

Write one Markdown source file. Everything else is generated. The complete,
copyable front-matter and body template is in
[`docs/use-case-template.md`](docs/use-case-template.md).

```text
content/usecases/<project>/<slug>.md   →   usecases/<project>/<slug>.html
                                       →   assets/usecases.json
                                       →   usecases/index.html
```

Then:

```sh
npm run build
```

Front matter drives the page scaffold. The body is a small Markdown subset:

- `## Eyebrow · Title` starts a new section.
- `### Heading` immediately followed by a list becomes a collapsible
  "architecture decisions" block.
- `**bold**`, `` `code` ``, `[links](url)` and plain lists work as expected.
- Raw HTML passes straight through, so a case study that needs a custom SVG
  diagram or table just includes it. A body that begins with `<section>` is
  emitted verbatim — that is how the richer case studies are written.

To attach a diagram script, drop it in `assets/` and reference it:
`scripts: [tgw-diagram.js]`.

Pages that are hand-written rather than generated (the telecom and healthcare
case studies) are listed in `content/extra-index.json` so they still appear in
the library and in search.

## Local preview

```sh
npm ci          # only needed for the test suite
npm run build
npm run preview
```

Open http://127.0.0.1:4173. The site defaults to dark mode and remembers the
visitor's theme across pages. Core content and case-study navigation remain
available without JavaScript.

## Verification

```sh
npm test        # Playwright suite
npm run check   # rebuild and fail if committed output is stale
```

The Playwright suite checks pages in dark and light themes at 320, 360, 390,
768, and 1440px; local links and anchors; filters; keyboard details expansion;
email copying; diagrams; theme persistence; JavaScript-disabled content;
browser errors; and automated WCAG A/AA accessibility rules. Screenshots are
saved in the ignored `artifacts/` directory.

The scripts use installed Chrome or Edge on Windows. Elsewhere, run
`npx playwright install chromium` first, or set `BROWSER_PATH` to a browser
executable.

CI runs `.github/workflows/build-check.yml` on every push and pull request. It
regenerates the site and fails if the committed output no longer matches the
source — for example, if a case study was edited without running `npm run build`.

## Editing

- `content/usecases/`: case-study source. **Start here.**
- `content/extra-index.json`: hand-written pages to include in the library.
- `index.html`: introduction, selected work, expertise, career, credentials, contact.
- `usecases/tolling/index.html`, `usecases/telecom/…`, `usecases/healthcare/…`: engagement narratives.
- `scripts/build.mjs`: the generator.
- `assets/site.css`, `assets/deepdive.css`, `assets/library.css`, `assets/assistant.css`: themes, layout, components.
- `assets/theme.js`, `assets/site.js`, `assets/library.js`, `assets/assistant.js`: theme persistence, homepage interactions, library filtering, search panel.
- `assets/og-template.html`: social preview source. Run `node scripts/render-social.mjs` to regenerate `og-image.png`.

Generated files (`usecases/*/**.html` under generated projects, `usecases/index.html`,
`assets/usecases.json`) are committed so GitHub Pages can serve them directly
from the branch. Don't hand-edit them — edit the Markdown and rebuild.

Project outcomes and credentials are based on the existing portfolio content.
The $300K+ figure describes annual savings identified across several
engagements, not savings attributable only to the clinical platform.

## About "Ask about my work"

The panel searches `assets/usecases.json` in the browser. It is not an AI and
says so — every result is text I wrote, linked to the page it came from, with a
direct email fallback when nothing matches. If a hosted model is added later,
only the `answer()` function in `assets/assistant.js` changes; the index it
searches is already the grounding corpus.

## Deployment

The repository is deployable as static files. GitHub Pages can serve the
committed output directly from the publishing branch, while Vercel uses the
included `vercel.json` configuration and runs `npm run build` before serving the
repository root. Confirm the active hosting provider and deployment status in
that provider's dashboard; this repository does not claim a deployment was
successful merely because the build passed.

## Publish

```sh
npm run build
git add -A && git commit -m "…"
git push origin main
```
