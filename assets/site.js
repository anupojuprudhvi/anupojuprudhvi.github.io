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

const expertiseCards = document.getElementById('expertiseCards');
if (expertiseCards) {
  const controls = document.querySelector('.expertise-controls');
  controls.hidden = false;
  controls.addEventListener('click', event => {
    const button = event.target.closest('[data-expertise]');
    if (!button) return;
    const distance = expertiseCards.clientWidth * (button.dataset.expertise === 'next' ? 1 : -1);
    expertiseCards.scrollBy({left:distance, behavior:matchMedia('(prefers-reduced-motion: reduce)').matches || motionPaused() ? 'auto' : 'smooth'});
  });
}
