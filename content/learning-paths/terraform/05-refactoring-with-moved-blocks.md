---
title: Zero-Downtime Refactoring with Moved & Import Blocks
date: 2026-09-17
updated: 2026-10-06
track: terraform
order: 5
module: 5
summary: Rename, restructure, adopt, and let go of resources without outages, using moved, import, and removed blocks that are reviewed in a pull request like any other code.
level: Advanced Refactoring
readingTime: 9 min read
stack: [Terraform 1.5+, HCL, AWS]
tags: [refactoring, moved-blocks, import, zero-downtime, state-migration]
---

**In this module, you'll learn to:**

- Rename and restructure resources with `moved` blocks, without destroying them
- Bring existing resources under Terraform with `import` blocks
- Stop managing a resource without deleting it, using `removed` blocks

**Before you start:** read [Modern HCL](03-variables-validation-and-types.html). Its switch from `count` to `for_each` is a typical refactor that needs `moved` blocks.

## Principle · Code refactoring must not cause resource recreation

In the early days of Terraform, renaming a resource or moving it into a child module meant running risky, manual CLI commands:

<pre><code># DANGEROUS LEGACY APPROACH: Manual CLI state manipulation
terraform state mv aws_s3_bucket.logs module.logging.aws_s3_bucket.this</code></pre>

### Why manual state commands are risky
- **Nobody reviews them:** they aren't in Git, so they can't be checked in a pull request.
- **Timing:** the code change and the state command happen separately. If the pipeline applies the new code before someone runs the command, Terraform sees a "new" resource and plans to **destroy and re-create** the real one.

Modern Terraform fixes this by putting the move in the code itself, so it's reviewed and applied together with the change.

## Pattern 1 · Refactoring with declarative `moved` blocks

Terraform 1.1 added the `moved {}` block. It tells Terraform that a resource has a new address. The plan shows the move, and the apply updates state, without touching the real resource.

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
`aws_s3_bucket.data_lake has moved to module.storage.aws_s3_bucket.this` with **0 to add, 0 to change, 0 to destroy**, as long as the module configures the bucket the same way the old resource did. If the plan shows changes, compare the module's settings with the old ones before applying.

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
  id = "<security-group-id>" # the existing resource ID in AWS
}</code></pre>

You can even ask Terraform to write the initial HCL for you:

<pre><code>terraform plan -generate-config-out=generated_sg.tf</code></pre>

Review the generated file, remove arguments that only repeat defaults, commit it, and run `terraform apply`. The resource is now managed by Terraform, with no manual state commands.

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

## Checklist · Refactoring without downtime

1. **Change the code and add `moved` in the same commit.** Never remove the old resource in one commit and add the move in another.
2. **Read the plan.** You want `Plan: 0 to add, 0 to change, 0 to destroy`. If it shows a destroy, stop: the `from` or `to` address is wrong.
3. **Keep `moved` blocks until everyone has applied them.** Remove one only after every environment and every open branch using this code has applied it. In a shared module that other teams use, keep them for good.

## Recap · Key terms

- **`moved` block:** records a new address for an existing resource, reviewed and applied together with the code change (Terraform 1.1+).
- **`import` block:** adopts an existing resource declaratively (1.5+). `terraform plan -generate-config-out` drafts its HCL.
- **`removed` block with `destroy = false`:** drops a resource from state but leaves it running (1.7+).
- **`terraform state mv`:** the older manual command. It isn't reviewed, and it can run out of step with the code.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: What should the plan show after a correct `moved` block for a resource whose settings didn't change?
* That the resource has moved, with 0 to add, 0 to change, 0 to destroy
- 1 to add and 1 to destroy
- 1 to change
- Nothing about the move at all
= The move is listed in the plan, and the apply only updates state. The real resource isn't touched.
Q: Which block stops Terraform managing an Aurora cluster without deleting it?
- `moved`
- `import`
* `removed`, with `destroy = false`
- `lifecycle { prevent_destroy = true }`
= `removed` with `destroy = false` takes the cluster out of state and leaves it running in AWS.
Q: Why is `terraform state mv` riskier than a `moved` block?
- It's slower
* It isn't in Git or reviewed, and it can run before or after the code change instead of with it
- It only works with local state
- It deletes the resource
= If the pipeline applies the new code before someone runs the command, Terraform plans to destroy and re-create the resource.
S: During a module refactor, the plan shows `1 to destroy`. What do you do?
- Apply; the `moved` block fixes it afterwards
* Stop: the `from` or `to` address is wrong. Fix it until the plan shows no destroys
- Add `prevent_destroy` and apply
- Run `terraform state rm` first
= A correct refactor plans 0 to add, 0 to change, 0 to destroy. A destroy means Terraform doesn't see the move.
S: A shared module that other teams use added `moved` blocks last month. Can you delete them now?
- Yes, once your own environment has applied them
- Yes, after 30 days
* No: keep them, because other teams' code may not have applied the move yet
- Only if `terraform validate` passes
= A `moved` block can go only after every environment and branch using the code has applied it. In a shared module, keep it for good.
```
