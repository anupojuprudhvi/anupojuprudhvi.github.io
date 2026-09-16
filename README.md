# Prudhvi Raj Anupoju — Cloud & DevOps Portfolio

Static portfolio, engagement case studies, and a growing library of individual
cloud architecture use cases. Hosted directly on GitHub Pages; no runtime
dependencies and no build-time dependencies either — the generator is plain
Node with nothing to install.

Live at: https://anupojuprudhvi.github.io/

## How the site is put together

There are two layers, on purpose:

- **Narrative** — `index.html` and the engagement pages under `usecases/`.
  This is the pitch: who I am, three engagements, why they mattered.
- **Reference** — `usecases/index.html`, the searchable use-case library.
  This is the depth: one page per engineering problem, filterable by project,
  layer, and technology.

The library, the search index, and the "Ask about my work" panel are all driven
by a single generated file, `assets/usecases.json`, so they can never disagree
with each other.

## Adding a use case

Write one Markdown file. Everything else is generated.

```sh
content/usecases/<project>/<slug>.md   →   usecases/<project>/<slug>.html
                                       →   assets/usecases.json
                                       →   usecases/index.html
```

```markdown
---
title: A private image API without a proxy application to operate
nav: Upload and retrieve images        # short label used on cards
label: Image handling                  # shown as the section eyebrow
project: tolling                       # folder + filter key
projectName: U.S. Tolling Infrastructure
layer: Applications                    # Foundation | Core Network | Applications | Data …
order: 30                              # ordering within the project
stack: [API Gateway, Amazon S3, IAM, Terraform]
tags: [storage, security, api, cost]
summary: One line for the card, the search index, and the meta description.
problem: |
  What was actually hard.
solution: |
  What I built.
flow: [Internal service, VPC endpoint, Private REST API, IAM role, Amazon S3]
enables: |
  What this made possible.
---

### Architecture decisions

- **First decision:** why.
- **Second decision:** why.
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
- Raw HTML passes straight through, so a use case that needs a custom SVG
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

CI runs `.github/workflows/build-check.yml` on every push, which regenerates
the site and fails if the committed output no longer matches `content/` — i.e.
if a use case was edited without running `npm run build`.

## Editing

- `content/usecases/`: use-case source. **Start here.**
- `content/extra-index.json`: hand-written pages to include in the library.
- `index.html`: introduction, selected work, expertise, career, credentials, contact.
- `usecases/governance/…`, `usecases/telecom/…`, `usecases/healthcare/…`: engagement narratives.
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

## Publish

```sh
npm run build
git add -A && git commit -m "…"
git push origin main
```
