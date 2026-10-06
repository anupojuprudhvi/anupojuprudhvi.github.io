---
title: AI as a Writer: Documentation That Finally Gets Done (Mid 2025)
date: 2026-10-06
track: my-ai-journey
order: 5
module: 5
summary: Documentation was always the thing I put off. In mid 2025 that changed. I bring the facts, AI brings the structure and the first draft, and I check every line. Runbooks, guides, and design notes that used to wait for "later" started getting written, and the training material and learning paths on this site came out of the same habit.
level: Part 2 · Working together
readingTime: 6 min read
stack: [ChatGPT, Claude]
tags: [ai, journey, documentation, writing, runbooks, training]
---

*The fix is done. The incident is closed. Somewhere in my head is everything the next engineer will need: what broke, why, and what to check next time. And as always, the runbook can wait until later. Later never comes.*

For years, writing was the third cost from [Chapter 01](01-before-ai.html): the work that always came last. In mid 2025, that changed.

## The shift · I bring the facts, AI brings the shape

What I'd learned as a co-worker carried straight over to writing. AI is good at structure, flow, and first drafts. It's bad at facts it doesn't have. So we split the job into four steps:

1. **Me: the facts.** Notes, commands, decisions, the real config, what went wrong.
2. **AI: the shape.** An outline first, then a first draft.
3. **Me: the check.** Every claim, command, and number against the source.
4. **AI: the polish.** Plain language, consistent terms, shorter sentences.

The blank page was always the hardest part. With a first draft in front of me, writing becomes editing, and editing is much faster.

## What I write this way · More than I expected

- **Runbooks and incident notes,** written while the details are still fresh.
- **Design notes and architecture write-ups** for reviews.
- **Training material for new engineers,** including a Linux course for interns with guides and a hands-on lab.
- **The learning paths on this site,** shaped from notes on real projects.

## The trap · Confident filler

AI writing has one big trap: when it doesn't have a fact, it fills the gap with something that *sounds* right. A plausible version number. A step that's normally there. A neat-sounding result.

So I hold every document to one rule: **every claim must trace back to a source.** A command I ran, a config I can open, a decision someone made, a log I read. If a sentence can't be traced, it comes out.

## Style rules · Write them down once

The other thing I learned: AI follows written style rules well. Instead of fixing the same problems in every draft, I wrote the rules down once and gave them with every request:

- Short sentences. Plain words. Explain each term the first time it's used.
- Active voice. Say who does what.
- No claims without a source. No invented numbers.

Writing rules down for AI turned out to matter far beyond documents. It's exactly where the agents in [Chapter 08](08-agents-md-skills-and-mcp.html) came from.

### Try it in your workflow: your first AI-assisted runbook

- Pick the last incident or tricky change you handled. Dump everything you remember into a note: commands, errors, decisions, gaps.
- Ask the AI for a runbook outline first: symptoms, checks, fix, prevention. Agree the outline before any prose.
- Ask for the draft, then check every command and claim against your notes or the system.
- Delete any sentence you can't trace to a source.

## What I'd tell you · If you're at this stage

- **Outline first, prose second.** It's much easier to fix the structure before the words exist.
- **You own every sentence.** If you can't trace a claim, cut it.
- **Write your style rules down once.** Then every draft starts closer to done.

## What would you do? · Quick check

```quiz
S: An AI draft of your runbook says a service "restarts automatically within 30 seconds". You don't remember that. What do you do?
- Keep it, because it sounds reasonable
* Check the real service configuration; if you can't confirm it, remove the sentence
- Change it to "about a minute" to be safe
- Add "(approximately)" after the number
= An unsourced detail is a guess, however reasonable it sounds. Check it against the system or take it out. Softening a guess still leaves a guess in the document.
S: You want AI to help write a design note for a review next week. What's the best first request?
- "Write a design note about our new platform"
* Give it your notes and the decisions made, and ask for an outline first
- Ask it for a long, detailed document so nothing's missed
- Ask it to research best practice and write from that
= An outline built from your real notes lets you fix the structure early. A document written from general best practice describes a platform, but not yours.
Q: Why do written style rules help so much with AI writing?
- They make the AI write faster
* The AI follows them consistently, so you stop correcting the same problems in every draft
- They're required by most AI tools
- They hide that a document was AI-assisted
= Written rules are applied every time. That turns repeated editing into a one-off job, and the same idea later powers agent context files.
```

Next: [Chapter 06](06-ai-as-a-planner.html). Late 2025, when AI helped me plan the work, not just do it.
