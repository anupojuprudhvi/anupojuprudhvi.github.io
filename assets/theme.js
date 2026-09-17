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
    if (toggle) {
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
    }

    // Dropdown toggle, touch & keyboard support
    document.querySelectorAll(".nav-dropdown").forEach((dropdown) => {
      const trigger = dropdown.querySelector(".nav-dropdown-trigger");
      if (!trigger) return;

      trigger.addEventListener("click", (e) => {
        e.preventDefault();
        const isOpen = dropdown.classList.toggle("is-open");
        trigger.setAttribute("aria-expanded", String(isOpen));
      });
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".nav-dropdown")) {
        document.querySelectorAll(".nav-dropdown.is-open").forEach((d) => {
          d.classList.remove("is-open");
          d.querySelector(".nav-dropdown-trigger")?.setAttribute(
            "aria-expanded",
            "false",
          );
        });
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        document.querySelectorAll(".nav-dropdown.is-open").forEach((d) => {
          d.classList.remove("is-open");
          d.querySelector(".nav-dropdown-trigger")?.setAttribute(
            "aria-expanded",
            "false",
          );
        });
      }
    });
  });
})();
