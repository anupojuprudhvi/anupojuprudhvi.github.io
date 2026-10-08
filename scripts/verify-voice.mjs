import assert from "node:assert/strict";

// Exercise locale selection and asynchronous voice loading without playing audio.
export async function verifyVoice(browser, base) {
  for (const scenario of ["locale", "named", "fallback", "delayed", "mute-pending", "close-pending"]) {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    try {
      await context.addInitScript((scenario) => {
        window.voiceCalls = [];
        window.testVoices = scenario === "locale"
          ? [{ name: "US default", lang: "en-US" }, { name: "Indian English", lang: "en-IN" }]
          : scenario === "named"
            ? [{ name: "English India", lang: "en" }]
            : scenario === "fallback" ? [{ name: "US default", lang: "en-US" }] : [];
        const synth = new EventTarget();
        synth.getVoices = () => window.testVoices;
        synth.cancel = () => {};
        synth.speak = (utterance) => window.voiceCalls.push({
          name: utterance.voice?.name || null,
          lang: utterance.lang,
          rate: utterance.rate,
        });
        Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
        window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
      }, scenario);
      const page = await context.newPage();
      await page.goto(`${base}/index.html`);
      await page.locator("[data-open-raj]").click();
      await page.locator(".companion-topic").first().waitFor();
      assert.equal(await page.evaluate(() => voiceCalls.length), 0, "voice is opt-in");
      await page.locator('[data-c="voice"]').click();
      if (["delayed", "mute-pending", "close-pending"].includes(scenario)) {
        if (scenario === "mute-pending") await page.locator('[data-c="voice"]').click();
        if (scenario === "close-pending") await page.locator('[data-c="close"]').click();
        await page.evaluate(() => {
          window.testVoices = [{ name: "Late Indian voice", lang: "en_IN" }];
          speechSynthesis.dispatchEvent(new Event("voiceschanged"));
        });
      }
      if (["mute-pending", "close-pending"].includes(scenario)) {
        await page.waitForTimeout(900);
        assert.equal(await page.evaluate(() => voiceCalls.length), 0, "pending speech must be cancelled");
      } else {
        await page.waitForFunction(() => voiceCalls.length === 1);
        const call = await page.evaluate(() => voiceCalls[0]);
        assert.equal(call.lang, "en-IN");
        assert.equal(call.rate, 0.9);
        assert.equal(call.name, scenario === "locale" ? "Indian English"
          : scenario === "named" ? "English India"
          : scenario === "delayed" ? "Late Indian voice" : null);
      }
    } finally {
      await context.close();
    }
  }
  console.log("PASS: Indian English voice selection, delayed voices, default fallback, opt-in, and pending-speech cancellation.");
}
