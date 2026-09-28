/**
 * Copies only what a visitor can request into one directory (default: _site/).
 * This is the single definition of the public site: the Pages deploy, the
 * Lighthouse run, and the Docker image all publish exactly this set.
 *
 *   node scripts/stage.mjs [outDir]
 */
import { cpSync, existsSync, rmSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve, dirname, relative } from "node:path";

const ROOT = process.cwd();
const out = resolve(ROOT, process.argv[2] || "_site");

const FILES = ["index.html", "404.html", "privacy.html", "og-image.png", "robots.txt", "sitemap.xml", "feed.xml"];
const DIRS = ["assets", "case-studies", "learning-paths"];
// Social-image templates render previews at build time; they are not pages.
const EXCLUDE = new Set(["assets/og-template.html", "assets/og-page.html"]);

// The output is wiped first, so never let it be the repo or one of its parents.
if (ROOT.startsWith(out)) throw new Error(`Refusing to stage into ${out}`);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const file of FILES) {
  if (!existsSync(join(ROOT, file))) throw new Error(`Missing public file: ${file} (run npm run build)`);
  cpSync(join(ROOT, file), join(out, file));
}
for (const dir of DIRS) {
  cpSync(join(ROOT, dir), join(out, dir), {
    recursive: true,
    filter: (src) => !EXCLUDE.has(src.slice(ROOT.length + 1).replaceAll("\\", "/")),
  });
}

const files = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]));
const staged = files(out);

// Every local href/src in a staged page must resolve inside the staged set,
// so a file missing from the lists above fails here, not on the live site.
const missing = [];
for (const page of staged.filter((f) => f.endsWith(".html"))) {
  const html = readFileSync(page, "utf8");
  for (const [, ref] of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    if (/^(?:[a-z]+:|#|\/\/)/i.test(ref)) continue;
    const path = decodeURIComponent(ref.split(/[?#]/)[0]);
    if (!path) continue;
    let target = path.startsWith("/") ? join(out, path) : join(dirname(page), path);
    if (path.endsWith("/")) target = join(target, "index.html");
    if (!existsSync(target)) missing.push(`${relative(out, page)} → ${ref}`);
  }
}
if (missing.length) {
  console.error(`Staged pages reference files that are not published:\n  ${missing.join("\n  ")}`);
  process.exit(1);
}
console.log(`Staged ${staged.length} public files in ${out}; all local links resolve.`);
