/* Step-by-step traffic walkthrough for ```flow diagrams (scripts/lib/markdown.mjs).
   Progressive enhancement: without this script every diagram is still fully
   readable. With it, each diagram gets Play / Back / Next controls that move a
   highlight hop by hop: the arrow a request travels along, then the box it
   reaches, with a caption saying what happens there. */
(function () {
  "use strict";
  var STEP_MS = 2600;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var motionPaused = function () {
    return document.documentElement.classList.contains("motion-paused");
  };
  var text = function (el) {
    return el ? el.textContent.replace(/\s+/g, " ").trim() : "";
  };

  function button(label, cls) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "flow-btn " + cls;
    b.textContent = label;
    return b;
  }

  function setup(figure, index) {
    var body = figure.querySelector(".flow-body");
    if (!body) return;

    // One step per box, carrying the arrow that leads into it (if any).
    var steps = [];
    var pendingEdge = null;
    Array.prototype.forEach.call(body.querySelectorAll(".flow-node, .flow-edge"), function (el) {
      if (el.classList.contains("flow-edge")) {
        pendingEdge = el;
        return;
      }
      var path = el.closest(".flow-path");
      var group = el.closest(".flow-group");
      steps.push({
        node: el,
        edge: pendingEdge,
        name: text(el.querySelector("strong")),
        detail: text(el.querySelector("span")),
        via: pendingEdge ? text(pendingEdge.querySelector(".flow-edge-label")) : "",
        where: [path && text(path.querySelector(".flow-path-label")), group && text(group.querySelector(".flow-group-label"))]
          .filter(Boolean)
          .join(" · "),
      });
      pendingEdge = null;
    });
    if (steps.length < 2) return;

    var controls = document.createElement("div");
    controls.className = "flow-controls";
    var play = button("▶ Play step by step", "flow-play");
    var back = button("← Back", "flow-back");
    var next = button("Next →", "flow-next");
    var reset = button("Reset", "flow-reset");
    var caption = document.createElement("p");
    caption.className = "flow-caption";
    caption.setAttribute("aria-live", "polite");
    caption.id = "flow-caption-" + index;
    figure.setAttribute("aria-describedby", caption.id);
    controls.append(play, back, next, reset);
    var title = figure.querySelector(".flow-title");
    (title || body).after(controls);
    body.after(caption);

    var current = -1;
    var timer = null;
    var idle = "Press play to follow it hop by hop, or step through with Next.";
    caption.textContent = idle;

    function render() {
      figure.classList.toggle("is-walking", current >= 0);
      steps.forEach(function (s, i) {
        s.node.classList.toggle("is-active", i === current);
        s.node.classList.toggle("is-visited", i < current);
        if (s.edge) {
          s.edge.classList.toggle("is-active", i === current);
          s.edge.classList.toggle("is-visited", i < current);
        }
      });
      back.disabled = current <= 0;
      next.disabled = current >= steps.length - 1;
      reset.disabled = current < 0;
      if (!timer) play.textContent = current >= steps.length - 1 ? "↻ Play again" : "▶ Play step by step";
      if (current < 0) {
        caption.textContent = idle;
        return;
      }
      var s = steps[current];
      caption.textContent = "";
      var head = document.createElement("strong");
      head.textContent = "Step " + (current + 1) + " of " + steps.length + ": " + s.name;
      caption.append(head);
      if (s.where) {
        var where = document.createElement("span");
        where.className = "flow-caption-where";
        where.textContent = s.where;
        caption.append(where);
      }
      var bits = [];
      if (s.via) bits.push("How it gets here: " + s.via + ".");
      if (s.detail) bits.push("What happens: " + s.detail + ".");
      if (bits.length) {
        var more = document.createElement("span");
        more.textContent = bits.join(" ");
        caption.append(more);
      }
      if (timer) s.node.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
    }

    function stop() {
      if (timer) clearInterval(timer);
      timer = null;
      play.setAttribute("aria-pressed", "false");
      render();
    }
    function go(i) {
      current = Math.max(-1, Math.min(steps.length - 1, i));
      render();
    }

    play.setAttribute("aria-pressed", "false");
    play.addEventListener("click", function () {
      if (timer) return stop();
      if (current >= steps.length - 1) go(-1);
      go(current + 1);
      play.textContent = "⏸ Pause";
      play.setAttribute("aria-pressed", "true");
      timer = setInterval(function () {
        // The site-wide "Pause animations" control also halts a running walkthrough.
        if (motionPaused()) return stop();
        if (current >= steps.length - 1) return stop();
        go(current + 1);
      }, STEP_MS);
    });
    next.addEventListener("click", function () { stop(); go(current + 1); });
    back.addEventListener("click", function () { stop(); go(current - 1); });
    reset.addEventListener("click", function () { stop(); go(-1); });
    render();
  }

  Array.prototype.forEach.call(document.querySelectorAll("figure.flow"), setup);
})();
