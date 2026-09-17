---
name: site-verification
description: Verify the rendered static site across links, generated output, accessibility, responsive layouts, themes, JavaScript behavior, and browser errors.
---

# Site Verification Skill

Use this skill when changing HTML, CSS, JavaScript, content rendering, metadata,
navigation, diagrams, or generated pages. Follow the root `AGENTS.md` and the
production-readiness skill first; this skill defines the site-focused checks.

## Verification procedure

### 1. Identify affected pages

- Determine whether the change affects the homepage, library, generated use-case
  pages, hand-written engagement pages, shared assets, or all pages.
- Confirm the source/generated relationship before editing.
- Run `npm run build` after changing Markdown, JSON content, templates, or the
  generator.
- Review generated diffs and confirm that unrelated pages did not change.

### 2. Run static checks

Run:

```sh
npm run build
git diff --check
```

Run `npm run check` from a clean checkout or after confirming that its reported
diff contains only expected generated output. This repository's check script
uses `git diff --exit-code`, so an intentionally modified working tree causes
it to fail by design.

### 3. Run browser verification

Run:

```sh
npm test
```

The Playwright verification covers the generated page set in dark and light
themes, multiple viewport widths, local links and anchors, accessibility rules,
theme switching, filters, keyboard details expansion, clipboard behavior,
diagrams, JavaScript-disabled content, and browser/page errors.

If the test cannot start or times out:

- Confirm dependencies were installed with `npm ci`.
- Confirm Chrome or Edge is available, or install Chromium with
  `npx playwright install chromium`.
- Set `BROWSER_PATH` when the browser is installed in a nonstandard location.
- Run the affected script directly and capture its output.
- Report the timeout or environment failure as unresolved; never call it a pass.

### 4. Perform focused manual checks

For changed pages, verify:

- Exactly one meaningful `h1` and a logical heading hierarchy.
- Page title, description, canonical URL, Open Graph metadata, and favicon paths.
- Local links, anchors, images, scripts, and stylesheets at the page's URL depth.
- Keyboard access, visible focus, button names, form labels, and status messages.
- Dark/light themes, reduced motion, narrow mobile layouts, and no horizontal
  overflow.
- Core narrative and navigation remain usable with JavaScript disabled.
- Images and diagrams have useful alternatives and do not expose sensitive data.
- External links and email actions are intentional and correctly formatted.

### 5. Review the final output

- Inspect the final diff as rendered output, not only as source code.
- Confirm generated HTML and `assets/usecases.json` agree with source content.
- Confirm no screenshots, browser artifacts, logs, or temporary files are added
  accidentally.
- Confirm deployment wording reflects verification that actually occurred.

## Completion checklist

- [ ] Affected pages and source/generated files identified.
- [ ] Build passes.
- [ ] Generated output is synchronized.
- [ ] `git diff --check` passes.
- [ ] Links and anchors resolve.
- [ ] Accessibility checks pass or documented issues remain.
- [ ] Responsive, theme, keyboard, and no-JavaScript behavior checked.
- [ ] Browser errors and missing assets checked.
- [ ] Final diff contains no accidental artifacts or sensitive files.
- [ ] Any skipped or blocked verification is reported explicitly.