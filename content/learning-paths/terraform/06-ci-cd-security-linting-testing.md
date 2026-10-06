---
title: CI/CD Guardrails — TFLint, Checkov & Plan Automation
date: 2026-09-17
updated: 2026-10-01
track: terraform
order: 6
module: 6
summary: A three-tier pipeline for Terraform: fast format and lint checks, Checkov security scanning, a plan posted on every pull request, and a nightly check for drift.
level: DevOps & Governance
readingTime: 9 min read
stack: [Terraform, GitHub Actions, Checkov, TFLint, AWS]
tags: [ci-cd, checkov, tflint, drift-detection, pipeline, automation]
---

## Principle · The three-tier verification pipeline

Production changes shouldn't be applied from anyone's laptop. Every change goes through a CI/CD pipeline that checks it, records it, and applies it with a controlled role.

The checks run in three tiers, fastest first:

```flow
title: The pipeline, fastest checks first
Tier 1 · Fast feedback | terraform fmt, terraform validate, tflint (seconds)
-> pass
Tier 2 · Security scan | Checkov or Trivy against security policies (a minute or two)
-> pass
Tier 3 · Plan and review | terraform plan -out=tfplan, posted on the pull request
-> approved and merged
* Apply | the saved plan, applied by the pipeline through an OIDC role
```

## Tier 1 · Code quality & linting with TFLint

`terraform validate` checks that the code is valid Terraform. **TFLint** goes further: provider-specific mistakes such as invalid instance types, unused variables, and naming conventions.

<pre><code># .tflint.hcl
config {
  call_module_type = "local" # also lint the local modules this code calls
}

plugin "aws" {
  enabled = true
  version = "0.30.0"
  source  = "github.com/terraform-linters/tflint-ruleset-aws"
}

# Enforce AWS best practices
rule "aws_instance_invalid_type" {
  enabled = true
}

rule "aws_s3_bucket_name" {
  enabled = true
}</code></pre>

Run in CI:
<pre><code>tflint --init
tflint --recursive</code></pre>

## Tier 2 · Security scanning with Checkov

**Checkov** scans infrastructure code against hundreds of security policies before anything is deployed.

### Example Checkov checks
- `CKV_AWS_18`: Ensure S3 bucket has access logging enabled.
- `CKV_AWS_19`: Ensure all data stored in S3 is encrypted.
- `CKV_AWS_20`: Ensure the S3 bucket ACL doesn't allow public read access.
- `CKV_AWS_24`: Ensure security groups do not allow ingress from 0.0.0.0/0 to port 22 (SSH).
- `CKV_AWS_130`: Ensure VPC subnets do not assign public IPs by default.

Run in CI:
<pre><code>checkov -d . --framework terraform --compact --quiet</code></pre>

If a pull request adds an unencrypted bucket or opens SSH to the world, the Checkov check fails. Make it a required check in branch protection, and the pull request can't be merged until it's fixed.

### One shared config for the whole tree

Keep a single `.checkov.yaml` at the `terraform/` root, so base modules, compositions, and every environment are scanned the same way:

<pre><code># terraform/.checkov.yaml
framework:
  - terraform
compact: true
download-external-modules: false
soft-fail: false        # a failed check fails the build
skip-check:
  - CKV_AWS_144         # cross-region replication: see ADR-0005</code></pre>

Every global skip carries a comment and, where it reflects a decision, an ADR number (Module 10). Prefer a skip scoped to one resource, with its reason, over a global one:

<pre><code>resource "aws_s3_bucket" "this" {
  # checkov:skip=CKV_AWS_18:Nonprod synthetic data only (ADR-0003)
  bucket = var.bucket_name
}</code></pre>

Run the same checks before a commit ever reaches CI, with the `pre-commit-terraform` hooks:

<pre><code># terraform/.pre-commit-config.yaml
repos:
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.96.1
    hooks:
      - id: terraform_fmt
      - id: terraform_validate
      - id: terraform_checkov
        args: ["--args=--config-file __GIT_WORKING_DIR__/terraform/.checkov.yaml"]</code></pre>

In CI, publish the results as a JUnit report so findings appear in the PR's checks: `checkov -d terraform/ --config-file terraform/.checkov.yaml -o junitxml > checkov-report.xml`.

### When Checkov flags something

1. **Fix it** if you can. This is always the preferred outcome.
2. If it can't be fixed (cost, an environment constraint, an accepted risk), **write an ADR** explaining why, then add a scoped skip that names the ADR.
3. **Log the exception** in the environment's `CHANGELOG.md`.
4. **Re-run Checkov** and confirm every remaining finding is accounted for before merging.

Never make a finding go away by disabling the pipeline step or setting `soft-fail: true`. [Module 11](11-module-promotion-gate.html) takes this further: each module is scanned and its findings justified *before* any environment is allowed to use it.

## Tier 3 · Automated plan posting in Pull Requests

When a pull request is opened, the pipeline runs `terraform plan` and posts the result as a comment:

<pre><code># Example GitHub Actions Workflow snippet
- name: Terraform Plan
  id: plan
  run: |
    set -o pipefail # without this, a failed plan would still pass because of the pipe
    terraform plan -no-color -out=tfplan 2>&1 | tee plan_output.txt

- name: Post Plan to Pull Request
  uses: actions/github-script@v7
  with:
    script: |
      const fs = require('fs');
      const output = fs.readFileSync('plan_output.txt', 'utf8');
      const comment = `#### Terraform Plan Summary 📋
      \`\`\`hcl
      ${output.slice(-2000)}
      \`\`\`
      *Pushed by: @${{ github.actor }}*`;
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: comment
      });</code></pre>

Reviewers read the exact changes before merging. After the merge, a separate deploy job applies that saved plan. If the state has changed since the plan was made, Terraform refuses to apply it, and a fresh plan is needed.

## Operational Control · Scheduled drift detection

Even with a strict pipeline, someone will eventually change something by hand in the AWS console, usually in an emergency.

Run a scheduled plan (for example every weekday at 02:00 UTC) that only reports, never applies:

<pre><code># Run in scheduled CI
terraform plan -detailed-exitcode</code></pre>

- **Exit code 0:** no changes. Real infrastructure matches the code.
- **Exit code 2:** **drift found.** Send an alert to the team's channel or on-call tool, and decide whether to bring the change into code or undo it.
- **Exit code 1:** the plan itself failed.
