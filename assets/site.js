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
