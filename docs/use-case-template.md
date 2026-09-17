# Technical use-case template

Copy this file to `content/usecases/<project>/<slug>.md`, replace the example
values, and remove any fields that do not apply. Do not edit the generated HTML
under `usecases/` directly.

```markdown
---
title: A concise description of the engineering problem solved
nav: Short navigation label
label: Architecture area
heading: How the problem was solved
project: project-folder
projectName: Project name shown in the library
engagement: usecases/project-folder/index.html
layer: Applications
order: 10
stack: [AWS service, Terraform]
tags: [security, networking]
summary: One sentence used on the card, search index, and page metadata.
problem: |
  Explain the real constraint or failure mode. Include the business or
  operational context needed to understand why this was difficult.
solution: |
  Explain the architecture and the key boundary or control that solved it.
flowLabel: Request or data path
flow:
  - step: First component
    note: What this component does and why it is present.
  - step: Second component
    note: What happens next.
enables: |
  State what this architecture makes possible for the team or system.
outcomes:
  - value: 40+
    label: Accounts, services, or environments affected
scripts: [diagram.js]
---

## Architecture · The decisions that mattered

Describe the design in enough detail for a technical reader to understand the
trade-offs.

### Implementation notes

- **Decision:** Explain the constraint and the chosen approach.
- **Operational control:** Explain how the design is monitored, rotated, or
  maintained.
```

## Front-matter guidance

- `title`, `project`, and `summary` are required by the generator.
- `project` determines the generated directory and must match the folder name.
- `order` controls ordering within a project; use gaps such as 10, 20, and 30.
- `flow` entries can be strings or objects with `step`, `note`, and optional
  `aside: "true"`.
- `outcomes` and `scripts` are optional. Diagram scripts belong in `assets/`.
- Keep claims specific and supportable. State security boundaries, AWS service
  constraints, operational ownership, and known limitations where relevant.

After adding or changing a source file, regenerate all derived site files:

```sh
npm run build
git diff --check
npm test
```