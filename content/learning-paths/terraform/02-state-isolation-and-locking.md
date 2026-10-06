---
title: State Isolation, Remote Locking & Blast Radius Control
date: 2026-09-17
updated: 2026-10-01
track: terraform
order: 2
module: 2
summary: A secure S3 state backend with native locking, state split into layers so one mistake can't reach everything, and SSM parameters instead of remote_state for sharing values between layers.
level: Core Architecture
readingTime: 8 min read
stack: [Terraform, AWS S3, AWS KMS, IAM, SSM Parameter Store]
tags: [state-management, blast-radius, locking, security, isolation]
---

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
