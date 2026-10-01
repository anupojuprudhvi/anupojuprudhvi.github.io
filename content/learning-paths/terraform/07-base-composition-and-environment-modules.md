---
title: Base, Composition & Environment: A Three-Layer Module Standard
date: 2026-10-01
track: terraform
order: 7
module: 7
summary: Split reusable modules into base modules that build one component and composition modules that wire a whole solution together, so environments differ only in their values. Worked through on an AWS Glue and S3 data pipeline.
level: Module standard · Structure
readingTime: 13 min read
stack: [Terraform, HCL, AWS Glue, Amazon S3, IAM]
tags: [module-design, composition, repo-structure, environment-parity, best-practices]
---

**In this module, you'll learn to:**

- Tell a base module from a composition module, and decide which one a new resource belongs in
- Lay out a repository so the IAM and networking wiring lives in exactly one place
- Keep every environment the same shape, so `dev` predicts what `prod` will do

**Before you start:** read [Enterprise Repository & Module Layout](01-enterprise-module-design.html). This module builds on its split between reusable child modules and root deployments.

## Principle · Child modules come in two sizes

Module 01 drew one line: **child modules** are reusable blueprints, and **root modules** are the deployments that hold state and provider settings. In a small codebase that's enough. As the codebase grows, a second line appears inside the child modules, because two very different kinds of module are hiding under that one name.

- A **base module** builds a single component: one S3 bucket, one Glue job, one crawler. It knows nothing about any other module.
- A **composition module** builds a whole solution. It calls several base modules and adds the code that joins them: the IAM roles that let one service reach another, and the networking they share.

That joining code is where most of the real decisions live: who can read the bucket, which subnets the job runs in. Putting all of it in the composition keeps the base modules small and reusable, and gives reviewers one place to look when permissions change.

The rest of this module, and of Part 2, follows one complete standard for a data platform on AWS Glue and S3: an S3 bucket for the data, a Glue ETL job that transforms it, and a Glue crawler that catalogs it. It's drawn from a real codebase standard, with every name removed.

## Structure · The directory layout

```text
terraform/
├── .checkov.yaml               # shared scan config (Module 11)
├── .pre-commit-config.yaml
├── environments/
│   ├── dev/
│   └── nonprod/
│       ├── data.tf
│       ├── local.tf
│       ├── main.tf
│       ├── variables.tf
│       ├── outputs.tf
│       ├── providers.tf
│       ├── version.tf
│       ├── terraform.tfvars
│       ├── .terraform.lock.hcl
│       └── docs/
│           ├── adr/            # decision records (Module 10)
│           └── CHANGELOG.md
└── modules/
    ├── base/
    │   ├── s3/
    │   │   ├── main.tf
    │   │   ├── variables.tf
    │   │   ├── outputs.tf
    │   │   ├── README.md
    │   │   └── tests/          # terraform test (Module 09)
    │   ├── glue-etl/
    │   └── glue-crawler/
    └── composition/
        └── glue-s3/
            ├── main.tf
            ├── variables.tf
            ├── outputs.tf
            ├── locals.tf
            ├── iam.tf
            ├── networking.tf
            └── README.md
```

Calls only ever go down this tree. An environment calls a composition, a composition calls base modules, and a base module calls nothing.

```flow
title: Who calls whom
* environments/nonprod | the only layer that knows which environment it is; holds providers, backend, and values
-> calls, passing names, sizing, and network IDs
composition/glue-s3 | joins the parts: IAM roles, networking, naming, outputs
-> calls each base module with resource-specific inputs
paths
path: base/s3
S3 bucket | encryption, public access block, versioning
path: base/glue-etl
Glue ETL job | script location, worker type, role
path: base/glue-crawler
Glue crawler | target path, schedule, role
end
-> creates
AWS Glue + Amazon S3 | the running data pipeline
```

## Responsibilities · What each layer may and may not do

