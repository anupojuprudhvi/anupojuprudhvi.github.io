---
title: Compliant by Design: An Agentic Workflow for Platform Code (Late 2025)
date: 2026-10-06
track: my-ai-journey
order: 7
module: 7
summary: Late 2025, the biggest step so far. Instead of asking AI for snippets, I designed a workflow where an AI agent delivers whole pieces of platform code, and the rules it must follow (naming, tagging, security checks, tests, and review) are built into the workflow itself. Compliance stopped being a check at the end and became the way the code is written.
level: Part 3 · Agents
readingTime: 7 min read
stack: [Terraform, Checkov, TFLint, terraform test, CI/CD]
tags: [ai, journey, agents, agentic-workflow, compliance, terraform, platform-engineering]
---

*The old way: an engineer writes a Terraform module, opens a pull request, and a reviewer finds the missing tags, the bucket without encryption, the name that breaks the convention. Back and forth, three rounds. The new way: by the time a human sees the change, the tags are there, the encryption is on, the name follows the convention, the tests pass, and the security scan is clean. The review is about the design, not the basics.*

That's what "compliant by design" means. In late 2025, I started delivering platform code this way, with an AI agent doing much of the writing.

## The shift · From snippets to a workflow

Until now, AI had been a helper I talked to. An **agent** is different: it can read files, write code, run commands, and check its own results, in a loop, until a task is done.

That's powerful, and risky. An agent that writes code fast can also write non-compliant code fast. So the question changed from "what can the agent write?" to **"what must every piece of code pass before anyone accepts it?"**

## The design · Rules first, then the agent

I built the workflow around the rules, not around the agent:

1. **The standard comes first.** Naming, tagging, module structure, and the security baseline are written down, and the agent reads them before it starts.
2. **The agent writes the change,** following the standard.
3. **Automatic checks run:** format, lint, security scan, tests, and a plan with no surprises. If anything fails, the agent fixes it and runs them again.
4. **A person reviews it:** the design, the risk, and anything the checks can't judge.
5. **A person approves the deploy.** The plan is shown on the pull request, and nothing is applied until someone approves it.

Three things make it work:

1. **The standard is written down.** Naming, tagging, module layout, and security rules live in the repository, where the agent reads them first. The [Terraform track](../terraform/index.html) describes the kind of standard I mean: [base and composition modules](../terraform/07-base-composition-and-environment-modules.html), [naming and tagging](../terraform/08-naming-tagging-and-provider-versions.html), and [module testing](../terraform/09-change-workflow-and-module-testing.html).
2. **The checks are automatic.** Linting, security scanning such as Checkov, and `terraform test` run on every change. The agent runs them too, before it says it's done.
3. **A person still decides.** Every change goes through review, and nothing is applied to an environment without a person approving it, the same [promotion gate](../terraform/11-module-promotion-gate.html) any engineer's code goes through.

## What changed · Review gets better, not just faster

- **Fewer review rounds.** The basics are already right, so reviews focus on design and risk.
- **More consistent code.** The agent follows the standard every time. People forget; written rules don't.
- **Standards got sharper.** When the agent did something odd, the cause was usually a gap or an unclear line in the standard. Fixing the standard fixed it for every future change.

## What didn't change · Responsibility

The agent writes much of the code, but I'm responsible for what gets deployed. A clean scan doesn't prove a design is right. A passing test only checks what someone thought to test. That's why the human review and the approval gate stay, however good the agent gets.

### Try it in your workflow: make one rule automatic

- Pick one rule reviewers keep repeating, such as "every resource must have an owner tag".
- Write it down in the repository, in one line, where people and agents will read it.
- Add a check that enforces it automatically on every pull request.
- Next time an agent or a person writes code, see whether the rule is followed without anyone asking.

## What I'd tell you · If you're at this stage

- **Write the rules before you let the agent write code.** An agent amplifies whatever standard it's given, good or missing.
- **Automate every rule you can.** Checks don't get tired, and they don't skip steps under deadline pressure.
- **Keep the human gate.** Agents speed up delivery. They don't take over accountability.

## What would you do? · Quick check

```quiz
S: An AI agent delivers a Terraform module that passes every automatic check. What's still needed before it reaches production?
- Nothing, since the checks passed
* A human review of the design and risk, and an approved plan before apply
- A second agent to re-check the module
- A manual re-run of the same checks
= Checks prove the code follows the rules they know about. Design choices, blast radius, and fit with the rest of the platform still need a person.
S: The agent keeps naming resources slightly differently from your convention. What's the best fix?
- Correct the names by hand in each review
- Stop using the agent for naming
* Write the convention down clearly in the repository and add a check that enforces it
- Ask the agent to "be more careful"
= Repeated mistakes usually point to an unwritten or unclear rule. Writing it down and enforcing it fixes it for every future change, from people and agents alike.
Q: What does "compliant by design" mean?
- Running a compliance audit once a year
* Building the rules into how code is written and checked, so compliant code is the default
- Asking reviewers to look harder for problems
- Using only approved AI tools
= Compliance by design moves the rules to the start: written standards plus automatic checks, so problems are caught as the code is written, not found at the end.
```

Next: [Chapter 08](08-agents-md-skills-and-mcp.html). February 2026, AGENTS.md, Skills, and MCP.
