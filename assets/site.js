const copyButton = document.getElementById("copyEmail");
let copyTimeout;
copyButton?.addEventListener("click", async () => {
  const status = document.getElementById("copyStatus");
  clearTimeout(copyTimeout);
  try {
    await navigator.clipboard.writeText("anupojuprudhvi@gmail.com");
    status.textContent = "Email address copied.";
    copyTimeout = setTimeout(() => {
      status.textContent = "";
    }, 4000);
  } catch {
    status.textContent = "Please select and copy the email address above.";
  }
});

// "Pause animations" in the footer (theme.js) sets this class; loops below respect it.
const motionPaused = () => document.documentElement.classList.contains("motion-paused");

// Keep the role label stable so visitors can read it without cycling text.
// Hero glow that follows the pointer (mouse devices only, motion allowed).
const heroEl = document.querySelector(".hero");
const heroSpot = heroEl?.querySelector(".hero-spot");
if (heroSpot && matchMedia("(hover: hover) and (prefers-reduced-motion: no-preference)").matches) {
  let spotFrame = 0;
  heroEl.addEventListener("pointermove", (event) => {
    cancelAnimationFrame(spotFrame);
    spotFrame = requestAnimationFrame(() => {
      const box = heroEl.getBoundingClientRect();
      const half = heroSpot.offsetWidth / 2;
      heroSpot.style.transform = `translate(${event.clientX - box.left - half}px, ${event.clientY - box.top - half}px)`;
      heroSpot.classList.add("is-on");
    });
  });
  heroEl.addEventListener("pointerleave", () => heroSpot.classList.remove("is-on"));
}

// Metrics are rendered at their final values; avoid layout work on every frame.
// "How a change reaches production": the five steps light up in order the
// first time the strip scrolls into view. Without IntersectionObserver, or with
// reduced motion or paused animations, the steps are simply shown.
const changeFlow = document.querySelector(".change-flow");
if (
  changeFlow &&
  "IntersectionObserver" in window &&
  matchMedia("(prefers-reduced-motion: no-preference)").matches &&
  !motionPaused()
) {
  changeFlow.classList.add("is-armed");
  const reveal = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      changeFlow.classList.add("is-visible");
      reveal.disconnect();
    },
    { threshold: 0.25 },
  );
  reveal.observe(changeFlow);
}

// Expertise: paged dots, native touch scrolling, mouse dragging, and opt-out rotation.
const expertiseCards = document.getElementById('expertiseCards');
if (expertiseCards) {
  const controls = document.querySelector('.expertise-controls');
  const dots = controls.querySelector('.expertise-dots');
  const play = controls.querySelector('.expertise-play');
  const cards = [...expertiseCards.querySelectorAll('a')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false;
  let visible = false;
  let perPage = 4;
  let offsets = [];
  let timer;
  let drag;
  let suppressClick = false;
  const behavior = () => reducedMotion.matches || motionPaused() ? 'auto' : 'smooth';
  const currentPage = () => offsets.reduce((best, offset, index) =>
    Math.abs(expertiseCards.scrollLeft - offset) < Math.abs(expertiseCards.scrollLeft - offsets[best]) ? index : best, 0);
  const updateDots = () => [...dots.children].forEach((dot, index) => dot.setAttribute('aria-current', String(index === currentPage())));
  const go = index => expertiseCards.scrollTo({left: offsets[index], behavior: behavior()});
  function schedule() {
    clearInterval(timer);
    play.hidden = reducedMotion.matches;
    play.textContent = paused ? 'Play' : 'Pause';
    play.setAttribute('aria-label', (paused ? 'Play' : 'Pause') + ' automatic expertise rotation');
    if (!paused && !reducedMotion.matches) timer = setInterval(() => {
      if (!visible || document.hidden || motionPaused() || expertiseCards.matches(':hover') || controls.matches(':hover') || controls.contains(document.activeElement) || expertiseCards.contains(document.activeElement) || drag) return;
      go((currentPage() + 1) % offsets.length);
    }, 8000);
  }
  function pause() { paused = true; schedule(); }
  function rebuild() {
    const focused = dots.contains(document.activeElement) ? currentPage() : -1;
    perPage = innerWidth <= 767 ? 1 : innerWidth <= 1199 ? 2 : 4;
    const gap = parseFloat(getComputedStyle(expertiseCards).columnGap) || 0;
    const missing = (perPage - cards.length % perPage) % perPage;
    expertiseCards.classList.toggle('has-tail', missing > 0);
    expertiseCards.style.setProperty('--expertise-tail', missing ? (missing * (cards[0].getBoundingClientRect().width + gap) - gap) + 'px' : '0px');
    const max = expertiseCards.scrollWidth - expertiseCards.clientWidth;
    offsets = cards.filter((_, index) => index % perPage === 0).map(card => Math.min(max, card.offsetLeft - cards[0].offsetLeft));
    dots.replaceChildren(...offsets.map((offset, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', `Show expertise group ${index + 1} of ${offsets.length}`);
      button.setAttribute('aria-controls', 'expertiseCards');
      button.addEventListener('click', () => { pause(); go(index); });
      return button;
    }));
    updateDots();
    if (focused >= 0) dots.children[Math.min(focused, offsets.length - 1)]?.focus({preventScroll:true});
  }
  controls.hidden = false;
  play.addEventListener('click', () => { paused = !paused; schedule(); });
  expertiseCards.addEventListener('scroll', updateDots, {passive:true});
  expertiseCards.addEventListener('keydown', event => { if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) pause(); });
  expertiseCards.addEventListener('dragstart', event => event.preventDefault());
  expertiseCards.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse') { pause(); return; }
    if (event.button !== 0) return;
    drag = {id:event.pointerId, x:event.clientX, start:expertiseCards.scrollLeft, moved:false};
  });
  expertiseCards.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const delta = event.clientX - drag.x;
    if (!drag.moved && Math.abs(delta) < 8) return;
    if (!drag.moved) { drag.moved = true; pause(); expertiseCards.setPointerCapture(event.pointerId); expertiseCards.classList.add('is-dragging'); }
    event.preventDefault();
    expertiseCards.scrollLeft = drag.start - delta;
  });
  const endDrag = () => {
    if (!drag) return;
    suppressClick = drag.moved;
    if (expertiseCards.hasPointerCapture(drag.id)) expertiseCards.releasePointerCapture(drag.id);
    drag = null; expertiseCards.classList.remove('is-dragging');
    setTimeout(() => { suppressClick = false; }, 150);
  };
  expertiseCards.addEventListener('pointerup', endDrag);
  expertiseCards.addEventListener('pointercancel', endDrag);
  expertiseCards.addEventListener('pointerleave', () => { if (drag && !drag.moved) drag = null; });
  expertiseCards.addEventListener('click', event => { if (suppressClick) { event.preventDefault(); event.stopPropagation(); } }, true);
  new ResizeObserver(rebuild).observe(expertiseCards);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }, {threshold:0.25}).observe(expertiseCards);
  reducedMotion.addEventListener('change', schedule);
  rebuild(); schedule();
}
