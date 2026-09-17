import assert from "node:assert/strict";
import fs from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { libraryPage } from "./lib/render.mjs";

export async function verifySearch(browser, base) {
  const index = JSON.parse(fs.readFileSync("assets/case-studies.json", "utf8"));
  const context = await browser.newContext();
  const errors = [];
  context.on("page", (page) => page.on("pageerror", (error) => errors.push(error.message)));
  try {
    const page = await context.newPage();
    const label = 'Explain "private" <APIs> & access';
    const item = { ...index[0], nav: label };
    await page.route("**/assets/case-studies.json", (route) => route.fulfill({ json: [item] }));
    await page.goto(base);
    await page.locator(".ask-launcher").click();
    const chip = page.locator("#askChips button").first();
    await chip.waitFor();
    assert.equal(await chip.textContent(), label);
    assert.equal(await chip.getAttribute("data-q"), label);
    assert.equal(await chip.locator("*").count(), 0, "metadata must remain text");
    await chip.click();
    assert.equal(await page.locator("#askInput").inputValue(), label);
    await page.locator(".ask-hit").waitFor();
    assert.equal(await page.locator(".ask-hit").getAttribute("href"), `${base}/${item.url}`);
    assert.deepEqual((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations, []);
    await page.close();

    for (const failure of ["http", "network", "invalid-json"]) {
      const page = await context.newPage();
      let requests = 0;
      await page.route("**/assets/case-studies.json", async (route) => {
        if (++requests > 1) return route.fulfill({ json: index });
        if (failure === "network") return route.abort();
        if (failure === "invalid-json") return route.fulfill({ body: "{bad json", contentType: "application/json" });
        return route.fulfill({ status: 503, body: "Unavailable" });
      });
      await page.goto(base);
      await page.locator(".ask-launcher").click();
      await page.getByRole("button", { name: "Retry search" }).waitFor();
      assert.match(await page.locator("#askResults").textContent(), /Search couldn't load/);
      assert.equal(await page.locator("#askResults").getAttribute("aria-busy"), "false");
      if (failure === "http") {
        assert.deepEqual((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations, []);
      }
      if (failure === "network") {
        await page.locator(".ask-close").click();
        await page.locator(".ask-launcher").click();
      } else {
        await page.getByRole("button", { name: "Retry search" }).click();
      }
      await page.locator(".ask-hit").first().waitFor();
      assert.equal(requests, 2, "failed requests must be retried");
      assert.equal(await page.locator(".ask-retry").count(), 0);
      await page.close();
    }

    const library = await context.newPage();
    const layer = "Security: identity: workforce";
    await library.route("**/case-studies/index.html", (route) => route.fulfill({
      contentType: "text/html", body: libraryPage([{ ...index[0], layer }]),
    }));
    await library.goto(`${base}/case-studies/index.html`);
    await library.getByRole("button", { name: layer, exact: true }).click();
    assert.equal(await library.locator(".uc-card:visible").count(), 1);
    await library.locator("#ucSearch").fill("no-matching-study-xyz");
    assert.equal(await library.locator(".uc-card:visible").count(), 0);
    await library.locator("#ucSearch").fill("");
    assert.equal(await library.locator(".uc-card:visible").count(), 1);
    assert.deepEqual(errors, []);
    console.log("PASS: quoted search labels, retry/reopen after failed loads, dialog accessibility, and colon-containing layers.");
  } finally {
    await context.close();
  }
}
