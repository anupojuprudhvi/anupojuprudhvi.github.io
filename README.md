# Prudhvi Raj Anupoju — Cloud & DevOps Portfolio

Static portfolio and three technical case studies covering AWS cloud architecture, multi-account governance, and infrastructure modernization. Hosted directly on GitHub Pages; no production build or runtime dependencies.

Live at: https://anupojuprudhvi.github.io/

## Local preview

With Node.js installed:

```sh
npm ci
npm run preview
```

Open http://127.0.0.1:4173. The site defaults to dark mode and remembers the visitor’s theme across pages. Core content and case-study navigation remain available without JavaScript.

## Verification

```sh
npm test
```

The Playwright suite checks all four pages in dark and light themes at 320, 360, 390, 768, and 1440px; local links and anchors; filters; keyboard details expansion; email copying; diagrams; theme persistence; JavaScript-disabled content; browser errors; and automated WCAG A/AA accessibility rules. Screenshots are saved in the ignored `artifacts/` directory. Automated accessibility checks supplement manual visual and keyboard review.

The scripts use installed Chrome or Edge on Windows. Elsewhere, run `npx playwright install chromium` first, or set `BROWSER_PATH` to a browser executable.

## Editing

- `index.html`: introduction, selected work, expertise, career, credentials, and contact.
- `usecases/`: the three detailed project narratives and interactive diagrams.
- `assets/site.css` and `assets/deepdive.css`: shared themes, responsive layout, and case-study components.
- `assets/theme.js` and `assets/site.js`: theme persistence and homepage interactions.
- `assets/og-template.html`: social preview source. Run `node scripts/render-social.mjs` to regenerate the 1200 × 630 `og-image.png`.

Project outcomes and credentials are based on the existing portfolio content. The $300K+ figure describes annual savings identified across several engagements, not savings attributable only to the clinical platform.

## Publish

Commit the changes, then push `main` to the configured GitHub remote:

```sh
git push origin main
```
