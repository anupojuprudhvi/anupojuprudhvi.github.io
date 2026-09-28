/**
 * Animated header illustrations ("motifs") for case studies and playbooks.
 *
 * A small, fixed set of themes instead of one drawing per page: each case study
 * gets the motif for its capability layer, or names one with `motif:` in its
 * front matter. Playbooks take theirs from `motif` in tracks.json.
 *
 * Each motif is an inline SVG on a 240×180 grid. It is decorative only
 * (aria-hidden) and styled by deepdive.css; packet movement uses SVG
 * <animateMotion>, which the CSS hides under prefers-reduced-motion.
 */
const pk = (path, dur, begin, reverse = false, cls = "m-pk") =>
  `<circle class="${cls}" r="2.4"><animateMotion dur="${dur}s" begin="${begin}s" repeatCount="indefinite"${
    reverse ? ' keyPoints="1;0" keyTimes="0;1" calcMode="linear"' : ""
  }><mpath href="#${path}" /></animateMotion></circle>`;

// Motif ids are unique per page (one motif per header), so fixed ids are safe.
const MOTIFS = {
  network: `
    <defs>
      <path id="mA" d="M85 84 H40 V38" /><path id="mB" d="M155 84 H200 V38" />
      <path id="mC" d="M85 96 H40 V142" /><path id="mD" d="M155 96 H200 V142" />
    </defs>
    <path class="m-line" d="M85 84 H40 V38 M155 84 H200 V38 M85 96 H40 V142 M155 96 H200 V142" />
    <g class="m-packets">${pk("mA", 2.6, -0.3)}${pk("mB", 3.1, -1.9, true)}${pk("mC", 2.9, -1.1, true)}${pk("mD", 2.4, -0.7)}${pk("mB", 3.1, -0.4)}</g>
    <rect class="m-node m-hub" x="85" y="76" width="70" height="28" rx="4" /><text class="m-hot" x="120" y="93">TGW</text>
    <rect class="m-node" x="10" y="14" width="60" height="24" rx="4" /><text x="40" y="29">PROD</text>
    <rect class="m-node" x="170" y="14" width="60" height="24" rx="4" /><text x="200" y="29">DEV</text>
    <rect class="m-node" x="10" y="142" width="60" height="24" rx="4" /><text x="40" y="157">SHARED</text>
    <rect class="m-node" x="170" y="142" width="60" height="24" rx="4" /><text x="200" y="157">EGRESS</text>`,

  failover: `
    <defs><path id="mP" d="M110 32 V66 H56 V100" /><path id="mS" d="M130 32 V66 H184 V100" /></defs>
    <path class="m-line mf-link-p" d="M110 32 V66 H56 V100" />
    <path class="m-line mf-link-s" d="M130 32 V66 H184 V100" />
    <path class="m-line m-dash" d="M104 132 H136" />
    <g class="m-packets">
      <g class="mf-to-p">${pk("mP", 2.2, -0.2)}${pk("mP", 2.2, -1.3)}</g>
      <g class="mf-to-s">${pk("mS", 2.2, -0.6)}${pk("mS", 2.2, -1.7)}</g>
    </g>
    <rect class="m-node m-hub" x="90" y="8" width="60" height="24" rx="4" /><text class="m-hot" x="120" y="23">DNS</text>
    <rect class="m-node mf-primary" x="8" y="100" width="96" height="64" rx="5" />
    <text x="56" y="128">PRIMARY</text>
    <text class="m-state mf-ok" x="56" y="144">HEALTHY</text><text class="m-state m-warn mf-bad" x="56" y="144">FAILED</text>
    <rect class="m-node mf-standby" x="136" y="100" width="96" height="64" rx="5" />
    <text x="184" y="128">SECONDARY</text>
    <text class="m-state m-muted mf-ok" x="184" y="144">STANDBY</text><text class="m-state mf-bad" x="184" y="144">ACTIVE</text>`,

  pipeline: `
    <text class="m-start m-muted" x="4" y="40">git push → main</text>
    <path class="m-line" d="M52 88 H66 M114 88 H128 M176 88 H190" />
    <rect class="m-node mp-s1" x="4" y="70" width="48" height="36" rx="4" /><text x="28" y="91">COMMIT</text>
    <rect class="m-node mp-s2" x="66" y="70" width="48" height="36" rx="4" /><text x="90" y="91">PLAN</text>
    <rect class="m-node mp-s3" x="128" y="70" width="48" height="36" rx="4" /><text x="152" y="91">TEST</text>
    <rect class="m-node mp-s4" x="190" y="70" width="48" height="36" rx="4" /><text x="214" y="91">DEPLOY</text>
    <rect class="m-track" x="4" y="128" width="234" height="3" rx="1.5" />
    <rect class="m-bar" x="4" y="128" width="234" height="3" rx="1.5" />
    <text class="m-state mp-done" x="214" y="150">✓ LIVE</text>`,

  replication: `
    <defs><path id="mR" d="M86 85 H154" /></defs>
    <text class="m-muted" x="52" y="30">us-east-1</text><text class="m-muted" x="188" y="30">us-west-2</text>
    <path class="m-node m-hub" d="M20 50 V120 A32 9 0 0 0 84 120 V50" /><ellipse class="m-node m-hub" cx="52" cy="50" rx="32" ry="9" />
    <path class="m-node" d="M156 50 V120 A32 9 0 0 0 220 120 V50" /><ellipse class="m-node" cx="188" cy="50" rx="32" ry="9" />
    <path class="m-row mr-1" d="M162 76 H214" /><path class="m-row mr-2" d="M162 90 H214" /><path class="m-row mr-3" d="M162 104 H214" />
    <path class="m-line m-dash" d="M86 85 H154" />
    <g class="m-packets">${pk("mR", 1.8, -0.1)}${pk("mR", 1.8, -0.7)}${pk("mR", 1.8, -1.3)}</g>
    <text class="m-muted" x="120" y="74">lag &lt; 1s</text>
    <text class="m-hot" x="52" y="150">PRIMARY</text><text x="188" y="150">REPLICA</text>`,

  migration: `
    <defs><path id="mM" d="M84 90 C 108 44, 132 44, 156 90" /></defs>
    <text x="45" y="30">ON-PREM</text><text class="m-hot" x="195" y="30">AWS</text>
    <rect class="m-node" x="6" y="40" width="78" height="100" rx="5" />
    <rect class="m-node m-dashed" x="156" y="40" width="78" height="100" rx="5" />
    <rect class="m-node mm-src1" x="16" y="58" width="58" height="16" rx="2" />
    <rect class="m-node mm-src2" x="16" y="82" width="58" height="16" rx="2" />
    <rect class="m-node mm-src3" x="16" y="106" width="58" height="16" rx="2" />
    <rect class="m-node mm-dst1" x="166" y="58" width="58" height="16" rx="2" />
    <rect class="m-node mm-dst2" x="166" y="82" width="58" height="16" rx="2" />
    <rect class="m-node mm-dst3" x="166" y="106" width="58" height="16" rx="2" />
    <path class="m-line m-dash" d="M84 90 C 108 44, 132 44, 156 90" />
    <g class="m-packets">${pk("mM", 1.5, -0.2)}${pk("mM", 1.5, -0.95)}</g>
    <text class="m-muted" x="120" y="162">wave-by-wave cutover</text>`,

  stream: `
    <defs>
      <path id="mQ1" d="M26 50 C 50 50, 50 90, 72 90" /><path id="mQ2" d="M26 90 H72" />
      <path id="mQ3" d="M26 130 C 50 130, 50 90, 72 90" /><path id="mQ4" d="M156 90 H184" />
    </defs>
    <path class="m-line" d="M26 50 C 50 50, 50 90, 72 90 M26 90 H72 M26 130 C 50 130, 50 90, 72 90 M156 90 H184" />
    <g class="m-packets">${pk("mQ1", 1.6, -0.2)}${pk("mQ2", 1.3, -0.9)}${pk("mQ3", 1.7, -0.5)}${pk("mQ4", 0.9, -0.3)}${pk("mQ4", 0.9, -0.75)}</g>
    <circle class="m-node" cx="20" cy="50" r="6" /><circle class="m-node" cx="20" cy="90" r="6" /><circle class="m-node" cx="20" cy="130" r="6" />
    <text x="20" y="160">SOURCES</text>
    <text x="114" y="64">QUEUE</text>
    <rect class="m-node" x="72" y="72" width="84" height="36" rx="4" />
    <rect class="m-cell ms-c1" x="76" y="76" width="12" height="28" rx="2" /><rect class="m-cell ms-c2" x="92" y="76" width="12" height="28" rx="2" />
    <rect class="m-cell ms-c3" x="108" y="76" width="12" height="28" rx="2" /><rect class="m-cell ms-c4" x="124" y="76" width="12" height="28" rx="2" />
    <rect class="m-cell ms-c5" x="140" y="76" width="12" height="28" rx="2" />
    <rect class="m-node m-hub" x="184" y="68" width="48" height="44" rx="5" /><text class="m-hot m-big" x="208" y="96">λ</text>
    <text x="208" y="130">PROCESS</text>`,

  monitor: `
    <text class="m-start m-muted" x="8" y="14">p99 latency</text>
    <rect class="m-node" x="6" y="20" width="228" height="120" rx="4" />
    <path class="m-grid" d="M6 80 H234 M6 110 H234" />
    <path class="m-slo" d="M6 52 H234" /><text class="m-end m-warn" x="230" y="48">SLO</text>
    <path class="m-trace" pathLength="100" d="M10 110 L30 104 L50 108 L70 100 L90 106 L110 98 L130 104 L150 60 L160 40 L170 70 L190 100 L210 104 L230 102" />
    <g class="mo-alert"><rect class="m-badge m-badge-warn" x="128" y="150" width="64" height="18" rx="9" /><text class="m-warn" x="160" y="162">ALERT</text></g>
    <g class="mo-ok"><rect class="m-badge" x="128" y="150" width="64" height="18" rx="9" /><text class="m-hot" x="160" y="162">RESOLVED</text></g>`,

  security: `
    <defs><path id="mIn" d="M4 90 H74" /><path id="mOut" d="M166 90 H236" /></defs>
    <circle class="m-ring" cx="120" cy="90" r="46" />
    <text class="m-hot" x="120" y="36">KMS KEY</text>
    <path class="m-line" d="M4 90 H74 M166 90 H236" />
    <g class="m-packets">${pk("mIn", 1.6, -0.2, false, "m-pk m-pk-plain")}${pk("mIn", 1.6, -1)}${pk("mOut", 1.6, -0.6)}${pk("mOut", 1.6, -1.4)}</g>
    <path class="m-node m-hub m-shackle" d="M108 80 V68 A12 12 0 0 1 132 68 V80" />
    <rect class="m-node m-hub" x="98" y="80" width="44" height="34" rx="4" />
    <circle class="m-keyhole" cx="120" cy="95" r="3.5" />
    <text class="m-muted" x="40" y="118">PLAINTEXT</text><text class="m-hot" x="200" y="118">ENCRYPTED</text>`,
};

export const MOTIF_NAMES = Object.keys(MOTIFS);

// Default motif for each capability layer; `motif:` in front matter overrides it.
export const LAYER_MOTIF = {
  "Foundation & governance": "network",
  "Networking & security": "network",
  "Data & storage": "replication",
  "Resilience & DR": "failover",
  "Platform & delivery": "pipeline",
  "Applications & integration": "stream",
  "Operations & incidents": "monitor",
  "Migration & strategy": "migration",
  "Product engineering": "pipeline",
};

/** The motif name for a page, or "" if it has none. */
export function motifFor(d) {
  return d.motif || LAYER_MOTIF[d.layer] || "";
}

/** Inline SVG for a motif name (validated at build time), or "". */
export function motifSvg(name) {
  if (!name) return "";
  return `<svg class="motif motif-${name}" viewBox="0 0 240 180" width="240" height="180" aria-hidden="true" focusable="false">${MOTIFS[name]}
    </svg>`;
}
