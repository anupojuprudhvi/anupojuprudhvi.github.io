---
title: First Conversations: Trying ChatGPT in Late 2022
date: 2026-10-06
track: my-ai-journey
order: 2
module: 2
summary: Late 2022. I typed a technical question into ChatGPT and got back one clear, confident answer instead of a list of links. It felt like a shortcut, until the first confident answer turned out to be wrong. The habit that came from it is the one I still use every day.
level: Part 1 · Curious
readingTime: 5 min read
stack: [ChatGPT]
tags: [ai, journey, chatgpt, llm, verification]
---

*Late 2022. Everyone is talking about ChatGPT, so I try it. I type a real question from my work, the kind that normally means ten tabs. A few seconds later there's an answer: written for my question, in full sentences, with a code sample. I remember thinking: this changes how I'll search.*

It did. Just not in the way I expected.

## The first surprise · One answer instead of ten links

A search engine gives you a list of pages, and you do the work of finding the part that applies to you. A chat window gives you one answer, written for your question. You can ask a follow-up in plain language, and it remembers what you just said.

For the "translating" cost from [Chapter 01](01-before-ai.html), that felt like magic. I didn't have to adapt someone else's fix. I could describe my setup and ask for a fix that fit it.

## The second surprise · Fluent isn't the same as correct

The answers always *sounded* right. Clear, confident, and formatted like documentation. And sometimes they were wrong in the ways that are hardest to spot:

- **Invented details.** An option, a flag, or a Terraform argument that looked exactly like a real one but didn't exist.
- **The wrong version.** Advice that was right for an older release, presented as current.
- **No "I don't know".** When it didn't have a good answer, it usually gave a confident one anyway.

This makes sense once you know what a language model does: it writes the most likely next words. A confident, well-formatted answer is very likely text, whether or not it's true. In late 2022 that wasn't obvious to me, and the confidence was persuasive.

## The habit · An answer is a draft, not a fact

What I learned then is still the most important habit in this whole story: **treat every AI answer as a draft.** I check it the way I'd check a suggestion from a new colleague:

1. Does this option or argument exist in the official documentation for the version I run?
2. Can I try it somewhere safe first: a `terraform plan`, a dry run, a test environment?
3. Does it make sense, given what I already know about the system?

Checking is faster than searching from scratch, so even then AI saved time. But only because of the checking. Skip it, and you just find wrong answers faster.

### Try it in your workflow: the three-check habit

- Next time an AI gives you a command or a config change, don't run it straight away.
- Find the option it used in the official documentation for your version.
- Run it somewhere safe first: a plan, a dry run, or a test environment.
- Note how often the answer needed fixing. After a week, you'll know how much to trust it, and for which kinds of question.

## Where it left me · Useful, but on the side

By the end of 2022, ChatGPT was a tool I opened sometimes, for some questions. It lived in a browser tab next to the real work, and everything moved between the two by copy and paste. That arrangement lasted a long time. It's the next chapter.

## What I'd tell you · If you're at this stage

- **Describe your real setup.** Versions, platform, and what you've already tried. A vague question gets a generic answer.
- **Don't trust the tone.** A confident, well-formatted answer isn't evidence. Ask where it comes from.

## What would you do? · Quick check

```quiz
S: An AI answer gives you a Terraform argument you've never seen. It looks right. What do you do?
- Use it, since the rest of the answer was correct
* Look it up in the provider documentation for your version, then run a plan before applying
- Ask the AI if it's sure
- Search a forum for someone who used it
= Models can invent arguments that look exactly like real ones. Asking the AI "are you sure?" often just gets a confident yes. The documentation and a plan are the real checks.
S: You ask the same question twice and get two different answers. What does that tell you?
* The model is producing likely text, not looking up one stored fact, so you need to check either answer
- The second answer is the corrected one
- The first answer is always the most accurate
- The tool is broken
= Language models generate answers rather than retrieving one stored fact, so wording and details can change between runs. Neither answer is proof. Check the one you plan to use.
S: Which question will get the most useful answer?
- "Why is my pipeline failing?"
- "Fix this error"
* "My GitHub Actions job using Terraform 1.9 fails at plan with this error. It worked yesterday. Since then I changed the backend config. What could cause this?"
- "Explain Terraform"
= The useful question includes the tool, the version, the error, what changed, and what you've tried. Context turns a generic answer into a specific one.
```

Next: [Chapter 03](03-the-copy-paste-loop.html). The copy-paste loop, 2023 to mid 2024.
