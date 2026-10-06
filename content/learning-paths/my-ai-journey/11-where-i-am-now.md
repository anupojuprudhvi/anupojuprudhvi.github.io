---
title: Where I Am Now, and Where You Could Start
date: 2026-10-06
track: my-ai-journey
order: 11
module: 11
summary: Four years after my first ChatGPT question, AI is part of nearly everything I do as a DevOps architect: debugging, writing, planning, delivering platform code, and building apps. How my work changed against the baseline from Chapter 01, what didn't change at all, and a simple way to find your own next step.
level: Part 5 · Now
readingTime: 5 min read
stack: [ChatGPT, Claude, AGENTS.md, Agent Skills, MCP]
tags: [ai, journey, career, advice, devops]
---

*Late 2022: a curious question in a chat window. Today: agents that read the repository, follow written standards, run the checks, and hand me changes to review. Same engineer, same kinds of problems. A very different way of working.*

This is where the journey stands today, and how to find your own next step.

## What changed · Against the baseline

In [Chapter 01](01-before-ai.html) I named three costs that ate my time. Here's what happened to each one:

- **Translating answers to my setup:** the agent now reads my actual setup, so answers start in my context.
- **Switching context:** planning, writing, and coding happen in one place, and the agent fetches what it needs.
- **Writing came last:** documentation, ADRs, and changelogs now get written as part of the work.

And one new cost appeared: **checking.** I spend much more of my time reviewing than writing. That's the trade, and it's a good one, as long as the checking is never skipped.

## What didn't change · The engineer's job

- **Responsibility.** Whatever an agent writes, I'm accountable for what gets deployed.
- **Knowing the system.** Every check, review, and audit depends on understanding how things really work. AI made that knowledge more valuable, not less.
- **Judgment.** Agents draft plans, code, and documents. Deciding what's right for this team, this system, and this risk is still a human job.

## Where are you? · Find your next step

Pick the line that sounds most like you today, and start with that chapter:

| If this sounds like you... | Start with |
| --- | --- |
| "I've barely used AI at work." | [Chapter 01](01-before-ai.html): write down your baseline |
| "I paste errors in and copy fixes out." | [Chapter 03](03-the-copy-paste-loop.html): break out of the loop |
| "AI helps me debug, but I'd like more." | [Chapter 05](05-ai-as-a-writer.html) and [Chapter 06](06-ai-as-a-planner.html): writing and planning |
| "I want agents working in my repositories." | [Chapter 07](07-compliant-by-design.html) and [Chapter 08](08-agents-md-skills-and-mcp.html): rules first, then agents |
| "Agents already write code for my team." | [Chapter 09](09-writing-the-standards.html) and [Chapter 10](10-building-for-soc-compliance.html): standards and security |

### Try it in your workflow: one step this week

- Pick your line in the table above and read that chapter's "Try it in your workflow" box.
- Do just that one exercise, on real work, this week.
- Compare the result with your baseline from Chapter 01. Did it save time, or move the work somewhere else?
- Then take the next step. That's all this journey ever was: one step, then the next.

## What I'd tell you · Wherever you are

- **Start with real work.** That's where you learn what AI is good for.
- **Context is the job.** Every improvement in this story came from giving AI better context.
- **Write the rules down, then enforce them.** It works for agents for the same reason it works for teams.
- **Keep the human in charge.** Speed is the AI's job. Judgment and responsibility are yours.

## What would you do? · Quick check

```quiz
S: You've read the whole journey and want to start. What's the best first move?
- Set up agents with MCP across all your repositories this week
* Find where you are today, and do one small exercise from that chapter on real work
- Wait for the tools to settle down before starting
- Read more about AI models before trying anything
= Each stage builds on the habits of the one before. One small, real step teaches more than a big leap or more reading.
Q: As AI took on more of the work, which part of the engineer's job grew the most?
- Typing code
* Reviewing and checking, with the judgment that needs real system knowledge
- Searching documentation
- Writing the first draft of everything
= Agents now draft much of the work, so reviewing and checking take more time, and that depends on knowing how the system really works.
Q: Looking back across the whole journey, what drove almost every improvement?
- Newer, larger AI models
* Giving AI better context: clearer briefs, written standards, and access to the right tools
- Using more AI tools at once
- Writing longer prompts
= From the copy-paste loop to AGENTS.md, each step was about what the AI knew about the task, the system, and the rules.
```

Thanks for reading. If you're working on bringing AI into your own work, or you're stuck at one of these stages, I'd be glad to hear how it's going. Back to the [journey overview](index.html).
