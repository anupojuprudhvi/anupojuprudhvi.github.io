import assert from 'node:assert/strict';

export async function verifyContactPrompt(browser, base) {
  const paths = ['/', '/case-studies/index.html', '/case-studies/tolling/aurora-multi-region-dr-parity.html', '/learning-paths/', '/learning-paths/terraform/01-enterprise-module-design.html'];
  for (const width of [390, 1440]) for (const path of paths) {
    const context = await browser.newContext({viewport:{width,height:844},reducedMotion:'no-preference'});
    try {
      const page = await context.newPage();
      await page.goto(base + path);
      assert.equal(await page.locator('.ask-launcher, .ask-end-note, .ask-page-end').count(), 0, 'no unsolicited contact UI');
      assert.equal(await page.locator('.ask-backdrop').isHidden(), true, 'contact dialog starts closed');
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(150);
      assert.equal(await page.locator('.ask-launcher, .ask-end-note, .ask-page-end').count(), 0, 'scrolling creates no contact prompt');
      assert.equal(await page.locator('.ask-backdrop').isHidden(), true, 'no automatic dialog');
      if (path === '/') {
        assert.equal(await page.locator('.nav-cta').count(), 1);
        assert.equal(await page.locator('#contact [data-ask-mode="message"]').count(), 1);
      }
    } finally { await context.close(); }
  }
  const context = await browser.newContext({reducedMotion:'reduce'});
  try {
    const page = await context.newPage();
    await page.goto(base + '/');
    const contact = page.locator('#contact [data-ask-mode="message"]');
    await contact.click();
    await page.locator('#askMessageMode').waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await contact.evaluate(el => el === document.activeElement), true, 'explicit dialog returns focus');
    await page.keyboard.press('Control+k');
    await page.locator('#askInput').waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.ask-backdrop').isHidden(), true);
  } finally { await context.close(); }
  console.log('PASS: contact opens only on explicit action, with no floating button or page-end popup, and preserves keyboard focus.');
}
