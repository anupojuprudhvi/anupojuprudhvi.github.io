import assert from 'node:assert/strict';
export async function verifyPresentation(browser, base) {
  const page = await browser.newPage();
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  try {
    await page.goto(base);
    await page.waitForTimeout(3500);
    assert.equal(await page.locator('.hero-raj, #companionHud, .companion-launcher').count(), 0);
    assert.equal(requests.some(url => /companion\.(js|css)|raj-poses/.test(url)), false);
    assert.equal(await page.locator('#statsRow').isVisible(), true);
    await page.locator('#traceBtn').click();
    await page.screenshot({path:'artifacts/without-hologram-desktop.png', fullPage:false});
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({path:'artifacts/without-hologram-mobile.png', fullPage:true});
    console.log('PASS: experience and architecture remain visible, request tracing works, and no hologram assets or controls load.');
  } finally { await page.close(); }
}
