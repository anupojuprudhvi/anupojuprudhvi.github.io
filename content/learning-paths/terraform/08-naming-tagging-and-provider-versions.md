---
title: Naming, Tagging & Provider Versions Across a Module Tree
date: 2026-10-01
track: terraform
order: 8
module: 8
summary: The conventions that make a module codebase look like one team wrote it. A naming pattern, a tagging standard split between provider default_tags and module inputs, and provider version constraints that agree all the way down the module tree.
level: Module standard · Conventions
readingTime: 10 min read
stack: [Terraform, AWS provider, HCL, default_tags]
tags: [naming, tagging, cost-allocation, provider-versions, conventions]
---

**In this module, you'll learn to:**

- Name resources so anyone can tell the environment, service, and purpose at a glance
- Split tags between the provider's `default_tags` and a module's `tags` input, so none are forgotten and none are repeated
- Keep provider version constraints consistent from the environment down to every base module

**Before you start:** read [Base, Composition & Environment](07-base-composition-and-environment-modules.html). This module uses its layers and file names.

## Principle · Conventions are what make a codebase reviewable

A reviewer reading a pull request should spend their attention on *what* changed, not on decoding how this author happened to name things. Conventions take that decoding away. They also feed things outside Terraform: cost reports group by tag, alerts filter by name, and access policies match on both.

The conventions here are deliberately few. Each one is written down once, applied by the code where possible, and checked in review where not.

## Naming · One pattern for resources, one for code

| What | Convention | Example |
| --- | --- | --- |
| AWS resource names | `<prefix>-<env>-<service>-<purpose>` | `corp-nonprod-glue-etl-ingest` |
| Variables, locals, outputs | `snake_case` | `bucket_name`, `glue_job_name` |
| Module folders | `kebab-case`, named for what they build | `glue-crawler`, `glue-s3` |
| Module sources in the same repository | relative paths | `../../base/s3` |

Names are built once, in `locals.tf`, from the environment's prefix. No module concatenates its own environment name, which keeps base modules unaware of where they run:

```hcl
# modules/composition/glue-s3/locals.tf
locals {
  name_prefix   = "${var.prefix}-${var.env_name}"
  bucket_name   = "${local.name_prefix}-glue-data"
  glue_job_name = "${local.name_prefix}-glue-etl-ingest"
  crawler_name  = "${local.name_prefix}-glue-crawler-curated"
}
```

## Tagging · The standard set

Every taggable resource carries at least these tags:

| Tag | Example | Why it's there |
| --- | --- | --- |
| `Environment` | `nonprod` | Separate reporting and access by environment |
| `Project` | `data-platform-glue-s3` | Cost allocation |
| `Owner` | `data-platform-team` | Someone to ask, and someone accountable |
| `ManagedBy` | `terraform` | Warns anyone in the console not to edit it by hand |
| `CostCenter` | `CC-1234` | Chargeback to the right budget |
| `DataClassification` | `internal`, `confidential`, `pii` | On data stores: drives encryption, retention, and which security checks apply |

## Pattern · Split tags by who knows them

The first five tags are the same for every resource in an environment. `DataClassification` only makes sense on a bucket; `JobType` only on a Glue job. So tags come from two places, each holding only what it knows:

| Source | What goes there | Why |
| --- | --- | --- |
| The provider's `default_tags`, in `providers.tf` | `Environment`, `Project`, `Owner`, `ManagedBy`, `CostCenter` | Applied to every resource the provider creates, so they can't be forgotten, and one edit changes them everywhere |
| A module's `tags` input | Tags only that resource understands: `DataClassification`, `JobType`, `CrawlerSchedule` | The environment shouldn't need to know them, and the module shouldn't carry org-wide ones |

```hcl
# environments/nonprod/providers.tf
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags # Environment, Project, Owner, ManagedBy, CostCenter
  }
}
```

The module just passes its `tags` input to the resource. The AWS provider merges `default_tags` with a resource's own `tags`, so there's no need for `merge(local.common_tags, var.tags)` in the module:

```hcl
# modules/base/s3/main.tf
resource "aws_s3_bucket" "this" {
  bucket = var.bucket_name
  tags   = var.tags # merged with default_tags by the provider
}
```

```hcl
# modules/composition/glue-s3/main.tf
module "s3" {
  source      = "../../base/s3"
  bucket_name = local.bucket_name
  tags        = { DataClassification = "pii" } # only the resource-specific tag
}
```

### Where the split needs care

