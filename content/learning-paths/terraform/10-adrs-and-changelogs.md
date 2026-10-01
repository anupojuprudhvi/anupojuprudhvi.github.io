---
title: ADRs & Changelogs: Recording Why the Infrastructure Looks This Way
date: 2026-10-01
track: terraform
order: 10
module: 10
summary: Code shows what the infrastructure is; it can't show why. Architecture decision records with a real Options Considered section, a changelog per environment, and the list of changes that must leave a decision behind.
level: Module standard · Governance
readingTime: 10 min read
stack: [Terraform, Markdown, ADRs, Keep a Changelog]
tags: [adr, changelog, governance, documentation, decisions]
---

**In this module, you'll learn to:**

- Write an architecture decision record (ADR) whose rejected options would convince a sceptical reviewer
- Recognise the infrastructure changes that must come with an ADR
- Keep a changelog per environment that lines up with the code, the ADRs, and the release tags

**Before you start:** read [Base, Composition & Environment](07-base-composition-and-environment-modules.html). Each environment folder holds its own `docs/` folder.

## Principle · The code can't tell you why

Six months after a change, someone will look at a bucket with access logging switched off, or an environment with a resource the others lack, and ask whether it's a mistake. The Terraform shows *what* was built. Without a record of *why*, the safe-looking fix may undo a deliberate decision, and the risky-looking setting may be left alone when it really was a mistake.

An **architecture decision record** is a short Markdown file that captures one decision: the problem, the options weighed, the choice, and its consequences. It lives next to the code it explains, so it's reviewed in the same pull request.

## Structure · One `docs/` folder per environment

```text
environments/nonprod/docs/
├── adr/
│   ├── 0001-record-architecture-decisions.md
│   ├── 0002-single-glue-crawler-per-bucket.md
│   └── 0003-nonprod-buckets-without-access-logging.md
└── CHANGELOG.md
```

- **One file per decision**, named `NNNN-short-kebab-case-title.md`, numbered in order.
- **Never renumber or delete an ADR.** When a decision changes, write a new ADR and mark the old one `Superseded by 00NN`. The history of why is the point.
- **`0001` is always the same:** it records that this project uses ADRs, in the format below.

## Template · Context, options, decision, consequences

This is the common Michael Nygard format, with one addition: an **Options Considered** section.

```markdown
# NNNN. <Title>

Date: YYYY-MM-DD

## Status
Proposed | Accepted | Deprecated | Superseded by 00NN

## Context
What problem or constraint led to this decision.

## Options Considered
1. **Option A: <name>**
   - Description, pros, cons
   - Why not chosen: ...
2. **Option B: <name>**
   - Description, pros, cons
   - Why not chosen: ...
3. **Option C: <chosen option>** (see Decision)

## Decision
Which option was chosen, and why it beat the others.

## Consequences
What becomes easier or harder; the trade-offs accepted.
```

### Options Considered is the section reviewers check

A decision record without alternatives is just a statement. The rules for this section:

- **At least two alternatives besides the chosen one**, including "do nothing" where it's real. If there was genuinely only one viable approach, say so explicitly rather than leaving the section out.
- **Every rejected option gets a concrete reason**: cost, a security gap, operational load, a team skill gap, a service limit. "We preferred the other one" isn't a reason.

This matters most when an ADR justifies accepting a security finding (Module 11). The reviewer needs to see that safer options were genuinely weighed, not skipped for convenience.

## Example · An ADR for an accepted risk

```markdown
# 0003. Nonprod data buckets without S3 access logging

Date: 2026-09-14

## Status
Accepted

## Context
Checkov check CKV_AWS_18 flags the nonprod Glue data bucket for
having no server access logging. Nonprod holds only synthetic
test data, and CloudTrail management events are already
collected for the account.

## Options Considered
1. **Enable server access logging to a central log bucket**
   - Pros: matches production; satisfies the check.
   - Cons: log storage and lifecycle cost for synthetic data.
   - Why not chosen: no audit requirement covers synthetic data,
     so the cost buys no reduction in real risk.
2. **Enable CloudTrail S3 data events instead**
   - Pros: richer, API-level records.
   - Cons: billed per event; the ETL job makes millions of calls.
   - Why not chosen: highest cost of the three for the same gap.
3. **Accept the finding for nonprod only** (chosen)

## Decision
Accept CKV_AWS_18 on the nonprod data bucket only, with a scoped
inline skip that references this ADR. Production keeps logging.

## Consequences
No object-level access history in nonprod. If real data ever
enters nonprod, this ADR is superseded and logging is enabled.
```

