/* Pop quiz for ```quiz blocks (scripts/lib/markdown.mjs quizBlock).
   Progressive enhancement: without this script each quiz is a plain list of
   questions with "Show answer" toggles. With it, the quiz becomes one
   question at a time, with questions and options shuffled on every attempt,
   instant feedback with an explanation, and a score at the end. When the
   reader reaches the last section before the quiz, a small "Pop quiz" card
   slides in offering to open it in a dialog. The card never takes focus, so
   it doesn't interrupt someone reading or using a keyboard. */
(function () {
  "use strict";

  // 80% passes: 4 of 5. A pass gets a badge and a burst of confetti.
  var PASS_MARK = 0.8;
  var CONFETTI_PIECES = 90;
  var CONFETTI_MS = 4200;

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  }

  function shuffle(list) {
    var copy = list.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  // Copies of the build's own markup, so inline code and emphasis survive.
  function contents(node) {
    var frag = document.createDocumentFragment();
    Array.prototype.forEach.call(node.childNodes, function (child) {
      frag.append(child.cloneNode(true));
    });
    return frag;
  }

  function calm() {
    return (
      (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) ||
      document.documentElement.classList.contains("motion-paused")
    );
  }

  // Confetti falls across the screen from above the quiz. Purely decorative:
  // hidden from assistive technology, never blocks clicks, removes itself, and
  // is skipped entirely under reduced motion (the badge still shows).
  function celebrate(host) {
    if (calm()) return;
    var layer = el("div", "lp-confetti");
    layer.setAttribute("aria-hidden", "true");
    for (var i = 0; i < CONFETTI_PIECES; i++) {
      var piece = el("span", "lp-confetti-piece c" + (i % 5));
      // CSSOM custom properties (allowed by the CSP, unlike style="" markup)
      piece.style.setProperty("--x", (Math.random() * 100).toFixed(1) + "vw");
      piece.style.setProperty("--drift", (Math.random() * 30 - 15).toFixed(1) + "vw");
      piece.style.setProperty("--spin", Math.round(Math.random() * 900 - 450) + "deg");
      piece.style.setProperty("--delay", (Math.random() * 0.6).toFixed(2) + "s");
      piece.style.setProperty("--fall", (2.2 + Math.random() * 1.6).toFixed(2) + "s");
      layer.append(piece);
    }
    host.append(layer);
    setTimeout(function () {
      layer.remove();
    }, CONFETTI_MS);
  }

  var store = {
    get: function (key) {
      try {
        return sessionStorage.getItem(key);
      } catch (e) {
        return null;
      }
    },
    set: function (key, value) {
      try {
        sessionStorage.setItem(key, value);
      } catch (e) {
        /* private mode or blocked storage: the card may simply show again */
      }
    },
  };

  function readQuestions(root) {
    return Array.prototype.map.call(root.querySelectorAll(".lp-quiz-q"), function (item) {
      return {
        kind: item.getAttribute("data-kind") || "Concept",
        prompt: item.querySelector(".lp-quiz-prompt"),
        options: Array.prototype.slice.call(item.querySelectorAll(".lp-quiz-options > li")),
        answer: Number(item.getAttribute("data-answer")),
        why: item.querySelector(".lp-quiz-why"),
      };
    });
  }

  function setup(root, index) {
    var questions = readQuestions(root);
    if (!questions.length || questions.some(function (q) { return !q.prompt || !q.why || !q.options[q.answer]; })) return;

    var section = root.closest("section");
    var heading = section && section.querySelector("h2");
    var app = el("div", "lp-quiz-app");
    var round = [];
    var pos = 0;
    var score = 0;
    var missed = [];
    var started = false;

    function start() {
      round = shuffle(questions).map(function (q) {
        return { q: q, order: shuffle(q.options.map(function (_, i) { return i; })) };
      });
      pos = 0;
      score = 0;
      missed = [];
      renderQuestion(false);
    }

    function renderQuestion(moveFocus) {
      var item = round[pos];
      app.replaceChildren();

      var head = el("div", "lp-quiz-head");
      var count = el("p", "lp-quiz-count", "Question " + (pos + 1) + " of " + round.length + " ");
      count.append(el("span", "lp-quiz-chip" + (item.q.kind === "Scenario" ? " is-scenario" : ""), item.q.kind));
      var tally = el("p", "lp-quiz-score", "Score " + score);
      head.append(count, tally);
      var bar = el("progress", "lp-quiz-progress");
      bar.max = round.length;
      bar.value = pos;
      bar.setAttribute("aria-label", "Quiz progress");

      var promptId = "lp-quiz-" + index + "-q";
      var prompt = el("p", "lp-quiz-qtext");
      prompt.id = promptId;
      prompt.tabIndex = -1;
      prompt.append(contents(item.q.prompt));

      var group = el("div", "lp-quiz-choices");
      group.setAttribute("role", "group");
      group.setAttribute("aria-labelledby", promptId);
      var buttons = item.order.map(function (optionIndex, shown) {
        var b = el("button", "lp-quiz-choice");
        b.type = "button";
        var letter = el("span", "lp-quiz-letter", String.fromCharCode(65 + shown));
        letter.setAttribute("aria-hidden", "true");
        var label = el("span", "lp-quiz-choice-text");
        label.append(contents(item.q.options[optionIndex]));
        var mark = el("span", "lp-quiz-mark");
        b.append(letter, label, mark);
        b.addEventListener("click", function () {
          choose(optionIndex, buttons, item, feedback, next);
        });
        return b;
      });
      group.append.apply(group, buttons);

      var feedback = el("div", "lp-quiz-feedback");
      feedback.setAttribute("aria-live", "polite");
      var next = el("button", "flow-btn flow-play lp-quiz-next", pos === round.length - 1 ? "Submit quiz →" : "Next question →");
      next.type = "button";
      next.hidden = true;
      next.addEventListener("click", function () {
        pos++;
        if (pos < round.length) renderQuestion(true);
        else renderResult();
      });

      app.append(head, bar, prompt, group, feedback, next);
      if (moveFocus) prompt.focus();
    }

    function choose(chosen, buttons, item, feedback, next) {
      started = true;
      hideNudge();
      var right = chosen === item.q.answer;
      if (right) score++;
      else missed.push(item.q);
      buttons.forEach(function (b, shown) {
        var optionIndex = item.order[shown];
        b.disabled = true;
        var mark = b.querySelector(".lp-quiz-mark");
        if (optionIndex === item.q.answer) {
          b.classList.add("is-right");
          mark.textContent = optionIndex === chosen ? "✓ Your answer, correct" : "✓ Correct answer";
        } else if (optionIndex === chosen) {
          b.classList.add("is-wrong");
          mark.textContent = "✗ Your answer";
        }
      });
      app.querySelector(".lp-quiz-score").textContent = "Score " + score;
      feedback.replaceChildren();
      feedback.className = "lp-quiz-feedback " + (right ? "is-right" : "is-wrong");
      feedback.append(el("strong", "", right ? "Correct." : "Not quite."));
      var why = el("p");
      why.append(contents(item.q.why));
      feedback.append(why);
      next.hidden = false;
      next.focus();
    }

    function renderResult() {
      app.replaceChildren();
      var total = round.length;
      var passed = score / total >= PASS_MARK;
      var result = el("p", "lp-quiz-result", "You got " + score + " of " + total + ".");
      result.tabIndex = -1;
      var message =
        score === total
          ? "Perfect score. You're ready for the next module."
          : passed
            ? "You passed. What you missed is below; it's worth one more look."
            : "Not quite there yet: " + Math.ceil(PASS_MARK * total) + " of " + total + " passes. Have another look at the answers below, then try again.";
      if (passed) {
        var badge = el("p", "lp-quiz-badge");
        badge.append(el("span", "lp-quiz-badge-icon", "🏆"), el("span", "", score === total ? "Perfect score!" : "You passed!"));
        badge.firstChild.setAttribute("aria-hidden", "true");
        app.append(badge);
      }
      app.append(result, el("p", "lp-quiz-message", message));
      if (missed.length) {
        var list = el("ul", "lp-quiz-review");
        missed.forEach(function (q) {
          var li = el("li");
          var p = el("p", "lp-quiz-review-q");
          p.append(contents(q.prompt));
          var a = el("p", "lp-quiz-review-a");
          a.append(el("strong", "", "Answer: "));
          a.append(contents(q.options[q.answer]));
          li.append(p, a);
          list.append(li);
        });
        app.append(list);
      }
      var again = el("button", "flow-btn flow-play lp-quiz-again", "↻ Try again, in a new order");
      again.type = "button";
      again.addEventListener("click", function () {
        start();
        app.querySelector(".lp-quiz-qtext").focus();
      });
      app.append(again);
      result.focus();
      if (passed) celebrate(app);
    }

    root.classList.add("is-enhanced");
    root.append(app);
    start();

    // ---- The pop-up: a card near the end of the page, and a dialog to take it in.
    var seenKey = "lp-quiz-nudge:" + location.pathname;
    var dialog = null;
    var nudge = null;

    function openDialog() {
      hideNudge();
      if (typeof HTMLDialogElement !== "function") {
        if (heading) heading.scrollIntoView();
        return;
      }
      if (!dialog) {
        dialog = el("dialog", "lp-quiz-dialog");
        dialog.setAttribute("aria-labelledby", "lp-quiz-" + index + "-title");
        var bar = el("div", "lp-quiz-dialog-head");
        var title = el("h2", "", "Pop quiz");
        title.id = "lp-quiz-" + index + "-title";
        var close = el("button", "flow-btn lp-quiz-close", "Close");
        close.type = "button";
        close.addEventListener("click", function () {
          dialog.close();
        });
        bar.append(title, close);
        dialog.append(bar);
        dialog.addEventListener("close", function () {
          root.append(app);
          // The card that opened the dialog is gone, so return focus to the
          // quiz's own heading, without jumping the page there.
          if (heading) {
            heading.tabIndex = -1;
            heading.focus({ preventScroll: true });
          }
        });
        document.body.append(dialog);
      }
      dialog.append(app);
      dialog.showModal();
      var focusable = app.querySelector(".lp-quiz-qtext, .lp-quiz-result");
      if (focusable) focusable.focus();
    }

    function hideNudge() {
      if (nudge) nudge.classList.remove("is-open");
    }

    function showNudge() {
      if (started || store.get(seenKey)) return;
      store.set(seenKey, "1");
      nudge = el("div", "lp-quiz-nudge");
      nudge.setAttribute("role", "dialog");
      nudge.setAttribute("aria-modal", "false");
      nudge.setAttribute("aria-labelledby", "lp-quiz-" + index + "-nudge");
      var eyebrow = el("p", "lp-quiz-nudge-eyebrow", "Pop quiz");
      var title = el("p", "lp-quiz-nudge-title", "Ready for a quick check?");
      title.id = "lp-quiz-" + index + "-nudge";
      var scenarios = questions.filter(function (q) { return q.kind === "Scenario"; }).length;
      var concepts = questions.length - scenarios;
      var plural = function (n, word) { return n + " " + word + (n === 1 ? "" : "s"); };
      var body = el(
        "p",
        "lp-quiz-nudge-body",
        (scenarios ? plural(concepts, "question") + " and " + plural(scenarios, "scenario") : plural(questions.length, "question")) +
          ", in a new order every time. " + Math.ceil(PASS_MARK * questions.length) + " right passes.",
      );
      var actions = el("div", "lp-quiz-nudge-actions");
      var take = el("button", "flow-btn flow-play", "Take the quiz");
      take.type = "button";
      take.addEventListener("click", openDialog);
      var later = el("button", "flow-btn", "Not now");
      later.type = "button";
      later.addEventListener("click", hideNudge);
      actions.append(take, later);
      nudge.append(eyebrow, title, body, actions);
      nudge.addEventListener("keydown", function (e) {
        if (e.key === "Escape") hideNudge();
      });
      document.body.append(nudge);
      // Next frame, so the slide-in transition runs (it's off under reduced motion).
      requestAnimationFrame(function () {
        nudge.classList.add("is-open");
      });
    }

    // "Nearing the end" means the last section before the quiz is on screen.
    var trigger = section && section.previousElementSibling;
    if (!trigger || !("IntersectionObserver" in window)) return;
    // If the quiz itself is already on screen, there's nothing to offer. Once the
    // card is showing, it stays until the reader takes the quiz, starts it in the
    // page, or dismisses it, so it never flickers away on a tall screen.
    var quizInView = false;
    new IntersectionObserver(function (entries) {
      quizInView = entries[0].isIntersecting;
    }).observe(root);
    var watcher = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting || quizInView) return;
      watcher.disconnect();
      showNudge();
    });
    watcher.observe(trigger);
  }

  Array.prototype.forEach.call(document.querySelectorAll("[data-quiz]"), setup);
})();
