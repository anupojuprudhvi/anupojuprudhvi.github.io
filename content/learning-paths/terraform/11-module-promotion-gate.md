---
title: The Module Promotion Gate: Scan Before You Wire
date: 2026-10-01
track: terraform
order: 11
module: 11
summary: No module reaches an environment until it has been scanned on its own, every finding fixed or justified, and a second person has approved it. Then it is scanned again once wired in. The gate step by step, how CI enforces it, and the whole delivery process end to end.
level: Module standard · Capstone
readingTime: 12 min read
stack: [Terraform, Checkov, GitHub Actions, ADRs]
tags: [checkov, promotion-gate, security, governance, ci-cd, capstone]
motif: pipeline
---

**In this module, you'll learn to:**

- Take a module through the five gate steps, from development in isolation to its first apply in `dev`
- Build the justification package (ADR, scoped skip, README entry) that lets a finding be accepted
- Explain why the scan runs twice, and how CI makes skipping a step impossible rather than just discouraged

**Before you start:** read [CI/CD Guardrails](06-ci-cd-security-linting-testing.html) for how Checkov runs, and [ADRs & Changelogs](10-adrs-and-changelogs.html) for the records an accepted finding needs.

## Principle · Scan the module before anything depends on it

Module 06 runs Checkov on every pull request. That catches problems, but late: by the time a finding shows up in an environment's plan, the module is already wired in, other work is stacked on it, and the pressure is to add a skip and move on.

The promotion gate moves the scan earlier. **No module, base or composition, may be called from `environments/dev` or any other environment until it has passed the gate.** The module is scanned on its own, while it's still cheap to change, and the decision about each finding is made and reviewed before anything depends on it.

```flow
title: The five steps of the promotion gate
Step 1 · Develop | build the module in its own folder; nothing calls it yet
-> then
* Step 2 · Scan | Checkov, scoped to the module's folder only
paths
path: Clean
Fast track | no findings, so go straight to review
path: Findings
Step 3 · Justify | fix each finding, or accept it with an ADR, a scoped skip, and a README entry
end
-> then
Step 4 · Approve | a second person, not the author, reviews the scan and the justifications
-> merged
* Step 5 · Promote | wire into the composition and environment, scan again, then plan and apply to dev
```

## Step 1 · Develop the module in isolation

Build or change the module under `modules/base/<name>` or `modules/composition/<name>`, with its tests (Module 09). Don't add a `module` block to any environment yet. Until the gate is passed, nothing calls this code.

## Step 2 · Scan only that module

```bash
checkov -d terraform/modules/base/<name> \
  --config-file terraform/.checkov.yaml
```

- **No findings:** go straight to Step 4. No justification is needed.
- **Findings:** go to Step 3. The module can't move on with any finding unexplained.

## Step 3 · Fix it, or justify it

Every finding ends one of two ways:

| Outcome | What's required |
| --- | --- |
| **Fixed** | A short note in the module's README that it was fixed. Fixing is always the preferred outcome. |
| **Accepted risk** | All three parts of the justification package: an ADR, a scoped inline skip, and a README entry |

The three parts of an accepted risk:

1. **An ADR** explaining why the risk is accepted, with real alternatives in its Options Considered section (Module 10).
2. **A scoped inline skip** on the exact resource, giving the reason and the ADR number:

```hcl
resource "aws_s3_bucket" "this" {
  # checkov:skip=CKV_AWS_18:Nonprod synthetic data only (ADR-0003)
  bucket = var.bucket_name
}
```

3. **A README entry** under a `## Security Exceptions` heading, so anyone reading the module sees its accepted risks without reading every resource:

```markdown
## Security Exceptions

| Check      | Resource              | Reason                       | ADR      |
| ---------- | --------------------- | ---------------------------- | -------- |
| CKV_AWS_18 | aws_s3_bucket.this    | Nonprod synthetic data only  | ADR-0003 |
```

**No blanket skips to get a module through.** A global `skip-check` in `.checkov.yaml` hides the finding from every module, including ones where it really matters. It's only for a platform-wide decision that already has its own ADR, like the cross-region replication example in [Module 06](06-ci-cd-security-linting-testing.html). Everything else is scoped to one resource and justified one at a time.

## Step 4 · A second person approves

Someone other than the module's author reviews, as part of the module's pull request:

- the Checkov output: clean, or every finding justified;
- the ADR for each accepted risk, and whether its rejected options are real;
- that the README's Security Exceptions table matches the skips actually in the code.

The module code doesn't merge without this sign-off. Branch protection makes it a rule, not a habit: the module scan is a required status check, and the reviewer is a required approval.

## Step 5 · Wire it in, and scan again

Only now may the module be referenced:

1. Add the `module` block to the composition, or call the composition from `environments/dev/main.tf`.
2. **Scan again, at the composition and environment level:**

```bash
checkov -d terraform/modules/composition/<composition> \
  --config-file terraform/.checkov.yaml
checkov -d terraform/environments/dev \
  --config-file terraform/.checkov.yaml
```

3. Put any *new* findings through Steps 2 to 4 again.
4. Only after this second clean or justified scan does `terraform plan` and `apply` run against `dev`.
5. Log the promotion in `environments/dev/docs/CHANGELOG.md`.

The second scan isn't a formality. Base modules can be clean on their own and still produce findings once joined: the IAM policy that grants the Glue job access to the bucket, or the security group that lets it reach a database, is written in the composition. That joining code is exactly where over-broad permissions tend to appear.

