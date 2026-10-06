---
title: Zero-Plaintext Secret Architecture
date: 2026-09-17
updated: 2026-10-06
track: terraform
order: 4
module: 4
summary: Why sensitive = true doesn't protect secrets in state, how to keep database passwords out of Terraform entirely, passing secret ARNs instead of values, and replacing static access keys with OIDC roles.
level: Security & Compliance
readingTime: 8 min read
stack: [Terraform, AWS Secrets Manager, AWS KMS, IAM]
tags: [security, secrets, sensitive-values, encryption, state-security]
---

**In this module, you'll learn to:**

- Explain why `sensitive = true` doesn't keep a secret out of state
- Keep database passwords out of Terraform, and pass secret ARNs instead of values
- Replace static access keys with OIDC roles, and harden access to state

**Before you start:** read [State Isolation, Remote Locking & Blast Radius Control](02-state-isolation-and-locking.html). This module builds on its state bucket protections.

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

### The catch
Marking a value `sensitive = true` **only hides it from the terminal and CI logs**.

It does **not** protect it in the state file. Open `terraform.tfstate` and the password is there in plain JSON. Anyone who can read the state bucket can read every secret Terraform has touched.

So the goal is simple: keep secrets out of Terraform altogether wherever you can.

## Pattern · Let AWS create and keep the password

Never pass production passwords in through `terraform.tfvars`. For RDS and Aurora, let AWS create the master password and keep it in Secrets Manager for you:

<pre><code>resource "aws_rds_cluster" "primary" {
  cluster_identifier            = "prod-aurora-cluster"
  engine                        = "aurora-postgresql"
  master_username               = "dbadmin"
  manage_master_user_password   = true # RDS creates and rotates it in Secrets Manager
  master_user_secret_kms_key_id = aws_kms_key.secrets.arn
  # ...
}</code></pre>

Terraform never sees the password, so it never reaches state. Applications read it at runtime from Secrets Manager with their own IAM role (or EKS Pod Identity), and no engineer needs to know it.

<div class="callout"><b>Why not random_password?</b> A <code>random_password</code> resource is better than a typed-in password, but its result is still stored in state. Use it only where the service can't manage its own secret, and protect the state bucket as in <a href="02-state-isolation-and-locking.html">Module 02</a>.</div>

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

A common anti-pattern is creating static `aws_iam_access_key` resources to give services or CI/CD pipelines access to AWS:

<pre><code># ANTI-PATTERN: Generating static keys in Terraform
resource "aws_iam_user" "ci" {
  name = "github-actions-deployer"
}

resource "aws_iam_access_key" "ci" { # Stored in plaintext state!
  user = aws_iam_user.ci.name
}</code></pre>

### The alternative: OIDC federation

CI pipelines such as GitHub Actions, GitLab CI, and CircleCI can assume a temporary IAM role through **OIDC federation**, with no long-lived keys at all:

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
            # only the main branch of this one repository can assume the role
            "token.actions.githubusercontent.com:sub" = "repo:my-org/my-repo:ref:refs/heads/main"
          }
        }
      }
    ]
  })
}</code></pre>

## State Defense · Hardening remote state access

Some sensitive values will always end up in state, so protect the bucket as well (the full checklist is in [Module 02](02-state-isolation-and-locking.html)):

- **A dedicated KMS key:** only the CI/CD roles and the read-only plan roles may decrypt state.
- **Network limits:** allow state reads only through your VPC endpoint or from approved CI runners.
- **Access logging:** turn on S3 data events in CloudTrail, and alert on unexpected `GetObject` calls to `*.tfstate`.

## Recap · Key terms

- **`sensitive = true`:** hides a value in CLI and CI output only. It's still plain text in state.
- **`manage_master_user_password`:** RDS or Aurora creates the master password and keeps it in Secrets Manager. Terraform never sees it.
- **`random_password`:** better than a typed-in password, but its result is still stored in state.
- **Secret reference:** a secret's ARN, passed instead of its value. The workload reads the value at runtime with its own IAM role.
- **OIDC federation:** a pipeline assumes a short-lived IAM role, limited by audience and subject, instead of using access keys.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: A variable is marked `sensitive = true`. Where can its value still be read?
- Nowhere; it's encrypted
* In the state file, in plain text
- Only in the plan output
- Only in CloudTrail
= `sensitive` only hides the value from terminal and CI output. Anyone who can read the state can read it.
Q: How does `manage_master_user_password = true` keep the database password out of state?
* RDS creates the password and keeps it in Secrets Manager, so Terraform never handles it
- Terraform encrypts it before writing state
- It moves the password to SSM Parameter Store
- It marks the password as sensitive
= A value Terraform never receives can't end up in state. Applications read it from Secrets Manager at runtime.
Q: In the GitHub Actions OIDC trust policy, what does the `sub` condition limit?
- The AWS region
* Which repository and branch may assume the role
- How long the session lasts
- Which IAM user created the role
= `repo:my-org/my-repo:ref:refs/heads/main` means only the main branch of that one repository can assume the role.
S: A Glue job gets its database password from `data "aws_secretsmanager_secret_version"`, passed in `default_arguments`. What's wrong, and what's the fix?
- Nothing; a data source only reads
- Mark the argument `sensitive = true`
* The password lands in state; pass the secret's ARN and let the job's role read it at runtime
- Move the password into `terraform.tfvars`
= Reading a secret into Terraform stores its value in state. Pass the ARN and grant the job's role `secretsmanager:GetSecretValue` on that one secret.
S: A pipeline deploys with an IAM user whose `aws_iam_access_key` is created in Terraform. What do you replace it with?
- The same key, rotated every 90 days
- The key stored as a CI secret
* An IAM role the pipeline assumes through OIDC, with no long-lived keys
- The key output marked `sensitive`
= The access key sits in state in plain text and never expires. OIDC gives the pipeline short-lived credentials instead.
```
