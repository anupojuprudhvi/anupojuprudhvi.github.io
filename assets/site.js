document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    document
      .querySelectorAll("[data-filter]")
      .forEach((item) =>
        item.setAttribute("aria-pressed", String(item === button)),
      );
    let count = 0;
    document.querySelectorAll(".case").forEach((card) => {
      card.hidden =
        button.dataset.filter !== "all" &&
        !card.dataset.tags.split(" ").includes(button.dataset.filter);
      if (!card.hidden) count++;
    });
    document.getElementById("filterStatus").textContent =
      `${count} ${count === 1 ? "engagement" : "engagements"} shown`;
  });
});
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

const typeWordEl = document.getElementById("typeWord");
const typeLineEl = document.getElementById("typeLine");
if (
  typeWordEl &&
  typeLineEl &&
  !matchMedia("(prefers-reduced-motion: reduce)").matches
) {
  const roles = ["Cloud", "DevOps", "FinOps"];
  let roleIndex = 0;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const typeText = async (text) => {
    for (let i = 1; i <= text.length; i++) {
      typeWordEl.textContent = text.slice(0, i);
      await sleep(75);
    }
  };
  const deleteText = async (text) => {
    for (let i = text.length; i >= 0; i--) {
      typeWordEl.textContent = text.slice(0, i);
      await sleep(45);
    }
  };
  (async function loop() {
    while (true) {
      while (motionPaused()) await sleep(500);
      const role = roles[roleIndex % roles.length];
      await typeText(role);
      typeLineEl.setAttribute("aria-label", `${role} platform architect`);
      // Hold a whole word on screen for as long as animations are paused.
      do await sleep(1800); while (motionPaused());
      await deleteText(role);
      await sleep(350);
      roleIndex++;
    }
  })();
}

const traceBtn = document.getElementById("traceBtn");
if (traceBtn) {
  const core = document.getElementById("archCore");
  const branch = document.getElementById("archBranch");
  const caption = document.getElementById("traceCaption");
  const services = [
    document.getElementById("archSvc0"),
    document.getElementById("archSvc1"),
    document.getElementById("archSvc2"),
  ];
  // Timing below is real reading time, not animation time: the moving dot
  // and pulse glow already switch off under prefers-reduced-motion via the
  // site's global animation kill-switch, so this delay doesn't shrink too.
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const DEFAULT_CAPTION = caption.innerHTML;
  const steps = [
    {
      node: "core",
      text: "Every request starts inside the <b>governed foundation</b>. Security boundaries, network segmentation, and automation are in place before anything ships.",
      hold: 3200,
    },
    {
      node: 0,
      text: "<b>Resilient systems</b>: automated failover and health checks are the default, not bolted on after an outage.",
      hold: 2700,
    },
    {
      node: 1,
      text: "<b>Scalable platforms</b>: capacity grows and shrinks with real load, instead of paying for a fixed ceiling.",
      hold: 2700,
    },
    {
      node: 2,
      text: "<b>Cost-aware operations</b>: you can see what's being spent and why, before the monthly bill arrives.",
      hold: 2700,
    },
  ];

  function clearVisited() {
    services.forEach((s) => s.classList.remove("active", "visited"));
    core.classList.remove("pulse");
    branch.classList.remove("flowing");
  }

  let playing = false;
  async function play() {
    if (playing) return;
    playing = true;
    traceBtn.disabled = true;
    clearVisited();
    for (const step of steps) {
      caption.innerHTML = step.text;
      if (step.node === "core") {
        core.classList.add("pulse");
        branch.classList.remove("flowing");
        void branch.offsetWidth;
        branch.classList.add("flowing");
        await sleep(500);
        core.classList.remove("pulse");
        await sleep(step.hold - 500);
      } else {
        services[step.node].classList.add("active");
        await sleep(200);
        services[step.node].classList.remove("active");
        services[step.node].classList.add("visited");
        await sleep(step.hold - 200);
      }
    }
    await sleep(1400);
    caption.innerHTML = DEFAULT_CAPTION;
    clearVisited();
    playing = false;
    traceBtn.disabled = false;
  }
  traceBtn.addEventListener("click", play);
}

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

const statsRow = document.getElementById("statsRow");
if (statsRow && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const statEls = [...statsRow.querySelectorAll("strong[data-target]")];
  const animateStats = () => {
    statEls.forEach((el) => {
      const target = parseFloat(el.dataset.target);
      const decimals = parseInt(el.dataset.decimals || "0", 10);
      const prefix = el.dataset.prefix || "";
      const suffix = el.dataset.suffix || "";
      const step = target >= 500 ? 10 : target >= 50 ? 1 : Math.pow(10, -decimals);
      const format = (n) =>
        `${prefix}${n.toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })}${suffix}`;
      const dur = 2400;
      const t0 = performance.now();
      const frame = (now) => {
        const p = Math.min((now - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 2);
        const raw = target * eased;
        const val = p < 1 ? Math.round(raw / step) * step : target;
        el.textContent = format(val);
        if (p < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  };
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateStats();
          io.disconnect();
        }
      });
    },
    { threshold: 0.2 },
  );
  io.observe(statsRow);
}

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