## Enforcement · Make skipping a step impossible

A process people are trusted to follow erodes under deadline pressure. The pipeline enforces the gate instead:

| Pull request touches | CI does |
| --- | --- |
| `modules/**` | Runs `terraform test`, then the module-scoped Checkov scan. Both are required checks, so the pull request can't merge until they pass and the reviewer approves |
| `environments/<env>/**` | Re-scans the **whole** `environments/<env>` tree, not just the diff, and blocks plan and apply if it fails |

In a single repository, "the module passed the gate" has a simple meaning: its code is on `main`, and `main` only accepts module code that passed the required checks. Re-scanning the whole environment tree on every environment change is the backstop. A module that somehow slipped in without its own scan is still caught before `apply`.

```yaml
# .github/workflows/terraform-modules.yml (excerpt)
on:
  pull_request:
    paths: ["terraform/modules/**"]

jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - name: Module tests
        run: |
          for dir in terraform/modules/*/*/; do
            if [ -d "$dir/tests" ]; then
              (cd "$dir" && terraform init -backend=false && terraform test)
            fi
          done
      - name: Checkov
        run: |
          pip install checkov
          checkov -d terraform/modules \
            --config-file terraform/.checkov.yaml \
            -o cli -o junitxml --output-file-path console,checkov
```

## Process · The whole delivery, end to end

Part 2 of this track describes one process. Here it is in a single picture, with where each step is covered:

```flow
title: How a module goes from idea to production
Design | which layer, base or composition, does this belong in? (Module 07)
-> following
Conventions | names, tags, provider ranges (Module 08)
-> build
Build and test | bottom-up, with terraform test beside the module (Module 09)
-> decisions recorded as they're made
Record | ADRs for decisions, CHANGELOG entries for changes (Module 10)
-> then
* Gate | scan alone, justify, second-person approval (this module)
-> merged
Wire in | composition and environment, scanned again (this module)
-> saved plan, reviewed
Apply to dev | terraform apply tfplan (Module 09)
-> same composition version, different values
* Promote to nonprod and prod | environment symmetry makes dev a reliable preview (Module 07)
```

There are two ways into this process:

- **Changing or adding one module.** Start at Design, and follow it down. The environments and their layers are already in place.
- **Building a platform from scratch.** First split it into the numbered state layers from [Module 01](01-enterprise-module-design.html), such as `01-networking`, `03-data`, and `04-compute`, and bootstrap the state backend (Module 02). Then build each layer's code through this same process.

### Copy into the pull request description

- Module scanned with Checkov on its own (Step 2), output attached.
- Every finding fixed, or justified with an ADR, a scoped inline skip, and a README entry (Step 3).
- A reviewer other than the author approved the scan and the justifications (Step 4).
- Composition and environment re-scan run after wiring (Step 5), output attached.
- `environments/dev/docs/CHANGELOG.md` updated with the promotion.

## Recap · Key terms

- **Promotion gate:** the rule that a module is scanned, justified, and approved before any environment may call it.
- **Justification package:** the ADR, scoped inline skip, and README Security Exceptions entry an accepted finding needs.
- **Scoped skip:** a `checkov:skip` comment on one resource, never a global skip.
- **Second scan:** the composition- and environment-level scan after wiring, which catches findings in the joining code.
- **Required status check:** a CI check that branch protection won't let a pull request merge without.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: When is a module first allowed to be called from `environments/dev`?
- As soon as `terraform validate` passes
- After its first successful apply
* After it has been scanned alone, every finding fixed or justified, and a second person has approved it
- Whenever the composition needs it
= The gate comes before any wiring. That's the whole point: decisions about findings are made while the module is still cheap to change.
Q: What three things make up the justification for an accepted finding?
- A Jira ticket, a Slack thread, and a global skip
* An ADR, a scoped inline skip naming the ADR, and an entry in the module README's Security Exceptions
- A comment in `.checkov.yaml`, a changelog entry, and a tag
- The Checkov output, a screenshot, and an approval
= Each part has a job: the ADR shows the reasoning, the skip scopes it to one resource, and the README makes it visible to anyone using the module.
Q: Why scan again after the module is wired into the composition?
- Checkov results expire after a day
- The first scan only checks syntax
* The joining code, such as IAM policies and security groups, is written in the composition and wasn't in the first scan
- To check the environment's `terraform.tfvars`
= Clean parts can still be joined unsafely. The permissions between components are where new findings usually appear.
S: A deadline is close, and an engineer proposes adding `CKV_AWS_18` to `skip-check` in `.checkov.yaml` so the pipeline goes green. What's wrong with that?
- Nothing, as long as it's removed later
* A global skip hides that check for every module, including ones where it matters, with no reasoning recorded
- Checkov ignores `skip-check` in CI
- It only works for checks starting with `CKV2`
= Exceptions are scoped to one resource and justified one at a time. A global skip turns one accepted risk into an invisible one everywhere.
S: Your team is starting a brand-new data platform with networking, a database, and compute. Where do you begin?
- Write one composition module for the whole platform
- Start at Step 1 of the gate with a base module for the VPC
* Split it into numbered state layers and bootstrap the backend, then build each layer's modules through the gate process
- Apply everything to dev first and split it into modules afterwards
= From scratch, first decide how state is split (Module 01). Then the module process runs inside each layer, one module at a time.
```
