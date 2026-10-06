---
title: AI as a Co-Worker: Debugging Together (Late 2024 to Early 2025)
date: 2026-10-06
track: my-ai-journey
order: 4
module: 4
summary: The turning point. I stopped pasting errors and started explaining problems, the way I would to a colleague. AI went from a patch machine to a debugging partner that suggests causes, explains unfamiliar logs, and argues back. What changed, the brief I now give it, and why I still own the fix.
level: Part 2 · Working together
readingTime: 6 min read
stack: [ChatGPT, Claude]
tags: [ai, journey, debugging, troubleshooting, prompting, context]
---

*Same kind of problem as always: something broken, a deadline, a vague error. But this time, instead of pasting the error, I write a paragraph. What the system is, what it should do, what it does instead, what changed, and what I've already ruled out. The reply doesn't start with a fix. It starts with: "Here are the three most likely causes, and how to tell them apart."*

That was the moment AI stopped being a search box and started being a co-worker. For me, it started in late 2024 and became daily practice in early 2025.

## What changed · From "fix this" to "help me think"

[Chapter 03](03-the-copy-paste-loop.html) ended with the lesson that context is the job. This chapter is what happened when I took that seriously. Three things changed in how I worked:

1. **I explained instead of pasting.** A short brief, like a ticket for a colleague, instead of a bare error.
2. **I asked for causes, not fixes.** "What could cause this, and how do I check each one?" instead of "fix this".
3. **I let it argue back.** When I suggested a cause, I asked it to find the holes in my idea.

The result felt like pairing with a patient colleague who has read every manual, never gets tired of questions, and doesn't mind being told they're wrong.

## The brief · What I give it now

This is the brief I still use for any hard problem. Five short parts:

1. **The system:** what it is, the versions, and where it runs.
2. **The goal:** what should happen.
3. **The symptom:** what happens instead, with the exact error and logs.
4. **Recent changes:** what changed since it last worked.
5. **Already ruled out:** what I tried, and what I learned from it.

The last part matters most. Telling the AI what you've ruled out stops it from suggesting the obvious things again, and pushes it towards the less obvious ones.

## What it's good at · And what it isn't

As a debugging partner, AI turned out to be very good at some things:

- **Ranking causes.** Turning a symptom into a short list of likely causes, with a way to test each.
- **Reading unfamiliar output.** Explaining a log format, a stack trace, or a tool's output I hadn't seen before.
- **Rubber-ducking.** Just writing the brief often showed me the answer before I sent it.

And still weak at others:

- **It can't see the system.** It only knows what I tell it, so the facts still have to come from me: the logs, the metrics, the real config.
- **It sounds sure even when it's guessing.** A ranked list of causes is a set of ideas to test, not a diagnosis.

## The rule · I still own the fix

Working this way, the AI suggests and I decide. Every cause gets tested against the real system before I change anything. And the cause, not just the fix, goes into the ticket or commit message, so the reasoning doesn't stay in a chat window.

### Try it in your workflow: the debugging brief

- Next time you're stuck for more than fifteen minutes, write the five-part brief above before asking anything.
- Ask: "What are the three most likely causes, and how do I tell them apart?"
- Test each cause yourself, in order, and tell the AI what you found.
- When it's solved, paste the cause and the evidence into the ticket or commit message.

## What I'd tell you · If you're at this stage

- **Write it like a ticket for a colleague.** If a person couldn't help you from what you wrote, the AI can't either.
- **Say what you've ruled out.** It's the fastest way to get past the obvious answers.
- **Test every cause.** The AI suggests, the system decides.

## What would you do? · Quick check

```quiz
S: A service fails after a deploy. Which first message to an AI is most useful?
- "Service is down, help"
- The full 2,000-line log, with no explanation
* What the service does, the error, what changed in the deploy, and what you've already checked
- "Write me a script to restart the service automatically"
= A short brief with the goal, the symptom, recent changes, and what's ruled out gives the AI something to reason about. A wall of log with no context, or a request for a workaround, doesn't.
S: The AI lists three likely causes. What's your next step?
- Apply the fix for the first cause
* Test each cause against the real system, starting with the cheapest check, and report back what you find
- Ask a different AI to confirm the list
- Apply all three fixes at once to be safe
= The list is a set of ideas to test. Checking them one by one, cheapest first, finds the real cause without stacking up changes you don't need.
Q: Why does saying what you've already ruled out help so much?
- It makes the message shorter
* It stops the AI repeating obvious suggestions and pushes it towards less obvious causes
- It proves you tried hard
- AI tools need it to work at all
= Without it, the most likely answers come first, and they're usually the ones you've already tried. Ruling them out moves the conversation forward.
```

Next: [Chapter 05](05-ai-as-a-writer.html). Mid 2025, when AI started writing with me.
