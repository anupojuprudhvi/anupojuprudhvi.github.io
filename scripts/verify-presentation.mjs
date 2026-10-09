import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';
import {verifyCarousel} from './verify-carousel.mjs';
export async function verifyPresentation(browser, base) {
  const context = await browser.newContext({reducedMotion:'reduce'});
  const page = await context.newPage();
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  try {
    await page.goto(base);
    await page.waitForTimeout(3500);
    assert.equal(await page.locator('.hero-raj, #companionHud, .companion-launcher').count(), 0);
    assert.equal(requests.some(url => /companion\.(js|css)|raj-poses/.test(url)), false);
    assert.equal(await page.locator('#statsRow').isVisible(), true);
    assert.equal(await page.locator('a[href="#background"]').filter({hasText:'View experience'}).count(), 1);
    assert.equal(await page.locator('.role').count(), 3);
    assert.equal(await page.evaluate(() => document.querySelector('#latestTitle').compareDocumentPosition(document.querySelector('.expertise-deck')) & Node.DOCUMENT_POSITION_FOLLOWING), 4);
    assert.equal(await page.locator(".architecture, #traceBtn, #work").count(), 0);
    assert.equal(await page.locator(".expertise-grid a").count(), 7);
    await page.getByRole("button", {name:"Show expertise group 2 of 2"}).click();
    await page.waitForFunction(() => document.getElementById("expertiseCards").scrollLeft > 0);
    const aligned = await page.evaluate(() => Math.abs(document.querySelector(".expertise-heading").getBoundingClientRect().left - document.querySelector(".hero-copy").getBoundingClientRect().left) < 1);
    assert.equal(aligned, true, "hero and expertise share a reading column");
    assert.equal(await page.getByRole('button', {name:'Play automatic expertise rotation'}).isHidden(), true);
    await page.screenshot({path:'artifacts/without-hologram-desktop.png', fullPage:false});
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({path:'artifacts/without-hologram-mobile.png', fullPage:true});
    await page.goto(base + '/case-studies/tolling/aurora-multi-region-dr-parity.html');
    assert.equal(await page.locator('.case-overview dt').first().textContent(), 'Problem');
    await page.getByRole('button', {name:'Enlarge diagram'}).first().click();
    await page.getByRole('dialog').waitFor();
    const audit = await new AxeBuilder({page}).include('.diagram-viewer').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    assert.deepEqual(audit.violations, []);
    await page.keyboard.press('Escape');
    const opener = page.getByRole('button', {name:'Enlarge diagram'}).first();
    assert.equal(await opener.evaluate(el => el === document.activeElement), true);
    await opener.click();
    await page.getByRole('button', {name:'Close', exact:true}).click();
    console.log('PASS: experience, case-study overviews, diagram enlargement and focus restoration, expertise navigation, and retired-asset removal.');
  } finally { await context.close(); }
  await verifyCarousel(browser, base);
}
