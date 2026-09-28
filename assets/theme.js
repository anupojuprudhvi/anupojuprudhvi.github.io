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

    // Scroll reveal: blocks fade up as they scroll into view. Only blocks that
    // start below the fold are hidden, so nothing on screen ever blinks and, if
    // this never runs, nothing is hidden at all.
    if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const selector = ".section-head, .case, .capability, .role, .cred, .case-study-links a, .uc-card, body.deepdive main section";
      const blocks = [...document.querySelectorAll(selector)].filter(
        (el) => !el.parentElement.closest(selector) && el.getBoundingClientRect().top > innerHeight,
      );
      const reveal = (el, delay) => {
        el.style.setProperty("--reveal-delay", `${delay}ms`);
        el.classList.add("reveal-in");
        el.classList.remove("reveal-pending");
        // Hand transitions back to the element's own hover styles afterwards.
        setTimeout(() => {
          el.classList.remove("reveal-in");
          el.style.removeProperty("--reveal-delay");
        }, 700 + delay);
      };
      const observer = new IntersectionObserver(
        (entries) => {
          // Blocks arriving together (a card grid) stagger slightly.
          entries.filter((e) => e.isIntersecting).forEach((e, i) => {
            observer.unobserve(e.target);
            reveal(e.target, Math.min(i, 3) * 80);
          });
        },
        { rootMargin: "0px 0px -8% 0px" },
      );
      blocks.forEach((el) => {
        el.classList.add("reveal-pending");
        observer.observe(el);
      });
      addEventListener("beforeprint", () => blocks.forEach((el) => el.classList.remove("reveal-pending")));
    }

    // Animated diagrams run only while on screen: SVG traffic (SMIL) and CSS
    // cycles both pause when a diagram scrolls away, saving battery on phones.
    const diagrams = document.querySelectorAll("svg.hub-net, svg.hub-net-compact, svg.motif");
    if (diagrams.length && "IntersectionObserver" in window) {
      const diagramObserver = new IntersectionObserver((entries) => {
        for (const { target, isIntersecting } of entries) {
          target.classList.toggle("anim-paused", !isIntersecting);
          if (isIntersecting) target.unpauseAnimations?.();
          else target.pauseAnimations?.();
        }
      });
      diagrams.forEach((svg) => diagramObserver.observe(svg));
    }
  });
})();
