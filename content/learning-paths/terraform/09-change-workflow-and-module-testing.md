---
title: The Change Workflow & Module Testing
date: 2026-10-01
track: terraform
order: 9
module: 9
summary: How a change moves from a laptop to a running environment. Format, validate, a saved plan that is reviewed and then applied exactly, the order to touch base, composition, and environment code, and module tests with terraform test and Terratest.
level: Module standard · Build & test
readingTime: 10 min read
stack: [Terraform 1.7+, terraform test, Terratest, HCL, AWS]
tags: [workflow, testing, terraform-test, terratest, plan-review]
---

**In this module, you'll learn to:**

- Run the standard change workflow, and explain why shared environments only ever apply a saved plan
- Order a change across base, composition, and environment code so nothing is wired in before it's ready
- Write a module test with `terraform test`, and know when a real-infrastructure test with Terratest is worth its cost

**Before you start:** read [Base, Composition & Environment](07-base-composition-and-environment-modules.html) for the layers this workflow moves through.

## Principle · What you reviewed is what gets applied

The most important habit in this module is small: in any shared environment, `terraform apply` only ever runs against a **saved plan file**. A plain `terraform apply` makes a new plan at that moment, which may not be the plan anyone reviewed. A saved plan is fixed. If the state has changed since it was made, Terraform refuses to apply it and tells you the plan is stale, so a reviewed change can never quietly turn into a different one.

## Workflow · The seven steps

Run from `terraform/environments/<env>/`:

```flow
title: One change, from code to a running environment
Init | terraform init: download providers and modules, connect the backend
-> then
Format and validate | terraform fmt -recursive, terraform validate
-> then
* Plan | terraform plan -var-file=terraform.tfvars -out=tfplan
-> a human reads the plan
Review | does it match the ADR that was accepted? Add a CHANGELOG entry under Unreleased
-> approved
* Apply | terraform apply tfplan, the saved plan and nothing else
-> then
Record | a new ADR if this was a decision; otherwise finalize the CHANGELOG version
-> optional
Tag | tag the commit with the new CHANGELOG version
```

```bash
terraform init
terraform fmt -recursive
terraform validate
terraform plan -var-file="terraform.tfvars" -out=tfplan
terraform show tfplan        # read it, again, before applying
terraform apply tfplan
```

In CI, the same steps run in a pipeline: plan on the pull request, a person approves, then apply uses the plan artifact from that run (Module 06).

## Order · Changing infrastructure from the bottom up

When a change needs new code at more than one layer, work up the call tree:

1. **Base module.** Does this need a new reusable resource type, or a change to an existing one? Build or change it first, alone.
2. **The gate.** The new or changed base module passes the promotion gate (Module 11) before anything references it.
3. **Composition.** Add the `module` block, update `iam.tf`, `networking.tf`, and `locals.tf`, and expose any new outputs.
4. **Environment.** Pass the new inputs through `variables.tf`, `terraform.tfvars`, and `main.tf`.
5. **Records.** Write or update the ADR if this is a decision worth recording, and add a CHANGELOG entry under `[Unreleased]` (Module 10).
6. **Workflow.** Run the seven steps above.
7. **Docs.** Update the module `README.md` files whose inputs or outputs changed.

Working bottom-up means every layer you touch is calling something already reviewed. Working top-down, starting from the environment, means wiring in code that doesn't exist yet and reviewing the whole stack at once.

## Testing · `validate` is not a test

`terraform validate` checks syntax and types. It can't tell you that the bucket is encrypted, or that a bad input is rejected. Every base module should have tests that check its behaviour, in a `tests/` folder beside it:

```text
modules/base/s3/
├── main.tf
├── variables.tf
├── outputs.tf
├── README.md
└── tests/
    └── s3_basic.tftest.hcl
```

Native `terraform test` (Terraform 1.6 and later) runs `.tftest.hcl` files. Each `run` block plans or applies the module with the given variables, then checks `assert` conditions:

```hcl
# modules/base/s3/tests/s3_basic.tftest.hcl
mock_provider "aws" {} # Terraform 1.7+: no AWS credentials needed

variables {
  bucket_name = "test-bucket"
}

run "blocks_public_access" {
  command = plan

  assert {
    condition     = aws_s3_bucket_public_access_block.this.block_public_acls
    error_message = "The bucket must block public ACLs"
  }

  assert {
    condition     = aws_s3_bucket_public_access_block.this.restrict_public_buckets
    error_message = "The bucket must restrict public bucket policies"
  }
}

run "rejects_invalid_bucket_name" {
  command = plan

  variables {
    bucket_name = "Not_A_Valid_Name"
  }

  expect_failures = [var.bucket_name]
}
```