The last line is worth copying: a good accepted-risk ADR says what would make it wrong.

## Triggers · Changes that must come with an ADR

| Change | Why it's a decision | Covered in |
| --- | --- | --- |
| A new component or pattern | It sets a precedent others will copy | Module 07 |
| A different IAM or networking approach | It changes who can reach what | Module 07 |
| An environment that differs in shape, not just values | It breaks environment symmetry | Module 07 |
| A major provider version upgrade | It can change resource behaviour and defaults | Module 08 |
| A backend change, such as moving from DynamoDB to native S3 locking | It changes the state contract every run depends on | Module 02 |
| Reading another stack's state with `terraform_remote_state` | It couples two state files | Module 02 |
| Manual state surgery with `state rm` or `state mv` | It isn't visible in code review | Module 05 |
| An accepted security finding | It's a known risk, kept on purpose | Module 11 |

## Changelog · What changed, environment by environment

ADRs record decisions. The changelog records changes: every notable change to that environment's infrastructure, in the [Keep a Changelog](https://keepachangelog.com/) style:

```markdown
# Changelog

All notable changes to the nonprod Glue and S3 infrastructure.

## [Unreleased]
### Added
### Changed
### Fixed

## [1.1.0] - 2026-10-01
### Added
- glue-crawler module wired into the composition for
  automatic catalog updates.
### Security
- Accepted CKV_AWS_18 on the nonprod data bucket. See ADR-0003.

## [1.0.0] - 2026-09-01
### Added
- Initial S3 bucket and Glue ETL job.
```

- **Update it in the same pull request** as the Terraform change, under `[Unreleased]`. Move the entries into a version section when the change is applied.
- **Line versions up with Git tags**, if the repository tags releases.
- **Reference ADR numbers** when a change carries out or supersedes a decision, as in `See ADR-0003`.

### Implementation notes

- **Write the ADR before or with the code, never after.** An ADR written after the fact describes what was built, not the choice that was made, and the Options Considered section shows it.
- **Keep ADRs short.** One decision, one to two pages. If it needs more, it's probably two decisions.
- **Put the ADR number in the code.** A comment like `# see ADR-0003` beside a skip or an unusual setting turns a puzzle into a link.

## Recap · Key terms

- **ADR (architecture decision record):** a short, numbered file recording one decision, its alternatives, and its consequences.
- **Options Considered:** the ADR section listing the real alternatives and the concrete reason each was rejected.
- **Superseded:** the status of an ADR replaced by a later one; it's kept, never deleted.
- **CHANGELOG.md:** the per-environment record of notable changes, grouped by version.
- **`[Unreleased]`:** the changelog section where entries wait until the change is applied.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: A decision recorded in ADR-0004 is reversed. What happens to ADR-0004?
- It's deleted, and a new 0004 replaces it
- It's edited to describe the new decision
* It stays, marked "Superseded by" the new ADR, which gets the next number
- It moves to an archive folder and is renumbered
= ADRs are never renumbered or deleted. The trail of why a decision changed is what makes them useful.
Q: What makes an Options Considered section acceptable to a reviewer?
- A single option, described in detail
* At least two real alternatives, each with a concrete reason it was rejected
- A list of every AWS service that could be used
- A statement that the team preferred the chosen option
= Reviewers need to see that safer or simpler choices were genuinely weighed. A preference isn't a reason.
Q: Which change needs an ADR rather than just a changelog entry?
- Raising a Glue job's worker count in `terraform.tfvars`
- Fixing a typo in a tag value
* Upgrading the AWS provider by a major version
- Adding an output that exposes an existing bucket name
= A major provider upgrade can change behaviour across every resource, so it's a decision. The others are routine changes for the changelog.
S: A pull request adds `# checkov:skip=CKV_AWS_18` to a bucket with the reason "not needed". What should the reviewer ask for?
- Nothing; the reason is given
- Move the skip to the global `.checkov.yaml` instead
* An ADR with real alternatives, the ADR number in the skip comment, and a changelog entry
- A different check ID
= An accepted risk needs a decision behind it. The ADR shows safer options were weighed, and the skip comment points straight to it.
S: Six months on, an engineer finds nonprod buckets without access logging and opens a pull request to "fix the oversight". What should have stopped them?
* A comment on the skip pointing to the ADR, which explains the decision and when it would no longer hold
- The changelog's `[Unreleased]` section
- Nothing; they're right to fix it
- A `lifecycle { prevent_destroy = true }` block
= The ADR number next to the code turns an apparent mistake into a link to the reasoning. If the reasoning no longer holds, they supersede the ADR instead.
```
