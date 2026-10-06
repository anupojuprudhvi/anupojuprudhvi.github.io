---
title: State Isolation, Remote Locking & Blast Radius Control
date: 2026-09-17
updated: 2026-10-06
track: terraform
order: 2
module: 2
summary: A secure S3 state backend with native locking, state split into layers so one mistake can't reach everything, and SSM parameters instead of remote_state for sharing values between layers.
level: Core Architecture
readingTime: 9 min read
stack: [Terraform, AWS S3, AWS KMS, IAM, SSM Parameter Store]
tags: [state-management, blast-radius, locking, security, isolation]
---

**In this module, you'll learn to:**

- Set up an S3 state backend with native locking, encryption, and least-privilege access
- Give every layer its own state, so a mistake in one can't reach the others
- Share values between layers through SSM Parameter Store instead of `terraform_remote_state`

**Before you start:** read [Enterprise Repository & Module Layout](01-enterprise-module-design.html). This module gives each of its layers a state of its own.

## Principle · State is both your source of truth and a risk

The state file is how Terraform knows which real cloud resources belong to your code. Handled carelessly, it creates two big risks:

1. **Two runs at once:** two CI jobs or engineers applying at the same time can overwrite each other's state, leaving orphaned resources or drift.
2. **Too much in one place:** with all infrastructure in one state file, a mistake anywhere can affect everything.

## Architecture · A secure S3 backend with native locking

The state bucket needs several layers of protection. Terraform 1.10 added native locking to the S3 backend, using S3 conditional writes (`use_lockfile`), and it became generally available in Terraform 1.11. A separate DynamoDB lock table is no longer needed:

<pre><code># backend.tf (Terraform 1.11+)
terraform {
  backend "s3" {
    bucket       = "corp-terraform-state-us-east-1-prod"
    key          = "networking/vpc/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    kms_key_id   = "alias/corp-terraform-state"
    use_lockfile = true # native S3 locking
  }
}</code></pre>

### Older runners · DynamoDB locking

DynamoDB locking (`dynamodb_table`) is deprecated from Terraform 1.11, but runners still on older versions need it. To migrate, set **both** `use_lockfile = true` and `dynamodb_table` for a while: Terraform then takes both locks, so old and new runners can't overlap. Once every runner is on 1.11 or later, remove `dynamodb_table` and decommission the table. A backend change like this affects every run, so record it as an ADR (Module 10).

### Backend security checklist
- **Versioning on:** turn on bucket versioning, so a damaged state file can be rolled back.
- **KMS encryption:** use a customer-managed key, and allow `kms:Decrypt` only to the roles that need to read state: the CI/CD roles, and the read-only roles engineers use for `terraform plan`.
- **Block public access:** set all four S3 public access block settings to `true`.
- **TLS only:** add a bucket policy that denies `s3:*` when `aws:SecureTransport` is `false`.
- **Only the pipeline writes:** only the CI/CD role and break-glass admin roles may write state. Engineers get read-only access, enough for `terraform plan` and `terraform state show`.
- **If you still use DynamoDB locking:** the lock table's primary key must be named `LockID`, of type String.

### State hygiene

Never commit state or the local provider cache. Do commit the provider lock file, `.terraform.lock.hcl`, in each root module, so every machine resolves the same provider versions (Module 08):

