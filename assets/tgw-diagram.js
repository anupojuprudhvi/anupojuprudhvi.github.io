/* Transit Gateway traffic-flow walkthrough (used by the tolling
   cloud-foundation case study). Extracted from the original inline
   script so the page template can stay generic. */
(function () {
  "use strict";
  /* Transit Gateway traffic-flow animation */
  var reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var HUB = { x: 360, y: 175 };
  var DEFAULT_CAPTION =
    "Click <b>Show traffic flow</b> to follow a public request in through the edge, and see how it’s then distributed like any other hub-routed traffic.";
  var SHARED = { x: 630, y: 25 };
  var steps = [
    {
      line: "hl-internet",
      from: { x: 630, y: -75 },
      to: SHARED,
      nodes: ["hn-internet", "hn-shared"],
      caption:
        "A public request hits <b>CloudFront</b> (with a WAF in front of it) and resolves through <b>Route 53</b> — both the public and private hosted zones live in the Shared Services account.",
    },
    {
      line: "hl-shared",
      from: SHARED,
      to: HUB,
      nodes: ["hn-shared", "hn-hub"],
      caption:
        "From Shared Services, it reaches the <b>Transit Gateway</b> in the Networking account — the same hub every other account uses.",
    },
    {
      line: "hl-prod",
      from: HUB,
      to: { x: 630, y: 115 },
      nodes: ["hn-hub", "hn-prod"],
      caption:
        "From the hub it’s distributed into the <b>Production</b> account like any other hub-routed traffic — there’s no separate ingress path to maintain. A test endpoint in Dev would arrive exactly the same way.",
    },
    {
      line: "hl-security",
      from: HUB,
      to: { x: 90, y: 100 },
      nodes: ["hn-hub", "hn-security"],
      caption:
        "The governance stack is reachable the same way — say, a centralized auth check against the <b>Security account</b> — even though it runs no workloads itself.",
    },
    {
      line: "hl-devstg",
      from: HUB,
      to: { x: 630, y: 205 },
      nodes: ["hn-hub", "hn-devstg"],
      caption:
        "<b>Dev/Staging</b> traffic rides the same hub but is isolated by routing policy from production paths.",
    },
    {
      line: "hl-prod",
      from: HUB,
      to: { x: 630, y: 115 },
      nodes: ["hn-hub", "hn-prod"],
      caption:
        "<b>Production</b>’s own outbound calls — to a database or a shared service — rejoin the same governed, logged path back through the hub.",
    },
    {
      line: "hl-archive",
      from: HUB,
      to: { x: 90, y: 275 },
      nodes: ["hn-hub", "hn-archive"],
      caption:
        "<b>Archive &amp; migration</b> — the other half of the governance stack — uses the identical pattern, no special-cased networking to maintain.",
    },
    {
      line: "hl-dr",
      from: HUB,
      to: { x: 630, y: 295 },
      nodes: ["hn-hub", "hn-dr"],
      caption:
        "If the primary hub is unavailable, routing shifts to the <b>DR region’s</b> standby hub instead.",
    },
  ];
  var playBtn = document.getElementById("tgwPlayBtn");
  var pulse = document.getElementById("hubPulse");
  var tgwCaption = document.getElementById("hubCaption");
  var tgwPlaying = false;

  function resetTgw() {
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

  function playTraffic() {
    if (tgwPlaying) return;
    tgwPlaying = true;
    resetTgw();
    var i = 0;
    function nextStep() {
      if (i >= steps.length) {
        tgwPlaying = false;
        resetTgw();
        tgwCaption.innerHTML = DEFAULT_CAPTION;
        return;
      }
      var s = steps[i];
      document.getElementById(s.line).classList.add("active");
      s.nodes.forEach(function (id) {
        document.getElementById(id).classList.add("active");
      });
      tgwCaption.innerHTML = s.caption;
      animatePulse(
        s.from.x,
        s.from.y,
        s.to.x,
        s.to.y,
        reduceMotion ? 1 : 550,
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
            reduceMotion ? 250 : 500,
          );
        },
      );
    }
    nextStep();
  }
  playBtn.addEventListener("click", playTraffic);
})();
