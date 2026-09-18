---
title: State Isolation, Remote Locking & Blast Radius Control
track: terraform
order: 2
module: 2
totalModules: 6
summary: Architecting remote state backends with S3 and DynamoDB, reducing blast radius via state layering, and replacing remote_state with parameter contracts.
level: Core Architecture
readingTime: 8 min read
stack: [Terraform, AWS S3, DynamoDB, AWS KMS, IAM]
tags: [state-management, blast-radius, locking, security, isolation]
---

## Principle · State is your single point of truth and vulnerability

Terraform state files map your declarative code to real-world cloud resources, track metadata, and cache resource attributes. In production, an improperly governed state file introduces two severe risks:

1. **State Corruption / Concurrency Race:** Two CI jobs or engineers applying changes concurrently can overwrite each other's state, leading to orphaned resources or silent cloud drift.
2. **Catastrophic Blast Radius:** Storing all infrastructure in one massive state file means an error anywhere risks downtime everywhere.

## Architecture · Secure S3 & DynamoDB backend design

An enterprise S3 state backend must be locked down with multiple layers of defense:

<pre><code># backend.tf
terraform {
  backend "s3" {
    bucket         = "corp-terraform-state-us-east-1-prod"
    key            = "networking/vpc/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "corp-terraform-locks-prod"
  }
}</code></pre>

### Backend Security Checklist:
- **Bucket Versioning:** Must be enabled on the S3 bucket so corrupted states can be rolled back immediately.
- **KMS Encryption:** Enforce customer-managed keys (CMK) with an IAM policy restricting `kms:Decrypt` to authorized CI/CD pipeline execution roles.
- **Block Public Access:** All 4 public access block settings on the S3 bucket must be set to `true`.
- **Enforce TLS:** Add an S3 bucket policy denying `s3:*` when `aws:SecureTransport == false`.
- **DynamoDB State Locking:** The DynamoDB table must have a primary key named `LockID` of type String.

## Strategy · Layering state to control blast radius

Never deploy all infrastructure in a single state file. Partition your infrastructure into separate directories, each with its own independent `key` in the state bucket:

<pre><code>State Hierarchy & Blast Radius:
┌────────────────────────────────────────────────────────┐
│  00-bootstrap: State S3 bucket, DynamoDB lock table    │ (Managed once)
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│  01-networking: VPC, Transit Gateway, Route 53 Hub     │ (Changes quarterly)
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│  02-security: IAM Roles, KMS Keys, GuardDuty           │ (Changes monthly)
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│  03-data: Aurora Clusters, S3 Data Lakes, EFS          │ (High risk, changes monthly)
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│  04-compute: EKS Node Groups, ECS Clusters, Lambdas    │ (Changes weekly/daily)
└────────────────────────────────────────────────────────┘</code></pre>

If a developer makes an error in `04-compute`, the state lock is confined to that layer. The VPC and database state files remain completely untouched and locked against modifications.

## Contracts · Avoiding the `terraform_remote_state` trap

Historically, teams shared outputs between state files using `data "terraform_remote_state"`:

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

### Why this is an anti-pattern:
- **Security Leak:** Anyone running the app Terraform must have full read access to the entire VPC state file, exposing all attributes and metadata.
- **Brittle Coupling:** Renaming an output in the VPC module silently breaks downstream plans across different teams.

### The Production Alternative: SSM Parameter Store Contracts

Publish resource identifiers to AWS Systems Manager (SSM) Parameter Store, and consume them via standard data lookups:

<pre><code># 1. In 01-networking: Publish contract
resource "aws_ssm_parameter" "vpc_id" {
  name  = "/infrastructure/prod/vpc/vpc_id"
  type  = "String"
  value = module.vpc.vpc_id
}

# 2. In 04-compute: Consume contract cleanly
data "aws_ssm_parameter" "vpc_id" {
  name = "/infrastructure/prod/vpc/vpc_id"
}

resource "aws_security_group" "app" {
  vpc_id = data.aws_ssm_parameter.vpc_id.value
}</code></pre>

This cleanly decouples your state files, adheres to least-privilege IAM, and creates an explicit architectural interface between infrastructure layers.
