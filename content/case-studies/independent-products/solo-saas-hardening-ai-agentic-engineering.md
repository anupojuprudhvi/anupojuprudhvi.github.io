---
title: Hardening a solo SaaS product, end to end, with AI-agent-assisted engineering
nav: Solo SaaS hardening
summary: Taking a solo-built PDF SaaS product from a serverless deployment that didn't actually run to a security-audited, ~93% lighter production app — built and operated solo using a formalized AI-agent engineering workflow.
project: independent-products
layer: Product engineering
order: 10
stack: [Node.js, Vercel Serverless, Supabase, Stripe, mupdf WASM, Terraform]
tags: [saas, security, performance, serverless, ai-assisted-engineering]
problem: |
  A solo-built PDF compression and conversion SaaS product launched on Vercel's serverless
  platform, but the architecture it launched with was built around assumptions serverless
  doesn't support: a native-binary PDF rendering library that can't load its system
  dependencies in a Lambda-style runtime, a worker file `pdf.js` needs that the deployment
  bundler couldn't trace and include, and a file-based SQLite database on a filesystem that's
  read-only and wiped between invocations. On top of that, the app handled real payments
  through Stripe and had never had a dedicated security pass.
solution: |
  A systematic, documented engineering pass — one person, working through a formalized
  AI-agent-assisted workflow — that replaced the native-binary rendering stack with a pure
  WebAssembly engine, migrated the database to managed Postgres, ran a full security audit
  that found and fixed nine real findings including a critical payment-integrity bug, and cut
  the app's first-load payload by roughly 93%.
heroTitle: One person, a formal AI-agent workflow, and a production SaaS product taken from broken to hardened
intro: A solo SaaS product hit the wall a lot of serverless deployments hit — libraries that assume a persistent filesystem or native system dependencies that Lambda-style runtimes don't provide. This case study covers rebuilding the core engine around that constraint, the security audit that followed, and the AI-agent-assisted engineering discipline that made it possible to do all of this alone without cutting corners.
role: Solo founder / full-stack & infrastructure engineer
scope: Serverless architecture rework, self-run security audit and remediation, and performance optimization
closingText: Happy to go deeper on the WASM rendering rewrite, the security audit findings, or how the AI-agent workflow itself was structured.
outcomes:
  - value: 93%
    label: Reduction in first-load page weight (1.47MB down to roughly 106KB, one origin instead of three)
  - value: 9
    label: Security findings fixed in a self-run audit, including a critical payment-integrity bypass
  - value: ">95%"
    label: Cut in database write queries after adding a short-lived in-memory session cache
scaffold: false
---

## Problem · Serverless doesn't forgive assumptions a normal server tolerates

The product's PDF rendering engine depended on a native-binary canvas library and `pdf.js`'s worker-based rendering model — both fine on a normal server, both broken on Vercel's serverless runtime. The canvas library couldn't link its underlying system graphics libraries in that environment; `pdf.js` loads its worker script through a dynamic import the deployment bundler can't trace statically, so the worker file simply never shipped. The failures didn't look the same twice — sometimes an outright 500 error, sometimes the request "succeeded" but the output was barely smaller than the input — while every one of it worked correctly on a local machine. That mismatch is its own lesson: a serverless environment can pass every local test and still not run the same code path once deployed.

The database had the same category of problem: a file-based SQLite store on a filesystem that's read-only at the application root, so writes there failed outright with a read-only-filesystem error; redirecting writes to the one writable scratch directory available didn't really fix it either, because that storage doesn't survive between function invocations, so a write could succeed and then simply not be there anymore the next time a user's request landed on a different instance.

Underneath both of those was a business-critical concern that hadn't been addressed at all yet: the app processes real payments through Stripe, and no dedicated security review had been run against it.

## Architecture · Rebuilding the engine around the runtime's actual constraints, not around what's convenient locally

```text
   Before                                    After
   ──────                                    ─────
   [ canvas (native binary) ]                [ mupdf — pure WASM ]
   [ pdf.js worker (untraceable) ]     ──►    [ no worker, no native deps ]
   [ SQLite (local file) ]                    [ Supabase Postgres, managed ]
          │                                          │
          ▼                                          ▼
   Fails silently on Vercel                   Runs identically local & deployed
```

### Implementation notes

