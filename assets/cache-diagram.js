(function () {
  "use strict";
  /* Read-path animation */
  var reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DEFAULT_CAPTION =
    "Click <b>Show the read path</b> to see how a live vitals reading reaches a dashboard without ever putting reporting load on the operational database.";
  var steps = [
    {
      line: "cl-0",
      from: { x: 100, y: 95 },
      to: { x: 255, y: 95 },
      nodes: ["cn-0", "cn-1"],
      caption:
        "A device reading comes in through the integration gateway to the application tier.",
    },
    {
      line: "cl-1",
      from: { x: 255, y: 95 },
      to: { x: 410, y: 95 },
      nodes: ["cn-1", "cn-2"],
      caption:
        "The application tier writes it to the <b>operational database</b> — the system of record for live clinical state.",
    },
    {
      line: "cl-3",
      from: { x: 255, y: 65 },
      to: { x: 565, y: 65 },
      nodes: ["cn-1", "cn-3"],
      caption:
        "The same reading is also streamed directly into the <b>analytics pipeline</b>, in parallel, rather than being read back out of the operational database later.",
    },
    {
      line: "cl-2",
      from: { x: 410, y: 95 },
      to: { x: 565, y: 95 },
      nodes: ["cn-2", "cn-3"],
      caption:
        "A clinician's dashboard query hits the analytics pipeline, not the operational database — so a heavy 90-day trend report can't slow down live device ingestion.",
    },
  ];
  var playBtn = document.getElementById("cachePlayBtn");
  var pulse = document.getElementById("cachePulse");
  var caption = document.getElementById("cacheCaption");
  var playing = false;

  function reset() {
    document.querySelectorAll(".hub-line").forEach(function (l) {
      l.classList.remove("active");
    });
    document.querySelectorAll(".hub-node").forEach(function (n) {
      n.classList.remove("active");
    });
    pulse.style.opacity = 0;
  }

  function animatePulse(fromX, fromY, toX, toY, duration, cb) {
    pulse.setAttribute("cx", fromX);
    pulse.setAttribute("cy", fromY);
    if (reduceMotion) {
      pulse.setAttribute("cx", toX);
      pulse.setAttribute("cy", toY);
      cb();
      return;
    }
    var t0 = null;
    pulse.style.opacity = 1;
    function frame(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / duration, 1);
      pulse.setAttribute("cx", fromX + (toX - fromX) * p);
      pulse.setAttribute("cy", fromY + (toY - fromY) * p);
      if (p < 1) {
        requestAnimationFrame(frame);
      } else {
        cb();
      }
    }
    requestAnimationFrame(frame);
  }

  function play() {
    if (playing) return;
    playing = true;
    reset();
    var i = 0;
    function nextStep() {
      if (i >= steps.length) {
        playing = false;
        reset();
        caption.innerHTML = DEFAULT_CAPTION;
        return;
      }
      var s = steps[i];
      document.getElementById(s.line).classList.add("active");
      s.nodes.forEach(function (id) {
        document.getElementById(id).classList.add("active");
      });
      caption.innerHTML = s.caption;
      animatePulse(
        s.from.x,
        s.from.y,
        s.to.x,
        s.to.y,
        reduceMotion ? 1 : 600,
        function () {
          setTimeout(
            function () {
              document.getElementById(s.line).classList.remove("active");
              s.nodes.forEach(function (id) {
                document.getElementById(id).classList.remove("active");
              });
              i++;
              nextStep();
            },
            reduceMotion ? 250 : 550,
          );
        },
      );
    }
    nextStep();
  }
  playBtn.addEventListener("click", play);
})();
