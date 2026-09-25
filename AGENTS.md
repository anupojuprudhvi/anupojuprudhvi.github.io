# AI Engineering Instructions

These instructions apply to every task in this repository. Read them before
changing code, content, tests, configuration, or generated output.

## Mission

Keep this portfolio production-ready: reliable, accessible, maintainable,
secure, truthful, fast, and easy to evolve. Prefer small, reviewable changes
that preserve the site's existing visual language and static-site architecture.

## Required workflow

1. **Inspect first.** Read the relevant source, templates, styles, scripts,
   tests, package scripts, and repository instructions before editing. Search
   for existing patterns before introducing a new one.
2. **State a plan.** Explain the intended change, files involved, assumptions,
   and validation steps before making edits.
3. **Change the source of truth.** Markdown under `content/`, JSON metadata,
   templates, and scripts are authoritative. Do not hand-edit generated HTML
   when a source or generator change is appropriate.
4. **Keep generated output synchronized.** Run `npm run build` after source or
   generator changes. Review the generated diff; do not discard intentional
   output changes.
5. **Validate before finishing.** Run the narrowest relevant checks first, then
   `npm run check`, `git diff --check`, and `npm test` when available. If a
   check cannot run, report the exact command, limitation, and remaining risk.
6. **Review the final diff.** Confirm links, anchors, paths, responsive markup,
   accessibility semantics, content accuracy, and unintended files before
   declaring the task complete.

## Architecture and maintainability

- Preserve the static-site design: plain HTML, CSS, JavaScript, Markdown, and
  the existing Node build scripts. Do not add a framework or dependency unless
  the task requires it and the repository owner agrees.
- Prefer reusable templates, shared CSS classes, data-driven content, and
  small focused functions over duplicated markup or page-specific hacks.
- Keep content in the appropriate source file. Keep navigation and labels
  consistent across the homepage, library, case studies, metadata, and footer.
- Avoid speculative abstractions. Reuse an existing pattern when it fits;
  introduce a new abstraction only when it removes real duplication or
  prevents a known class of defects.
- Keep changes scoped. Do not reformat unrelated files or rewrite working
  content merely for style.
- Use semantic HTML and progressive enhancement. Core content and navigation
  must remain useful without JavaScript.

## Production-readiness gates

Before describing a change as production-ready, verify as applicable:

- Build succeeds and committed generated files match the source.
- Local links, anchors, asset paths, canonical URLs, and navigation work.
- Layout remains usable at the project's supported viewport sizes.
- Keyboard navigation, focus states, labels, headings, contrast, and reduced
  motion remain accessible.
- JavaScript failures do not make core content unavailable.
- No credentials, tokens, private client data, secrets, or sensitive screenshots
  are added to the repository.
- User-facing claims, metrics, client descriptions, dates, and certifications
  are supported by existing portfolio evidence or explicitly marked as
  assumptions/placeholders for review.
- Error handling and fallback behavior are considered for every new interactive
  feature.
- Tests or focused verification cover the changed behavior.
- Deployment status is not claimed unless the deployment was actually checked.

## Content and privacy

- Write for customers first: explain the problem, contribution, decision,
  outcome, and evidence without unnecessary jargon.
- Use the shared case-study narrative format for new or substantially revised
  technical case studies: **Problem**, **Solution**, **Architecture**,
  **Implementation notes**, **Security**, **Delivery**, **Trade-offs**,
  **Outcome**, and **Next steps**. Keep the section names recognizable so the
  case-study library remains consistent and easy to scan.
- Separate customer-facing case-study narrative from implementation details.
- Never invent outcomes, savings, account counts, client names, architectures,
  certifications, or responsibilities. Preserve qualifiers such as “identified”
  versus “realized” savings.
- Use the least sensitive detail necessary. Generalize client-sensitive names,
  identifiers, network ranges, credentials, and operational data.
- **Client anonymity and confidential data**: Never publish client company, authority, or agency names
  (e.g., Neology, SRTA, THEA, CTRMA, PRD, Lukka, Bespin, or any other partner/agency clients), proprietary client project names, internal AWS
  account numbers, or client infrastructure identifiers. Use anonymized, industry-level
  framing (e.g., "Electronic tolling systems", "Telecom platform", "Regulated healthcare provider").
- **Recent case studies showcase**: When publishing a new case study that should be
  featured in the homepage "Latest case studies" strip, update `content/recent-case-studies.json`
  to place the new study at the top, maintaining strictly the 3 most recent entries.
  The generator automatically limits to the top 3 and renders the strip. Card text
  (`title`, `desc`, `badge`) must be supported by the case study itself.
- **Capability taxonomy**: every case study's `layer:` must be one of `LAYER_ORDER` in
  `scripts/lib/render.mjs`; the build fails otherwise. Add a new capability there only
  when at least two case studies need it.
- **Neutral voice**: the site is a portfolio, not a sales page. Do not add language that
  solicits work (availability, hiring, consulting/contract offers, "your environment",
  pricing or sales calls to action). Contact copy stays neutral: questions about the work.
- **Social images**: after adding or renaming a case study, run `npm run social` (needs a
  local Chromium/Chrome) and then `npm run build` so the page uses its own preview image.
- Keep terminology consistent: use “authentication” for proving identity and
  “authorization” for permissions.

## Code and security standards

- Use clear names, small functions, early validation, and explicit failure
  handling. Do not hide errors or silently fall back to unsafe behavior.
- Escape or safely construct user-visible content. Treat search/filter input and
  external data as untrusted even in a static site.
- Avoid unnecessary client-side work, third-party requests, tracking, and
  dependencies. Preserve privacy and fast loading.
- Do not weaken security, accessibility, test coverage, or validation to make a
  check pass. Fix the underlying issue or document the justified exception.
- Use repository-relative links in content where appropriate and verify links
  from the page's actual URL depth.

## Completion report

Every implementation response must include:

- What changed and why.
- Files changed, including generated files.
- Commands run and their results.
- Known limitations, skipped checks, or deployment uncertainty.
- A concise commit-message recommendation.