- **The fix was a rewrite of the rendering path, not a patch.** Rather than continuing to work around the native canvas library and the worker-loading problem individually, the compression engine was rebuilt on `mupdf` compiled to WebAssembly — no native bindings, no worker file, no dynamic import the bundler needs to trace. The same code path now runs identically on a laptop and in a serverless function, which is what actually closes this class of bug rather than patching around each symptom.
- **The database migration wasn't just "move the file to a service."** Moving from SQLite to Supabase Postgres also meant hand-writing and committing an idempotent, row-level-security-locked schema — the first migration attempt shipped the code that read and wrote a `users` table without ever creating that table anywhere, which meant every read failed and was silently swallowed as "not found" until that was caught and fixed. That became a standing rule afterward: a data-access helper is never allowed to turn a real error into an empty success value, because it makes a broken query and a genuinely empty table look identical.
- **The security audit found a critical payment bug.** The Stripe webhook — the endpoint that grants purchased credits — verified the cryptographic signature only when both the webhook secret and the signature header were present, and otherwise trusted the request body directly. That meant anyone who knew the endpoint could POST a fabricated "payment completed" event and mint credits for any account, with no payment involved. The fix rejects any webhook call that isn't signed at all, rather than treating an unsigned request as a degraded-but-acceptable case. The same audit pass also fixed a forgeable default session secret (an unset environment variable falling back to a known string — full authentication bypass in production if missed), a session-fixation gap (session IDs weren't rotated on login), and a race condition in credit deduction that allowed the same credits to be spent twice under concurrent requests.
- **Performance work was measured before and after, not assumed.** The homepage's first-load transfer dropped from about 1.47MB across three different origins to roughly 106KB from one, mainly by fixing two mislabeled 594KB images that were actually 1024px JPEGs saved with a `.png` extension and being rendered at 68px, self-hosting the one font family actually in use instead of pulling from Google's CDN, and loading the auth SDK on demand instead of on every page view regardless of whether that page needed it.
- **A cross-region latency bug was a deployment-topology problem, not a code problem.** Login was slow because the serverless functions ran in one region while the database sat in another, and every login made several sequential round trips between them. The fix was pinning the function region next to the database and folding a redundant follow-up request into the login response itself — a deployment and response-shape change, not a rewrite of how authentication or sessions actually work.

### Privacy by construction, not by policy

The server-side flow already carried a privacy decision worth naming on its own: the optimized output gets stored in a private bucket so a user can re-download it later, but the raw uploaded file itself never does — only the result is retained, never the source. The in-browser mode takes that same instinct to its logical endpoint. For a document someone doesn't want leaving their own device at all — a contract, an ID scan, a medical record — the file is never uploaded anywhere in the first place: the same compression engine runs inside a Web Worker on the user's own machine, compiled to WebAssembly, so "we don't see your file" is an architectural fact rather than a policy promise someone has to take on trust.

That turned into a real product problem, not just a technical one: the app still needs to meter usage per page for a file it never receives. That's handled with a fileless reserve/complete/abort exchange — the client tells the server how many pages it's about to process before the work starts, the server reserves the credits for that, and the client confirms or aborts once the in-browser job actually finishes — so the credit-based business model stays intact without the server ever needing to see the file to enforce it.

The trade-off is a one-time ~4.7MB WebAssembly engine download before the in-browser mode can run at all. It's cached after that first load, and that caching is what made the installable, offline-capable version of the app possible as a natural side effect, rather than a separate feature that had to be built on its own.

### The engineering process itself

This was built and operated by one person, directing AI coding agents against a written operating protocol — not an ad hoc "ask the AI to fix it" loop, but a standing document the agent is required to follow on every change, the same way a team would follow an engineering handbook.

The protocol runs every change through three explicit steps in order: explain the issue — what broke, the actual technical root cause, in plain language — before touching any code; propose the fix and name exactly which files it will touch and why; then implement, test, and document. Skipping straight to "here's the fix" isn't allowed, which matters specifically when you're the only reviewer — the explanation step is what a second engineer's code review would normally catch, done before the change lands instead of after.

Every one of the 28 issues logged during development — from the serverless native-binary failures to the security audit findings — went through the same fixed shape: a dated write-up of the symptom, the root cause, the fix, and a prevention rule, filed in its own document and indexed in a master tracker before the issue counted as closed. That discipline is what turned a genuinely gnarly bug into a traceable record instead of a memory: a post-login authentication failure was fixed once by closing a session-save race condition, recurred anyway, and was fixed a second time by adding live token-refresh handling — and it was going back through the written RCA trail, not a fresh guess, that eventually surfaced the actual cause: the database table the login route depended on had never been created in the first place, so every read had been failing silently all along and each earlier fix had correctly solved a symptom of a problem it couldn't see.

There's also a hard automated gate, not just a written guideline: ten test suites covering authentication, Stripe pricing math, upload validation, real compression runs against synthetic PDFs, and the premium/credit logic, and the protocol is explicit that if any suite fails, nothing gets pushed until it's fixed and every suite passes clean. On top of that sits a pre-push checklist scoped specifically to what an AI agent might otherwise skip under time pressure — tests green, new environment variables documented, the relevant issue doc and tracker updated, secrets excluded from git, and a commit message that actually states what changed — checked before any deployment command is even suggested, let alone run.

The protocol itself wasn't written once and left alone, either — it absorbed its own lessons. The rule that optional native modules must be guarded with try-catch fallbacks, and that serverless functions must never assume local filesystem write access, are standing instructions today specifically because ignoring both of those is what caused the original production outage this project started from.

### Trade-offs

Rewriting the rendering engine instead of patching the native-binary approach cost real time up front — WASM compilation has its own quirks and the migration touched every code path that generated a PDF. It was the right call because the alternative was chasing an open-ended list of serverless-incompatibility bugs one at a time, each looking like a one-off until the next one landed. Running the security audit as a dedicated pass, rather than fixing issues opportunistically as they were noticed, surfaced the critical webhook finding specifically because it wasn't reachable through the app's normal usage paths — it only showed up under a deliberate line-by-line adversarial read of the whole codebase — server, routes, middleware, and client — which is a good argument for scheduling that kind of pass rather than waiting for something to trigger it.
