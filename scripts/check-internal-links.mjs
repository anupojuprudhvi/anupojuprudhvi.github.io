/**
 * Checks every relative (internal) link in the generated pages resolves to an
 * existing file. Catches renamed/moved case studies, learning-path modules, and
 * dangling href/src that external link checking misses.
 *
 *   node scripts/check-internal-links.mjs   (exit 1 if any link is broken)
 *
 * Runs on the committed generated output, so it validates what visitors
 * actually see rather than the source templates.
 */
import {
  readdirSync,
  readFileSync,
  statSync,
  existsSync,
} from "node:fs";
import { join, dirname, resolve } from "node:path";

const ROOT = process.cwd();
const INDEX_NAME = "index.html";

// Every generated HTML page to scan.
const pages = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory()
      ? pages(p)
      : p.endsWith(".html")
        ? [p]
        : [];
  });

const files = ["index.html", "404.html", "privacy.html"].map((f) =>
  join(ROOT, f),
)
  .concat(pages(join(ROOT, "case-studies")), pages(join(ROOT, "learning-paths")));

// href/src attribute values. Absolute URLs (https://, //) are handled by
// check-links.mjs; mailto:, tel:, #, data: are not file links.
const LINK_RE = /\s(?:href|src)=["']([^"']+)["']/gi;
const NOT_FILE_LINK = /^(?:https?:|mailto:|tel:|#|data:|\/\/)/;

const broken = [];
let checked = 0;

for (const file of files) {
  const html = readFileSync(file, "utf8");
  const pageDir = dirname(file);
  const seenOnPage = new Set();
  for (const [, raw] of html.matchAll(LINK_RE)) {
    let clean = raw.replaceAll("&amp;", "&");
    // Strip fragment and query string before resolving the file target.
    clean = clean.split("#", 2)[0].split("?", 2)[0];
    if (NOT_FILE_LINK.test(clean)) continue;
    const key = `${clean}`;
    if (seenOnPage.has(key)) continue;
    seenOnPage.add(key);
    checked++;

    // Resolve page-relative against the page's directory.
    const candidates = [resolve(pageDir, clean)];
    if (!clean.endsWith(".html")) {
      candidates.push(join(resolve(pageDir, clean), INDEX_NAME));
    }
    // Root-relative (/...) also resolve from the site root.
    if (clean.startsWith("/")) {
      const rootPath = join(ROOT, clean.slice(1));
      candidates.push(rootPath);
      if (!clean.endsWith(".html")) {
        candidates.push(join(rootPath, INDEX_NAME));
      }
    }

    if (!candidates.some((c) => existsSync(c))) {
      broken.push({
        link: clean,
        page: file.slice(ROOT.length + 1).replaceAll("\\", "/"),
        tried: candidates.map((c) => c.slice(ROOT.length + 1)),
      });
    }
  }
}

if (broken.length) {
  console.error(`\n${broken.length} broken internal link(s):`);
  for (const b of broken) {
    console.error(`  ${b.link}  (in ${b.page})`);
    for (const tried of b.tried) console.error(`        tried ${tried}`);
  }
  process.exitCode = 1;
} else {
  console.log(`\nChecked ${checked} internal link(s); none broken.`);
}
