---
title: Writing the Standards: Platform Docs, ADRs, and Changelogs (Mid 2026)
date: 2026-10-06
track: my-ai-journey
order: 9
module: 9
summary: By mid 2026 the loop closed. Agents work best from written standards, so I started using AI to help write the standards themselves, a complete documentation set for a platform. Enterprise platform guides, architecture decision records (ADRs) that capture why, and changelogs that say what changed. How I write them with AI, and why they now serve people and agents alike.
level: Part 4 · Standards and building
readingTime: 6 min read
stack: [Markdown, ADRs, Keep a Changelog]
tags: [ai, journey, documentation, adr, changelog, standards, platform-engineering]
---

*Six months after a design decision, someone asks: "Why did we build it this way?" Nobody remembers. The person who decided has moved on. The chat where it was discussed is gone. So the team either keeps a choice nobody understands, or undoes it and rediscovers the reason the hard way.*

Mid 2026 is where my journey came full circle. Agents need written standards ([Chapter 07](07-compliant-by-design.html)). Writing is something AI helps with ([Chapter 05](05-ai-as-a-writer.html)). So I started using AI to help write the standards that agents and people both follow.

## The set · Three kinds of document

For a platform, I now write and maintain three kinds of document, each with its own job:

- **Platform guide:** how we build, run, and change things here. It changes when the way we work changes.
- **ADR (architecture decision record):** why we chose something, and what we gave up. An ADR is never edited; a new one replaces it.
- **Changelog:** what changed in each version, and whether it breaks anything. It changes with every release.

The [Terraform track](../terraform/10-adrs-and-changelogs.html) covers ADRs and changelogs in detail. Here, the story is how AI changed writing them.

## ADRs · Capture the "why" while it's fresh

An ADR is a short record of one decision: the context, the options, the choice, and its consequences. The hard part was never the format. It was writing it at all, at the moment the reasons were fresh.

Now, after a design discussion, I give the AI my notes and ask for an ADR draft in our template. It's good at laying out options fairly and at listing consequences I hadn't written down. Then I check every line. The decision and the reasons are mine, and an ADR that misstates them is worse than none.

## Changelogs · Written from the real history

A changelog tells the people who use a module or a platform what changed in each version, and whether they need to do anything. AI drafts it from the actual history: merged changes, commit messages, and pull request descriptions. I check each entry, and especially anything marked as a breaking change, against the code.

This only works because of a habit from [Chapter 03](03-the-copy-paste-loop.html): writing the *cause* into commit messages. A good history makes a good changelog.

## Platform guides · One set of rules for people and agents

The platform guides are the big one: how modules are structured, how things are named and tagged, how changes are tested and promoted, and what the security baseline is.

And here's the loop closing: **the same guides that onboard a new engineer also guide the agents.** The agent reads the standard before writing code. When it gets something wrong, I usually find a gap in the guide. I fix the guide, not just the code, and every future change, by people or agents, gets better.

### Try it in your workflow: write one ADR this week

- Pick a decision your team made recently that isn't written down anywhere.
- Give the AI your notes, and ask for an ADR with: context, options considered, the decision, and consequences.
- Check every line. Add the trade-off that only you know about.
- Store it in the repository, next to the code it's about, so people and agents can find it.

## What I'd tell you · If you're at this stage

- **Write the "why", not just the "what".** Code shows what was built. Only an ADR remembers why.
- **Keep docs next to the code.** That's where people look, and where agents read.
- **When agents go wrong, fix the standard.** The same gap would have tripped up a new engineer.

## What would you do? · Quick check

```quiz
S: Your team made a big design decision in a meeting yesterday. What's the most useful next step?
- Wait until the design is built, then document it
* Write a short ADR now, with the context, options, choice, and consequences, while the reasons are fresh
- Record the meeting and share the video
- Add a comment in the code
= Reasons fade fast. A short ADR written now saves the next person from guessing, or undoing a choice they don't understand.
S: An AI-drafted changelog marks a change as "no breaking changes". What do you do before publishing?
- Publish it, since the AI read the commits
* Check the change against the code, especially renamed inputs, removed outputs, or changed defaults
- Remove the line to be safe
- Mark every change as breaking just in case
= Commit messages can miss a breaking change. Users trust the changelog, so check the risky parts against the code itself.
Q: Why do written platform standards help AI agents?
- Agents can't write code without them
* Agents read them before they start, so they follow the same rules as everyone else
- They make the agents run faster
- They replace the need for code review
= Agents only know what they're given. Written standards in the repository give every agent the same rules people follow, and gaps they reveal improve the standard for everyone.
```

Next: [Chapter 10](10-building-for-soc-compliance.html). Mid 2026, building web apps for SOC compliance.
