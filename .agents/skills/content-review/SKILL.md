---
name: content-review
description: Review portfolio narratives, case studies, metrics, credentials, and technical claims for accuracy, privacy, clarity, and appropriate qualification.
---

# Content Review Skill

Use this skill when adding or changing homepage copy, engagement narratives,
  case studies, credentials, outcomes, client descriptions, metadata, or search-index
content. Follow the root `AGENTS.md` and the production-readiness skill first;
this skill focuses only on content-specific review.

## Review procedure

### 1. Establish the evidence

- Identify the source-of-truth file and whether the visible page is generated.
- Read surrounding sections so terminology, tense, voice, and context remain
  consistent.
- Trace every metric, date, certification, role, technology, and outcome to
  existing repository evidence or information explicitly supplied by the user.
- Mark unresolved claims for confirmation instead of silently filling gaps.

### 2. Protect privacy and confidentiality

- Do not add credentials, secrets, tokens, private contact details, internal
  hostnames, account identifiers, customer identifiers, or sensitive screenshots.
- Generalize client and operational details to the least specific description
  that still explains the engineering problem.
- Check diagrams, alt text, URLs, metadata, filenames, and generated output for
  accidental sensitive information, not only visible body copy.

### 3. Preserve truthful claims

- Distinguish personal contribution from team or organization-wide outcomes.
- Preserve qualifiers such as “identified,” “estimated,” “targeted,” or
  “supported” when the evidence does not prove realized impact.
- Do not convert an architecture pattern into a claim that it was deployed,
  approved, certified, or operated unless that is supported.
- Avoid unsupported superlatives and absolute claims such as “guaranteed,”
  “zero downtime,” “fully secure,” or “best.”
- Keep financial figures, dates, project scope, and technology names consistent
  across the homepage, case studies, library index, metadata, and search data.

### 4. Review communication quality

- Lead with the customer problem, constraints, decision, contribution, and
  evidence rather than a list of tools.
- Explain acronyms at first use when the audience may not know them.
- Keep customer-facing summaries concise and move implementation depth into the
  technical sections.
- Use precise security terminology: authentication proves identity;
  authorization controls permissions.
- Ensure headings, labels, summaries, link text, and alt text remain meaningful
  when read out of visual context.

### 5. Validate the change

- Rebuild generated pages with `npm run build` when source content changes.
- Review the generated HTML and `assets/case-studies.json` for stale, duplicated, or
  contradictory text.
- Search the repository for the changed claim or metric and check related copies.
- Run `git diff --check` and the relevant site-verification checks.

## Completion checklist

- [ ] Source-of-truth file identified.
- [ ] Claims trace to repository evidence or are explicitly marked for review.
- [ ] Personal contribution is distinct from team or organization outcomes.
- [ ] Metrics and qualifiers are consistent everywhere they appear.
- [ ] No private data, credentials, or sensitive operational details introduced.
- [ ] Customer-facing language is clear and technically accurate.
- [ ] Generated output and search metadata are synchronized.
- [ ] Relevant validation commands were run and limitations reported.