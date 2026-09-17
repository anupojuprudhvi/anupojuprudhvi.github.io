---
title: Zero-Downtime Refactoring with Moved & Import Blocks
track: terraform
order: 5
module: 5
totalModules: 6
summary: Safely evolving production infrastructure without outages — using declarative moved blocks, modern import blocks, and removed blocks to refactor state with zero downtime.
level: Advanced Refactoring
readingTime: 8 min read
stack: [Terraform 1.5+, HCL, AWS]
tags: [refactoring, moved-blocks, import, zero-downtime, state-migration]
---

## Principle · Code refactoring must not cause resource recreation

In the early days of Terraform, renaming a resource or moving it into a child module meant running risky, manual CLI commands:

<pre><code># DANGEROUS LEGACY APPROACH: Manual CLI state manipulation
terraform state mv aws_s3_bucket.logs module.logging.aws_s3_bucket.this</code></pre>

### Why manual state commands fail in production:
- **Zero Reviewability:** Not tracked in Git or code review; cannot be inspected in a pull request.
- **Race Conditions:** If another engineer or CI pipeline runs before the command executes, Terraform attempts to **destroy and recreate** the production resource.

Modern Terraform solves this by making state refactoring **declarative and version-controlled**.

## Pattern 1 · Refactoring with declarative `moved` blocks

Terraform 1.1+ introduced the `moved {}` block. When Terraform encounters a `moved` block during `terraform plan`, it updates the state file in memory without destroying or modifying the physical cloud resource.

### Scenario A: Moving an existing resource into a module

<pre><code># In environments/prod/main.tf

# 1. New module call replacing the old standalone resource
module "storage" {
  source      = "../../modules/secure-s3-bucket"
  bucket_name = "corp-data-lake-prod"
}

# 2. Declarative state migration record
moved {
  from = aws_s3_bucket.data_lake
  to   = module.storage.aws_s3_bucket.this
}</code></pre>

When you run `terraform plan`, Terraform prints:
`aws_s3_bucket.data_lake has moved to module.storage.aws_s3_bucket.this` with **0 to add, 0 to change, 0 to destroy**.

### Scenario B: Migrating from a single resource to `for_each`

<pre><code># Before: Single resource
# resource "aws_subnet" "public" { ... }

# After: Converted to for_each map
resource "aws_subnet" "public" {
  for_each          = var.subnets
  cidr_block        = each.value.cidr
  availability_zone = each.value.az
}

# Preserve the original resource's state under the new map key
moved {
  from = aws_subnet.public
  to   = aws_subnet.public["us-east-1a"]
}</code></pre>

## Pattern 2 · Declarative adoption with `import` blocks

Before Terraform 1.5, adopting unmanaged AWS resources required running `terraform import <addr> <id>`, followed by hand-writing HCL to match reality.

Terraform 1.5+ allows you to import resources declaratively:

<pre><code># import.tf

import {
  to = aws_security_group.ingress
  id = "sg-0123456789abcdef0" # AWS Resource ID
}</code></pre>

You can even ask Terraform to write the initial HCL for you:

<pre><code>terraform plan -generate-config-out=generated_sg.tf</code></pre>

Review the generated file, clean up redundant default parameters, commit it to Git, and run `terraform apply`. The resource is now under state management with zero manual CLI commands.

## Pattern 3 · Safely detaching resources with `removed` blocks

In Terraform 1.7+, if you want to stop managing a resource in Terraform **without deleting the underlying infrastructure in AWS**, use the `removed {}` block:

<pre><code># main.tf

# Stop managing an Aurora cluster without destroying data
removed {
  from = aws_rds_cluster.legacy

  lifecycle {
    destroy = false # Drops from state, leaves cluster running in AWS!
  }
}</code></pre>

## Checklist · The Zero-Downtime Refactoring Protocol

1. **Never delete code before declaring `moved`:** Add the new module or resource structure alongside the `moved {}` block in the same commit.
2. **Review the plan diff religiously:** Verify that `terraform plan` outputs `Plan: 0 to add, 0 to change, 0 to destroy`. If the plan shows `Destroy`, stop immediately — your `from` or `to` path is misaligned.
3. **Leave `moved` blocks in place:** Keep `moved` blocks committed for at least 1-2 release cycles so all team members and feature branches migrate their state cleanly before removing the block.
