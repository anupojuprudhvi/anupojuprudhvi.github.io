---
name: new-case-study
description: Add a new technical case study from a single Markdown source file, including taxonomy, homepage feature strip, social image, build, and review. Use when the user asks to write, add, or publish a case study.
---

# New Case Study Skill

Follow the root `AGENTS.md` first. This skill covers the steps specific to adding
a case study; `content-review` and `site-verification` cover the review.

## Procedure

### 1. Gather evidence before writing

- Get the facts from the user or from existing repository content: the problem,
  their personal contribution, the architecture, the outcomes, and the dates.
- If a metric, date, or outcome is missing, mark it for confirmation. Never fill
  the gap yourself.
- Anonymize at this stage, following "Client anonymity and confidential data" in
  `AGENTS.md`.

### 2. Choose where it belongs

- `project:` must be an `id` in `content/projects.json`. It also names the folder:
  `content/case-studies/<project>/<slug>.md`.
- `layer:` must be one of `LAYER_ORDER` in `scripts/lib/render.mjs`.
- `motif:` is optional. If you set it, it must be one of `MOTIF_NAMES` in
  `scripts/lib/motifs.mjs`.
- `order:` should leave gaps (10, 20, 30) relative to the project's other studies.

### 3. Write the source

- Copy the template in `docs/case-study-template.md`. It holds the complete
  front matter, the body sections, and the field guidance.
- Keep the shared section order: Problem, Solution, Architecture, Implementation
  notes, Security, Delivery, Trade-offs, Outcome, Next steps.
- Never create or edit the HTML under `case-studies/`. The build generates it.

### 4. Feature it (only if asked)

- Add it at the top of `content/recent-case-studies.json` and keep exactly three
  entries. `title`, `desc`, and `badge` must be supported by the study itself.

### 5. Generate and verify (strict: every command must pass)

```sh
npm run social                       # needs a local Chrome/Chromium; creates the preview image
npm run build
npm run confidential -- --changed    # client names, AWS account numbers, keys
git diff --check
npm run check
npm test
npm run stage
```

If `npm run social` cannot run, say so. The page falls back to `og-image.png`.
Any other failure means the case study is **not complete**. Fix it and rerun the
whole list. Don't report partial success as done. Then apply the `content-review`
and `site-verification` skills.

## Completion checklist

- [ ] Every claim traces to evidence or is marked for confirmation.
- [ ] `npm run confidential -- --changed` passes: no client names, AWS account
      numbers, or keys in the source, generated output, or file paths.
- [ ] No sales language.
- [ ] `project`, `layer`, and `motif` are valid values.
- [ ] Social image generated, or the skip is reported.
- [ ] Build, check, and tests pass, or failures are reported exactly.
