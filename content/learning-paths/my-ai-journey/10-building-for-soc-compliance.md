---
title: Building Web Apps for SOC Compliance, with a Full Security Audit (Mid 2026)
date: 2026-10-06
track: my-ai-journey
order: 10
module: 10
summary: The last step of the journey so far. By mid 2026 I was building whole web applications with AI agents. An HR management tool with SOC-style controls designed in from the start, and a PDF product that went through a full security audit, which found a critical bug that everyday testing never would have.
level: Part 4 · Standards and building
readingTime: 7 min read
stack: [Next.js, FastAPI, PostgreSQL, Supabase, Security audit]
tags: [ai, journey, soc, compliance, security-audit, web-apps, agents]
related: [independent-products/ai-assisted-hrms-tool, independent-products/solo-saas-hardening-ai-agentic-engineering]
---

*The app works. Every page loads, every test passes, and the demo went well. It's tempting to call it done. But "works" only means it does what it should when people use it as intended. Security is about what happens when someone doesn't.*

By mid 2026, everything from the earlier chapters came together: agents that follow written rules, checks that can't be skipped, and standards written down. That made something possible that once needed a team: building whole web applications myself, and taking security as seriously as a team would.

## What I built · Two real products

- **An [AI-assisted HRMS tool](../../case-studies/independent-products/ai-assisted-hrms-tool.html):** leave, attendance, shifts, timesheets, the org chart, assets, and policy documents, with an assistant that answers policy questions by quoting the handbook with the page.
- **A [PDF product](../../case-studies/independent-products/solo-saas-hardening-ai-agentic-engineering.html)** that handles real payments, taken from a broken deployment to a hardened, audited app.

Both were built with AI agents doing much of the coding, under the rules from [Chapter 08](08-agents-md-skills-and-mcp.html).

## SOC compliance · Controls designed in

SOC reports, such as SOC 2, are about showing that a system has the right controls and that they work. That's very hard to add at the end. So in the HRMS, the controls were part of the design from the start, and part of the rules the agents follow:

- **Access control:** every user has a role, and the API checks it before any data changes.
- **Data separation:** every record is tagged with its company, and tests try to cross that line and expect to be refused.
- **Change management:** changes follow written rules, tests, and review, and every task leaves a written handover.
- **Secure sign-in:** the sign-in token sits in a cookie that page scripts can't read.
- **Evidence:** the tests and handovers form a record of what was done and checked.

One thing to be clear about: designing for SOC controls isn't the same as holding a SOC report. A SOC report comes from an independent auditor. What I can do as a builder is make sure the controls exist, work, and leave evidence.

## The audit · Reading the code like an attacker

Tests check that the app does what it should. An audit asks what it does when someone attacks it. The PDF product handles real payments but had never had a security review, so I ran a full audit as a separate, deliberate pass: a line-by-line read of the server, routes, middleware, and client, looking for ways to misuse it.

It found nine real issues. The worst was critical: the payment webhook trusted unsigned requests, so anyone who knew the endpoint could fake a "payment completed" event and get credits for free. It wasn't reachable through normal use, so no everyday test would have found it. A deliberate audit did.

Every finding was fixed and written up the same way: the symptom, the cause, the fix, and a rule to stop it happening again.

AI helps here too, as an extra reviewer that reads every file without getting tired. But the audit is a deliberate step with a person in charge, not something an agent does on the side.

### Try it in your workflow: a one-hour security pass

- Pick one app you own. List every way data gets in: forms, APIs, webhooks, file uploads.
- For each one, ask: what if the request is forged, repeated, or from the wrong user?
- Ask an AI to review that code path with the same questions. Check every finding yourself.
- For each real issue, fix it, add a test that would have caught it, and write down the rule that prevents it.

## What I'd tell you · If you're at this stage

- **Design controls in from day one.** Access, separation, and change records are cheap early and expensive later.
- **Schedule the audit.** The worst bugs hide off the normal paths, where everyday testing never goes.
- **Be honest about what you can claim.** "Built with SOC controls" and "holds a SOC report" are different statements.

## What would you do? · Quick check

```quiz
S: All tests pass and the app works in the demo. Are you ready to call it secure?
- Yes, passing tests mean it's secure
* No. Tests check intended use; a deliberate security review checks what happens when someone misuses it
- Yes, if an AI agent wrote the tests
- No, but only because the tests should be run twice
= Tests confirm expected behaviour. Many serious issues, like a forged webhook, only appear when someone deliberately uses the app in ways it wasn't meant for.
S: A prospect asks whether your app is "SOC 2 compliant". You've built in SOC-style controls, but there's been no independent audit. What's the honest answer?
- "Yes, fully compliant"
* "It's built with SOC 2-style controls, but it doesn't have a SOC 2 report from an independent auditor yet"
- "SOC 2 doesn't apply to small apps"
- "Our AI checked it, so yes"
= A SOC 2 report comes from an independent auditor. Saying exactly what you have, the controls and the evidence, keeps trust.
Q: In a multi-company app, what's the best proof that one company can't see another's data?
- A note in the documentation saying so
* Automated tests that try to read and change another company's data, and expect to be refused
- Asking users to report problems
- Using a different colour theme for each company
= Separation has to be proven, not assumed. Tests that deliberately cross the boundary, and pass only when refused, are evidence an auditor can check.
```

Next: [Chapter 11](11-where-i-am-now.html). Where I am now, and where you could start.