<pre><code># .gitignore at the terraform/ root
**/.terraform/*
*.tfstate
*.tfstate.*
crash.log
override.tf
override.tf.json
*_override.tf
*_override.tf.json
# .terraform.lock.hcl is NOT ignored: commit it</code></pre>

## Strategy · Layering state to control blast radius

Never put all infrastructure in one state file. Give each layer from [Module 01](01-enterprise-module-design.html) (`00-bootstrap`, `01-networking`, `02-security`, `03-data`, `04-compute`) its own directory and its own `key` in the state bucket.

Then a mistake in `04-compute` only locks and changes the compute state. The networking and database state files aren't part of that run at all.

## Contracts · Avoiding the `terraform_remote_state` trap

Teams often share values between state files with `data "terraform_remote_state"`:

<pre><code># ANTI-PATTERN: Tight state coupling
data "terraform_remote_state" "vpc" {
  backend = "s3"
  config = {
    bucket = "corp-terraform-state-prod"
    key    = "networking/vpc/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_security_group" "app" {
  vpc_id = data.terraform_remote_state.vpc.outputs.vpc_id # Tightly coupled!
}</code></pre>

### Why this causes problems
- **Too much access:** anyone running the app's Terraform needs read access to the whole networking state file, including every attribute in it.
- **Fragile links:** renaming an output in the networking layer breaks other teams' plans, and they only find out when their next plan fails.

### The alternative: SSM Parameter Store

Publish the values other layers need to AWS Systems Manager (SSM) Parameter Store, and read them with a data source:

<pre><code># 1. In 01-networking: Publish the value
resource "aws_ssm_parameter" "vpc_id" {
  name  = "/infrastructure/prod/vpc/vpc_id"
  type  = "String"
  value = module.vpc.vpc_id
}

# 2. In 04-compute: Read it
data "aws_ssm_parameter" "vpc_id" {
  name = "/infrastructure/prod/vpc/vpc_id"
}

resource "aws_security_group" "app" {
  vpc_id = data.aws_ssm_parameter.vpc_id.value
}</code></pre>

Now each layer reads only the values it needs, IAM can grant access per parameter, and the parameter names form a clear, written contract between layers.

## Recap · Key terms

- **State file:** Terraform's record of which real resources belong to the code. It can hold secrets, so it's protected like one.
- **`use_lockfile`:** native S3 state locking, generally available from Terraform 1.11. It replaces the DynamoDB lock table.
- **Blast radius:** how much one run can change. One state per layer keeps it to that layer.
- **`terraform_remote_state`:** reads another state's outputs, but needs read access to that whole state file.
- **SSM parameter contract:** values one layer publishes by name and another reads, with IAM access per parameter.
- **`.terraform.lock.hcl`:** committed to Git. `.terraform/` and `*.tfstate` never are.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: From Terraform 1.11, what does `use_lockfile = true` on the S3 backend replace?
* The DynamoDB lock table
- Bucket versioning
- KMS encryption of the state
- The `.terraform.lock.hcl` file
= Native S3 locking uses conditional writes, so a separate DynamoDB table is no longer needed. The lock file is about provider versions, not state.
Q: Why is `data "terraform_remote_state"` discouraged for sharing values between layers?
- It doesn't work with the S3 backend
* The reader needs access to the whole other state file, and a renamed output breaks it
- It's slower than reading SSM
- It can read only one output
= It couples layers tightly. SSM parameters expose only the values each layer needs, with access granted per parameter.
Q: Which of these should be committed to Git?
- `terraform.tfstate`
- The `.terraform/` directory
* `.terraform.lock.hcl`
- `crash.log`
= The lock file makes every machine resolve the same provider versions. State and the local provider cache stay out of Git.
S: Some CI runners still use the DynamoDB lock table, while others have moved to Terraform 1.11. How do you switch to native S3 locking safely?
- Switch every runner to `use_lockfile` today and delete the table
* Set both `use_lockfile = true` and `dynamodb_table` until every runner is on 1.11 or later, then remove the table
- Keep DynamoDB locking for good
- Turn locking off during the migration
= With both set, Terraform takes both locks, so old and new runners can't overlap. A backend change like this is recorded in an ADR.
S: An engineer needs to run `terraform plan` for the `03-data` layer. What access should they get?
- Write access to the state bucket
* Read-only access to that state, including `kms:Decrypt` on the state key
- Full admin, because plan changes nothing
- None; only CI may read state
= Engineers get read-only access, enough for `terraform plan` and `terraform state show`. Only the pipeline and break-glass roles write state.
```
