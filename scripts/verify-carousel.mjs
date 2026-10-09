import assert from 'node:assert/strict';
export async function verifyCarousel(browser, base) {
  const context = await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
  const page = await context.newPage();
  try {
    await page.goto(base);
    await page.locator('.expertise-deck').scrollIntoViewIfNeeded();
    await page.mouse.move(0,0);
    const active = () => page.locator('.expertise-dots [aria-current="true"]').getAttribute('aria-label');
    assert.match(await active(), /group 1 of 2/);
    await page.waitForTimeout(8900);
    assert.match(await active(), /group 2 of 2/);
    await page.getByRole('button',{name:'Pause automatic expertise rotation'}).click();
    await page.mouse.move(0,0);
    const held = await active();
    await page.waitForTimeout(8300);
    assert.equal(await active(), held);
    await page.getByRole('button',{name:'Show expertise group 1 of 2'}).click();
    await page.waitForFunction(() => document.getElementById('expertiseCards').scrollLeft < 3);
    const box = await page.locator('#expertiseCards').boundingBox();
    await page.mouse.move(box.x + 240, box.y + 90);
    await page.mouse.down(); await page.mouse.move(box.x + 30, box.y + 90,{steps:8}); await page.mouse.up();
    assert.equal(page.url().replace(/\/$/,''), base.replace(/\/$/,''), 'drag must not navigate a card link');
    assert.equal(await page.locator('#expertiseCards').evaluate(el=>el.scrollLeft>0),true);
    await page.setViewportSize({width:390,height:844});
    await page.waitForFunction(()=>document.querySelectorAll('.expertise-dots button').length===7);
    await page.getByRole('button',{name:'Show expertise group 7 of 7'}).click();
    await page.waitForFunction(()=>document.querySelector('.expertise-dots [aria-current="true"]')?.getAttribute('aria-label').includes('group 7'));
    await page.waitForFunction(() => { const grid = document.getElementById('expertiseCards'); return Math.abs(grid.scrollWidth - grid.clientWidth - grid.scrollLeft) < 2; });
    await page.screenshot({path:'artifacts/carousel-mobile.png'});
    console.log('PASS: visible autoplay, Pause, dot navigation, drag without accidental navigation, and responsive groups.');
  } finally { await context.close(); }
}
