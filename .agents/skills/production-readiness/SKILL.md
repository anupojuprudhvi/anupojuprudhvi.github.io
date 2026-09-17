---
name: production-readiness
description: Review and implement portfolio changes with production-readiness, maintainability, accessibility, security, content-truthfulness, and source/generated synchronization gates.
---

# Production Readiness Skill

Use this skill for every change to the portfolio, especially new pages,
case studies, interactive behavior, navigation, styling, build scripts, or
claims about experience and outcomes.

## Outcome

Deliver a change that is safe to publish, easy to maintain, honest about its
evidence, and validated at the same quality bar as the rest of the site.

## Procedure

### 1. Establish context

- Read the root `AGENTS.md`, `README.md`, `package.json`, and relevant source.
- Identify whether the target is hand-written, generated, or source content.
- Find existing components, CSS patterns, utilities, and tests before creating
  new ones.
- Identify client-sensitive claims, metrics, links, and generated artifacts
  affected by the change.

### 2. Plan the smallest correct change

Before editing, state:

- The user-visible goal.
- The source-of-truth files to change.
- Any generated files that will be rebuilt.
- Assumptions requiring confirmation.
- The validation commands and manual checks.

Do not expand scope into a redesign, dependency migration, or unrelated cleanup.

### 3. Implement with guardrails

- Follow existing naming, formatting, HTML, CSS, JavaScript, and Markdown
  conventions.
- Prefer shared data and generator logic to repeated page markup.
- Keep one source of truth for labels, URLs, metadata, and case-study content.
- Preserve no-JavaScript content, keyboard access, responsive behavior, and
  theme behavior.
- Use semantic headings, landmarks, links, buttons, labels, and status messages.
- Avoid unsupported superlatives such as “guaranteed,” “zero downtime,” or
  “production-ready” unless the repository contains evidence for the exact
  claim.

### 4. Verify the change

Run, in order where applicable:

```sh
npm run build
git diff --check
npm run check
npm test
```

Inspect the rendered pages at `/`, `/usecases/`, and any changed case-study URL.
Check local links, anchors, page titles, descriptions, canonical paths, images,
keyboard navigation, dark/light themes, and mobile layouts.

If browser tests time out, first check the server/browser prerequisites and then
run the affected test directly. Do not convert a timeout into a passing result;
record it as an unresolved verification issue.

### 5. Final review

Use the diff as a reviewer would:

- Is every line necessary?
- Is duplicated logic reduced rather than increased?
- Can a future editor find the source of truth immediately?
- Are failures visible and recoverable?
- Are private details and credentials absent?
- Are claims accurate and appropriately qualified?
- Are generated files synchronized?

## Quality checklist

- [ ] Root instructions followed.
- [ ] Source-of-truth files updated instead of generated output alone.
- [ ] Build passes.
- [ ] Generated output is synchronized.
- [ ] `git diff --check` passes.
- [ ] Relevant tests pass, or limitations are documented.
- [ ] Accessibility and no-JavaScript behavior preserved.
- [ ] Responsive layouts and links checked.
- [ ] No secrets or unsupported claims introduced.
- [ ] Final diff is scoped and free of accidental changes.

## Required completion format

Report:

1. Summary of implementation.
2. Files changed.
3. Validation results.
4. Limitations or follow-up risks.
5. Suggested commit message.
