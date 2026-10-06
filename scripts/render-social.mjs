/**
 * Renders social preview images (the picture LinkedIn/Slack/X show for a link).
 *
 *   og-image.png                          ← assets/og-template.html (site-wide default, with --default)
 *   assets/og/<project>/<slug>.jpg        ← assets/og-page.html, one per case study
 *   assets/og/<project>/index.jpg         ← assets/og-page.html, one per project overview
 *   assets/og/learning-paths/<track>.jpg  ← assets/og-page.html, one per learning path
 *
 * `--only <prefix>` renders just the images whose path starts with the
 * prefix, e.g. `npm run social -- --only assets/og/learning-paths/`.
 *
 * Run after adding or renaming a case study, then `npm run build` so pages
 * pick the new image up (build.mjs falls back to og-image.png when a
 * per-page image doesn't exist yet).
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { serve, root } from "./serve.mjs";
import { parseFrontMatter } from "./lib/markdown.mjs";

const server = serve(0);
await new Promise((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const executablePath = [
  process.env.BROWSER_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find((p) => p && fs.existsSync(p));
const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : {}),
});

const projects = JSON.parse(fs.readFileSync(path.join(root, "content/projects.json"), "utf8"));
const cards = [];
for (const project of projects) {
  const dir = path.join(root, "content/case-studies", project.id);
  const studies = fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort();
  cards.push({
    out: `assets/og/${project.id}/index.jpg`,
    eyebrow: "Case studies",
    title: project.name,
    stat: String(studies.length),
    statLabel: studies.length === 1 ? "case study" : "case studies",
    kind: "Project overview",
  });
  for (const file of studies) {
    const { data } = parseFrontMatter(
      fs.readFileSync(path.join(dir, file), "utf8").replaceAll("\r\n", "\n"),
      file,
    );
    const first = Array.isArray(data.outcomes) ? data.outcomes[0] : null;
    cards.push({
      out: `assets/og/${project.id}/${file.replace(/\.md$/, ".jpg")}`,
      eyebrow: project.name,
      title: data.title,
      stat: first?.value || "",
      statLabel: first?.label || "",
    });
  }
}

const tracks = JSON.parse(fs.readFileSync(path.join(root, "content/learning-paths/tracks.json"), "utf8"));
for (const track of tracks) {
  const modules = fs
    .readdirSync(path.join(root, "content/learning-paths", track.id))
    .filter((f) => /^\d+-.*\.md$/.test(f)).length;
  cards.push({
    out: `assets/og/learning-paths/${track.id}.jpg`,
    eyebrow: track.eyebrow || "Learning path",
    title: track.title,
    stat: String(modules),
    statLabel: modules === 1 ? "module" : "modules",
    kind: "Learning path",
  });
}

const onlyAt = process.argv.indexOf("--only");
const only = onlyAt > -1 ? process.argv[onlyAt + 1] : "";

try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  if (process.argv.includes("--default")) {
    await page.goto(`${base}/assets/og-template.html`);
    await page.screenshot({ path: path.join(root, "og-image.png") });
  }
  for (const card of cards.filter((c) => c.out.startsWith(only))) {
    const { out, ...params } = card;
    await page.goto(`${base}/assets/og-page.html?${new URLSearchParams(params)}`);
    fs.mkdirSync(path.dirname(path.join(root, out)), { recursive: true });
    await page.screenshot({ path: path.join(root, out), type: "jpeg", quality: 82 });
    console.log("  social", out);
  }
} finally {
  await browser.close();
  server.close();
}
