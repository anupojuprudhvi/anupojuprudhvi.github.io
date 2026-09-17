/**
 * "Ask about my work" — searches assets/case-studies.json, which the build
 * generates from content/case-studies/**.  Deliberately not an AI: it returns
 * what was actually written, with a link to the source page.
 *
 * If a hosted model is added later, only `answer()` needs to change — the
 * index it searches is already the grounding corpus.
 */
(() => {
  // Resolve asset paths relative to this script, so it works at any depth.
  const self =
    document.currentScript ||
    document.querySelector('script[src$="assistant.js"]');
  const base = self ? self.src.replace(/assistant\.js.*$/, "") : "assets/";
  const siteRoot = base.replace(/assets\/$/, "");

  let index = null;
  let loading = null;

  const load = () => {
    if (index) return Promise.resolve(index);
    if (!loading)
      loading = fetch(base + "case-studies.json")
        .then((r) => {
          if (!r.ok) throw new Error("Search index unavailable");
          return r.json();
        })
        .then((data) => {
          if (!Array.isArray(data) || data.some((item) =>
            !item || typeof item.title !== "string" || typeof item.projectName !== "string" ||
            typeof item.url !== "string" || !/^case-studies\/[a-z0-9-]+\/[a-z0-9-]+\.html$/.test(item.url) ||
            ["nav", "summary", "problem", "solution", "layer"].some((key) => item[key] !== undefined && typeof item[key] !== "string") ||
            ["stack", "tags"].some((key) => item[key] !== undefined && (!Array.isArray(item[key]) || item[key].some((value) => typeof value !== "string")))
          )) throw new Error("Invalid search index");
          return (index = data);
        })
        .finally(() => { loading = null; });
    return loading;
  };

  /* ---------------------------------------------------------------- UI */
  const launcher = document.createElement("button");
  launcher.className = "ask-launcher";
  launcher.type = "button";
  launcher.innerHTML = `Ask about my work <kbd>${
    navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl"
  } K</kbd>`;
  launcher.setAttribute("aria-haspopup", "dialog");

  const backdrop = document.createElement("div");
  backdrop.className = "ask-backdrop";
  backdrop.hidden = true;
  backdrop.innerHTML = `
    <div class="ask-panel" role="dialog" aria-modal="true" aria-labelledby="askTitle">
      <button class="ask-close" type="button" aria-label="Close">×</button>
      <div class="ask-head">
        <h2 id="askTitle">Ask about my work</h2>
        <p class="ask-note">
          Searches my written case notes — not an AI. Every result links to the
          page it came from.
        </p>
      </div>
      <div class="ask-field">
        <label class="visually-hidden" for="askInput">Search my work</label>
        <input id="askInput" type="search" autocomplete="off"
               placeholder="e.g. private S3 uploads, failover, cost savings…" />
      </div>
      <div class="ask-chips" id="askChips"></div>
      <div class="ask-results" id="askResults" role="region"
           aria-live="polite" aria-label="Search results"></div>
      <div class="ask-foot">
        <span>Can't find it? Happy to answer directly.</span>
        <a href="mailto:anupojuprudhvi@gmail.com">Email me ↗</a>
      </div>
    </div>`;

  document.addEventListener("DOMContentLoaded", () => {
    document.body.append(launcher, backdrop);
    wire();
  });

  /* ------------------------------------------------------------ search */
  const norm = (s) => (s || "").toLowerCase();

  function score(item, terms) {
    const title = norm(item.title) + " " + norm(item.nav);
    const body =
      norm(item.summary) +
      " " +
      norm(item.problem) +
      " " +
      norm(item.solution);
    const meta =
      norm((item.stack || []).join(" ")) +
      " " +
      norm((item.tags || []).join(" ")) +
      " " +
      norm(item.projectName) +
      " " +
      norm(item.layer);

    let total = 0;
    for (const t of terms) {
      let s = 0;
      if (title.includes(t)) s += 10;
      if (meta.includes(t)) s += 5;
      if (body.includes(t)) s += 3;
      if (!s) return 0; // every term must land somewhere
      total += s;
    }
    return total;
  }

  function snippet(item, terms) {
    const text = item.summary || item.problem || "";
    if (!terms.length) return escape(text);
    const lower = text.toLowerCase();
    let at = -1;
    for (const t of terms) {
      const i = lower.indexOf(t);
      if (i !== -1 && (at === -1 || i < at)) at = i;
    }
    let out = text;
    if (at > 90) out = "…" + text.slice(at - 60);
    out = out.length > 190 ? out.slice(0, 190).trim() + "…" : out;
    return escape(out).replace(
      new RegExp(`(${terms.map(escapeRe).join("|")})`, "gi"),
      "<mark>$1</mark>",
    );
  }

  const escape = (s) =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  function render(items, terms) {
    const box = backdrop.querySelector("#askResults");
    if (!items.length) {
      box.innerHTML = `<p class="ask-empty">No match in my written work for that.
        Ask me directly and I'll answer properly —
        <a href="mailto:anupojuprudhvi@gmail.com">anupojuprudhvi@gmail.com</a></p>`;
      return;
    }
    box.innerHTML = items
      .map(
        (i) => `<a class="ask-hit" href="${siteRoot}${i.url}">
          <span class="ask-hit-meta">${escape(i.projectName)}${
            i.layer ? " · " + escape(i.layer) : ""
          }</span>
          <strong>${escape(i.title)}</strong>
          <span>${snippet(i, terms)}</span>
        </a>`,
      )
      .join("");
  }

  let requestVersion = 0;
  async function answer(query) {
    const version = ++requestVersion;
    const box = backdrop.querySelector("#askResults");
    box.setAttribute("aria-busy", "true");
    try {
      const data = await load();
      if (version !== requestVersion) return;
      buildChips();
      const terms = norm(query).split(/\s+/).filter(Boolean);
      if (!terms.length) {
        render(data.slice(0, 6), []);
        return;
      }
      const hits = data
        .map((item) => ({ item, s: score(item, terms) }))
        .filter((h) => h.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, 8)
        .map((h) => h.item);
      render(hits, terms);
    } catch {
      if (version !== requestVersion) return;
      const message = document.createElement("p");
      message.className = "ask-empty";
      message.textContent = "Search couldn't load. Please try again, or use the email link below.";
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "ask-retry";
      retry.textContent = "Retry search";
      retry.addEventListener("click", () => {
        const input = backdrop.querySelector("#askInput");
        input.focus();
        answer(input.value);
      });
      box.replaceChildren(message, retry);
    } finally {
      if (version === requestVersion) box.setAttribute("aria-busy", "false");
    }
  }

  /* -------------------------------------------------------------- wire */
  let lastFocus = null;

  function open() {
    lastFocus = document.activeElement;
    backdrop.hidden = false;
    answer(backdrop.querySelector("#askInput").value);
    backdrop.querySelector("#askInput").focus();
    document.addEventListener("keydown", onKeydown, true);
  }

  function close() {
    requestVersion++;
    backdrop.hidden = true;
    document.removeEventListener("keydown", onKeydown, true);
    lastFocus?.focus();
  }

  function onKeydown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== "Tab") return;
    const focusables = backdrop.querySelectorAll(
      'a[href], button, input, [tabindex]:not([tabindex="-1"])',
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function buildChips() {
    const wrap = backdrop.querySelector("#askChips");
    if (wrap.dataset.built) return;
    const picks = (index || []).slice(0, 4);
    wrap.replaceChildren(...picks.map((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.q = item.nav || item.title;
      button.textContent = item.nav || item.title;
      return button;
    }));
    wrap.dataset.built = "1";
    wrap.querySelectorAll("button").forEach((b) =>
      b.addEventListener("click", () => {
        const input = backdrop.querySelector("#askInput");
        input.value = b.dataset.q;
        answer(input.value);
        input.focus();
      }),
    );
  }

  function wire() {
    launcher.addEventListener("click", open);
    backdrop.querySelector(".ask-close").addEventListener("click", close);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close();
    });
    const input = backdrop.querySelector("#askInput");
    const resultsBox = backdrop.querySelector("#askResults");

    let t;
    input.addEventListener("input", (e) => {
      requestVersion++;
      clearTimeout(t);
      const v = e.target.value;
      t = setTimeout(() => answer(v), 120);
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const firstHit = backdrop.querySelector(".ask-hit");
        if (firstHit) {
          e.preventDefault();
          firstHit.click();
        }
      } else if (e.key === "ArrowDown") {
        const firstHit = backdrop.querySelector(".ask-hit");
        if (firstHit) {
          e.preventDefault();
          firstHit.focus();
        }
      }
    });

    resultsBox.addEventListener("keydown", (e) => {
      const hits = [...resultsBox.querySelectorAll(".ask-hit")];
      const idx = hits.indexOf(document.activeElement);
      if (idx === -1) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (idx < hits.length - 1) {
          hits[idx + 1].focus();
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (idx > 0) {
          hits[idx - 1].focus();
        } else {
          input.focus();
        }
      }
    });

    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        backdrop.hidden ? open() : close();
      }
    });
  }
})();
