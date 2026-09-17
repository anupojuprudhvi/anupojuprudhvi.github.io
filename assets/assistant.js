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
  launcher.innerHTML = `Ask or message me <kbd>${
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
        <h2 id="askTitle">Ask or message me</h2>
        <p class="ask-note">
          Search my written case notes, or switch to <b>Message</b> to reach me
          directly — not an AI either way. Search results link to the page
          they came from.
        </p>
      </div>
      <div class="ask-tabs" role="tablist">
        <button class="ask-tab active" id="askTabSearch" role="tab"
                aria-selected="true" type="button">Search my work</button>
        <button class="ask-tab" id="askTabMessage" role="tab"
                aria-selected="false" type="button">Message <kbd>M</kbd></button>
      </div>
      <div id="askSearchMode">
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
          <button class="ask-link" id="askSwitchToMessage" type="button">Message me directly →</button>
        </div>
      </div>
      <div id="askMessageMode" hidden>
        <div class="ask-msg-body" id="askMsgBody" aria-live="polite"></div>
        <div class="ask-msg-foot" id="askMsgFoot"></div>
        <!-- Honeypot: real visitors never see or touch this (it's off-screen,
             unlabeled, and no step in the guided flow points at it). A bot
             that blindly fills every field in the DOM fills this one too,
             and sendMessage() below drops the submission without hitting
             the network. Name matches Web3Forms' own botcheck convention. -->
        <input type="checkbox" id="askBotcheck" name="botcheck" tabindex="-1"
               autocomplete="off" aria-hidden="true"
               style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0" />
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
        <button type="button" class="ask-link ask-empty-switch">Message me directly →</button></p>`;
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
    setMode("search");
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
    if (
      e.key.toLowerCase() === "m" &&
      !e.metaKey && !e.ctrlKey && !e.altKey &&
      !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)
    ) {
      e.preventDefault();
      setMode("message");
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

  /* ------------------------------------------------------------ message */
  // Get a free access key at https://web3forms.com (just an email address,
  // no password) and drop it in below — it's meant to live in client-side
  // code, it isn't a secret. Until it's swapped in, Send fails gracefully
  // and points the visitor at the mailto fallback instead of pretending to
  // succeed.
  const CONTACT_ACCESS_KEY = "63a534f2-c4b0-4ce1-8cda-73659ad20411";

  const msgBody = () => backdrop.querySelector("#askMsgBody");
  const msgFoot = () => backdrop.querySelector("#askMsgFoot");
  const msgState = { name: "", email: "", interest: "", note: "" };
  let msgStarted = false;

  function addBotMessage(html) {
    const el = document.createElement("div");
    el.className = "ask-msg bot";
    el.innerHTML = html;
    msgBody().appendChild(el);
    msgBody().scrollTop = msgBody().scrollHeight;
  }
  function addUserMessage(text) {
    const el = document.createElement("div");
    el.className = "ask-msg user";
    el.textContent = text;
    msgBody().appendChild(el);
    msgBody().scrollTop = msgBody().scrollHeight;
  }
  async function botSay(html) {
    const t = document.createElement("div");
    t.className = "ask-typing";
    t.innerHTML = "<span></span><span></span><span></span>";
    msgBody().appendChild(t);
    msgBody().scrollTop = msgBody().scrollHeight;
    await new Promise((r) => setTimeout(r, 550));
    t.remove();
    addBotMessage(html);
  }
  function clearMsgFoot() {
    msgFoot().innerHTML = "";
  }

  async function startMessage(carryQuery) {
    if (msgStarted) return;
    msgStarted = true;
    if (carryQuery) {
      msgState.note = `Was searching for: "${carryQuery}"`;
      await botSay(
        `No luck finding "<b>${escape(carryQuery)}</b>" in my written work — happy to answer directly instead. Mind sharing a few details?`,
      );
    } else {
      await botSay(
        "Hey — I'm not an AI, just the fastest way to reach Prudhvi directly. Mind sharing a few details?",
      );
    }
    askName();
  }

  function askName() {
    clearMsgFoot();
    msgFoot().innerHTML = `
      <div class="ask-field-row">
        <input type="text" id="askMsgName" placeholder="Your name" autocomplete="name" />
        <button class="ask-send" id="askMsgNameNext" type="button">Next</button>
      </div>
      <p class="ask-err" id="askMsgNameErr" hidden>Mind sharing your name first?</p>`;
    const input = backdrop.querySelector("#askMsgName");
    const err = backdrop.querySelector("#askMsgNameErr");
    const submit = () => {
      const v = input.value.trim();
      if (!v) {
        err.hidden = false;
        input.focus();
        return;
      }
      msgState.name = v;
      addUserMessage(v);
      clearMsgFoot();
      askEmail();
    };
    backdrop.querySelector("#askMsgNameNext").addEventListener("click", submit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });
    input.focus();
  }

  async function askEmail() {
    await botSay(
      `Nice to meet you, <b>${escape(msgState.name)}</b>. What's the best email to reach you at?`,
    );
    msgFoot().innerHTML = `
      <div class="ask-field-row">
        <input type="email" id="askMsgEmail" placeholder="you@company.com" autocomplete="email" />
        <button class="ask-send" id="askMsgEmailNext" type="button">Next</button>
      </div>
      <p class="ask-err" id="askMsgEmailErr" hidden>That doesn't look like a valid email.</p>`;
    const input = backdrop.querySelector("#askMsgEmail");
    const err = backdrop.querySelector("#askMsgEmailErr");
    const valid = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    const submit = () => {
      const v = input.value.trim();
      if (!valid(v)) {
        err.hidden = false;
        input.focus();
        return;
      }
      msgState.email = v;
      addUserMessage(v);
      clearMsgFoot();
      askInterest();
    };
    backdrop.querySelector("#askMsgEmailNext").addEventListener("click", submit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });
    input.focus();
  }

  async function askInterest() {
    await botSay("What are you looking for?");
    msgFoot().innerHTML = `
      <div class="ask-chip-row" id="askInterestChips">
        <button class="ask-chip" data-v="Advisory engagement">Advisory engagement</button>
        <button class="ask-chip" data-v="Consulting / contract">Consulting / contract</button>
        <button class="ask-chip" data-v="Full-time hire">Full-time hire</button>
        <button class="ask-chip" data-v="Just saying hi">Just saying hi</button>
      </div>`;
    backdrop.querySelectorAll("#askInterestChips .ask-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        msgState.interest = chip.dataset.v;
        addUserMessage(chip.dataset.v);
        clearMsgFoot();
        askNote();
      });
    });
  }

  async function askNote() {
    await botSay(
      "Anything specific I should mention to Prudhvi before he replies? (optional)",
    );
    msgFoot().innerHTML = `
      <div class="ask-field-row">
        <textarea id="askMsgNote" rows="2" placeholder="e.g. migrating a legacy platform, timeline is Q1..."></textarea>
      </div>
      <div class="ask-foot-actions">
        <button class="ask-link-btn" id="askMsgSkip" type="button">Skip</button>
        <button class="ask-send" id="askMsgNoteNext" type="button">Continue</button>
      </div>`;
    const input = backdrop.querySelector("#askMsgNote");
    backdrop.querySelector("#askMsgSkip").addEventListener("click", () => {
      showRecap();
    });
    backdrop.querySelector("#askMsgNoteNext").addEventListener("click", () => {
      const v = input.value.trim();
      if (v) {
        msgState.note = v;
        addUserMessage(v);
      }
      showRecap();
    });
    input.focus();
  }

  async function showRecap() {
    clearMsgFoot();
    await botSay(`
      Here's what I've got — sending this straight to Prudhvi's inbox:
      <dl class="ask-recap">
        <dt>Name</dt><dd>${escape(msgState.name)}</dd>
        <dt>Email</dt><dd>${escape(msgState.email)}</dd>
        <dt>Looking for</dt><dd>${escape(msgState.interest)}</dd>
        ${msgState.note ? `<dt>Note</dt><dd>${escape(msgState.note)}</dd>` : ""}
      </dl>`);
    msgFoot().innerHTML = `
      <div class="ask-foot-actions">
        <button class="ask-link-btn" id="askMsgRestart" type="button">← Start over</button>
        <button class="ask-send" id="askMsgSend" type="button">Send →</button>
      </div>`;
    backdrop.querySelector("#askMsgRestart").addEventListener("click", () => {
      msgBody().innerHTML = "";
      msgState.name = "";
      msgState.email = "";
      msgState.interest = "";
      msgState.note = "";
      msgStarted = false;
      startMessage();
    });
    backdrop.querySelector("#askMsgSend").addEventListener("click", sendMessage);
  }

  async function sendMessage() {
    clearMsgFoot();
    msgFoot().innerHTML = `<p class="ask-sending">Sending…</p>`;

    const finishAsSent = async () => {
      await botSay(
        `Sent — thanks, <b>${escape(msgState.name)}</b>. Expect a reply within a business day or two. You can also reach <b>anupojuprudhvi@gmail.com</b> directly anytime.`,
      );
      clearMsgFoot();
      msgFoot().innerHTML = `<div class="ask-foot-actions"><span></span><button class="ask-link-btn" id="askMsgClose" type="button">Close</button></div>`;
      backdrop.querySelector("#askMsgClose").addEventListener("click", close);
      msgStarted = false;
      msgState.name = "";
      msgState.email = "";
      msgState.interest = "";
      msgState.note = "";
    };

    // Honeypot: a real visitor never touches #askBotcheck (it isn't part of
    // any step in the guided flow and sits off-screen). Something did fill
    // it in only by scripting the DOM directly, so quietly pretend the send
    // worked instead of hitting the network — never tip the bot off that it
    // was caught, and never spend a real email on it.
    if (backdrop.querySelector("#askBotcheck")?.checked) {
      await finishAsSent();
      return;
    }

    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: CONTACT_ACCESS_KEY,
          name: msgState.name,
          email: msgState.email,
          subject: `Portfolio contact — ${msgState.interest}`,
          message: `Looking for: ${msgState.interest}${
            msgState.note ? `\n\nNote: ${msgState.note}` : ""
          }`,
          botcheck: false,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || "Send failed");
      await finishAsSent();
    } catch {
      await botSay(
        "Something went wrong sending that automatically. Please email me directly at <b>anupojuprudhvi@gmail.com</b> — or try again below.",
      );
      clearMsgFoot();
      msgFoot().innerHTML = `
        <div class="ask-foot-actions">
          <a class="ask-link-btn" href="mailto:anupojuprudhvi@gmail.com">Email instead</a>
          <button class="ask-send" id="askMsgRetry" type="button">Try again</button>
        </div>`;
      backdrop.querySelector("#askMsgRetry").addEventListener("click", () => {
        clearMsgFoot();
        msgFoot().innerHTML = `<div class="ask-foot-actions"><span></span><button class="ask-send" id="askMsgSend2" type="button">Send →</button></div>`;
        backdrop.querySelector("#askMsgSend2").addEventListener("click", sendMessage);
      });
    }
  }

  function setMode(mode, carryQuery) {
    const search = mode === "search";
    const tabSearch = backdrop.querySelector("#askTabSearch");
    const tabMessage = backdrop.querySelector("#askTabMessage");
    tabSearch.classList.toggle("active", search);
    tabMessage.classList.toggle("active", !search);
    tabSearch.setAttribute("aria-selected", String(search));
    tabMessage.setAttribute("aria-selected", String(!search));
    backdrop.querySelector("#askSearchMode").hidden = !search;
    backdrop.querySelector("#askMessageMode").hidden = search;
    backdrop.querySelector(".ask-note").hidden = !search;
    if (!search) startMessage(carryQuery);
  }

  function wire() {
    launcher.addEventListener("click", open);
    backdrop.querySelector(".ask-close").addEventListener("click", close);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close();
    });
    backdrop.querySelector("#askTabSearch").addEventListener("click", () => setMode("search"));
    backdrop.querySelector("#askTabMessage").addEventListener("click", () => setMode("message"));
    backdrop.querySelector("#askSwitchToMessage").addEventListener("click", () => {
      setMode("message", backdrop.querySelector("#askInput").value.trim());
    });
    backdrop.querySelector("#askResults").addEventListener("click", (e) => {
      if (e.target.closest(".ask-empty-switch")) {
        setMode("message", backdrop.querySelector("#askInput").value.trim());
      }
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
