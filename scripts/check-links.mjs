/**
 * Checks every external link (href/src to another site) in the generated pages.
 * Local links are covered by verify.mjs and stage.mjs; this catches the ones
 * that rot on their own — docs pages moved, profiles renamed, domains lapsed.
 *
 *   node scripts/check-links.mjs      (exit 1 if any link is broken)
 *
 * Runs weekly in CI (.github/workflows/links.yml), not on every push, so a
 * third-party outage never blocks a deploy.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { SITE } from "./lib/render.mjs";

const ROOT = process.cwd();
// Hosts that refuse automated requests no matter what (LinkedIn answers 999).
// A response from them proves nothing either way, so they are listed, not checked.
const UNCHECKABLE = new Set(["www.linkedin.com", "linkedin.com"]);
const TIMEOUT_MS = 15000;
const CONCURRENCY = 6;

const pages = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? pages(p) : p.endsWith(".html") ? [p] : [];
  });
const files = ["index.html", "404.html", "privacy.html"].map((f) => join(ROOT, f))
  .concat(pages(join(ROOT, "case-studies")), pages(join(ROOT, "learning-paths")));

const links = new Map(); // url → first page that uses it
for (const file of files) {
  for (const [, url] of readFileSync(file, "utf8").matchAll(/\s(?:href|src)="(https?:\/\/[^"]+)"/g)) {
    const clean = url.replaceAll("&amp;", "&");
    if (clean.startsWith(SITE)) continue;
    if (!links.has(clean)) links.set(clean, file.slice(ROOT.length + 1).replaceAll("\\", "/"));
  }
}

// Bot filters disagree: kluniversity.in rejects a link-checker agent but accepts
// a browser one, while web3forms.com (Cloudflare) does the opposite. A link is
// only reported once every attempt fails.
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";
const ATTEMPTS = [
  { method: "HEAD", ua: "portfolio-link-check (+https://anupojuprudhvi.github.io/)" },
  { method: "GET", ua: "portfolio-link-check (+https://anupojuprudhvi.github.io/)" }, // many servers reject HEAD
  { method: "GET", ua: BROWSER_UA },
];

async function probe(url) {
  let last;
  for (const { method, ua } of ATTEMPTS) {
    try {
      const res = await fetch(url, {
        method,
        redirect: "follow",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { "User-Agent": ua, Accept: "text/html,*/*" },
      });
      await res.body?.cancel();
      last = { status: res.status };
      if (res.status < 400 || res.status === 429) return last;
    } catch (error) {
      last = { status: 0, error: error.cause?.code || error.name };
    }
  }
  return last;
}

const queue = [...links.keys()];
const broken = [];
const skipped = [];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const url = queue.shift();
      if (UNCHECKABLE.has(new URL(url).hostname)) { skipped.push(url); continue; }
      const { status, error } = await probe(url);
      // 429 means rate limited, not broken; anything below 400 is fine.
      if (status >= 400 && status !== 429 || status === 0) broken.push({ url, page: links.get(url), result: error || status });
      else console.log(`  ok  ${status}  ${url}`);
    }
  }),
);

for (const url of skipped) console.log(`  skip      ${url} (host blocks automated checks)`);
if (broken.length) {
  console.error(`\n${broken.length} broken external link(s):`);
  for (const b of broken) console.error(`  ${b.result}  ${b.url}\n        used in ${b.page}`);
  process.exitCode = 1;
} else {
  console.log(`\nChecked ${links.size - skipped.length} external links; none broken.`);
}
