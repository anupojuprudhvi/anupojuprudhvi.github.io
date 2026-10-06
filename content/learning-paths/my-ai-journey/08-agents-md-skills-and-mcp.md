---
title: Context for Agents: AGENTS.md, Skills, and MCP (February 2026)
date: 2026-10-06
track: my-ai-journey
order: 8
module: 8
summary: In February 2026 I started giving agents context the proper way. AGENTS.md is the onboarding note every agent reads first. Skills are step-by-step procedures it loads when a task needs them. MCP connects it to tools and data. Hooks turn the most important rules into checks it can't skip. A tour, using the setup behind this very website.
level: Part 3 · Agents
readingTime: 7 min read
stack: [AGENTS.md, Agent Skills, MCP, Git hooks]
tags: [ai, journey, agents, agents-md, skills, mcp, hooks, context]
---

*A new engineer joins the team. On day one, someone hands them a page: how we work, where things live, what never to do. Now picture a new AI agent starting every session with no memory at all. What does it get on day one? Until 2026, mostly nothing.*

In [Chapter 03](03-the-copy-paste-loop.html) I learned that context is the job. In February 2026, I started giving agents that context properly, in files, in the repository, every time.

## AGENTS.md · The onboarding note

An `AGENTS.md` file sits at the root of a repository and tells any AI agent how to work there: the workflow, the conventions, the checks to run, and the rules that are never broken. Many coding agents read it automatically when they start.

This website is a real example. Its `AGENTS.md` says, in plain language:

- **Inspect first, then state a plan,** before changing anything.
- **Change the source, not the generated output,** then rebuild.
- **Run the checks** (build, tests, link check) before calling anything done.
- **Never publish a client name.** The site is public, so a confidentiality scan runs before every commit.

Different tools look for different file names. This site keeps one canonical `AGENTS.md`, and a short `CLAUDE.md` simply imports it, so every agent follows the same rules.

## Skills · Procedures, loaded when needed

Some jobs need more than general rules. They need a procedure. A **skill** is a folder with a `SKILL.md` file: a step-by-step guide for one kind of task, which the agent loads only when the task needs it.

This site has four: reviewing content, checking production readiness, verifying the site in a browser, and adding a new case study. The agent doesn't carry all four in its head all the time. It picks up the right one when the work calls for it, like an engineer opening the right runbook.

## MCP · Tools and data

The **Model Context Protocol (MCP)** is a standard way to connect an agent to tools and data outside the repository: documentation, a browser, a ticketing system, a cloud account. Instead of me copying information into the chat, which was the copy-paste loop all over again, the agent can fetch it.

The rule for MCP is the same as for people: **least privilege.** Read-only access unless writing is truly needed, and nothing connected that the task doesn't require.

## Hooks · Rules that can't be skipped

Written rules are good. Enforced rules are better. A **hook** runs automatically at a set moment and can stop the agent or the commit:

On this site, the rule "never publish a client name" is in AGENTS.md, but it doesn't stop there. When an agent finishes a task, a hook scans every changed file and sends the agent back if it finds a client name. And a Git pre-commit hook runs the same scan on every commit, mine included, and blocks it if anything matches.

The written rule tells the agent what to do. The hooks make sure it actually happened, for the agent and for me.

## The bigger picture · Context, in layers

AGENTS.md is read every session. Skills and MCP tools are picked up when a task needs them. Hooks run on their own at set moments.

Put together, this is the opposite of the copy-paste loop. The agent starts every session knowing the rules, finds the right procedure, fetches its own context, and can't skip the checks that matter.

### Try it in your workflow: your first AGENTS.md

- Create `AGENTS.md` at the root of one repository you work in.
- Write five to ten lines: how to build and test, the main conventions, and the one or two things that must never happen.
- Run an agent on a small task and watch whether it follows them. Where it doesn't, make the line clearer.
- Pick your most important rule and enforce it with a hook or a CI check, not just a sentence.

## What I'd tell you · If you're at this stage

- **Start small.** A ten-line AGENTS.md beats a perfect one you never write.
- **Turn repeated tasks into skills.** If you explain the same procedure twice, write it down once.
- **Enforce what matters most.** Anything that would hurt if it slipped through deserves a hook, not just a sentence.

## What would you do? · Quick check

```quiz
Q: What's the main job of an AGENTS.md file?
- To list which AI tools a team is allowed to use
* To tell any agent how to work in the repository: workflow, conventions, checks, and hard rules
- To store the agent's memory between sessions
- To document the AI model's settings
= AGENTS.md is the onboarding note for agents. It's read at the start of a session, so every agent begins with the same rules.
S: You explain the same 8-step release procedure to an agent every week. What should you do?
- Paste it into every conversation
* Write it once as a skill, so the agent loads it whenever a release task comes up
- Put all 8 steps into AGENTS.md so it's always loaded
- Do the releases by hand instead
= A procedure for one kind of task fits a skill: written once, loaded only when needed. AGENTS.md stays short and general.
S: A rule says client names must never be published, but an agent nearly committed one. What's the strongest fix?
- Make the rule in AGENTS.md bold and capitalised
- Remind the agent at the start of every session
* Add a scan that runs automatically and blocks any commit containing a client name
- Review every commit by hand
= Written rules can be missed. An automatic hook enforces the rule every time, for agents and people alike.
```

Next: [Chapter 09](09-writing-the-standards.html). Mid 2026, writing the standards themselves.
