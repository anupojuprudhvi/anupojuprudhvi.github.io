---
title: Zero-Plaintext Secret Architecture
date: 2026-09-17
updated: 2026-10-01
track: terraform
order: 4
module: 4
summary: The hard realities of secret management in Terraform — state file plaintext vulnerabilities, dynamic credentials, and replacing static API keys with IAM roles.
level: Security & Compliance
readingTime: 7 min read
stack: [Terraform, AWS Secrets Manager, AWS KMS, IAM]
tags: [security, secrets, sensitive-values, encryption, state-security]
---

## Principle · The `sensitive = true` misconception

Terraform provides a `sensitive = true` attribute for variables and outputs:

<pre><code>variable "db_password" {
  type      = string
  sensitive = true
}

output "connection_string" {
  value     = "postgresql://admin:${var.db_password}@db.example.com"
  sensitive = true
}</code></pre>

### The Critical Caveat:
Marking a value as `sensitive = true` **only hides it from the CLI terminal and CI execution logs**.

It **DOES NOT** encrypt the value in the Terraform state file. If you inspect `terraform.tfstate`, the database password is stored in **100% plaintext JSON**. 

Anyone with read permissions to your remote S3 state bucket can read every secret your infrastructure manages.

## Pattern · Generating secrets dynamically inside AWS

Never accept production passwords as manual inputs via `terraform.tfvars`. Generate them dynamically and store them directly in AWS Secrets Manager:

<pre><code># 1. Generate an unguessable password
resource "random_password" "master" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# 2. Store the secret in AWS Secrets Manager with KMS encryption
resource "aws_secretsmanager_secret" "db_credentials" {
  name                    = "prod/database/master-credentials"
  description             = "Master credentials for production Aurora database"
  kms_key_id              = aws_kms_key.secrets.arn
  recovery_window_in_days = 0 # Enforce immediate deletion if destroyed
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = "dbadmin"
    password = random_password.master.result
  })
}

# 3. Reference the random password in the database resource
resource "aws_rds_cluster" "primary" {
  cluster_identifier = "prod-aurora-cluster"
  engine             = "aurora-postgresql"
  master_username    = "dbadmin"
  master_password    = random_password.master.result
  # ...
}</code></pre>

Applications then retrieve the credential at runtime using the AWS SDK, authenticated via their IAM Execution Role or EKS Pod Identity. No engineer ever needs to know or copy the database master password.

## Pattern · Pass references, not values

Reading a secret into Terraform puts it in state too. A `data "aws_secretsmanager_secret_version"` lookup stores the secret's value in the state file, exactly like a variable would. Where the consumer can fetch the secret itself, give it the secret's **ARN** and let it read the value at runtime:

<pre><code># AVOID: the password lands in state and in the job's arguments
default_arguments = {
  "--db_password" = data.aws_secretsmanager_secret_version.db.secret_string
}

# PREFER: the job reads the secret at runtime with its own IAM role
default_arguments = {
  "--db_secret_arn" = aws_secretsmanager_secret.db_credentials.arn
}</code></pre>

The workload's IAM role is then granted `secretsmanager:GetSecretValue` on that one secret, and nothing secret passes through Terraform at all.

The same rules hold everywhere: no secrets in `terraform.tfvars`, in variable defaults, or in any `.tf` file. Any variable that genuinely has to carry a sensitive value is declared `sensitive = true`, with the caveat above that this only hides it from output.

## Identity · Eliminate static AWS access keys

A common antipattern is creating static `aws_iam_access_key` resources to give services or CI/CD pipelines access to AWS:

<pre><code># ANTI-PATTERN: Generating static keys in Terraform
resource "aws_iam_user" "ci" {
  name = "github-actions-deployer"
}

resource "aws_iam_access_key" "ci" { # Stored in plaintext state!
  user = aws_iam_user.ci.name
}</code></pre>

### The Production Alternative: OpenID Connect (OIDC) Federation

Modern CI pipelines (GitHub Actions, GitLab CI, CircleCI) should assume temporary AWS IAM roles using **OIDC Federation** with zero long-lived credentials:

<pre><code># Secure OIDC Trust Policy for GitHub Actions
resource "aws_iam_role" "ci_deployer" {
  name = "github-actions-terraform-deployer"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "arn:aws:iam::<your-account-number>:oidc-provider/token.actions.githubusercontent.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:my-org/my-repo:ref:refs/heads/main"
          }
        }
      }
    ]
  })
}</code></pre>

## State Defense · Hardening remote state access

Because state files contain sensitive values, lock down the S3 bucket with strict IAM conditions:

- **Customer-Managed KMS Keys:** Encrypt state objects with a dedicated KMS key. Deny access to everyone except the dedicated CI/CD execution role.
- **VPC Endpoint Enforcement:** Restrict S3 state access so objects can only be retrieved from inside your corporate VPC or approved CI runner IP ranges.
- **Access Logging:** Enable S3 Data Event logging in AWS CloudTrail to alert on unauthorized `GetObject` attempts against `*.tfstate`.
