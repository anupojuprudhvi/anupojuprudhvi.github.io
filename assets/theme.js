(() => {
  let theme = "dark";
  try {
    if (localStorage.getItem("theme") === "light") theme = "light";
  } catch {}
  document.documentElement.dataset.theme = theme;
  // Lets CSS collapse the mobile menu only when this script can reopen it.
  document.documentElement.classList.add("js");
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

    // Mobile menu: the Menu button shows/hides the nav links on small screens.
    const menuButton = document.querySelector(".nav-toggle");
    const menu = menuButton && document.getElementById(menuButton.getAttribute("aria-controls"));
    const setMenu = (open) => {
      if (!menuButton || !menu) return;
      menu.classList.toggle("is-open", open);
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };
    if (menuButton && menu) {
      menuButton.addEventListener("click", () =>
        setMenu(menuButton.getAttribute("aria-expanded") !== "true"),
      );
      // Following an in-page link (e.g. #work) should close the menu.
      menu.addEventListener("click", (e) => {
        const link = e.target.closest("a[href]");
        if (link && !link.classList.contains("nav-dropdown-trigger")) setMenu(false);
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
        if (menuButton?.getAttribute("aria-expanded") === "true") {
          setMenu(false);
          menuButton.focus();
        }
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
