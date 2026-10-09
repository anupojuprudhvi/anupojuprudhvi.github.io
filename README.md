# Prudhvi Raj Anupoju — Cloud & DevOps Portfolio

Static portfolio and a growing collection of cloud architecture case studies.
The site is a plain static output served directly by GitHub Pages.
There are no runtime dependencies and no build-time dependencies
for the generator — it is plain Node.

Live at: https://anupojuprudhvi.github.io/

## Run it locally with Docker

`docker compose up --build` starts two containers:

- **site** — the generated site on a hardened, non-root nginx at
  <http://localhost:8080>, served like GitHub Pages (directory `index.html`,
  branded `404.html`) plus real security headers (CSP, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy`). It keeps running.
- **tests** — waits for the site to be healthy, then runs every check CI runs
  (`npm run check`, `test:build`, `test:preview`, `test:browser`) and
  `scripts/verify-docker.mjs` against the running container. It exits when done;
  page screenshots are written to `./artifacts`.

`docker compose run --rm tests` runs only the tests (the exit code is the
result). `docker compose down` stops everything. CI runs the same containers in
its `container` job.

## CI and deployment

`.github/workflows/build-check.yml` runs on every push and pull request:

- **build** — generated-output drift check, generator and preview-server tests,
  the full browser suite, then `npm run stage` (copies only public files to
  `_site/` and fails on any local link that would 404) and `npm run lighthouse`
  (median of 3 runs; performance ≥ 90, accessibility, best practices and SEO
  ≥ 95; reports kept as a run artifact).
- **container** — the Docker setup above, so it can't silently rot.
- **deploy** — on `main` only, and only after **build** passes: publishes
  `_site/` to GitHub Pages. Requires *Settings → Pages → Source: GitHub Actions*.
  Publishing the staged folder also keeps `content/`, `scripts/`, and repo docs
  off the public site.

`.github/workflows/links.yml` checks every external link weekly
(`npm run links`); a failed run emails the repository owner. Dependabot proposes
monthly updates for actions, npm packages and Docker images.

> **Headers differ in production.** GitHub Pages cannot send custom response
> headers, so the live site relies on the `<meta http-equiv="Content-Security-Policy">`
> tag in every page. A meta CSP cannot express `frame-ancestors`, and there is no
> `X-Frame-Options` or `Permissions-Policy` on the live site; those protections
> exist only in the local nginx container.

## How the site is put together

The published HTML is generated. Edit the files under `content/`, then run
`npm run build`. There are two kinds of content:

- **Narrative** — `index.html` and the engagement pages under `case-studies/`.
  This is the pitch: who I am, three engagements, why they mattered.
- **Reference** — `case-studies/index.html`, the searchable case-study library.
  This is the depth: one page per technical case study, filterable by project,
  layer, and technology.
- **Playbooks & Learning Paths** — `learning-paths/index.html` and track modules under
  `learning-paths/<track>/`. This is hands-on production engineering: curriculum-based
  technical playbooks (starting with Terraform for Enterprise Production).

Every case study comes from one Markdown file. The build uses those files for
the detail pages, project lists, library, and `assets/case-studies.json`. The
"Ask about my work" panel searches that generated index.

## Adding a case study

Write one Markdown source file. Everything else is generated. The complete,
copyable front-matter and body template is in
[`docs/case-study-template.md`](docs/case-study-template.md).

```text
content/case-studies/<project>/<slug>.md   →   case-studies/<project>/<slug>.html
                                       →   case-studies/<project>/index.html
                                       →   assets/case-studies.json
                                       →   case-studies/index.html
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
  diagram or table just includes it. Style it with classes, not `style=""`
  attributes or `<style>` blocks: the Content-Security-Policy blocks inline CSS. A body that begins with `<section>` is
  emitted verbatim — that is how the richer case studies are written.

Every case study and playbook header shows a small animated illustration
(`scripts/lib/motifs.mjs`): one of eight themes (`network`, `failover`,
`pipeline`, `replication`, `migration`, `stream`, `monitor`, `security`). A case
study gets the default for its `layer`; set `motif:` in front matter to choose
another. Playbook tracks set `motif` in `content/learning-paths/tracks.json`.

To attach a diagram script, drop it in `assets/` and reference it:
`scripts: [tgw-diagram.js]`.

Telecom, healthcare, and tolling remain separate project folders. Add a case
study to the appropriate folder; its project list, library entry, layer filter,
and search entry update automatically. No homepage or index edits are needed.

All case studies use the shared page layout. Custom HTML sections and SVG
diagrams stay in Markdown; diagram behavior lives in `assets/` and is loaded
through the `scripts` field. Titles, introductions, role, and scope can be
customized through front matter without copying the page shell.

## Local preview

```sh
npm ci          # only needed for the test suite
npm run build
npm run preview
```

Open http://127.0.0.1:4173. The site defaults to dark mode and remembers the
visitor's theme across pages. Core content and case-study navigation remain
available without JavaScript.

The preview server listens only on localhost. It supports GET and HEAD requests,
disables caching so edits stay visible, and returns error responses for malformed
URLs without stopping the server. These settings apply to local preview, not
the production hosting provider.

## Verification

```sh
npm test        # build, preview-server, and Playwright checks
npm run check   # compare generated output with sources without writing files
npm run test:build   # fast authoring/build regression checks
npm run test:preview # local server request handling and file types
npm run test:browser # rendered-site checks only
```

The build tests exercise additions, renames, new layers, shared project names,
stale output detection, and safe cleanup in a temporary copy.
The Playwright suite checks pages in dark and light themes at 320, 360, 390,
768, and 1440px; local links and anchors; filters; keyboard details expansion;
email copying; diagrams; theme persistence; JavaScript-disabled content;
browser errors; and automated WCAG A/AA accessibility rules. Screenshots are
saved in the ignored `artifacts/` directory.

The scripts use installed Chrome or Edge on Windows. Elsewhere, run
`npx playwright install chromium` first, or set `BROWSER_PATH` to a browser
executable.

CI runs `.github/workflows/build-check.yml` on every push to main and pull request.
It compares the committed output with the source, then runs the build regression
and browser suites. It fails if a case study was edited without rebuilding.

## Where to edit

| Change | Source |
| --- | --- |
| Add or update a case study | `content/case-studies/<project>/<slug>.md` |
| Add or update a learning path module | `content/learning-paths/<track>/<slug>.md` |
| Learning path track metadata | `content/learning-paths/tracks.json` |
| Project name and display order | `content/projects.json` |
| Homepage introduction, career, credentials, contact | `content/home.html` |
| A project's selected-work pitch | `content/engagements/<project>.html` |
| Tolling's longer overview narrative | `content/overviews/tolling.html` |
| Shared detail/library layout | `scripts/lib/render.mjs` |
| Markdown parsing | `scripts/lib/markdown.mjs` |
| Build orchestration and output checking | `scripts/build.mjs` |
| Styles and browser behavior | `assets/` |

Homepage pitches are short editorial summaries of an engagement, not copies of
its case-study inventory. Change a pitch only when that engagement's story
changes. The build fills in project names and links from the project registry.

Every case study sets `layer:` to one capability from `LAYER_ORDER` in
`scripts/lib/render.mjs` (Foundation & governance, Networking & security, Data &
storage, Resilience & DR, Platform & delivery, Applications & integration,
Operations & incidents, Migration & strategy, Product engineering). The library's
Capability filters are generated from it, and the build fails on an unknown value
so the filter list can't sprawl.

To add a **project**, add an entry with a unique `id` and `name` to
`content/projects.json`, create `content/engagements/<id>.html` using an existing
pitch as a starting point, and add Markdown files under
`content/case-studies/<id>/`. The build creates its overview automatically.
Set `customOverview: true` only if it needs a longer narrative, and create
either `content/overviews/<id>.html` (tolling) or `content/overviews/<id>.md`
(telecom). Markdown overviews require `title` and `summary` front matter and use
the shared page layout. Include `{{caseStudyLinks}}` in a raw HTML container to
list the project’s entries automatically. Provide exactly one overview source.

Telecom has four main case studies and one incident write-up. Supporting networking
and storage work lives in its overview; the consolidation and evidence gaps are
recorded in [the telecom editorial notes](docs/telecom-content-review.md).

Templates use named slots such as `{{projectName}}`, `{{engagementUrl}}`,
`{{selectedWork}}`, `{{caseStudyLinks}}`, and `{{caseStudyCount}}`.
`{{year}}` works in every template: it is the year of the newest `date:` or
`updated:` in any content file, so the footer year moves on with the site while
the build stays reproducible (it never reads the clock).
Unknown slots and invalid project references fail the build before outputs are
written. HTML in content is trusted repository-authored markup, not user input.

Generated files are committed so GitHub Pages can serve the branch directly:
`index.html`, `case-studies/**/*.html`, `learning-paths/**/*.html`, `assets/case-studies.json`,
`sitemap.xml`, `robots.txt`, and `feed.xml`.
Do not edit these files directly. Only current case-study URLs are published;
legacy redirects are not generated.
Renaming a published study changes its URL: update any editorial cross-links
and arrange a redirect if the old slug needs to remain public.

The build removes obsolete HTML only when it carries the generated-file marker.
It leaves unknown, manually created HTML alone. `npm run check` detects stale,
missing, or obsolete generated files even when the working tree has other edits.

The sitemap uses each generated page's canonical URL and updates automatically
when studies or projects are added, renamed, or removed. `robots.txt` allows
crawling and points to the sitemap. No separate URL list needs maintaining.
These files help discovery; they do not guarantee search-engine indexing.

Social preview images: `assets/og-template.html` is the site-wide default
(`og-image.png`), and `assets/og-page.html` renders one image per case study and
project overview into `assets/og/`, and one per learning path into
`assets/og/learning-paths/<track>.jpg` (shared by the track's overview and
modules). Run `npm run social` after adding or renaming a case study or track
(add `-- --default` to also regenerate `og-image.png`, or `-- --only <prefix>`
to redraw just one set, such as `assets/og/learning-paths/`), then
`npm run build`; pages fall back to `og-image.png` until their image exists.

Titles and descriptions are trimmed for search results in
`scripts/lib/render.mjs`: `docTitle()` adds " — Prudhvi Raj Anupoju" only when
the whole title stays within about 60 characters, and `metaDescription()` ends a
summary longer than 160 characters at its last full sentence (or a word, with an
ellipsis). The full summary still shows on the page, so write summaries for
readers and let the build shorten the meta tags.

Layout widths: every page uses the homepage width (`--maxw` in `site.css`,
1160px, or 1320px from 1600px wide). Running text on reading pages is capped at
`--measure` (860px, in `deepdive.css`); figures, tables, and card lists use the
full width. Below 1024px the navigation collapses behind the Menu button.

The site's font is Inter, self-hosted as one variable file in `assets/fonts/`
(SIL Open Font License, `assets/fonts/OFL.txt`) and preloaded on every page.

Learning-path modules follow one shape: "In this module, you'll learn to",
"Before you start", the sections, an optional "Try it" lab, "Recap · Key terms",
and "Check yourself · Pop quiz". When a module's `readingTime` changes, update
the track's `duration` in its `index.md`, in `tracks.json`, and on the
learning-paths hub (`content/learning-paths/index.html`).

Project outcomes and credentials are based on the existing portfolio content.
The $300K+ figure describes annual savings identified across several
engagements, not savings attributable only to the clinical platform.

## About "Ask about my work"

The panel searches `assets/case-studies.json` in the browser. It is not an AI and
says so — every result is text I wrote, linked to the page it came from, with a
direct email fallback when nothing matches. If a hosted model is added later,
only the `answer()` function in `assets/assistant.js` changes; the index it
searches is already the grounding corpus.

## Homepage presentation

The homepage puts professional experience and architecture first. The hologram,
automatic greeting, and voice controls are no longer loaded. Case-study search and filters, Learning Paths, and the Ask panel remain available.
The generic homepage architecture illustration and duplicate project cards are removed.
Seven expertise cards cover architecture, Kubernetes, infrastructure as code,
resilience, CI/CD, FinOps, and migration. The card strip supports manual navigation and pausable rotation.
Unused guide code, portrait artwork, and the Three.js vendor bundle have been removed.
Case-study overviews use existing problem, solution, role, and outcome metadata.
The Experience navigation preserves the original `#background` anchor. Diagrams
can be enlarged in a keyboard-accessible dialog; originals remain readable without JavaScript.

## Deployment

The repository is served directly by GitHub Pages from the `main` branch.
Committed static files (`index.html`, `case-studies/**/*.html`, `learning-paths/**/*.html`,
`assets/case-studies.json`, `sitemap.xml`, `robots.txt`, and `feed.xml`) are served globally
without any external hosting dependencies. Check deployment status under the repository's
GitHub Pages settings or Actions tab.

## Publish

```sh
npm run build
git add -A && git commit -m "…"
git push origin main
```

Homepage navigation leads to the case-study library rather than a duplicate
Selected Work card section. The hero and header use the same reading grid.
The role label and metrics remain steady instead of animating. Visible copy
uses existing portfolio facts, with decorative arrows and prose dashes reduced.
Technical commands, diagrams, and dates keep their required notation.

Expertise navigation uses labelled dots with swipe and mouse-drag support.
Rotation runs every eight seconds only while visible, pauses for hover/focus,
stops after manual navigation, and respects reduced motion and Pause animations.
Contact links open the existing message or written-work search panel directly.
They retain mailto/library fallbacks without JavaScript. Duplicate capability
prose and the toolbox catalogue have been removed from the homepage.

The homepage moves from introduction to case studies, expertise, delivery approach,
experience, credentials, and contact. Repeated hero labels are removed. The learning
path hub uses short summaries with details on each track page, and links back to
case studies so examples and guides remain connected.
