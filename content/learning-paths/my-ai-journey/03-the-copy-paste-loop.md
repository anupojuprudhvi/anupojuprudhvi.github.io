---
title: The Copy-Paste Loop: Debugging by Hand (2023 to Mid 2024)
date: 2026-10-06
track: my-ai-journey
order: 3
module: 3
summary: For about eighteen months I used AI on and off, almost always the same way. Paste the error, copy the fix back, run it, paste the next error. Why that loop sometimes worked, why it often went round in circles, and the lesson behind every chapter after it, that context is the job.
level: Part 1 · Curious
readingTime: 6 min read
stack: [ChatGPT]
tags: [ai, journey, debugging, context, copy-paste]
---

*Round one: paste the error, copy the fix, run it. New error. Round two: paste that one. Another fix, another error. Round five: the first error is back. The code now looks like nothing I'd have written, and neither of us can say why it is the way it is.*

If you use AI at work, you've probably been here. I lived here, on and off, from 2023 until the middle of 2024.

## The loop · How it worked

Some weeks the chat window was open all day. Some weeks I forgot about it. When I used it, it was nearly always for debugging, and nearly always like this:

```flow
title: The copy-paste loop
Run it | apply, deploy, build, or test
-> it fails
Copy the error | paste the error message into the chat window
-> the AI suggests a fix
Copy the fix | paste it back into my code or configuration
-> run it again
* New error | a different message, or the same one again
loop: paste the new error and repeat
```

## When it worked · The easy problems

For some problems, the loop was genuinely fast. When the error message held everything needed to fix it, such as a typo, a wrong argument name, or a permission named in the message, one round was often enough.

But those were the easy problems. I could have solved most of them myself in a few minutes. The loop was best exactly where I needed it least.

## When it stalled · The AI only saw what I pasted

On hard problems, the loop went round in circles. One fix cleared an error and caused another. The next fix quietly undid the one before. The reason was always the same: **the AI only saw what I pasted.** One error message, maybe one file. It never saw:

- **The rest of the code.** How the broken piece connected to the modules, scripts, and pipelines around it.
- **The environment.** Versions, settings, network rules, permissions, and what was already deployed.
- **The history.** What worked yesterday, what I'd already tried, and why things were built the way they were.
- **The goal.** What the code was *meant* to do, not just what the error said it was doing.

So it did the only thing it could: it made the error message go away. That's not the same as fixing the problem. And I was the only link between the AI and the real system. Every missing piece of context was a piece I hadn't thought to paste.

## The hidden costs · What the loop left behind

- **Code nobody understood.** A fix from the eighth round was hard to explain in a review and hard to maintain later.
- **Lost reasoning.** The "why" stayed in the chat history in my browser. The repository only got the result.
- **Time spent carrying text.** A lot of my effort went into moving text between two windows instead of thinking.

## The lesson · Context is the job

It took me a long time to see it, but this is the most important lesson of the whole journey: **AI can only be as good as the context it gets.** A smarter model with the wrong context still gives a wrong answer.

Every chapter from here on is about context: giving AI more of it, in better shape, with less of my effort spent carrying it.

- **Copy-paste loop:** it sees only what I paste.
- **Co-worker:** I explain the whole problem.
- **Writer and planner:** I give it everything I know, and it shapes it.
- **Agents:** it reads the repository and uses tools itself, following written rules.
- **Standards and building:** the rules are good enough to build and audit against.

### Try it in your workflow: break out of the loop

- Set a limit of three rounds. If the third fix gives a third new error, stop pasting.
- Write one paragraph instead: what the code should do, what it does, your versions, and what you've tried.
- Ask for possible causes ranked by likelihood, not for a fix.
- Only keep code you could defend in a review. Write the cause into the commit message.

## What I'd tell you · If you're stuck in the loop

- **Stop pasting only the error.** Add the goal, the versions, and what you tried. The answers improve straight away.
- **Ask for a diagnosis, not a patch.** "Why is this happening?" beats "fix this".

## What would you do? · Quick check

```quiz
S: You've pasted four errors in a row, and each fix creates a new one. What's the best next move?
- Paste the fifth error and keep going
- Switch to a different AI tool
* Stop, write down the goal, the setup, and everything you've tried, and ask for likely causes
- Revert everything and start again from memory
= Repeated new errors usually mean the AI is missing context, not that it needs one more round. Describe the whole problem and ask for a diagnosis.
S: An AI fix makes the error disappear, but you can't explain why it works. What should you do?
- Commit it, because the error is gone
* Don't commit it until you understand it. Ask the AI to explain the cause, then confirm it yourself
- Add a comment saying "fixed by AI"
- Open a ticket for someone else to review later
= Making an error disappear isn't the same as fixing the cause. If you can't explain a change in a review, you can't safely maintain it.
Q: Why did the copy-paste loop stall on hard problems?
- The AI models of the time were too small
* The AI only saw the error and the code you pasted, not the rest of the system
- Error messages are too long to paste
- Chat windows can't handle code
= The real cause usually sat outside what was pasted: other code, the environment, recent changes, or the goal. Missing context, not model size, was the limit.
```

Next: [Chapter 04](04-ai-as-a-co-worker.html). Late 2024, when AI became a co-worker.