| Layer | Example | Does | Never does |
| --- | --- | --- | --- |
| Base | `s3`, `glue-etl`, `glue-crawler` | Creates one reusable component, with a `README.md` covering inputs, outputs, and usage | Calls another module, configures a provider, or hardcodes an account, region, or environment name |
| Composition | `glue-s3` | Calls base modules and owns the joining code in `iam.tf`, `networking.tf`, and `locals.tf` | Configures a provider or backend, or reads `terraform.tfvars` |
| Environment | `nonprod` | Configures the provider and backend, sets values, and calls the composition | Declares raw resources the composition should own |

Every file has one job, and the same file name means the same thing wherever it appears:

| File | Found in | Purpose |
| --- | --- | --- |
| `main.tf` | all three layers | Resource or module declarations |
| `variables.tf` | all three layers | Input declarations, each with a `description` and `type` |
| `outputs.tf` | all three layers | Values exposed to the caller |
| `locals.tf` / `local.tf` | composition, environment | Derived values: names, prefixes, common tags |
| `iam.tf` | composition | Roles and policies that connect the base modules |
| `networking.tf` | composition | VPC, subnet, and security group wiring |
| `data.tf` | environment | Lookups of things that already exist: the VPC, a KMS key, the account |
| `providers.tf` | environment | Provider and backend configuration |
| `version.tf` | environment | The exact Terraform and provider versions used to apply |
| `terraform.tfvars` | environment | This environment's values |
| `README.md` | base, composition | Purpose, inputs and outputs table, and a usage example |

## Base · One component, no opinions about its neighbours

A base module takes everything environment-specific as an input. Each variable carries a description and a type, and a default only where one value is right almost everywhere.

```hcl
# modules/base/s3/variables.tf
variable "bucket_name" {
  description = "Name of the S3 bucket"
  type        = string
}

variable "tags" {
  description = "Resource-specific tags, added to the provider's default_tags"
  type        = map(string)
  default     = {}
}
```

Three rules keep a base module reusable:

- **No hardcoded environment values.** No account IDs, region names, or `if var.env == "prod"`. Pass the difference in as a variable.
- **No calls to other modules.** If the S3 module needs a KMS key, it takes the key's ARN as an input; it doesn't create one by calling a KMS module.
- **No provider blocks.** A base module declares which providers it *requires* (Module 08), but only the environment *configures* one.

## Composition · Where the wiring lives

The composition calls each base module and feeds one module's outputs into the next. Names come from `locals.tf`; the role comes from `iam.tf`.

```hcl
# modules/composition/glue-s3/main.tf
module "s3" {
  source      = "../../base/s3"
  bucket_name = local.bucket_name
  tags        = { DataClassification = "pii" }
}

module "glue_etl" {
  source          = "../../base/glue-etl"
  job_name        = local.glue_job_name
  iam_role_arn    = aws_iam_role.glue.arn
  script_location = "s3://${module.s3.bucket_name}/scripts/ingest.py"
  tags            = { JobType = "etl" }
}

module "glue_crawler" {
  source       = "../../base/glue-crawler"
  crawler_name = local.crawler_name
  iam_role_arn = aws_iam_role.glue.arn
  s3_target    = "s3://${module.s3.bucket_name}/curated/"
  tags         = { CrawlerSchedule = "daily" }
}
```

Notice that `tags` here only carries tags that mean something for that one resource. The tags every resource needs (`Environment`, `Owner`, `CostCenter`) are applied once by the provider, not passed down through every module. Module 08 explains the split.

A composition exposes only the outputs an environment actually uses: the bucket name, job name, crawler name, and role ARN. Anything else stays internal, so it can change without breaking a caller.

## Environment · The only layer that knows where it is

```hcl
# environments/nonprod/main.tf
module "glue_s3" {
  source = "../../modules/composition/glue-s3"

  env_name    = local.env_name
  bucket_name = "${local.name_prefix}-glue-data"
  vpc_id      = data.aws_vpc.main.id
  subnet_ids  = data.aws_subnets.private.ids
}
```

The environment looks up what already exists (the VPC, the private subnets) in `data.tf`, builds names from `local.tf`, and hands them to the composition. It's also the only place a provider and a backend are configured, so it's the only place that decides which account and which state file a change goes to.

