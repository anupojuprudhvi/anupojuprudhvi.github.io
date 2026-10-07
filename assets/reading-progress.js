/*
 * Reading progress for learning-path pages.
 *
 * Module pages get a thin bar across the top and a small ring above the chat
 * button showing how much of the module has been read, with a short message
 * at 25%, 50%, 75%, and the end. Finishing a module is remembered in this
 * browser only (localStorage), so module lists can mark what's done.
 * Overview pages only get the "done" marks.
 *
 * Progressive enhancement: without JavaScript, or with storage blocked, the
 * page reads exactly as before. The widget never takes clicks or focus.
 */
(function () {
  "use strict";

  var article = document.querySelector("article.lp-content[data-track]");
  if (!article) {
    showTrackProgress();
    return;
  }

  // ---- Learning-paths hub: "3 of 11 done" on each track card with progress.
  function showTrackProgress() {
    var els = document.querySelectorAll(".track-progress[data-track]");
    Array.prototype.forEach.call(els, function (el) {
      var done = 0;
      try {
        var list = JSON.parse(localStorage.getItem("lp-done:" + el.getAttribute("data-track")) || "[]");
        done = Array.isArray(list) ? list.length : 0;
      } catch (e) {
        return; /* blocked storage: the card simply shows no progress */
      }
      var total = Number(el.getAttribute("data-total")) || 0;
      if (!done || !total) return;
      el.textContent = Math.min(done, total) + " of " + total + " done";
      el.hidden = false;
    });
  }

  var track = article.getAttribute("data-track");
  var total = Number(article.getAttribute("data-total")) || 0;
  var moduleNo = Number(article.getAttribute("data-module")) || 0;
  var slug = article.getAttribute("data-slug");
  var nextTitle = article.getAttribute("data-next-title");
  var storeKey = "lp-done:" + track;

  // ---- What's been completed, per track, in this browser only.
  function readDone() {
    try {
      var list = JSON.parse(localStorage.getItem(storeKey) || "[]");
      return Array.isArray(list) ? list.filter(function (s) { return typeof s === "string"; }) : [];
    } catch (e) {
      return [];
    }
  }
  function saveDone(list) {
    try {
      localStorage.setItem(storeKey, JSON.stringify(list));
    } catch (e) {
      /* private mode or blocked storage: progress simply isn't remembered */
    }
  }

  function slugOf(href) {
    var file = (href || "").split("#")[0].split("?")[0].split("/").pop() || "";
    return file.replace(/\.html$/, "");
  }

  // ---- Mark finished modules in the overview cards and the sidebar list.
  function markDoneLinks() {
    var done = readDone();
    var links = article.querySelectorAll(".lp-module-card, .lp-toc-list > li > a");
    Array.prototype.forEach.call(links, function (link) {
      var isDone = done.indexOf(slugOf(link.getAttribute("href"))) !== -1;
      if (!isDone || link.classList.contains("is-done")) return;
      link.classList.add("is-done");
      var mark = document.createElement("span");
      mark.className = "lp-done-mark";
      var tick = document.createElement("span");
      tick.setAttribute("aria-hidden", "true");
      tick.textContent = "✓";
      var label = document.createElement("span");
      label.className = "visually-hidden";
      label.textContent = "Completed";
      mark.append(tick, label);
      link.append(mark);
    });
  }
  markDoneLinks();

  if (!moduleNo || !slug) return; // overview pages stop here

  // ---- The widget: a top bar and a ring with the percentage and a message.
  var SVG = "http://www.w3.org/2000/svg";
  var RADIUS = 19;
  var CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  var bar = document.createElement("div");
  bar.className = "lp-progress-bar";
  bar.setAttribute("aria-hidden", "true");
  var barFill = document.createElement("span");
  barFill.className = "lp-progress-bar-fill";
  var barDot = document.createElement("span");
  barDot.className = "lp-progress-bar-dot";
  bar.append(barFill, barDot);

  var box = document.createElement("aside");
  box.className = "lp-progress";
  box.setAttribute("aria-label", "Reading progress");

  var ring = document.createElementNS(SVG, "svg");
  ring.setAttribute("class", "lp-progress-ring");
  ring.setAttribute("viewBox", "0 0 44 44");
  ring.setAttribute("aria-hidden", "true");
  ["lp-progress-track", "lp-progress-fill"].forEach(function (cls) {
    var c = document.createElementNS(SVG, "circle");
    c.setAttribute("class", cls);
    c.setAttribute("cx", "22");
    c.setAttribute("cy", "22");
    c.setAttribute("r", String(RADIUS));
    ring.append(c);
  });
  var ringFill = ring.querySelector(".lp-progress-fill");
  ringFill.style.setProperty("stroke-dasharray", CIRCUMFERENCE.toFixed(2));

  var pct = document.createElement("span");
  pct.className = "lp-progress-pct";

  var text = document.createElement("span");
  text.className = "lp-progress-text";
  var title = document.createElement("b");
  title.textContent = "Module " + String(moduleNo).padStart(2, "0");
  var count = document.createElement("span");
  text.append(title, count);

  var msg = document.createElement("span");
  msg.className = "lp-progress-msg";
  msg.setAttribute("role", "status");
  msg.setAttribute("aria-live", "polite");

  box.append(ring, pct, text, msg);
  document.body.append(bar, box);

  function updateCount() {
    var done = readDone();
    count.textContent = total ? done.length + " of " + total + " done" : "";
    box.classList.toggle("is-complete", done.indexOf(slug) !== -1);
  }
  updateCount();

  // ---- Milestones: each fires once per visit, and only the highest one crossed.
  var hasQuiz = !!article.querySelector("[data-quiz]");
  var MILESTONES = [
    { at: 25, text: "A quarter of the way through. Nice start." },
    { at: 50, text: "Halfway there. Keep going." },
    { at: 75, text: hasQuiz ? "Nearly done. The pop quiz is coming up." : "Nearly done." },
    { at: 100, text: null },
  ];
  var reached = 0;
  var hideTimer = null;

  function completeText() {
    var done = readDone();
    if (total && done.length >= total) return "Track complete: all " + total + " modules done!";
    return nextTitle ? "Module complete. Next up: " + nextTitle : "Module complete.";
  }

  function announce(textValue) {
    msg.textContent = textValue;
    box.classList.remove("is-celebrating");
    void box.offsetWidth; // restart the short pop animation
    box.classList.add("is-showing", "is-celebrating");
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function () {
      box.classList.remove("is-showing");
    }, 5000);
  }

  function markComplete() {
    var done = readDone();
    if (done.indexOf(slug) === -1) {
      done.push(slug);
      saveDone(done);
    }
    updateCount();
    markDoneLinks();
  }

  // ---- Scroll tracking, throttled to one update per frame.
  var moveTimer = null;
  var scheduled = false;

  function progress() {
    var start = article.getBoundingClientRect().top + window.scrollY;
    var end = start + article.offsetHeight - window.innerHeight;
    if (end <= start) return 1;
    return Math.min(1, Math.max(0, (window.scrollY - start) / (end - start)));
  }

  function update() {
    scheduled = false;
    var p = progress();
    var percent = Math.round(p * 100);
    bar.style.setProperty("--p", p.toFixed(4));
    ringFill.style.setProperty("stroke-dashoffset", (CIRCUMFERENCE * (1 - p)).toFixed(2));
    pct.textContent = percent + "%";
    box.classList.toggle("is-visible", window.scrollY > 120);

    var crossed = null;
    MILESTONES.forEach(function (m) {
      if (percent >= m.at && m.at > reached) crossed = m;
    });
    if (crossed) {
      reached = crossed.at;
      if (crossed.at === 100) markComplete();
      announce(crossed.text || completeText());
    }
  }

  function onScroll() {
    bar.classList.add("is-moving");
    clearTimeout(moveTimer);
    moveTimer = setTimeout(function () {
      bar.classList.remove("is-moving");
    }, 700);
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(update);
    }
  });
  // Start from where the reader already is, without celebrating old milestones.
  reached = Math.max.apply(null, [0].concat(MILESTONES.filter(function (m) {
    return Math.round(progress() * 100) >= m.at && m.at < 100;
  }).map(function (m) { return m.at; })));
  update();
})();
