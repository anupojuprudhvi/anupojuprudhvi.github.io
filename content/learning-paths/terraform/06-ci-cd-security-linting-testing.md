---
title: CI/CD Guardrails — TFLint, Checkov & Plan Automation
track: terraform
order: 6
module: 6
totalModules: 6
summary: Building a three-tier automated verification pipeline for Terraform — pre-merge formatting, deep linting, security scanning with Checkov, speculative plan reviews, and scheduled drift detection.
level: DevOps & Governance
readingTime: 9 min read
stack: [Terraform, GitHub Actions, Checkov, TFLint, AWS]
tags: [ci-cd, checkov, tflint, drift-detection, pipeline, automation]
---

## Principle · The three-tier verification pipeline

Never allow engineers to run `terraform apply` directly from their local laptops in production. All changes must pass through an automated, audited, and locked-down CI/CD pipeline.

A production pipeline structures checks into three distinct tiers:

<pre><code>Production CI/CD Gateways:
┌────────────────────────────────────────────────────────┐
│  Tier 1: Fast Feedback (< 30s)                         │
│  terraform fmt · terraform validate · tflint           │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│  Tier 2: Security & Compliance Scanning (< 2 min)      │
│  Checkov / Trivy static analysis against CIS benchmarks │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│  Tier 3: Speculative Plan & Review                     │
│  terraform plan -out=tfplan · PR Plan Summary Comment  │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│  Apply Gate: Merge to main branch + OIDC execution     │
│  terraform apply tfplan · State unlock verification    │
└────────────────────────────────────────────────────────┘</code></pre>

## Tier 1 · Code quality & linting with TFLint

While `terraform validate` checks basic syntax, **TFLint** analyzes provider-specific rules, invalid instance types, unreferenced variables, and naming conventions.

<pre><code># .tflint.hcl
config {
  module = true
  force  = false
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

**Checkov** is an industry-standard static code analysis tool for infrastructure as code. It scans your code against hundreds of security policies before cloud resources are provisioned.

### Example Checkov rules enforced in CI:
- `CKV_AWS_18`: Ensure S3 bucket has access logging enabled.
- `CKV_AWS_19`: Ensure all data stored in S3 is encrypted.
- `CKV_AWS_20`: Ensure S3 bucket has public access blocks enabled.
- `CKV_AWS_24`: Ensure security groups do not allow ingress from 0.0.0.0/0 to port 22 (SSH).
- `CKV_AWS_130`: Ensure VPC subnets do not assign public IPs by default.

Run in CI:
<pre><code>checkov -d . --framework terraform --compact --quiet</code></pre>

If a developer opens a PR with an unencrypted S3 bucket or open SSH port, Checkov immediately fails the CI check and blocks the PR from merging.

## Tier 3 · Automated plan posting in Pull Requests

When a PR is opened, the pipeline runs `terraform plan` and posts a formatted summary as a comment on the GitHub PR:

<pre><code># Example GitHub Actions Workflow snippet
- name: Terraform Plan
  id: plan
  run: |
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

Team members review the exact diff before hitting **Merge**. Once merged to `main`, a separate deployment job applies the planned artifact.

## Operational Control · Scheduled drift detection

Even in strictly governed environments, emergency manual changes or out-of-band updates in the AWS Console happen. 

Set up a scheduled cron job (e.g. every weekday at 02:00 UTC) that runs a read-only plan:

<pre><code># Run in scheduled CI
terraform plan -detailed-exitcode</code></pre>

- **Exit code 0:** Succeeded, 0 changes (Infrastructure is 100% in sync).
- **Exit code 2:** Succeeded, **drift detected**! Route an alert to your SRE Slack channel or PagerDuty to reconcile the unmanaged change immediately.
- **Exit code 1:** Plan failed with error.
