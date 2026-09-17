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

const tickerEl = document.getElementById("closingTicker");
if (tickerEl && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const phrases = [
    "10+ years in production cloud architecture",
    "$2.5M+ TCO & licensing savings modeled",
    "1,000+ workloads profiled & migrated",
    "multi-region failover, by design",
  ];
  let tickerIndex = 0;
  setInterval(() => {
    tickerIndex = (tickerIndex + 1) % phrases.length;
    tickerEl.style.opacity = "0";
    setTimeout(() => {
      tickerEl.textContent = phrases[tickerIndex];
      tickerEl.style.opacity = "1";
    }, 250);
  }, 3200);
}

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
      const role = roles[roleIndex % roles.length];
      await typeText(role);
      typeLineEl.setAttribute("aria-label", `${role} platform architect`);
      await sleep(1800);
      await deleteText(role);
      await sleep(350);
      roleIndex++;
    }
  })();
}
