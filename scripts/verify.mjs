import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { serve, root } from "./serve.mjs";
import { verifySearch } from "./verify-search.mjs";
const artifacts = path.join(root, "artifacts");
const server = serve(0);
await new Promise((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const candidates = [
  process.env.BROWSER_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
];
const executablePath = candidates.find((p) => p && fs.existsSync(p));
let browser;
const errors = [];
try {
  browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });
  fs.mkdirSync(artifacts, { recursive: true });
  await verifySearch(browser, base);
  const pages = [
    "index.html",
    ...fs
      .readdirSync(path.join(root, "case-studies"), { recursive: true })
      .filter((p) => p.endsWith(".html"))
      .map((p) => "case-studies/" + p.replaceAll("\\", "/")),
    ...(fs.existsSync(path.join(root, "learning-paths"))
      ? fs
          .readdirSync(path.join(root, "learning-paths"), { recursive: true })
          .filter((p) => p.endsWith(".html"))
          .map((p) => "learning-paths/" + p.replaceAll("\\", "/"))
      : []),
  ];
  const discoveryContext = await browser.newContext();
  try {
    const response = await discoveryContext.request.get(`${base}/sitemap.xml`);
    assert.equal(response.status(), 200);
    assert.match(response.headers()["content-type"], /application\/xml/);
    const inspector = await discoveryContext.newPage();
    const sitemap = await inspector.evaluate((xml) => {
      const document = new DOMParser().parseFromString(xml, "application/xml");
      return {
        valid: !document.querySelector("parsererror"),
        namespace: document.documentElement.namespaceURI,
        locations: [...document.querySelectorAll("url > loc")].map((node) => node.textContent),
      };
    }, await response.text());
    assert.equal(sitemap.valid, true, "sitemap must be valid XML");
    assert.equal(sitemap.namespace, "http://www.sitemaps.org/schemas/sitemap/0.9");
    const canonicals = pages.map((file) => fs.readFileSync(path.join(root, file), "utf8").match(/rel="canonical"\s+href="([^"]+)"/)[1]);
    assert.deepEqual(sitemap.locations, [...canonicals].sort());
    for (const location of sitemap.locations) {
      const local = new URL(location).pathname;
      assert.equal((await discoveryContext.request.get(`${base}${local}`)).status(), 200, location);
    }
    const robots = await discoveryContext.request.get(`${base}/robots.txt`);
    assert.equal(robots.status(), 200);
    assert.match(robots.headers()["content-type"], /text\/plain/);
    assert((await robots.text()).includes(`Sitemap: ${new URL("/sitemap.xml", canonicals[0]).href}`));
    console.log("PASS: sitemap XML, complete canonical URL coverage, reachable pages, and robots.txt discovery.");
  } finally {
    await discoveryContext.close();
  }
  // Each (file, theme) pair below is fully independent -- its own browser
  // context, its own page, its own screenshot filenames -- so a pool of
  // workers can run them concurrently instead of one at a time. That's the
  // single biggest lever on this script's wall-clock time: it scales with
  // page count x 2 themes, and grows every time a new case study or
  // learning-path page is added. `errors` is a plain array pushed to from
  // multiple in-flight checks; JS's single-threaded event loop makes that
  // safe without any locking, and order doesn't matter since it's only
  // ever asserted to be empty at the end.
  async function checkPage(file, theme) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    await context.addInitScript(
      (theme) => localStorage.setItem("theme", theme),
      theme,
    );
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(`${file}: ${e.message}`));
    page.on("response", (r) => {
      if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
    });
    await page.goto(`${base}/${file}`);
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(
      await page.locator("html").getAttribute("data-theme"),
      theme,
    );
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    for (const v of audit.violations)
      errors.push(
        `${file} ${theme} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join("; ")}`,
      );
    const slug = file
      .replace(/\.html$/, "")
      .replaceAll("/", "-")
      .replaceAll("\\", "-");
    await page.screenshot({
      path: path.join(artifacts, `${slug}-${theme}-desktop.png`),
      fullPage: true,
    });
    for (const width of [320, 360, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      assert.equal(overflow, false, `${file} ${theme} overflow at ${width}`);
      if (width === 390)
        await page.screenshot({
          path: path.join(artifacts, `${slug}-${theme}-mobile.png`),
          fullPage: true,
        });
    }
    const links = await page
      .locator("a[href]")
      .evaluateAll((els) => els.map((el) => el.getAttribute("href")));
    for (const link of links.filter(
      (h) => !h.startsWith("http") && !h.startsWith("mailto:"),
    )) {
      const url = new URL(link, `${base}/${file}`);
      const local = path.join(root, decodeURIComponent(url.pathname));
      assert(fs.existsSync(local), `Missing link: ${file} -> ${link}`);
      if (url.hash)
        assert(
          fs
            .readFileSync(local, "utf8")
            .includes(`id="${url.hash.slice(1)}"`),
          `Missing anchor ${link}`,
        );
    }
    await page
      .getByRole("button", {
        name: `Switch to ${theme === "dark" ? "light" : "dark"} theme`,
      })
      .click();
    assert.equal(
      await page.locator("html").getAttribute("data-theme"),
      theme === "dark" ? "light" : "dark",
    );
    if (file === "index.html") {
      const tags = await page.locator(".case").evaluateAll((cards) => cards.map((card) => card.dataset.tags.split(/\s+/)));
      const filters = await page.locator("[data-filter]").evaluateAll((buttons) => buttons.map((button) => button.dataset.filter));
      for (const filter of filters) {
        const count = tags.filter((values) => filter === "all" || values.includes(filter)).length;
        await page.locator(`[data-filter="${filter}"]`).click();
        assert.equal(await page.locator(".case:visible").count(), count);
      }
      await page.locator('[data-filter="all"]').click();
      await page.locator("summary").first().focus();
      await page.keyboard.press("Enter");
      assert(
        (await page.locator("details").first().getAttribute("open")) !== null,
      );
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.getByRole("button", { name: "Copy email address" }).click();
      assert.equal(
        await page.evaluate(() => navigator.clipboard.readText()),
        "anupojuprudhvi@gmail.com",
      );
    } else if (await page.locator('button[id$="PlayBtn"]').count()) {
      await page.locator('button[id$="PlayBtn"]').click();
      assert(
        (await page.locator(".hub-node.active").count()) > 0,
        "Diagram must activate",
      );
      await page.waitForTimeout(2600);
    }
    if (file === "case-studies/index.html") {
      const index = JSON.parse(fs.readFileSync(path.join(root, "assets/case-studies.json"), "utf8"));
      assert.equal(await page.locator(".uc-card").count(), index.length);
      for (const project of new Set(index.map((item) => item.project))) {
        await page.locator(`[data-uc-filter="project:${project}"]`).click();
        assert.equal(await page.locator(".uc-card:visible").count(), index.filter((item) => item.project === project).length);
      }
      await page.locator('[data-uc-filter="all"]').click();
      await page.locator("#ucSearch").fill("no-matching-case-study-xyz");
      assert.equal(await page.locator(".uc-card:visible").count(), 0);
      assert.equal(await page.locator("#ucEmpty").isVisible(), true);
      await page.locator("#ucSearch").fill("");
      assert.equal(await page.locator(".uc-card:visible").count(), index.length);
    }
    await context.close();
    console.log(
      `PASS ${slug}: ${theme}, 5 viewports, links, accessibility, interactions`,
    );
  }

  // A small worker pool: each worker pulls the next (file, theme) pair off
  // a shared cursor until none remain. This caps how many browser contexts
  // (and CPU-heavy axe scans) run at once, rather than firing all of them
  // at once and risking resource contention on a small CI runner.
  const pairs = pages.flatMap((file) => ["dark", "light"].map((theme) => [file, theme]));
  const CONCURRENCY = Number(process.env.VERIFY_CONCURRENCY) || 4;
  let cursor = 0;
  async function worker() {
    while (cursor < pairs.length) {
      const [file, theme] = pairs[cursor++];
      await checkPage(file, theme);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, pairs.length) }, worker),
  );
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(base);
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  await page.locator("#themeToggle").click();
  await Promise.all([
    page.waitForURL(/case-studies/),
    page.locator(".case-bottom a").first().click(),
  ]);
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
  await page.reload();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
  await context.close();
  const nojs = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 360, height: 900 },
  });
  const plain = await nojs.newPage();
  await plain.goto(base);
  const projects = JSON.parse(fs.readFileSync(path.join(root, "content/projects.json"), "utf8"));
  assert.equal(await plain.locator(".case:visible").count(), projects.length);
  const index = JSON.parse(fs.readFileSync(path.join(root, "assets/case-studies.json"), "utf8"));
  for (const project of new Set(index.map((item) => item.project))) {
    await plain.goto(`${base}/case-studies/${project}/index.html`);
    assert.equal(await plain.locator(".case-study-links a").count(), index.filter((item) => item.project === project).length);
  }
  await plain.goto(`${base}/case-studies/index.html`);
  assert.equal(await plain.locator(".uc-card:visible").count(), index.length);
  await nojs.close();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: theme persistence, JavaScript-disabled content, no browser errors.",
  );
} finally {
  if (browser) await browser.close();
  server.close();
}
