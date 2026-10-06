---
title: AI as a Planner: Breaking Down Big Work and Cutting Cloud Cost (Late 2025 to Early 2026)
date: 2026-10-06
track: my-ai-journey
order: 6
module: 6
summary: As an architect, the hardest part of a project is often the first week, reading a long, complex requirement and turning it into a plan. From late 2025 I used AI to read with me, break big work into a work breakdown structure (WBS) of small tasks, and look for cloud cost savings. The method, and why the decisions stay with me.
level: Part 2 · Working together
readingTime: 7 min read
stack: [Claude, WBS]
tags: [ai, journey, planning, wbs, requirements, cost-optimization, finops]
---

*A new piece of work lands. Fifty pages of requirements, three diagrams that don't quite agree, and a meeting on Monday where everyone expects a plan. In the past, the first few days went on reading, re-reading, and sticky notes. Now the first hour goes on a different kind of conversation.*

From late 2025, I started using AI for the work *before* the work: understanding it, breaking it down, and deciding where the money goes.

## Reading · Complex documents, made small

Long requirements and architecture documents are hard because everything is connected and nothing is in order. AI turned out to be a very good reading partner, as long as I ask the right things:

- **"Summarise this in ten bullet points, then list every assumption it makes."**
- **"Where do these two sections disagree?"** Contradictions are much easier to find with a second reader.
- **"What questions should I ask the authors before I start?"** This one alone saves days.

The goal is never a summary to trust instead of the document. It's a map that tells me which parts of the document to read closely.

## Planning · From one big task to many small ones

A work breakdown structure (WBS) splits a big piece of work into phases, then tasks, each small enough to estimate and finish. Building one used to take me a day of thinking. Now it's a conversation in five steps:

1. **Give it the requirement,** plus the constraints: team, deadline, budget.
2. **Ask for phases:** big stages, each with a clear outcome.
3. **Ask for tasks:** small enough to finish in a day or two, with their dependencies.
4. **Ask what "done" means:** an acceptance check for every task.
5. **Review it myself:** reorder, cut, merge, and add what only I know.

The AI is fast at the first draft and good at spotting forgotten work: testing, documentation, access requests, cut-over, rollback. I'm the one who knows the team, the politics, and the history, so the final plan is mine.

## Cost · A second pair of eyes on the bill

In 2026 I also started using AI for cloud cost optimization. The pattern is the same as debugging: AI suggests, data decides.

1. **Give it the facts.** A cost breakdown by service, usage trends, and how the system is used.
2. **Ask for hypotheses.** Idle or oversized resources, storage in the wrong tier, data transfer between zones, workloads that could use Savings Plans or Spot.
3. **Check each one with real data.** Utilisation metrics, access patterns, and the actual bill.
4. **Decide with the people who own the system.** A saving that breaks a recovery plan or a compliance rule isn't a saving.

The value isn't that AI knows the answers. It's that it suggests places to look that I might have skipped.

### Try it in your workflow: plan your next piece of work with AI

- Take the next requirement document you get. Ask for a ten-bullet summary, the assumptions, and the questions to ask the authors.
- Ask for a WBS: phases, then tasks of one or two days, each with an acceptance check.
- Ask: "What work is commonly forgotten in a project like this?" Add what applies.
- For cost: export last month's cost by service, and ask for five hypotheses to check. Check them before changing anything.

## What I'd tell you · If you're at this stage

- **Use AI to read, not to skip reading.** Let it show you which parts deserve your full attention.
- **The first draft of a plan is cheap. The judgment is yours.** Only you know the team, the risks, and the history.
- **Cost ideas are hypotheses.** Check every one against real usage before you change anything.

## What would you do? · Quick check

```quiz
S: AI turns a 50-page requirement into a neat 10-bullet summary. What's the best way to use it?
- Share the summary with the team instead of the document
* Use it as a map to find the sections to read closely, and check it against the document
- Ask the AI to estimate the project from the summary
- File the document, since the summary covers it
= A summary can drop the one detail that matters. Use it to decide where to look, not as a replacement for reading.
S: An AI-generated WBS looks complete, but has no tasks for testing, access requests, or rollback. What does this tell you?
* You need to review it carefully and ask what's commonly forgotten, because the first draft is never the full plan
- The project doesn't need those tasks
- The AI is wrong, so you shouldn't use it for planning
- You should add 20% to every estimate instead
= First drafts of plans miss the unglamorous work. Asking directly for forgotten work, then reviewing with what only you know, makes the plan real.
S: AI suggests moving a storage bucket to a cheaper tier to save money. What do you check first?
- How much money it saves
* How often the data is read, and whether any recovery or compliance rule depends on it
- Whether the AI has suggested this before
- Whether other teams have done the same
= Cheaper storage tiers can charge more for reading data back or be slower to restore. Usage and constraints decide whether the saving is real.
```

Next: [Chapter 07](07-compliant-by-design.html). Late 2025, when agents started delivering platform code.
