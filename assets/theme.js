(() => {
  let theme = "dark";
  try {
    if (localStorage.getItem("theme") === "light") theme = "light";
  } catch {}
  document.documentElement.dataset.theme = theme;
  document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("themeToggle");
    const label = () => {
      const dark = document.documentElement.dataset.theme === "dark";
      toggle.setAttribute(
        "aria-label",
        `Switch to ${dark ? "light" : "dark"} theme`,
      );
      toggle.title = toggle.getAttribute("aria-label");
      toggle.textContent = dark ? "☼" : "☾";
    };
    if (!toggle) return;
    label();
    toggle.addEventListener("click", () => {
      const next =
        document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem("theme", next);
      } catch {}
      label();
    });
  });
})();
