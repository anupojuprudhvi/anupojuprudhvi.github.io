---
title: Before AI: How I Worked Without It
date: 2026-10-06
track: my-ai-journey
order: 1
module: 1
summary: Where the story starts. A DevOps engineer, a failing pipeline, and a dozen browser tabs. How I solved problems before AI, the three things that ate my time, and why you should write down your own starting point before you judge what AI changes.
level: Part 1 · Curious · Start here
readingTime: 5 min read
stack: [AWS, Terraform, Kubernetes, Linux]
tags: [ai, journey, devops, career, before-ai]
---

*Every DevOps engineer knows this evening. A pipeline that worked yesterday fails today. The error message is one line long and means nothing. You open a browser tab, then another, then ten more. Somewhere in a forum thread from three years ago, someone had almost the same problem, on almost the same version.*

That was my normal before AI. This chapter is about that "before", because you can't tell what AI changed unless you remember what came first.

## Who I am · The work

I'm a Lead DevOps engineer and a DevOps architect. My work is what the other tracks on this site teach: AWS infrastructure written in Terraform, Kubernetes platforms, Linux servers, CI/CD pipelines, cloud migrations, and the documents and decisions that hold them together.

The problems haven't changed since then. A pipeline fails. A Terraform plan wants to replace something it shouldn't. A pod won't start. A design needs writing up before Thursday's review. What changed, slowly, is how I get from the problem to the answer.

## The old way · Search, adapt, try again

Before AI, every unfamiliar problem took roughly the same route:

1. Read the error: the log line, the failed plan, the stack trace.
2. Search for it: documentation, issue trackers, forums, blog posts.
3. Find something close, but rarely exact.
4. Adapt someone else's fix to my versions and my setup.
5. Try it, read the new result, adjust, and repeat until it works, or until I ask a colleague.

This works, and it teaches you a lot, because you read far more documentation than you meant to. But it's slow.

## Where the time went · Three costs

Looking back, three things took most of my time:

1. **Translating.** Almost every answer I found was written for a slightly different setup: another version, another operating system, another cloud. Making it fit mine took real thought.
2. **Switching context.** A five-minute question became a dozen tabs, and getting back into the real work took longer than the question.
3. **Writing.** Runbooks, design notes, and documentation always came last, because they were the easiest thing to put off.

Keep these three in mind. Every chapter after this one is about AI taking a bite out of one of them.

## Why it matters · Know your starting point

People say AI "makes you faster". Faster at what? If you don't remember how you worked before, you can't tell whether a new tool saves you time or just moves the work somewhere else, for example from writing code to checking code.

### Try it in your workflow: write down your baseline

- Take ten minutes and list the three or four kinds of problem that fill most of your week.
- For each one, write how you solve it today, step by step, and roughly how long it takes.
- Mark the step that feels slowest. That's where to try AI first.
- Keep the list. Come back to it after each chapter and see what has changed.

## What I'd tell you · If you're at this stage

- **Your experience is the asset.** AI doesn't replace knowing how your systems work. Every later stage depends on that knowledge to check the answers.
- **Start with real work.** Toy questions teach you very little. Your own problems show you quickly what AI is and isn't good at.

## What would you do? · Quick check

Three quick scenarios from real work. Pick what you'd do, then see why.

```quiz
S: You want to start using AI at work, but you're not sure where. What's the best first step?
- Try it on whatever problem comes up next
* List the problems that take most of your week, and try AI on the slowest step of one of them
- Wait until your company picks an official tool
- Start with a toy project to learn the tool first
= Starting from your own slowest step gives you a real before-and-after comparison. Random problems and toy projects make it hard to tell whether AI actually helped.
S: A colleague says AI "made them twice as fast". What's the most useful question to ask?
- Which AI tool did you use?
* Faster at which part of your work, and what did you have to check afterwards?
- How much does it cost?
- Did your manager approve it?
= Speed claims mean little without the "which part" and the "what did it cost to check". AI often moves work from writing to reviewing.
S: Which of these is the strongest reason AI help can still go wrong for an experienced engineer?
- AI tools are too slow
* The answer looks right, and checking it needs the same knowledge the engineer already has
- AI can't read error messages
- AI only works for programming languages, not infrastructure
= AI output has to be checked, and checking depends on knowing how the system works. That's why experience matters more, not less.
```

Next: [Chapter 02](02-first-chatgpt-conversations.html). Late 2022, my first conversation with ChatGPT.
