(function () {
  "use strict";
  /* Failover sequence animation */
  var reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DEFAULT_CAPTION =
    "Click <b>Play failover sequence</b> to step through what happens in the seconds after a node stops responding.";
  var steps = [
    {
      line: "fl-0",
      from: { x: 100, y: 95 },
      to: { x: 255, y: 95 },
      nodes: ["fn-0", "fn-1"],
      caption:
        "A CloudWatch alarm detects a lost heartbeat and invokes the failover Lambda.",
    },
    {
      line: "fl-1",
      from: { x: 255, y: 95 },
      to: { x: 410, y: 95 },
      nodes: ["fn-1", "fn-2"],
      caption:
        "Before touching anything, the Lambda acquires a conditional lock in <b>DynamoDB</b> — if another invocation already holds it, this one backs off instead of racing it, which is what prevents split-brain.",
    },
    {
      line: "fl-2",
      from: { x: 410, y: 95 },
      to: { x: 565, y: 95 },
      nodes: ["fn-2", "fn-3"],
      caption:
        "The <b>license-pinned network interface</b> is detached from the failed node and reattached to the standby, carrying its MAC address and static IP with it.",
    },
    {
      line: "fl-3",
      from: { x: 565, y: 95 },
      to: { x: 670, y: 95 },
      nodes: ["fn-3", "fn-4"],
      caption:
        "Services on the standby are promoted and health-checked. Only once they pass is the failed node forcibly <b>fenced</b> — stopped at the API level so it can never write again — then restarted as the new warm standby.",
    },
  ];
  var playBtn = document.getElementById("failoverPlayBtn");
  var pulse = document.getElementById("failoverPulse");
  var caption = document.getElementById("failoverCaption");
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