- **Don't pass `common_tags` down as well.** It's applied already; passing it again just adds noise to every module call.
- **On a key collision, the resource's own tag wins.** If you find yourself overriding a default tag on purpose, either the tag belongs in `default_tags` for everyone, or it's a real exception that deserves a comment.
- **Each provider configuration has its own `default_tags`.** A resource created through an aliased provider (a second region, or another account) only gets default tags if that provider block declares them too.
- **Some resources don't take `tags` at all**, or tag what they create differently, such as tags an Auto Scaling group propagates to its instances. Check these by hand.

The standard is also easy to enforce in CI: TFLint's `aws_resource_missing_tags` rule, or a custom Checkov policy, fails a pull request when a required tag is missing (Module 06).

## Versions · One provider version for the whole tree

Terraform resolves **one** version of each provider for a root module and every module it calls. If a base module says `aws < 5.0` and the environment says `aws ~> 5.40`, `terraform init` fails with a resolution error. Worse, if constraints are loose everywhere, it quietly picks a version nobody chose or tested.

Module 01 set the principle: modules use a range, roots pin exactly. In a module tree, that becomes four rules.

**1. Every base and composition module declares what it needs**, as a range, with no provider configuration:

```hcl
# modules/base/s3/versions.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.40, < 6.0"
    }
  }
}
```

**2. The environment pins the version it applies with**, and that version must sit inside every module's range:

```hcl
# environments/nonprod/version.tf
terraform {
  required_version = "1.10.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "5.82.0"
    }
  }
}
```

**3. Bump the environment and the module ranges together.** When an environment moves to a provider version that some module's range doesn't allow, widen that module's range in the same pull request. Never let ranges drift until they can't be satisfied.

**4. Treat a major provider upgrade as a decision**, not routine maintenance. A major version can change resource behaviour and defaults, so record it as an ADR (Module 10).

### The lock file is what actually guarantees it

Constraints say what's *allowed*. The dependency lock file, `.terraform.lock.hcl`, records what was *chosen*, with checksums. Commit it in each environment folder, and every laptop and CI runner uses exactly the same provider build.

If engineers work on different operating systems than the CI runners, record checksums for every platform at once, or `init` on another platform will want to change the file:

```bash
terraform providers lock \
  -platform=linux_amd64 \
  -platform=darwin_arm64 \
  -platform=windows_amd64
```

## Recap · Key terms

- **Naming pattern:** `<prefix>-<env>-<service>-<purpose>`, built once in `locals.tf`.
- **`default_tags`:** a provider-level tag set applied to every resource that provider creates.
- **Resource-specific tags:** tags a module adds through its `tags` input because only that resource understands them.
- **Version constraint:** the range of provider versions a module accepts, declared in `required_providers`.
- **Dependency lock file:** `.terraform.lock.hcl`, the exact provider versions and checksums an environment uses.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: Where should the `CostCenter` tag be set?
* In the provider's `default_tags`, in the environment's `providers.tf`
- In every base module's `tags` default
- Only on resources that cost money
- In the composition module's `locals.tf`
= It's the same for every resource in the environment, so the provider applies it everywhere. Modules never need to know it.
Q: A base module needs `DataClassification = "pii"` on its bucket. How does it get there?
- Add it to `default_tags`
* The composition passes it through the module's `tags` input
- Hardcode it in the base module
- Tag the bucket by hand after apply
= Only that bucket needs it, so the composition, which knows what data it holds, passes it as a resource-specific tag.
Q: What guarantees that CI and every laptop use the same AWS provider build?
- Matching `required_providers` ranges in every module
- Pinning the Terraform CLI version
* The committed `.terraform.lock.hcl` file
- Running `terraform init -upgrade` before each plan
= Constraints only limit the choice. The lock file records the exact version and its checksums.
S: After the environment moves to AWS provider 6.x, `terraform init` fails to resolve providers. One base module still says `< 6.0`. What's the right fix?
- Remove the `required_providers` block from the base module
- Pin the environment back to 5.x permanently
* Test the module on 6.x, then widen its range in the same pull request, with an ADR for the major upgrade
- Copy the module and give the copy a 6.x range
= Ranges move together. A major upgrade can change behaviour, so it's tested, the range is widened deliberately, and the decision is recorded.
S: A resource created through a provider alias for a second region is missing `Owner` and `CostCenter`, though every other resource has them. What's the likely cause?
- The resource type doesn't support tags
* The aliased provider block doesn't declare `default_tags`
- `default_tags` only works in `us-east-1`
- The module overwrote them with an empty map
= Each provider configuration has its own `default_tags`. Add the same block to the alias.
```
