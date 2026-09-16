---
title: One governed cloud foundation under 40+ independently-run accounts
nav: Standardize the cloud
label: Foundation
project: tolling
projectName: U.S. Tolling Infrastructure
engagement: usecases/tolling/index.html
layer: Foundation
order: 10
stack: [Terraform, AWS Organizations, Transit Gateway, GitHub Actions]
tags: [governance, networking, terraform, cicd, multi-account]
summary: A four-layer landing zone, one hub-and-spoke network, and a CI/CD pipeline where an unintended apply is structurally impossible.
scripts: [tgw-diagram.js]
outcomes:
  - value: 40+
    label: AWS accounts under one consistent governance and security model
  - value: Weeks to hours
    label: Time to provision a fully governed new environment
  - value: Zero
    label: Accidental production applies since the pipeline redesign
---

<section>
        <div class="wrap">
          <div class="section-eyebrow">The problem</div>
          <h2>Every account was its own island</h2>
          <p>
            Before this work, each tolling project's AWS environment had been
            built independently — its own network design, its own security
            posture, its own way of provisioning a new environment. That meant
            no consistent audit trail across the platform, security tooling
            rolled out unevenly, and a new environment taking weeks of manual
            configuration to stand up. For teams operating tolling
            infrastructure, that inconsistency is itself a risk.
          </p>
          <p>
            The brief was to design a single governance model that every account
            — present and future — would inherit automatically, without slowing
            engineering teams down or requiring them to understand the
            underlying plumbing.
          </p>
        </div>
      </section>

      <section>
        <div class="wrap">
          <div class="section-eyebrow">Architecture</div>
          <h2>A four-layer landing zone, deployed bottom-up</h2>
          <p>
            I organized the entire platform into four dependency-ordered
            Terraform layers, each one only allowed to depend on the layer
            beneath it. That constraint is what keeps the blast radius of any
            single change small and the deployment order unambiguous.
          </p>

          <div class="layers">
            <div class="layer">
              <div class="lhead">
                <span class="lnum">03</span>
                <h3>Applications</h3>
              </div>
              <div class="chips">
                <span class="chip">API Gateway + Lambda</span>
                <span class="chip">Aurora PostgreSQL</span>
                <span class="chip">S3 &amp; EFS storage</span>
                <span class="chip">SQS / SNS messaging</span>
                <span class="chip">QuickSight BI</span>
              </div>
            </div>
            <div class="layer-arrow">↑ depends on</div>
            <div class="layer">
              <div class="lhead">
                <span class="lnum">02</span>
                <h3>Shared Services</h3>
              </div>
              <div class="chips">
                <span class="chip">Self-hosted HA identity provider</span>
                <span class="chip">CI/CD controller</span>
                <span class="chip">Bastion hosts</span>
                <span class="chip">DNS &amp; certificates</span>
                <span class="chip">EDR + vulnerability scanning</span>
              </div>
            </div>
            <div class="layer-arrow">↑ depends on</div>
            <div class="layer">
              <div class="lhead">
                <span class="lnum">01</span>
                <h3>Core Network</h3>
              </div>
              <div class="chips">
                <span class="chip">Transit Gateway hub</span>
                <span class="chip">Spoke VPCs per account</span>
                <span class="chip">Site-to-Site VPN</span>
                <span class="chip">Centralized VPC endpoints</span>
              </div>
            </div>
            <div class="layer-arrow">↑ depends on</div>
            <div class="layer">
              <div class="lhead">
                <span class="lnum">00</span>
                <h3>Foundation</h3>
              </div>
              <div class="chips">
                <span class="chip">AWS Organizations &amp; SCPs</span>
                <span class="chip">Centralized logging &amp; GuardDuty</span>
                <span class="chip">Terraform remote state</span>
                <span class="chip">OIDC federation for CI/CD</span>
              </div>
            </div>
          </div>

          <div class="callout">
            <b>Why layers, not one big Terraform config:</b> state is decoupled
            between layers via remote-state lookups, so a change to an
            application never risks touching the network hub, and a new account
            only ever needs to run the layers it's missing — not rebuild the
            platform from scratch.
          </div>
        </div>
      </section>

      <section>
        <div class="wrap">
          <div class="section-eyebrow">Networking</div>
          <h2>Hub-and-spoke, not point-to-point</h2>
          <p>
            Every account's VPC attaches to one central Transit Gateway rather
            than maintaining its own peering relationships and its own path to
            on-premises systems. A mirrored hub in a secondary region handles
            disaster recovery, so failover is a routing decision, not a rebuild.
          </p>

          <div class="hubwrap">
            <div class="diagram-top">
              <h3 style="font-size: 15.5px">
                How a request actually moves through the hub
              </h3>
              <button id="tgwPlayBtn">▶ Show traffic flow</button>
            </div>
            <div class="hub-legend">
              <span class="lg-dot lg-public"></span> Public entry (edge + DNS)
              <span class="lg-dot lg-internal"></span> Internal, hub-routed path
            </div>
            <div
              class="diagram-scroll"
              role="region"
              aria-label="Architecture diagram"
              tabindex="0"
            >
              <svg
                role="img"
                aria-label="Architecture flow diagram; the following walkthrough explains the sequence"
                class="hub-svg"
                viewBox="0 -150 720 520"
                xmlns="http://www.w3.org/2000/svg"
              >
                <!-- Group boxes -->
                <rect
                  class="hub-groupbox"
                  x="12"
                  y="55"
                  width="156"
                  height="265"
                  rx="14"
                />
                <text class="hub-group-label" x="90" y="42">
                  GOVERNANCE &amp; COMPLIANCE
                </text>
                <rect
                  class="hub-groupbox"
                  x="552"
                  y="-20"
                  width="156"
                  height="360"
                  rx="14"
                />
                <text class="hub-group-label" x="630" y="-27">
                  WORKLOAD ACCOUNTS
                </text>

                <path class="hub-line" id="hl-security" d="M360,175 L90,100" />
                <path class="hub-line" id="hl-archive" d="M360,175 L90,275" />
                <path class="hub-line" id="hl-shared" d="M360,175 L630,25" />
                <path class="hub-line" id="hl-prod" d="M360,175 L630,115" />
                <path class="hub-line" id="hl-devstg" d="M360,175 L630,205" />
                <path
                  class="hub-line"
                  id="hl-dr"
                  d="M360,175 L630,295"
                  stroke-dasharray="5,4"
                />
                <path
                  class="hub-line public"
                  id="hl-internet"
                  d="M630,-75 L630,0"
                />

                <circle
                  class="hub-pulse"
                  id="hubPulse"
                  r="6"
                  cx="360"
                  cy="175"
                />

                <text
                  x="630"
                  y="-58"
                  text-anchor="middle"
                  font-size="10.5"
                  fill="var(--muted)"
                  font-family="Inter,sans-serif"
                >
                  CloudFront + WAF → Route 53
                </text>

                <g class="hub-node public" id="hn-internet">
                  <rect
                    x="570"
                    y="-125"
                    width="120"
                    height="50"
                    rx="10"
                    stroke-dasharray="4,3"
                  />
                  <text x="630" y="-104" text-anchor="middle" font-weight="600">
                    Internet
                  </text>
                  <text x="630" y="-89" text-anchor="middle" opacity=".7">
                    End Users
                  </text>
                </g>

                <g class="hub-node center" id="hn-hub">
                  <rect x="300" y="150" width="120" height="50" rx="10" />
                  <text x="360" y="171" text-anchor="middle" font-weight="600">
                    Transit Gateway
                  </text>
                  <text x="360" y="186" text-anchor="middle" opacity=".75">
                    Networking Hub
                  </text>
                </g>

                <g class="hub-node" id="hn-security">
                  <rect x="30" y="75" width="120" height="50" rx="10" />
                  <text x="90" y="96" text-anchor="middle" font-weight="600">
                    Security
                  </text>
                  <text x="90" y="111" text-anchor="middle" opacity=".7">
                    Account
                  </text>
                </g>
                <g class="hub-node" id="hn-archive">
                  <rect x="30" y="250" width="120" height="50" rx="10" />
                  <text x="90" y="271" text-anchor="middle" font-weight="600">
                    Archive
                  </text>
                  <text x="90" y="286" text-anchor="middle" opacity=".7">
                    &amp; Migration
                  </text>
                </g>

                <g class="hub-node" id="hn-shared">
                  <rect x="570" y="0" width="120" height="50" rx="10" />
                  <text x="630" y="21" text-anchor="middle" font-weight="600">
                    Shared Services
                  </text>
                  <text x="630" y="36" text-anchor="middle" opacity=".7">
                    Route 53 · Identity
                  </text>
                </g>
                <g class="hub-node" id="hn-prod">
                  <rect x="570" y="90" width="120" height="50" rx="10" />
                  <text x="630" y="111" text-anchor="middle" font-weight="600">
                    Production
                  </text>
                  <text x="630" y="126" text-anchor="middle" opacity=".7">
                    Accounts
                  </text>
                </g>
                <g class="hub-node" id="hn-devstg">
                  <rect x="570" y="180" width="120" height="50" rx="10" />
                  <text x="630" y="201" text-anchor="middle" font-weight="600">
                    Dev / Staging
                  </text>
                  <text x="630" y="216" text-anchor="middle" opacity=".7">
                    Accounts
                  </text>
                </g>
                <g class="hub-node" id="hn-dr">
                  <rect x="570" y="270" width="120" height="50" rx="10" />
                  <text x="630" y="291" text-anchor="middle" font-weight="600">
                    DR Region
                  </text>
                  <text x="630" y="306" text-anchor="middle" opacity=".7">
                    Standby Hub
                  </text>
                </g>
              </svg>
            </div>
            <div class="hub-caption" id="hubCaption" aria-live="polite">
              Click <b>Show traffic flow</b> to follow a public request in
              through the edge, and see how it's then distributed like any other
              hub-routed traffic.
            </div>
          </div>
          <p style="font-size: 13.5px; color: var(--muted); margin-top: 10px">
            Security and Archive &amp; Migration are kept as a lightweight
            <b>governance and compliance stack</b> — audit, guardrails,
            long-term retention — structurally separate from the accounts that
            actually run workloads. Every account in either group still connects
            to the same single hub.
          </p>
          <p style="font-size: 14px; color: var(--muted); margin-top: 14px">
            To be precise about the path: a public request hits CloudFront
            first, with a WAF in front of it, then resolves through Route 53 —
            both the public zone for the domain and the private zones used for
            internal service discovery — hosted in the Shared Services account.
            From there it reaches the Transit Gateway in the Networking account
            and gets distributed to whichever account actually owns the
            workload, Production included. It's one entry point, not a separate
            ingress path per account.
          </p>
        </div>
      </section>

      <section>
        <div class="wrap">
          <div class="section-eyebrow">Rollout</div>
          <h2>A strict, dependency-ordered build sequence</h2>
          <p>
            Because every layer depends only on the one below it, the entire
            platform — or a single new account joining it — follows the same
            fixed sequence. In practice this turned a bespoke, multi-week
            onboarding into a repeatable checklist:
          </p>
          <div class="seq">
            <div class="seq-item">
              <h3>Organization &amp; guardrails</h3>
              <p>
                Stand up the AWS Organization, service control policies, and
                centralized logging before anything else exists.
              </p>
            </div>
            <div class="seq-item">
              <h3>Primary network hub</h3>
              <p>
                Deploy the Transit Gateway and attach the first wave of spoke
                VPCs.
              </p>
            </div>
            <div class="seq-item">
              <h3>DR network hub</h3>
              <p>
                Stand up the mirrored hub in the secondary region so failover
                has somewhere to go.
              </p>
            </div>
            <div class="seq-item">
              <h3>Shared services</h3>
              <p>
                Bastion access, DNS, certificates, identity, and security
                tooling — the layer every application depends on.
              </p>
            </div>
            <div class="seq-item">
              <h3>Applications, per account</h3>
              <p>
                Databases, storage, messaging, and the workload stack itself,
                brought up once its dependencies are confirmed live.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div class="wrap">
          <div class="section-eyebrow">CI/CD</div>
          <h2>Designing so a mistake literally cannot ship</h2>
          <p>
            Terraform changes are safe to review but dangerous to run carelessly
            against 40+ live accounts, so I built the pipeline to make an
            unintended <code>apply</code> structurally impossible rather than
            relying on people remembering to be careful. Every module inherits
            one shared pipeline engine instead of copy-pasted YAML, and every
            run is confined to exactly one module and one environment.
          </p>

          <div
            class="table-scroll"
            role="region"
            aria-label="Technical comparison"
            tabindex="0"
          >
            <table class="gtable">
              <tr>
                <th>Layer</th>
                <th>Guardrail</th>
              </tr>
              <tr>
                <td class="gnum">1</td>
                <td>
                  Pull requests can only ever trigger a read-only <b>plan</b> —
                  the automated PR job has no <code>apply</code> step to run,
                  full stop.
                </td>
              </tr>
              <tr>
                <td class="gnum">2</td>
                <td>
                  That plan job assumes an IAM role scoped to AWS-managed
                  read-only access — even a compromised or misconfigured
                  workflow is hard-rejected by AWS itself if it attempts a
                  write.
                </td>
              </tr>
              <tr>
                <td class="gnum">3</td>
                <td>
                  A manual deploy defaults to a dry-run plan. Actually changing
                  infrastructure requires explicitly unchecking a "plan only"
                  flag.
                </td>
              </tr>
              <tr>
                <td class="gnum">4</td>
                <td>
                  Applying still requires typing the exact target environment
                  name as a confirmation string — a typo or a copy-paste from
                  the wrong run aborts the pipeline before Terraform runs at
                  all.
                </td>
              </tr>
              <tr>
                <td class="gnum">5</td>
                <td>
                  The apply step itself is conditionally skipped in the workflow
                  definition unless every prior check passed — it's not a
                  policy, it's how the job graph is built.
                </td>
              </tr>
            </table>
          </div>

          <p>
            The result: onboarding a brand-new module into this pipeline takes
            under two minutes of YAML, but no engineer — however new — can
            accidentally run <code>terraform apply</code> against production by
            clicking the wrong button.
          </p>
        </div>
      </section>

      <section>
        <div class="wrap">
          <div class="section-eyebrow">Outcome</div>
          <h2>What changed</h2>
          <div class="outcomes">
            <div class="outcome">
              <div class="num">40+</div>
              <div class="txt">
                AWS accounts under one consistent governance and security model
              </div>
            </div>
            <div class="outcome">
              <div class="num">Weeks → Hours</div>
              <div class="txt">
                Time to provision a fully governed new environment
              </div>
            </div>
            <div class="outcome">
              <div class="num">Zero</div>
              <div class="txt">
                Accidental production applies since the pipeline redesign
              </div>
            </div>
          </div>
          <p>
            Beyond the numbers, the platform stopped depending on any one
            person's tribal knowledge. A new engineer can read the layer they're
            touching, trust that everything beneath it is already governed, and
            ship a change with a pipeline that makes the unsafe path harder than
            the safe one.
          </p>
        </div>
      </section>