This fits inside the layering from Module 01. Each layer of an environment, such as `03-data`, is its own root module, and it calls one or more compositions. The three-layer module standard decides how the *code* is organized; the numbered layers decide how the *state* is split.

## Symmetry · Every environment has the same shape

All environments call the **same composition, at the same version**, built from the **same base modules**. The only things allowed to differ are:

- the values in `terraform.tfvars`: sizing, naming, account and region details;
- the backend `bucket` and `key`, so every environment has its own state;
- the account the provider assumes a role into.

If `dev` and `prod` are the same shape, a change that plans cleanly in `dev` is a reliable preview of what it will do in `prod`. As soon as one environment grows a resource the others don't have, that preview stops being trustworthy.

Sometimes an environment genuinely needs a different shape, not just different values. That's an architectural decision: record it as an ADR in that environment's `docs/adr/` (Module 10), rather than letting the code quietly diverge.

## Workflow · Adding a new component

1. Create `modules/base/<component>/` with `main.tf`, `variables.tf`, `outputs.tf`, and `README.md`.
2. Put it through the promotion gate on its own, before anything references it (Module 11).
3. Call it from the composition: add the `module` block, add any IAM or networking it needs, and expose new outputs.
4. If the environment has new inputs to supply, add them to its `variables.tf` and `terraform.tfvars`.
5. Document the module's purpose, inputs, and outputs in its `README.md`.

### Implementation notes

- **Use relative paths between modules in the same repository.** `source = "../../base/s3"` means a module and its callers change in the same commit and are reviewed together. Modules shared *across* repositories still need a pinned `?ref=` tag, as Module 01 explains.
- **If two compositions need the same wiring, that's a signal, not a reason to merge them.** Extract the shared IAM pattern into a base module that takes ARNs as inputs.
- **Resist one composition per resource.** A composition earns its place by joining several base modules. A composition wrapping a single base module is just an extra layer to read.

## Recap · Key terms

- **Base module:** builds one component; calls no other module and configures no provider.
- **Composition module:** calls several base modules and owns the IAM and networking that join them.
- **Environment:** the root module that configures provider and backend, sets values, and calls a composition.
- **Environment symmetry:** every environment has the same shape and differs only in values, backend, and target account.
- **Joining code:** the IAM roles, policies, and networking that let separate components work together.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: Where does the IAM role that lets the Glue job read the S3 bucket belong?
- In the base S3 module, as a bucket policy
- In the base Glue ETL module
* In the composition module's `iam.tf`
- In the environment's `main.tf`
= The role joins two components, so it's joining code. The composition owns it; neither base module knows the other exists.
Q: Which of these is a base module allowed to contain?
- A `provider "aws"` block with a region
- A `module` block calling the KMS base module
* A `required_providers` block stating which provider versions it accepts
- A default value of `"prod"` for the environment name
= A base module may say which providers it needs, but only an environment configures one. It never calls other modules or assumes an environment.
Q: Under environment symmetry, what may differ between `dev` and `prod`?
- The composition version each one calls
* The values in `terraform.tfvars`, the backend key, and the target account
- Which base modules the composition includes
- Nothing at all
= Same shape, different values. Each environment needs its own state and account, but the modules and their versions stay identical.
S: A colleague adds `if var.environment == "prod"` inside `modules/base/s3` to turn on replication only in production. What should you suggest instead?
- Leave it; that's what base modules are for
- Move the bucket into the environment folder
* Add a `replication_enabled` input and set it from each environment's values
- Create a separate `s3-prod` base module
= Base modules don't know about environments. Turn the difference into an input, and let each environment's `terraform.tfvars` decide.
S: The data team needs a nightly export job in `nonprod` only, so someone adds the job resource straight into `environments/nonprod/main.tf`. What's the problem?
- None; environments are allowed to declare resources
* The environments no longer have the same shape, so `nonprod` stops predicting `prod`, and the change isn't recorded as a decision
- The job will be created in every environment
- Terraform can't plan resources in an environment folder
= Divergence should be deliberate and visible. Put the job in a base module behind an input, or record why `nonprod` differs in an ADR.
```
