import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';
export async function verifyContactPrompt(browser, base) {
  const paths=['/','/case-studies/index.html','/case-studies/tolling/aurora-multi-region-dr-parity.html','/learning-paths/','/learning-paths/terraform/01-enterprise-module-design.html'];
  for(const width of [390,1440])for(const path of paths){
    const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'no-preference'});
    try{const page=await context.newPage();await page.goto(base+path);
      const note=page.locator('.ask-end-note');await note.waitFor({state:'attached'});
      assert.equal(await note.isHidden(),true,'no reminder before reaching the bottom');
      assert.equal(await page.locator('.ask-launcher').evaluate(el=>getComputedStyle(el).animationName),'contact-breathe');
      await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
      await page.waitForFunction(()=>!document.querySelector('.ask-end-note').hidden || document.querySelector('.lp-quiz-nudge.is-open'));
      const quizNudge=page.locator('.lp-quiz-nudge.is-open');
      if(await quizNudge.count()){
        await note.waitFor({state:'hidden'});
        await quizNudge.getByRole('button',{name:'Not now'}).click();
      }
      await note.waitFor({state:'visible'});
      assert.equal(await page.locator('.ask-backdrop').isHidden(),true,'no automatic dialog');
      assert.equal(await note.evaluate(el=>el.contains(document.activeElement)),false,'no stolen focus');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      assert.deepEqual((await new AxeBuilder({page}).include('.ask-end-note').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations,[]);
      if(width===1440&&path==='/')await page.screenshot({path:'artifacts/contact-reminder-desktop.png'});
      if(width===390&&path==='/')await page.screenshot({path:'artifacts/contact-reminder-mobile.png'});
      await page.getByRole('button',{name:'Dismiss contact reminder'}).click();
      assert.equal(await note.isHidden(),true);
      assert.equal(await page.locator('.ask-launcher').evaluate(el=>el===document.activeElement),true);
      await page.evaluate(()=>window.scrollTo(0,0));await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
      assert.equal(await note.isHidden(),true,'dismissal persists during the page visit');
      await page.locator('.ask-launcher').click();await page.locator('#askMessageMode').waitFor();
      await page.keyboard.press('Escape');assert.equal(await note.isHidden(),true);
    }finally{await context.close();}
  }
  const context=await browser.newContext({reducedMotion:'reduce'});
  try{const page=await context.newPage();await page.goto(base+'/');
    assert.equal(await page.locator('.ask-launcher').evaluate(el=>getComputedStyle(el).animationName),'none');
    await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));await page.locator('.ask-end-note').waitFor();
    assert.equal(await page.locator('.ask-end-note').evaluate(el=>getComputedStyle(el).animationName),'none');
    await page.keyboard.press('Escape');assert.equal(await page.locator('.ask-end-note').isHidden(),true);
  }finally{await context.close();}
  const paused=await browser.newContext({reducedMotion:'no-preference'});
  try{await paused.addInitScript(()=>localStorage.setItem('motion','paused'));
    const page=await paused.newPage();await page.goto(base+'/');
    assert.equal(await page.locator('.ask-launcher').evaluate(el=>getComputedStyle(el).animationPlayState),'paused');
    await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));await page.locator('.ask-end-note').waitFor();
    assert.equal(await page.locator('.ask-end-note').evaluate(el=>getComputedStyle(el).animationName),'none');
    assert.equal(await page.locator('.ask-end-note').evaluate(el=>getComputedStyle(el).opacity),'1');
  }finally{await paused.close();}
  console.log('PASS: gentle contact pulse, page-end reminder, dismissal, focus, responsive layouts, accessibility, and reduced motion');
}