Run it from the module folder:

```bash
terraform test
```

The second run is the one people forget. It proves the module's `validation` block (Module 03) actually rejects a bad name. A test suite that only checks the happy path never catches a validation rule that was deleted.

`mock_provider` returns fake values instead of calling AWS, so tests run in seconds on any CI runner. The trade-off: a mock can't tell you AWS would reject the request. For that, you need real infrastructure.

### When to test against real AWS

Some behaviour only exists once a resource is real: does the Glue crawler actually find a table? For those modules, an integration test with [Terratest](https://terratest.gruntwork.io/) runs `terraform apply` against a disposable sandbox account, checks the result with the AWS SDK, and always runs `terraform destroy` in a deferred cleanup step, even when the test fails.

These tests cost money and take minutes, so they don't run on every commit:

| Test | Runs on | Speed | Catches |
| --- | --- | --- | --- |
| `terraform test` with mocks | every pull request touching `modules/base/**` or `modules/composition/**`, before the security scan | seconds | wrong defaults, missing settings, broken validation |
| `terraform test` with `command = apply` | a sandbox account, on merge or nightly | minutes | settings AWS rejects |
| Terratest | a separate scheduled job, for heavier modules | minutes to an hour | behaviour that only real resources show |

## Checklist · Before a pull request merges

- `terraform fmt -recursive` was run, with no remaining diff.
- `terraform validate` and `terraform test` pass.
- The plan is reviewed and attached to, or linked from, the pull request.
- `docs/CHANGELOG.md` is updated.
- A new ADR is added if an architectural decision was made.
- Module `README.md` files match any changed inputs or outputs.
- No secrets or account IDs are hardcoded in `.tf` files; they come from variables or data sources.
- The promotion gate is satisfied (Module 11).

### Implementation notes

- **Keep the plan file out of Git and out of logs.** A plan file can contain sensitive values in plain text, the same way state can (Module 04). Store it as a short-lived, access-controlled CI artifact.
- **Test what the module promises, not what Terraform does.** Asserting that `bucket` equals `var.bucket_name` tests Terraform. Asserting that public access is blocked tests your module.
- **Use `terraform plan -detailed-exitcode` in scripts.** It returns 2 when there are changes, which lets a pipeline tell "no changes" from "changes to review".

## Recap · Key terms

- **Saved plan:** a plan written with `-out`; `apply` on it does exactly what it shows, or refuses if the state has moved on.
- **Bottom-up change order:** base module, gate, composition, environment, records, workflow, docs.
- **`terraform test`:** Terraform's built-in test runner for `.tftest.hcl` files.
- **`mock_provider`:** a stand-in provider that returns fake values, so tests need no cloud credentials.
- **`expect_failures`:** marks a run that *should* fail, such as a validation rule rejecting bad input.
- **Terratest:** a Go library for testing real infrastructure: apply, check, then always destroy.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: Why does a shared environment apply only a saved plan file?
- It's faster than planning again
* What gets applied is exactly what was reviewed, and Terraform refuses if the state has changed since
- Saved plans skip the state lock
- `terraform apply` without a plan file is deprecated
= A fresh apply builds a new plan that nobody has seen. A saved plan is fixed, and goes stale rather than changing.
Q: What does `terraform validate` check?
* Syntax, references, and types in the configuration
- That resources match the security policy
- That the plan matches the ADR
- That AWS will accept the request
= It's a static check of the code. Behaviour needs tests, and security needs a scanner.
Q: What does a `run` block with `expect_failures = [var.bucket_name]` prove?
- The bucket name is optional
- The test is allowed to fail
* The variable's validation rule rejects the bad input it's given
- The bucket can't be created in AWS
= It passes only if that validation fails. It's how you test the guard rails, not just the happy path.
S: You need a new base module for an SQS queue and want the Glue job to send to it. Someone starts by adding the queue resource to `environments/dev/main.tf`, planning to tidy it into modules later. What's the right order?
- Environment first, then move it into modules with `moved` blocks
* Build the base module, pass the gate, wire it into the composition with IAM, then add the environment inputs
- Composition first, then the base module
- Any order, as long as it's one pull request
= Bottom-up, so each layer only calls code that's already reviewed and scanned, and the environment stays the same shape as the others.
S: Your module tests use `mock_provider` and all pass, but the first real apply fails because AWS rejects a setting combination. What does that tell you?
- The tests are wrong and should be deleted
* Mocks can't see AWS's own rules; this module needs an apply-mode test or Terratest in a sandbox account
- `terraform validate` should have caught it
- The provider version is too old
= Mocks are fast because they don't call AWS, and so they can't catch what only AWS checks. Add a slower real-infrastructure test for modules where that matters.
```
