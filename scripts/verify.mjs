import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { serve, root } from "./serve.mjs";
import { verifySearch } from "./verify-search.mjs";
import { verifyCompanion } from "./verify-companion.mjs";
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
  await verifyCompanion(browser, base);
  const allPages = [
    "index.html",
    "privacy.html",
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
  // Moved pages leave a noindex stub behind (scripts/lib/render.mjs redirectPage);
  // they're checked for a working redirect below, not as full pages.
  const isRedirect = (file) => /<meta http-equiv="refresh"/.test(fs.readFileSync(path.join(root, file), "utf8"));
  const pages = allPages.filter((file) => !isRedirect(file));
  const redirectStubs = allPages.filter(isRedirect);
  const discoveryContext = await browser.newContext();
  try {
    for (const file of redirectStubs) {
      const stub = await discoveryContext.newPage();
      await stub.goto(`${base}/${file}`);
      await stub.waitForURL((url) => !url.pathname.endsWith(`/${file}`));
      assert(pages.some((p) => new URL(stub.url()).pathname === `/${p}`), `${file} must redirect to a real page, got ${stub.url()}`);
      assert.equal(await stub.locator("h1").count(), 1, `${file} must land on a rendered page`);
      await stub.close();
    }
    if (redirectStubs.length) console.log(`PASS: ${redirectStubs.length} moved-page redirects land on live pages.`);
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
    page.on("console", (m) => {
      if (/Content Security Policy/i.test(m.text())) errors.push(`${file} CSP: ${m.text()}`);
    });
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
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
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
  // Mobile menu: collapsed by default, opens from the Menu button, closes on Escape.
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const phone = await mobile.newPage();
  await phone.goto(base);
  assert.equal(await phone.locator("#siteNavLinks").isVisible(), false, "menu starts collapsed on phones");
  await phone.getByRole("button", { name: "Open menu" }).click();
  assert.equal(await phone.locator("#siteNavLinks").isVisible(), true);
  assert.equal(await phone.locator(".nav-toggle").getAttribute("aria-expanded"), "true");
  await phone.keyboard.press("Escape");
  assert.equal(await phone.locator("#siteNavLinks").isVisible(), false);
  assert.equal(await phone.locator(".latest .recent-card-link").count(), 3);
  await mobile.close();
  // Pop quiz: a card slides in near the end of a module and opens the quiz in a
  // dialog; questions come in a new order each attempt; 4 of 5 passes and
  // celebrates; a fail doesn't; closing puts the quiz back in the page.
  const quizPage = "learning-paths/kubernetes-operations/05-pods-deployments-and-rollouts.html";
  const quizContext = await browser.newContext({ viewport: { width: 1280, height: 480 } });
  const learner = await quizContext.newPage();
  learner.on("pageerror", (e) => errors.push(`${quizPage} quiz: ${e.message}`));
  await learner.goto(`${base}/${quizPage}`);
  const answerKey = await learner.locator(".lp-quiz-q").evaluateAll((items) =>
    Object.fromEntries(items.map((item) => [
      item.querySelector(".lp-quiz-prompt").textContent.trim(),
      item.querySelectorAll(".lp-quiz-options > li")[Number(item.dataset.answer)].textContent.trim(),
    ])),
  );
  assert.equal(Object.keys(answerKey).length, 5);
  assert.equal(await learner.locator(".lp-quiz-nudge.is-open").count(), 0, "no quiz card before the end");
  await learner.evaluate(() => document.getElementById("key-terms").scrollIntoView({ block: "start" }));
  await learner.locator(".lp-quiz-nudge.is-open").waitFor({ state: "visible" });
  await learner.getByRole("button", { name: "Take the quiz" }).click();
  const quizDialog = learner.locator("dialog.lp-quiz-dialog");
  assert.equal(await quizDialog.evaluate((d) => d.open), true);
  async function takeQuiz(pickRight) {
    const order = [];
    for (let n = 0; n < 5; n++) {
      const prompt = (await quizDialog.locator(".lp-quiz-qtext").textContent()).trim();
      order.push(prompt);
      const choices = (await quizDialog.locator(".lp-quiz-choice-text").allTextContents()).map((t) => t.trim());
      const right = choices.indexOf(answerKey[prompt]);
      assert(right >= 0, `the right answer is offered for "${prompt}"`);
      await quizDialog.locator(".lp-quiz-choice").nth(pickRight ? right : (right + 1) % choices.length).click();
      await quizDialog.locator(".lp-quiz-next").click();
    }
    return order;
  }
  const firstOrder = await takeQuiz(true);
  assert.deepEqual([...firstOrder].sort(), Object.keys(answerKey).sort(), "every question is asked once");
  assert.equal((await quizDialog.locator(".lp-quiz-result").textContent()).trim(), "You got 5 of 5.");
  assert.equal(await quizDialog.locator(".lp-quiz-badge").isVisible(), true, "a pass shows the badge");
  assert.equal(await quizDialog.locator(".lp-confetti").count(), 1, "a pass celebrates with confetti");
  await quizDialog.getByRole("button", { name: /Try again/ }).click();
  const secondOrder = await takeQuiz(false);
  assert.equal((await quizDialog.locator(".lp-quiz-result").textContent()).trim(), "You got 0 of 5.");
  assert.equal(await quizDialog.locator(".lp-quiz-badge").count(), 0, "a fail shows no badge");
  assert.match(await quizDialog.locator(".lp-quiz-message").textContent(), /Not quite there yet/);
  await quizDialog.getByRole("button", { name: /Try again/ }).click();
  const thirdOrder = await takeQuiz(true);
  assert(
    new Set([firstOrder, secondOrder, thirdOrder].map((o) => o.join("|"))).size > 1,
    "question order is reshuffled between attempts",
  );
  await learner.keyboard.press("Escape");
  assert.equal(await quizDialog.evaluate((d) => d.open), false);
  // The dialog's "close" event, which moves the quiz back, fires asynchronously
  // after the dialog closes, so wait for it rather than checking at once.
  await learner
    .waitForFunction(() => document.querySelectorAll(".lp-quiz .lp-quiz-app").length === 1, null, { timeout: 5000 })
    .catch(() => {});
  assert.equal(await learner.locator(".lp-quiz .lp-quiz-app").count(), 1, "closing puts the quiz back in the page");
  await quizContext.close();
  // Reading progress: a module page shows how much has been read, announces
  // milestones, remembers a finished module, and marks it done in the lists.
  const progressPage = "learning-paths/linux-for-devops/07-systemd-and-services.html";
  const progressContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const progressReader = await progressContext.newPage();
  progressReader.on("pageerror", (e) => errors.push(`${progressPage} progress: ${e.message}`));
  await progressReader.goto(`${base}/${progressPage}`);
  const readTo = (fraction) =>
    progressReader.evaluate((f) => {
      const article = document.querySelector("article.lp-content");
      const start = article.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: start + (article.offsetHeight - window.innerHeight) * f, behavior: "instant" });
    }, fraction);
  await readTo(0.52);
  await progressReader.waitForFunction(() => {
    const percent = parseInt(document.querySelector(".lp-progress-pct")?.textContent || "0", 10);
    return percent >= 50 && percent < 75;
  });
  assert.match(await progressReader.locator(".lp-progress-msg").textContent(), /Halfway/, "the halfway milestone is announced");
  await readTo(1);
  await progressReader.waitForFunction(() => document.querySelector(".lp-progress-pct")?.textContent === "100%");
  assert.match(await progressReader.locator(".lp-progress-msg").textContent(), /Module complete\. Next up:/);
  assert.equal(await progressReader.locator(".lp-progress.is-complete").count(), 1, "the finished module is remembered");
  await progressReader.goto(`${base}/learning-paths/linux-for-devops/index.html`);
  assert.equal(await progressReader.locator(".lp-module-card.is-done").count(), 1, "the overview marks the finished module");
  assert.equal(await progressReader.locator(".lp-progress").count(), 0, "overview pages have no reading widget");
  await progressContext.close();
  // Toolbox: a tool chip opens the library filtered to exactly the case
  // studies its count promises, says which tool, and links back to all.
  const toolboxContext = await browser.newContext();
  const visitor = await toolboxContext.newPage();
  visitor.on("pageerror", (e) => errors.push(`toolbox: ${e.message}`));
  await visitor.goto(base);
  // The change-process steps animate in on scroll and must end fully visible.
  await visitor.locator(".change-flow").scrollIntoViewIfNeeded();
  await visitor.locator(".change-flow.is-visible").waitFor();
  await visitor.waitForFunction(() =>
    [...document.querySelectorAll(".change-step")].every((step) => getComputedStyle(step).opacity === "1"),
  );
  const eksChip = visitor.locator('#toolbox a.tool-chip[href$="?tool=amazon-eks"]');
  const promised = Number(await eksChip.locator(".tool-count").textContent());
  assert(promised > 0, "the toolbox shows how many case studies used a tool");
  await Promise.all([visitor.waitForURL(/tool=amazon-eks/), eksChip.click()]);
  assert.equal(await visitor.locator(".uc-card:visible").count(), promised);
  assert.equal((await visitor.locator("#ucStatus").textContent()).trim(), `${promised} case studies using Amazon EKS`);
  assert.equal(await visitor.locator("#ucToolFilter").isVisible(), true);
  await visitor.getByRole("link", { name: "Show all case studies" }).click();
  const allStudies = JSON.parse(fs.readFileSync(path.join(root, "assets/case-studies.json"), "utf8")).length;
  assert.equal(await visitor.locator(".uc-card:visible").count(), allStudies);
  await toolboxContext.close();
  // Branded 404 page renders with working root-relative assets.
  const notFound = await browser.newContext();
  const missing = await notFound.newPage();
  missing.on("response", (r) => {
    if (r.status() >= 400 && !r.url().endsWith("/404.html")) errors.push(`404 page asset ${r.status()} ${r.url()}`);
  });
  await missing.goto(`${base}/404.html`);
  assert.equal(await missing.locator("h1").textContent(), "This page doesn’t exist.");
  assert.deepEqual((await new AxeBuilder({ page: missing }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations, []);
  await notFound.close();
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
  await plain.goto(`${base}/${quizPage}`);
  assert.equal(await plain.locator(".lp-quiz-list .lp-quiz-q:visible").count(), 5, "the quiz is readable without JavaScript");
  await plain.locator(".lp-quiz-answer summary").first().click();
  assert.equal(await plain.locator(".lp-quiz-answer").first().getAttribute("open"), "");
  await nojs.close();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: theme persistence, mobile menu, latest strip, 404 page, JavaScript-disabled content, CSP, no browser errors.",
  );
} finally {
  if (browser) await browser.close();
  server.close();
}
