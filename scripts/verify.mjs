import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { serve, root } from "./serve.mjs";
const server = serve(0);
await new Promise((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const candidates = [
  process.env.BROWSER_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
];
const executablePath = candidates.find((p) => p && fs.existsSync(p));
const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : {}),
});
fs.mkdirSync("artifacts", { recursive: true });
const pages = [
  "index.html",
  ...fs
    .readdirSync("usecases", { recursive: true })
    .filter((p) => p.endsWith(".html"))
    .map((p) => "usecases/" + p.replaceAll("\\", "/")),
];
const errors = [];
try {
  for (const file of pages) {
    for (const theme of ["dark", "light"]) {
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
      const slug = file === "index.html" ? "home" : file.split("/")[1];
      await page.screenshot({
        path: `artifacts/${slug}-${theme}-desktop.png`,
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
            path: `artifacts/${slug}-${theme}-mobile.png`,
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
        for (const [filter, count] of [
          ["governance", 1],
          ["resilience", 2],
          ["platform", 1],
          ["finops", 2],
          ["all", 3],
        ]) {
          await page.locator(`[data-filter="${filter}"]`).click();
          assert.equal(await page.locator(".case:visible").count(), count);
        }
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
      } else {
        await page.locator('button[id$="PlayBtn"]').click();
        assert(
          (await page.locator(".hub-node.active").count()) > 0,
          "Diagram must activate",
        );
        await page.waitForTimeout(2600);
      }
      await context.close();
      console.log(
        `PASS ${slug}: ${theme}, 5 viewports, links, accessibility, interactions`,
      );
    }
  }
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(base);
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  await page.locator("#themeToggle").click();
  await page.locator(".case-bottom a").first().click();
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
  assert.equal(await plain.locator(".case:visible").count(), 3);
  await nojs.close();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: theme persistence, JavaScript-disabled content, no browser errors.",
  );
} finally {
  await browser.close();
  server.close();
}
