/* Raj: the homepage guide.

   Raj is Prudhvi as a hologram on a projection pedestal. On a visitor's first page
   view it waves, says hello, swipes open a topic menu, and walks them to the
   section they pick. There it points a laser at what it's describing. It steps
   through the case studies as milestones, notices when someone lingers on a
   case study ("I see you're reading..."), can open a case study for them, answers
   questions from the case-study index, and when he has no answer, hands the
   question to the message form in "Ask or message me" (assistant.js).

   Visitors only ever see the name "Raj": user-facing text never calls him an
   avatar, a figure, or a model.

   It is not an AI: every line is written below or read from the page itself,
   so keep the SECTIONS text in step with content/home.html.

   - The optimized local sprite atlas matches the homepage hologram and uses
     the owner's photo as the facial reference.
   - The picture is decorative. The panel uses real text and buttons, and keeps
     working if the picture fails to load. Motion follows reduced motion and
     the footer's Pause animations control. A first-visit greeting is optional.
   - Panels use the site's inverse and accent tokens (see companion.css). */
(() => {
  "use strict";

  const script = document.currentScript;
  const portraitUrl = new URL("images/raj-poses.webp", script ? script.src : location.href).href;
  const indexUrl = new URL("case-studies.json", script ? script.src : location.href).href;
  const root = document.documentElement;
  const reduceQuery = matchMedia("(prefers-reduced-motion: reduce)");
  const motionOff = () => reduceQuery.matches || root.classList.contains("motion-paused");
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const textOf = (el) => (el ? el.innerText || el.textContent : "").replace(/\s+/g, " ").trim();
  const pad = (n) => String(n).padStart(2, "0");
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const storage = (kind) => ({
    get: (key) => { try { return window[kind].getItem(key); } catch { return null; } },
    set: (key, value) => { try { window[kind].setItem(key, value); } catch {} },
    remove: (key) => { try { window[kind].removeItem(key); } catch {} },
  });
  const local = storage("localStorage");
  const session = storage("sessionStorage");

  /* ---------------------------------------------------------- content */
  const TOPICS = [
    { key: "work", label: "Case studies", sub: "Production systems and their outcomes" },
    { key: "approach", label: "How I work", sub: "Foundations, migration, security, FinOps" },
    { key: "background", label: "Experience & credentials", sub: "Roles, certifications, education" },
    { key: "contact", label: "Get in touch", sub: "Questions about the work" },
  ];

  // Facts here repeat content/home.html; update both together.
  const SECTIONS = {
    top: {
      selector: "#top", point: "#top h1", tag: "Overview",
      say: "I build cloud platforms that hold up under real production load: 10+ years of enterprise delivery, $2.5M+ in projected TCO and licensing savings, and 1,000+ workloads profiled, migrated, and modernized.",
    },
    work: {
      selector: "#work", point: "#work h2", tag: "Selected work",
      say: "These are projects where downtime, audits, and the monthly bill all mattered. Let me walk you through them one milestone at a time.",
    },
    approach: {
      selector: "#approach", point: "#approach h2", tag: "How I work",
      say: "I work across the parts that usually get split between teams: cloud foundations, migration, security and automation, and FinOps. Every change follows ITIL change control.",
    },
    background: {
      selector: "#background", point: "#background h2", tag: "Experience",
      say: "I started in Linux systems engineering, moved into automation, and now lead cloud platform architecture at Cloud Destinations.",
    },
    credentials: {
      selector: "#credentials", point: "#credentials h2", tag: "Credentials",
      say: "AWS Certified Solutions Architect – Associate, HashiCorp Terraform Associate, AWS MAP Accredited Practitioner, and a B.E. in Mechanical Engineering.",
    },
    contact: {
      selector: "#contact", point: "#contact h2", tag: "Get in touch",
      say: "Questions about any of this work? Send me a message right here. Email and LinkedIn are the quickest ways to reach me.",
    },
  };
  const NEXT = { top: "work", approach: "background", background: "credentials", credentials: "contact" };

  const READABLE = ".recent-card-link, #work article.case";
  const visibleCases = () => [...document.querySelectorAll("#work article.case")].filter((el) => el.offsetParent !== null);

  function cardInfo(card) {
    if (card.matches(".recent-card-link")) {
      return {
        title: textOf($(".recent-card-title", card)),
        rows: [["Area", textOf($(".recent-card-tag", card))], ["Highlight", textOf($(".recent-card-badge", card))]],
        link: card,
        point: $(".recent-card-title", card) || card,
      };
    }
    const result = $(".case-result", card);
    return {
      title: textOf($("h3", card)),
      rows: [
        ["Sector", textOf($(".tag", card)).replace(/^\d+\s*\/\s*/, "")],
        ["Outcome", [textOf($("strong", result)), textOf($("p", result))].filter(Boolean).join(": ")],
        ["Stack", textOf($(".case-stack", card))],
      ],
      link: $('h3 a[href], a[href*="case-studies/"]', card),
      point: $("h3", card) || card,
    };
  }

  /* --------------------------------------------------------------- UI */
  const personIcon = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M5.5 21v-2a6.5 6.5 0 0 1 13 0v2"/></svg>`;
  const svg = (d) => `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

  const launcher = document.createElement("button");
  launcher.type = "button";
  launcher.className = "companion-launcher";
  launcher.title = "Ask Raj, your guide";
  launcher.setAttribute("aria-expanded", "false");
  launcher.setAttribute("aria-controls", "companionHud");
  launcher.innerHTML = `<span class="companion-launcher-icon">${personIcon}</span><span class="companion-launcher-label">Ask Raj</span>`;

  const stage = document.createElement("div");
  stage.className = "companion-stage";
  stage.hidden = true;
  stage.setAttribute("aria-hidden", "true");

  const hud = document.createElement("div");
  hud.className = "companion-hud";
  hud.id = "companionHud";
  hud.hidden = true;
  hud.tabIndex = -1;
  hud.setAttribute("role", "region");
  hud.setAttribute("aria-label", "Raj, your guide");
  hud.innerHTML = `
    <div class="companion-hud-head" data-c="handle" title="Drag to move">
      <p class="companion-status"><span class="companion-status-dot" aria-hidden="true"></span><span>Raj · online</span></p>
      <div class="companion-head-actions">
        <button class="companion-icon-btn" type="button" data-c="voice" aria-pressed="false" aria-label="Read aloud" title="Read aloud" hidden>${svg('<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>')}</button>
        <button class="companion-icon-btn" type="button" data-c="menu" aria-label="Show topics" title="Topics">${svg('<path d="M4 6h16M4 12h16M4 18h16"/>')}</button>
        <button class="companion-icon-btn" type="button" data-c="min" aria-expanded="true" aria-label="Minimize Raj's panel" title="Minimize">${svg('<path d="M5 12h14"/>')}</button>
        <button class="companion-icon-btn" type="button" data-c="close" aria-label="Close Raj" title="Close">×</button>
      </div>
    </div>
    <button class="companion-peek" type="button" data-c="peek" hidden><span class="companion-peek-text" data-c="peek-text"></span><span class="companion-peek-open" aria-hidden="true">Open ▴</span></button>
    <div class="companion-body" data-c="body">
    <p class="companion-bubble-tag" data-c="tag"></p>
    <p class="companion-bubble-text" data-c="typed" aria-hidden="true"></p>
    <p class="companion-sr" data-c="live" aria-live="polite"></p>
    <div class="companion-card" data-c="card" hidden>
      <p class="companion-card-title" data-c="card-title"></p>
      <dl class="companion-card-rows" data-c="card-rows"></dl>
    </div>
    <div class="companion-topics" data-c="topics" hidden></div>
    <div class="companion-results" data-c="results" hidden></div>
    <div class="companion-actions" data-c="actions" hidden></div>
    <form class="companion-ask" data-c="ask">
      <label class="companion-sr" for="rajInput">Ask Raj a question</label>
      <input id="rajInput" type="text" autocomplete="off" maxlength="120" placeholder="Ask me anything: Aurora, Terraform, contact…" />
      <button class="companion-send" type="submit" aria-label="Ask Raj">${svg('<path d="M5 12h14M13 6l6 6-6 6"/>')}</button>
    </form>
    <div class="companion-foot">
      <button class="companion-link-btn" type="button" data-c="tour" aria-pressed="false">▶ Full guided tour</button>
      <p class="companion-note" data-c="note"></p>
    </div>
    </div>
    <div class="companion-resize" data-c="resize" aria-hidden="true" title="Drag to resize"></div>`;

  const laser = document.createElement("div");
  laser.className = "companion-laser";
  laser.setAttribute("aria-hidden", "true");
  const reticle = document.createElement("div");
  reticle.className = "companion-reticle";
  reticle.setAttribute("aria-hidden", "true");
  reticle.innerHTML = `<span class="tl"></span><span class="tr"></span><span class="bl"></span><span class="br"></span>`;

  const part = (name) => $(`[data-c="${name}"]`, hud);
  const ui = {
    tag: part("tag"), typed: part("typed"), live: part("live"),
    card: part("card"), cardTitle: part("card-title"), cardRows: part("card-rows"),
    topics: part("topics"), actions: part("actions"), tour: part("tour"), note: part("note"),
    voice: part("voice"), results: part("results"), ask: part("ask"), input: $("#rajInput", hud),
    body: part("body"), peek: part("peek"), peekText: part("peek-text"), min: part("min"),
    handle: part("handle"), resize: part("resize"),
  };
  const isOpen = () => !hud.hidden;

  /* ------------------------------------------ minimize, move, resize */
  // The panel minimizes to a one-line peek bar, moves by dragging its header,
  // and resizes from its bottom-right corner. Both last for the session.
  let minimized = false;
  let placed = false;

  function setMinimized(next) {
    minimized = next;
    hud.classList.toggle("is-min", next);
    ui.body.hidden = next;
    ui.peek.hidden = !next;
    ui.peek.classList.remove("is-new");
    ui.min.setAttribute("aria-expanded", String(!next));
    ui.min.setAttribute("aria-label", next ? "Expand Raj's panel" : "Minimize Raj's panel");
    ui.min.title = next ? "Expand" : "Minimize";
    ui.min.innerHTML = svg(next ? '<path d="M6 15l6-6 6 6"/>' : '<path d="M5 12h14"/>');
    session.set("companion-min", next ? "1" : "");
  }

  // Keeps the header on screen so the panel can always be dragged back.
  function place({ left, top, width, height }, resized = false) {
    placed = true;
    undock();
    hud.classList.add("is-placed");
    const x = Math.max(8, Math.min(left, innerWidth - width - 8));
    const y = Math.max(8, Math.min(top, innerHeight - 56));
    Object.assign(hud.style, { left: `${x}px`, top: `${y}px`, right: "auto", bottom: "auto" });
    if (resized) Object.assign(hud.style, { width: `${width}px`, height: `${height}px`, maxHeight: "none" });
    session.set("companion-place", JSON.stringify({ left: x, top: y, width: hud.style.width, height: hud.style.height }));
  }

  function restorePlacement() {
    let saved = null;
    try {
      saved = JSON.parse(session.get("companion-place") || "null");
    } catch {}
    if (saved) {
      if (saved.width) Object.assign(hud.style, { width: saved.width, height: saved.height, maxHeight: "none" });
      const r = hud.getBoundingClientRect();
      place({ left: saved.left, top: saved.top, width: r.width, height: r.height });
    }
    setMinimized(session.get("companion-min") === "1");
  }

  function dragWith(handle, onMove) {
    handle.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || e.target.closest("button")) return;
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      const rect = hud.getBoundingClientRect();
      handle.setPointerCapture(e.pointerId);
      hud.classList.add("is-dragging");
      const move = (ev) => onMove(rect, ev.clientX - startX, ev.clientY - startY);
      const end = () => {
        hud.classList.remove("is-dragging");
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", end);
        handle.removeEventListener("pointercancel", end);
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", end);
      handle.addEventListener("pointercancel", end);
    });
  }

  /* ------------------------------------------------------------ speech */
  let typeTimer = 0;
  let voiceOn = local.get("companion-voice") === "on";
  const canSpeak = "speechSynthesis" in window && typeof SpeechSynthesisUtterance === "function";

  let speechRequest = 0;
  function stopSpeech() {
    speechRequest++;
    if (canSpeak) speechSynthesis.cancel();
  }

  async function speak(message) {
    if (!canSpeak || !message) return;
    stopSpeech();
    const request = speechRequest;
    let voices = speechSynthesis.getVoices();
    // Some browsers populate voices only after the first speech interaction.
    if (!voices.length) {
      await new Promise((resolve) => {
        const finish = () => {
          clearTimeout(timeout);
          speechSynthesis.removeEventListener("voiceschanged", finish);
          resolve();
        };
        const timeout = setTimeout(finish, 800);
        speechSynthesis.addEventListener("voiceschanged", finish);
      });
      voices = speechSynthesis.getVoices();
    }
    if (request !== speechRequest || !voiceOn || !isOpen()) return;
    const indianVoice = voices.find((voice) => /^en[-_]in$/i.test(voice.lang))
      || voices.find((voice) => /^en(?:[-_]|$)/i.test(voice.lang) && /\bindia(?:n)?\b/i.test(voice.name));
    const utterance = new SpeechSynthesisUtterance(message);
    if (indianVoice) utterance.voice = indianVoice;
    utterance.lang = "en-IN";
    utterance.rate = 0.9;
    utterance.pitch = 1;
    speechSynthesis.speak(utterance);
  }

  function say(tag, message, { alert = false } = {}) {
    hud.classList.toggle("is-alert", alert);
    ui.tag.textContent = tag;
    ui.live.textContent = message;
    ui.peekText.textContent = message;
    // A new line while minimized makes the peek bar glow once.
    ui.peek.classList.remove("is-new");
    if (minimized && !motionOff()) requestAnimationFrame(() => ui.peek.classList.add("is-new"));
    clearInterval(typeTimer);
    if (motionOff()) {
      ui.typed.textContent = message;
      ui.typed.classList.remove("is-typing");
    } else {
      let shown = 0;
      ui.typed.textContent = "";
      ui.typed.classList.add("is-typing");
      typeTimer = setInterval(() => {
        shown += 2;
        ui.typed.textContent = message.slice(0, shown);
        if (shown >= message.length) {
          clearInterval(typeTimer);
          ui.typed.classList.remove("is-typing");
        }
      }, 16);
    }
    raj.talk(Math.min(5000, message.length * 40), alert);
    if (voiceOn) speak(message);
  }

  function setCard(info) {
    ui.card.hidden = !info;
    if (!info) return;
    ui.cardTitle.textContent = info.title;
    ui.cardRows.replaceChildren(
      ...info.rows.filter(([, value]) => value).flatMap(([label, value]) => {
        const dt = document.createElement("dt");
        dt.textContent = label;
        const dd = document.createElement("dd");
        dd.textContent = value;
        return [dt, dd];
      }),
    );
  }

  function setActions(list) {
    ui.actions.replaceChildren(
      ...list.filter(Boolean).map(({ label, primary, run }) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = primary ? "companion-btn companion-btn-primary" : "companion-btn";
        button.textContent = label;
        button.addEventListener("click", run);
        return button;
      }),
    );
    ui.actions.hidden = !ui.actions.children.length;
  }

  function showTopics(show) {
    ui.topics.hidden = !show;
    if (show) setResults([]);
  }

  function setResults(items) {
    ui.results.replaceChildren(
      ...items.map((item) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "companion-result";
        button.innerHTML = `<span class="companion-result-title"></span><span class="companion-result-meta"></span>`;
        $(".companion-result-title", button).textContent = item.title;
        $(".companion-result-meta", button).textContent = [item.projectShort, item.layer].filter(Boolean).join(" · ");
        button.addEventListener("click", () => takeTo(item));
        return button;
      }),
    );
    ui.results.hidden = !items.length;
  }

  ui.topics.replaceChildren(
    ...TOPICS.map((topic, i) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "companion-topic";
      button.dataset.topic = topic.key;
      button.innerHTML = `<span class="companion-topic-num">${pad(i + 1)}</span><span><span class="companion-topic-label"></span><span class="companion-topic-sub"></span></span><span class="companion-topic-go" aria-hidden="true">→</span>`;
      $(".companion-topic-label", button).textContent = topic.label;
      $(".companion-topic-sub", button).textContent = topic.sub;
      button.addEventListener("click", () => (topic.key === "work" ? goTo("work", { thenCase: true }) : goTo(topic.key)));
      return button;
    }),
  );

  /* ------------------------------------------------------------- flows */
  // Every flow takes a ticket; starting a new one cancels whatever was running.
  let flowId = 0;
  let touring = false;
  let walking = false;

  function newFlow() {
    watchReading(null);
    flowId++;
    walking = false;
    if (touring) {
      touring = false;
      setTourButton(false);
    }
    return flowId;
  }

  function setTourButton(playing) {
    ui.tour.setAttribute("aria-pressed", String(playing));
    ui.tour.textContent = playing ? "■ Stop the tour" : "▶ Full guided tour";
  }

  function settleScroll(maxMs = 2200) {
    return new Promise((resolve) => {
      const start = performance.now();
      let last = scrollY;
      let still = 0;
      const tick = () => {
        if (Math.abs(scrollY - last) < 1) still++;
        else {
          still = 0;
          last = scrollY;
        }
        if (still >= 4 || performance.now() - start > maxMs) resolve();
        else setTimeout(tick, 60);
      };
      setTimeout(tick, 60);
    });
  }

  // "Follow me": the guide escorts the visitor as the page scrolls.
  async function walkTo(el, block, flow) {
    walking = true;
    clearPoint();
    raj.setMode("walk");
    el.scrollIntoView({ behavior: motionOff() ? "auto" : "smooth", block });
    await Promise.all([settleScroll(), wait(motionOff() ? 0 : 1100)]);
    if (flow !== flowId) return false;
    walking = false;
    raj.setMode("idle");
    return true;
  }

  async function greet() {
    const flow = newFlow();
    session.set("companion-greeted", "1");
    showTopics(false);
    setCard(null);
    setActions([]);
    clearPoint();
    raj.setMode("wave");
    const hour = new Date().getHours();
    const daypart = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    say("Hello there", `Hola! ${daypart}. I'm Raj, and this is my portfolio. I can show you around, answer questions, or take a message for me.`);
    await wait(motionOff() ? 0 : 2800);
    if (flow !== flowId) return;
    showMenu();
  }

  function showMenu() {
    newFlow();
    clearPoint();
    setCard(null);
    setActions([{ label: "I'll explore on my own", run: exploreAlone }]);
    raj.setMode("swipe");
    say("Choose a topic", "What would you like to know? Pick a topic and I'll take you there, or ask me anything below.");
    showTopics(true);
  }

  function exploreAlone() {
    newFlow();
    showTopics(false);
    setCard(null);
    setActions([{ label: "Show topics", run: showMenu }]);
    raj.setMode("idle");
    say("Standing by", "Sure, take your time. Pause on any case study and I'll tell you about it, or ask me anything below.");
  }

  async function goTo(key, { flow = newFlow(), thenCase = false } = {}) {
    const section = SECTIONS[key];
    const el = section && $(section.selector);
    if (!el) return;
    showTopics(false);
    setResults([]);
    setCard(null);
    setActions([]);
    const label = TOPICS.find((t) => t.key === key)?.label || section.tag;
    say("Navigating", `This way. Follow me to ${label.toLowerCase()}.`);
    if (!(await walkTo(el, "start", flow))) return;
    pointAt($(section.point) || el);
    say(section.tag, section.say);
    if (touring) return;
    const next = NEXT[key];
    setActions([
      thenCase && { label: "Start with milestone 01", primary: true, run: () => caseStep(0) },
      key === "contact" && { label: "Leave me a message", primary: true, run: () => leaveMessage("") },
      key === "contact" && { label: "Email me", run: () => activeClick($('#contact a[href^="mailto:"]')) },
      next && { label: `Next: ${SECTIONS[next].tag}`, primary: !thenCase, run: () => (next === "work" ? goTo("work", { thenCase: true }) : goTo(next)) },
      { label: "Topics", run: showMenu },
    ]);
  }

  async function caseStep(index, flow = newFlow()) {
    const cases = visibleCases();
    if (!cases.length) return;
    const i = Math.max(0, Math.min(index, cases.length - 1));
    const card = cases[i];
    const info = cardInfo(card);
    showTopics(false);
    setResults([]);
    setActions([]);
    say("Navigating", `Milestone ${pad(i + 1)}. Follow me.`);
    if (!(await walkTo(card, "center", flow))) return;
    pointAt(info.point);
    setCard(info);
    say(`Milestone ${pad(i + 1)} of ${pad(cases.length)}`, `Milestone ${pad(i + 1)}: ${info.title}`);
    if (touring) return;
    const last = i === cases.length - 1;
    setActions([
      { label: last ? "Next: How I work" : "Next milestone", primary: true, run: () => (last ? goTo("approach") : caseStep(i + 1)) },
      info.link && { label: "Open case study", run: () => activeClick(info.link, info.title) },
      { label: "Ask about this", run: () => openAsk(info.title) },
      { label: "Topics", run: showMenu },
    ]);
  }

  async function tour() {
    const flow = newFlow();
    touring = true;
    setTourButton(true);
    setActions([]);
    const steps = [
      () => goTo("top", { flow }),
      ...visibleCases().map((_, i) => () => caseStep(i, flow)),
      ...["approach", "background", "credentials", "contact"].map((key) => () => goTo(key, { flow })),
    ];
    for (const step of steps) {
      await step();
      if (flow !== flowId) return;
      await wait(motionOff() ? 5000 : 6500);
      if (flow !== flowId) return;
    }
    newFlow();
    clearPoint();
    setCard(null);
    say("Tour complete", "That's the whole tour. What would you like to look at next?");
    showTopics(true);
    raj.setMode("swipe");
  }

  /* ------------------------------------------------- reading detection */
  // Lingering on a case study (pointer or keyboard focus) for a moment
  // counts as reading it. Each one is offered once per page view.
  const offered = new WeakSet();
  let hoverTimer = 0;
  let hoverCard = null;

  function watchReading(card) {
    if (card === hoverCard) return;
    hoverCard = card;
    clearTimeout(hoverTimer);
    if (card && !offered.has(card)) hoverTimer = setTimeout(() => offerHelp(card), 2200);
  }

  function offerHelp(card) {
    if (!isOpen() || touring || walking || hoverCard !== card) return;
    offered.add(card);
    newFlow();
    const info = cardInfo(card);
    showTopics(false);
    pointAt(info.point);
    setCard(info);
    say("Can I help?", `I see you're reading “${info.title}”. How may I help you?`, { alert: true });
    setActions([
      info.link && { label: "Open it for me", primary: true, run: () => activeClick(info.link, info.title) },
      { label: "Ask about this", primary: !info.link, run: () => openAsk(info.title) },
      { label: "Not now", run: exploreAlone },
    ]);
  }

  /* --------------------------------------------------------- questions */
  // Raj answers from the same index as "Ask about my work"
  // (assets/case-studies.json). Questions about a section take the visitor
  // there; anything he can't answer becomes a message to Prudhvi.
  const INTENTS = [
    { key: "contact", words: ["contact", "email", "e-mail", "reach you", "message", "linkedin", "get in touch"] },
    { key: "credentials", words: ["certification", "certifications", "certified", "certificate", "education", "degree", "university"] },
    { key: "background", words: ["experience", "background", "career", "resume", "cv", "employer", "job"] },
    { key: "approach", words: ["approach", "process", "method", "itil", "change control", "how do you work", "how you work"] },
    { key: "work", words: ["case studies", "case study", "projects", "portfolio", "selected work"] },
  ];
  const STOP = new Set("a an and any are about can could did do does for from have has how i in is it me my of on or show tell that the this to was what when where which who why with you your".split(" "));

  let indexLoad = null;
  const loadIndex = () =>
    (indexLoad ??= fetch(indexUrl).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }).catch((error) => {
      indexLoad = null;
      throw error;
    }));

  const termsOf = (query) => query.toLowerCase().split(/[^a-z0-9+#.-]+/).filter((t) => t.length > 1 && !STOP.has(t));

  function rank(items, query) {
    const terms = termsOf(query);
    if (!terms.length) return [];
    return items
      .map((item) => {
        const title = `${item.title} ${item.nav}`.toLowerCase();
        const meta = [...(item.stack || []), ...(item.tags || []), item.projectName, item.layer].join(" ").toLowerCase();
        const body = `${item.summary} ${item.problem} ${item.solution}`.toLowerCase();
        let score = 0;
        let hits = 0;
        for (const t of terms) {
          const s = (title.includes(t) ? 10 : 0) + (meta.includes(t) ? 5 : 0) + (body.includes(t) ? 3 : 0);
          if (s) hits++;
          score += s;
        }
        // Most of the meaningful words have to land, not just one.
        return { item, score: hits >= Math.ceil(terms.length * 0.6) ? score : 0 };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((r) => r.item);
  }

  async function answerQuery(raw) {
    const query = raw.trim().slice(0, 120);
    if (!query) return;
    const lower = ` ${query.toLowerCase()} `;
    const intent = INTENTS.find((i) => i.words.some((w) => lower.includes(` ${w} `) || lower.includes(` ${w}?`) || lower.includes(` ${w}s `)));
    const goToIntent = () => goTo(intent.key, { thenCase: intent.key === "work" });
    // "How can I contact you?" is about a section; "Aurora experience?" is a
    // search for Aurora that happens to contain a section word.
    const isIntentWord = (t) => intent && intent.words.some((w) => w.includes(t) || t.startsWith(w));
    const searchTerms = termsOf(query).filter((t) => !isIntentWord(t));
    if (intent && !searchTerms.length) {
      goToIntent();
      return;
    }
    const flow = newFlow();
    clearPoint();
    showTopics(false);
    setCard(null);
    setResults([]);
    setActions([]);
    raj.setMode("idle");
    say("Searching", `Let me check my work for “${query}”…`);
    let items;
    try {
      items = rank(await loadIndex(), searchTerms.join(" "));
    } catch {
      if (flow !== flowId) return;
      say("Search is offline", "I couldn't load my notes just now. Leave me a message and I'll get back to you as soon as I can.", { alert: true });
      setActions([{ label: "Leave me a message", primary: true, run: () => leaveMessage(query) }, { label: "Topics", run: showMenu }]);
      return;
    }
    if (flow !== flowId) return;
    if (items.length) {
      raj.setMode("swipe");
      say("Found it", `Here's what I have on “${query}”. Pick one and I'll take you there.`);
      setResults(items);
      setActions([{ label: "Leave me a message", run: () => leaveMessage("") }, { label: "Topics", run: showMenu }]);
    } else if (intent) {
      goToIntent();
    } else {
      say("Let's talk", `I haven't written about “${query}” here yet. Leave me a message and I'll get back to you as soon as I can.`, { alert: true });
      setActions([{ label: "Leave me a message", primary: true, run: () => leaveMessage(query) }, { label: "Topics", run: showMenu }]);
    }
  }

  // A case study on this page: walk there and press it. Elsewhere: go there.
  async function takeTo(item) {
    const onPage = [...document.querySelectorAll("a[href]")].find((a) => a.getAttribute("href") === item.url && a.offsetParent !== null);
    if (onPage) {
      activeClick(onPage, item.title);
      return;
    }
    const flow = newFlow();
    setResults([]);
    setActions([]);
    raj.setMode("poke");
    say("On my way", `Taking you to “${item.title}”…`);
    await wait(motionOff() ? 0 : 900);
    if (flow !== flowId) return;
    location.href = new URL(item.url, location.href).href;
  }

  // Opens the message form in "Ask or message me", with the question filled in.
  function leaveMessage(query) {
    const askLauncher = $(".ask-launcher");
    const input = document.getElementById("askInput");
    const toMessage = document.getElementById("askSwitchToMessage");
    if (!askLauncher || !input || !toMessage) {
      goTo("contact");
      return;
    }
    input.value = query || "";
    askLauncher.click();
    toMessage.click();
  }

  /* -------------------------------------------------------- hand-offs */
  function openAsk(query) {
    const askLauncher = $(".ask-launcher");
    const input = document.getElementById("askInput");
    if (!askLauncher || !input) {
      goTo("contact");
      return;
    }
    // assistant.js searches whatever is in the box when it opens.
    if (query) input.value = query;
    askLauncher.click();
  }

  // Raj reaches out and presses the link for the visitor.
  async function activeClick(el, title = textOf(el)) {
    if (!el) return;
    const flow = newFlow();
    setActions([]);
    say("On it", `Opening “${title}”…`);
    el.scrollIntoView({ behavior: motionOff() ? "auto" : "smooth", block: "center" });
    await settleScroll(1200);
    if (flow !== flowId) return;
    pointAt(el);
    raj.setMode("poke");
    await wait(motionOff() ? 150 : 850);
    if (flow !== flowId) return;
    ripple(el);
    await wait(motionOff() ? 0 : 250);
    if (flow !== flowId) return;
    el.click();
  }

  /* -------------------------------------------------- laser and reticle */
  let pointTarget = null;
  let docked = false;

  // If the panel covers what Raj is pointing at, it moves out of the way:
  // down for targets in the top half of the screen, up for the bottom half.
  function undock() {
    docked = false;
    hud.classList.remove("is-dock-low", "is-dock-high");
  }
  function dodge(r) {
    // Once the visitor has placed the panel themselves, it stays put.
    if (docked || placed) return;
    const h = hud.getBoundingClientRect();
    if (r.right < h.left || r.left > h.right || r.bottom < h.top || r.top > h.bottom) return;
    docked = true;
    hud.classList.add(r.top + r.height / 2 < innerHeight / 2 ? "is-dock-low" : "is-dock-high");
  }

  function pointAt(el) {
    undock();
    pointTarget = el || null;
    raj.setMode(pointTarget ? "point" : "idle");
  }

  function clearPoint() {
    undock();
    pointTarget = null;
    laser.classList.remove("is-on");
    reticle.classList.remove("is-on");
  }

  // Text elements are measured by their text, not their full-width box.
  function targetRect(el) {
    if (/^H[1-6]$/.test(el.tagName)) {
      const range = document.createRange();
      range.selectNodeContents(el);
      const r = range.getBoundingClientRect();
      if (r.width) return r;
    }
    return el.getBoundingClientRect();
  }

  function updateLaser() {
    if (!pointTarget || !pointTarget.isConnected) {
      laser.classList.remove("is-on");
      reticle.classList.remove("is-on");
      raj.aim(null);
      return;
    }
    const r = targetRect(pointTarget);
    const visible = r.bottom > 0 && r.top < innerHeight && r.width > 0;
    reticle.classList.toggle("is-on", visible);
    if (visible) dodge(r);
    const gap = 6;
    reticle.style.width = `${r.width + gap * 2}px`;
    reticle.style.height = `${r.height + gap * 2}px`;
    reticle.style.transform = `translate(${r.left - gap}px, ${r.top - gap}px)`;
    // Aim at the side of the target nearest Raj, mid-height.
    const end = { x: Math.min(r.right + gap, innerWidth - 8), y: r.top + r.height / 2 };
    raj.aim(visible ? end : null);
    const start = raj.fingertip();
    if (!visible || !start) {
      laser.classList.remove("is-on");
      return;
    }
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    laser.style.width = `${Math.hypot(dx, dy)}px`;
    laser.style.transform = `translate(${start.x}px, ${start.y}px) rotate(${Math.atan2(dy, dx)}rad)`;
    laser.classList.add("is-on");
  }

  function ripple(el) {
    if (motionOff()) return;
    const r = el.getBoundingClientRect();
    const dot = document.createElement("div");
    dot.className = "companion-ripple";
    dot.setAttribute("aria-hidden", "true");
    dot.style.left = `${r.left + r.width / 2}px`;
    dot.style.top = `${r.top + r.height / 2}px`;
    document.body.append(dot);
    setTimeout(() => dot.remove(), 600);
  }

  /* -------------------------------------------------- open, close, loop */
  let rafId = 0;
  function loop(now) {
    rafId = 0;
    if (!isOpen()) return;
    raj.frame(now);
    updateLaser();
    rafId = requestAnimationFrame(loop);
  }

  function open({ auto = false } = {}) {
    if (isOpen()) {
      setMinimized(false);
      hud.focus({ preventScroll: true });
      return;
    }
    hud.hidden = false;
    root.classList.add("raj-guide-open");
    stage.hidden = false;
    launcher.hidden = true;
    launcher.setAttribute("aria-expanded", "true");
    restorePlacement();
    if (auto) setMinimized(true);
    if (!auto) {
      local.remove("companion");
      hud.focus({ preventScroll: true });
    }
    raj.load();
    rafId ||= requestAnimationFrame(loop);
    if (session.get("companion-greeted") && !auto) showMenu();
    else greet();
  }

  function close() {
    newFlow();
    clearPoint();
    clearInterval(typeTimer);
    stopSpeech();
    hud.hidden = true;
    root.classList.remove("raj-guide-open");
    stage.hidden = true;
    launcher.hidden = false;
    launcher.setAttribute("aria-expanded", "false");
    local.set("companion", "off");
    if (hud.contains(document.activeElement) || document.activeElement === document.body) launcher.focus({ preventScroll: true });
  }

  /* Six locally hosted poses: wave, point, speak, nod, and rest.
     The guide remains functional when artwork or motion is unavailable. */
  const raj = (() => {
    let portrait;
    let mode = "idle";
    let modeStart = 0;
    let talkUntil = 0;
    let atHero = false;
    const heroPortrait = document.querySelector(".raj-hero-image");
    function pose(now) {
      if (motionOff()) return mode === "point" ? "point" : "idle";
      if (mode === "wave" && now - modeStart < 3000) return Math.floor(now / 450) % 2 ? "wave" : "wave-out";
      if (mode === "point" || mode === "poke") return "point";
      if (now < talkUntil || (mode === "swipe" && now - modeStart < 1800)) return Math.floor(now / 900) % 2 ? "speak" : "nod";
      return Math.floor(now / 4000) % 3 === 1 ? "nod" : "idle";
    }
    return {
      load() {
        if (portrait) return;
        portrait = document.createElement("div");
        portrait.className = "companion-portrait raj-sprite";
        portrait.dataset.pose = "idle";
        stage.append(portrait);
        const image = new Image();
        image.addEventListener("load", () => { portrait.dataset.ready = "true"; });
        image.addEventListener("error", () => {
          portrait.hidden = true;
          part("note").textContent = "My hologram couldn't load, but I can still guide you.";
        });
        image.src = portraitUrl;
      },
      frame(now) {
        const next = pose(now);
        if (portrait && portrait.dataset.pose !== next) portrait.dataset.pose = next;
        if (heroPortrait && heroPortrait.dataset.pose !== next) heroPortrait.dataset.pose = next;
        const r = heroPortrait?.getBoundingClientRect();
        atHero = Boolean(r && r.top < innerHeight && r.bottom > 0);
        stage.classList.toggle("is-at-hero", atHero);
      },
      setMode(next) { mode = next; modeStart = performance.now(); stage.dataset.mode = next; },
      talk(ms, alert) { talkUntil = performance.now() + ms; stage.classList.toggle("is-alert", Boolean(alert)); },
      aim() {},
      fingertip() {
        const r = atHero && heroPortrait ? heroPortrait.getBoundingClientRect() : stage.getBoundingClientRect();
        return r.width ? { x: r.left + r.width * .24, y: r.top + r.height * .14 } : null;
      },
    };
  })();

  /* ------------------------------------------------------------- wire */
  function init() {
    if (!$(SECTIONS.top.selector)) return;
    document.body.append(stage, hud, laser, reticle, launcher);

    launcher.addEventListener("click", () => open());
    part("close").addEventListener("click", close);
    part("menu").addEventListener("click", () => {
      setMinimized(false);
      showMenu();
    });
    ui.min.addEventListener("click", () => setMinimized(!minimized));
    ui.peek.addEventListener("click", () => setMinimized(false));
    ui.handle.addEventListener("dblclick", (e) => {
      if (!e.target.closest("button")) setMinimized(!minimized);
    });
    dragWith(ui.handle, (rect, dx, dy) => place({ left: rect.left + dx, top: rect.top + dy, width: rect.width, height: rect.height }));
    dragWith(ui.resize, (rect, dx, dy) =>
      place({
        left: rect.left,
        top: rect.top,
        width: Math.max(290, Math.min(560, rect.width + dx)),
        height: Math.max(240, Math.min(innerHeight - rect.top - 8, rect.height + dy)),
      }, true));
    addEventListener("resize", () => {
      if (placed && isOpen()) {
        const r = hud.getBoundingClientRect();
        place({ left: r.left, top: r.top, width: r.width, height: r.height });
      }
    });
    ui.ask.addEventListener("submit", (e) => {
      e.preventDefault();
      const question = ui.input.value;
      ui.input.value = "";
      answerQuery(question);
    });
    ui.tour.addEventListener("click", () => (touring ? (newFlow(), exploreAlone()) : tour()));
    hud.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    });

    if (canSpeak) {
      ui.voice.hidden = false;
      ui.voice.setAttribute("aria-pressed", String(voiceOn));
      ui.voice.addEventListener("click", () => {
        voiceOn = !voiceOn;
        ui.voice.setAttribute("aria-pressed", String(voiceOn));
        local.set("companion-voice", voiceOn ? "on" : "off");
        if (voiceOn) speak(ui.live.textContent);
        else stopSpeech();
      });
    }

    document.addEventListener("pointerover", (e) => {
      if (isOpen()) watchReading(hud.contains(e.target) ? null : e.target.closest?.(READABLE) || null);
    });
    document.addEventListener("focusin", (e) => {
      if (isOpen() && !hud.contains(e.target)) watchReading(e.target.closest?.(READABLE) || null);
    });

    // Hero controls and first-visit greeting share the same accessible guide.
    document.querySelectorAll("[data-open-raj]").forEach((button) => {
      button.hidden = false;
      button.addEventListener("click", () => open());
    });
    const greetVisitor = !motionOff() && local.get("companion") !== "off" && !session.get("companion-greeted");
    if (greetVisitor) {
      const start = () => setTimeout(() => {
        if (local.get("companion") !== "off" && !session.get("companion-greeted")) open({ auto: true });
      }, 1800);
      if (document.readyState === "complete") start();
      else addEventListener("load", start, { once: true });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
