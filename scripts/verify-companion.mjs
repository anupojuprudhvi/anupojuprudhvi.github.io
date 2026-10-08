import assert from "node:assert/strict";
import AxeBuilder from "@axe-core/playwright";

// Raj, the homepage guide (assets/companion.js): greets first-time visitors,
// offers topics, walks to sections and case studies and points at them,
// answers questions or turns them into a message, and stays out of the way of
// "Ask or message me". The local pose atlas needs no GPU runtime, and Raj keeps working
// without artwork.
const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

export async function verifyCompanion(browser, base) {
  const errors = [];

  async function openPage({ theme = "dark", width = 1440, height = 1000, reduced = true, block = [] } = {}) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? "reduce" : "no-preference" });
    await context.addInitScript((t) => localStorage.setItem("theme", t), theme);
    const page = await context.newPage();
    const threeRequests = [];
    const label = `${theme} ${width}${reduced ? " reduced" : ""}`;
    page.on("pageerror", (e) => errors.push(`${label}: ${e.message}`));
    page.on("console", (m) => {
      if (/Content Security Policy/i.test(m.text())) errors.push(`${label} CSP: ${m.text()}`);
    });
    page.on("request", (r) => {
      if (r.url().includes("vendor/three.min.js")) threeRequests.push(r.url());
    });
    for (const pattern of block) await page.route(pattern, (route) => route.abort());
    await page.goto(`${base}/index.html`);
    await page.locator(".companion-launcher").waitFor({ state: "attached" });
    return { context, page, threeRequests };
  }

  const askIsReachable = (page) =>
    page.evaluate(() => {
      const ask = document.querySelector(".ask-launcher").getBoundingClientRect();
      const hit = document.elementFromPoint(ask.x + ask.width / 2, ask.y + ask.height / 2);
      return Boolean(hit?.closest(".ask-launcher"));
    });
  const said = (page, pattern) =>
    page.waitForFunction((source) => new RegExp(source).test(document.querySelector('[data-c="live"]').textContent), pattern.source);
  const button = (page, name) => page.locator("#companionHud").getByRole("button", { name, exact: true });

  // Reduced motion: no greeting by itself; everything works on request.
  for (const theme of ["dark", "light"]) {
    const { context, page, threeRequests } = await openPage({ theme });
    try {
      await page.waitForTimeout(1800);
      assert.equal(await page.locator("#companionHud").isHidden(), true, "Raj must not pop up under reduced motion");
      assert.equal(threeRequests.length, 0, "Three.js must not load before Raj is opened");
      assert.equal(await askIsReachable(page), true, `${theme}: Raj's launcher must not cover the Ask launcher`);

      const launcher = page.locator(".companion-launcher");
      assert.equal(await launcher.getAttribute("title"), "Ask Raj, your guide");
      await page.locator("[data-open-raj]").click();
      const hud = page.locator("#companionHud");
      await hud.waitFor();
      assert.equal(await launcher.getAttribute("aria-expanded"), "true");
      await said(page, /What would you like to know\?/);
      assert.equal(await page.locator(".companion-topic").count(), 4);
      await page.waitForFunction(() => document.querySelector('.companion-portrait[data-ready="true"]') || document.querySelector('[data-c="note"]').textContent);
      assert.equal(await askIsReachable(page), true, `${theme}: open, Raj must not cover the Ask launcher`);
      assert.equal(overlaps(await hud.boundingBox(), await page.locator(".ask-launcher").boundingBox()), false);
      assert.doesNotMatch(await hud.innerText(), /avatar|3D model/i, "visitors only see the name Raj");

      // On palette: the panel uses the site's inverse and accent tokens.
      const colors = await page.evaluate(() => {
        const css = getComputedStyle(document.documentElement);
        const probe = document.createElement("span");
        document.body.append(probe);
        const resolve = (name) => {
          probe.style.color = css.getPropertyValue(name);
          return getComputedStyle(probe).color;
        };
        const out = {
          accent: resolve("--accent-bright"),
          text: resolve("--inverse-text"),
          num: getComputedStyle(document.querySelector(".companion-topic-num")).color,
          hud: getComputedStyle(document.querySelector(".companion-hud")).color,
        };
        probe.remove();
        return out;
      });
      assert.equal(colors.num, colors.accent, `${theme}: Raj's accent must be --accent-bright`);
      assert.equal(colors.hud, colors.text, `${theme}: Raj's text must be --inverse-text`);
      const audit = await new AxeBuilder({ page }).include("#companionHud").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      for (const v of audit.violations) errors.push(`${theme} Raj ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join("; ")}`);

      // A topic: Raj walks there, explains it, and points at it.
      await page.locator('.companion-topic[data-topic="approach"]').click();
      await said(page, /I work across the parts/);
      const heading = await page.locator("#approach h2").boundingBox();
      assert(heading.y > 0 && heading.y < 500, `${theme}: the page must scroll to the section`);
      await page.locator(".companion-reticle.is-on").waitFor();
      await page.locator(".companion-laser.is-on").waitFor();
      await page.waitForFunction(() => document.querySelector(".companion-portrait").dataset.pose === "point");

      // Case studies as milestones, each with its facts and a next step.
      await button(page, "Topics").click();
      await page.locator('.companion-topic[data-topic="work"]').click();
      await button(page, "Start with milestone 01").click();
      await said(page, /^Milestone 01: /);
      assert.match(await page.locator('[data-c="card"]').innerText(), /SECTOR/i);
      await button(page, "Next milestone").click();
      await said(page, /^Milestone 02: /);
      await page.locator(".companion-reticle.is-on").waitFor();
      assert.equal(overlaps(await page.locator(".companion-reticle").boundingBox(), await hud.boundingBox()), false,
        `${theme}: Raj's panel must move off what he points at`);

      // Questions: answered from the case-study index, by section, or as a message.
      await page.locator("#rajInput").fill("aurora");
      await page.locator("#rajInput").press("Enter");
      await page.locator(".companion-result").first().waitFor();
      // A section word inside a real question still searches.
      await page.locator("#rajInput").fill("do you have aurora experience");
      await page.locator("#rajInput").press("Enter");
      await said(page, /Here's what I have on “do you have aurora experience”/);
      await page.locator(".companion-result").first().waitFor();
      await page.locator("#rajInput").fill("how can I contact you");
      await page.locator("#rajInput").press("Enter");
      await said(page, /Questions about any of this work/);
      await page.locator("#rajInput").fill("zzqx quantum origami");
      await page.locator("#rajInput").press("Enter");
      await said(page, /get back to you/);
      await button(page, "Leave me a message").click();
      await page.locator("#askMessageMode").waitFor();
      await page.waitForFunction(() => /zzqx quantum origami/.test(document.querySelector("#askMessageMode").textContent));
      await page.keyboard.press("Escape");
      await page.locator(".ask-backdrop").waitFor({ state: "hidden" });

      // Lingering on a case study: "I see you're reading...".
      await page.locator(".recent-card-link").first().scrollIntoViewIfNeeded();
      await page.locator(".recent-card-link").first().hover();
      await said(page, /I see you're reading/);
      assert.equal(await button(page, "Open it for me").count(), 1);

      // The panel never shows its own scrollbars across, minimizes to one
      // line, and can be dragged anywhere on screen.
      assert.equal(await hud.evaluate((el) => getComputedStyle(el).overflow), "visible", `${theme}: Raj's frame never scrolls`);
      assert.equal(await page.locator(".companion-body").evaluate((el) => el.scrollWidth <= el.clientWidth), true);
      await button(page, "Minimize Raj's panel").click();
      assert.equal(await page.locator(".companion-body").isHidden(), true);
      await page.locator(".companion-peek").waitFor();
      assert((await hud.boundingBox()).height < 140, `${theme}: minimized panel is a single line`);
      await page.locator(".companion-peek").click();
      await page.locator(".companion-body").waitFor();
      const before = await hud.boundingBox();
      const grip = await page.locator(".companion-status").boundingBox();
      await page.mouse.move(grip.x + 10, grip.y + 5);
      await page.mouse.down();
      await page.mouse.move(grip.x - 300, grip.y - 60, { steps: 6 });
      await page.mouse.up();
      const after = await hud.boundingBox();
      assert(after.x < before.x - 200 && after.x >= 0 && after.y >= 0, `${theme}: Raj's panel moves when dragged`);

      await hud.focus();
      await page.keyboard.press("Escape");
      assert.equal(await hud.isHidden(), true);
      assert.equal(await page.evaluate(() => document.activeElement.classList.contains("companion-launcher")), true,
        "closing Raj returns focus to his launcher");
    } finally {
      await context.close();
    }
  }

  // First visit: Raj says hello by himself, then offers topics. Once closed,
  // he doesn't pop up again.
  {
    const { context, page, threeRequests } = await openPage({ reduced: false });
    try {
      await page.locator("#companionHud").waitFor({ timeout: 6000 });
      await page.waitForFunction(() => ["wave", "wave-out"].includes(document.querySelector(".raj-hero-image").dataset.pose));
      await said(page, /I'm Raj/);
      assert.equal(await page.locator(".companion-body").isHidden(), true, "first greeting starts compact");
      await page.locator(".companion-peek").click();
      assert.equal(await page.locator(".companion-body").isVisible(), true, "the greeting expands on request");
      await page.locator(".companion-topic").first().waitFor({ timeout: 6000 });
      assert.equal(threeRequests.length, 0, "Raj uses the local pose atlas without a WebGL runtime");
      await page.locator('.companion-portrait[data-ready="true"]').waitFor({ state: "attached" });
      await page.waitForFunction(() => ["speak", "nod"].includes(document.querySelector(".raj-hero-image").dataset.pose));
      assert.equal(await askIsReachable(page), true, "Raj must not cover the Ask launcher");
      await button(page, "Close Raj").click();
      await page.reload();
      await page.waitForTimeout(2500);
      assert.equal(await page.locator("#companionHud").isHidden(), true, "a closed Raj stays closed");
    } finally {
      await context.close();
    }
  }

  // Phones: the greeting fits, the Ask launcher stays usable, and the panel
  // uses compact controls that expand when requested.
  for (const width of [320, 390]) {
    const { context, page, threeRequests } = await openPage({ width, height: 740, reduced: false });
    try {
      await page.locator("#companionHud").waitFor({ timeout: 8000 });
      assert.equal(await page.locator(".companion-body").isHidden(), true, "the mobile greeting starts compact");
      await page.getByRole("button", { name: "Expand Raj's panel", exact: true }).click();
      await page.locator(".companion-topic").first().waitFor({ timeout: 8000 });
      assert.equal(threeRequests.length, 0, `${width}: the portrait needs no GPU library`);
      for (const selector of ["#companionHud", ".companion-stage"]) {
        const box = await page.locator(selector).evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
        assert(box.x >= 0 && box.x + box.width <= width && box.y >= 0, `${width}: ${selector} must fit the screen`);
      }
      assert.equal(await askIsReachable(page), true, `${width}: Raj must not cover the Ask launcher`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}: no overflow`);
      await page.mouse.click(5, 300);
      await page.waitForFunction(() => document.querySelector('.companion-portrait[data-ready="true"]') || document.querySelector('[data-c="note"]').textContent);
    } finally {
      await context.close();
    }
  }

  // Without artwork or the search index, Raj still guides and still takes messages.
  {
    const { context, page } = await openPage({ block: ["**/images/raj-poses.webp", "**/assets/case-studies.json"] });
    try {
      await page.locator(".companion-launcher").click();
      await page.waitForFunction(() => /can still guide you/.test(document.querySelector('[data-c="note"]').textContent));
      await page.locator('.companion-topic[data-topic="contact"]').click();
      await said(page, /Questions about any of this work/);
      await page.locator("#rajInput").fill("aurora");
      await page.locator("#rajInput").press("Enter");
      await said(page, /couldn't load my notes/);
      assert.equal(await button(page, "Leave me a message").count(), 1);
    } finally {
      await context.close();
    }
  }

  assert.deepEqual(errors, []);
  console.log("PASS: Raj greets, offers topics, walks and points, answers or takes a message, dodges what he points at, stays clear of Ask, and works without artwork.");
}
