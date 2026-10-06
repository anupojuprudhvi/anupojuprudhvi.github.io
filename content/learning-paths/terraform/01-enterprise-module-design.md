---
title: Enterprise Repository & Module Layout
date: 2026-09-17
updated: 2026-10-01
track: terraform
order: 1
module: 1
summary: How to lay out a Terraform codebase for a team: reusable child modules kept apart from the root deployments that use them, state split into layers, and versions pinned so plans don't change by surprise.
level: Core Architecture
readingTime: 8 min read
stack: [Terraform, HCL, AWS]
tags: [architecture, module-design, repo-structure, best-practices]
---

## Principle · The two types of Terraform modules

Mixing up a **reusable child module** and a **root deployment module** is one of the most common reasons a Terraform codebase becomes hard to maintain.

Keep the two apart:

- **Child modules (the building blocks):** reusable blueprints driven by inputs. They don't declare a backend, hardcode account IDs, or mention a specific environment. They're versioned and released like software libraries.
- **Root modules (the deployments):** the real environments. They set the S3 state backend and the provider (account, region, credentials), call the child modules, and pass in environment-specific values from `.tfvars`.

<div class="callout"><b>Going further.</b> As a codebase grows, child modules split again: <b>base modules</b> that build one component, and <b>composition modules</b> that join them with IAM and networking. Part 2 of this track, starting at <a href="07-base-composition-and-environment-modules.html">Module 07</a>, takes that standard from design to production.</div>

## Structure · The canonical directory layout

Organize the repository into clear layers of responsibility:

<pre><code>terraform-root/
├── modules/                         # Reusable child modules (pure blueprints, versioned)
│   ├── vpc/
│   │   ├── main.tf                  # VPC, subnets, route tables, flow logs
│   │   ├── variables.tf             # Inputs with validation & type constraints
│   │   ├── outputs.tf               # Exports VPC ID, subnet IDs, CIDR blocks
│   │   ├── versions.tf              # Min provider/core constraints (~> 5.0)
│   │   └── README.md                # Generated documentation with inputs/outputs
│   ├── aurora-postgresql/
│   └── eks-cluster/
│
└── environments/                    # Root execution environments (where state lives)
    ├── prod/
    │   ├── 00-bootstrap/            # S3 state bucket and KMS keys
    │   │   ├── backend.tf           # (Local backend during first run, then migrated)
    │   │   └── main.tf
    │   ├── 01-networking/           # Foundation: VPC, Transit Gateway, Route 53
    │   │   ├── backend.tf           # S3 backend with native locking (use_lockfile)
    │   │   ├── main.tf              # Calls modules/vpc with prod parameters
    │   │   ├── providers.tf         # Provider with exact version pin
    │   │   ├── terraform.tfvars     # Prod CIDRs, tags, AZs
    │   │   ├── variables.tf
    │   │   └── outputs.tf           # Writes IDs to AWS SSM Parameter Store
    │   ├── 02-security/             # Organization IAM roles, GuardDuty, Security Hub
    │   │   ├── backend.tf
    │   │   └── main.tf
    │   ├── 03-data/                 # Aurora DB, DynamoDB tables, S3 lakes, EFS
    │   │   ├── backend.tf
    │   │   └── main.tf
    │   └── 04-compute/              # EKS clusters, Node Groups, ALB, ECS services
    │       ├── backend.tf
    │       └── main.tf
    │
    └── nonprod/                     # Parity with prod; identical 5-layer topology
        ├── 00-bootstrap/
        ├── 01-networking/
        ├── 02-security/
        ├── 03-data/
        └── 04-compute/</code></pre>

### The 5-Layer Enterprise Slicing Standard

Why slice environments into numbered layers instead of one monolithic deployment?

<div class="table-scroll" role="region" aria-label="5-Layer Enterprise Slicing Standard" tabindex="0">
<table class="gtable">
  <thead>
    <tr>
      <th class="w-18">Layer</th>
      <th class="w-32">Responsibility &amp; Components</th>
      <th class="w-20">Volatility</th>
      <th class="w-30">Blast Radius &amp; Team Ownership</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="gnum">00-bootstrap</td>
      <td>S3 state bucket and KMS keys</td>
      <td><strong>Once</strong> (Creation only)</td>
      <td>Highest — Platform Admin / Security Lead</td>
    </tr>
    <tr>
      <td class="gnum">01-networking</td>
      <td>VPCs, Subnets, Transit Gateway, Route 53 Resolver</td>
      <td><strong>Quarterly</strong> (Slow moving)</td>
      <td>High — Network &amp; Foundation Platform Team</td>
    </tr>
    <tr>
      <td class="gnum">02-security</td>
      <td>Base IAM roles, GuardDuty, Security Hub, KMS keys</td>
      <td><strong>Monthly</strong> (Compliance)</td>
      <td>High — SecOps &amp; Platform Team</td>
    </tr>
    <tr>
      <td class="gnum">03-data</td>
      <td>Aurora PostgreSQL, DynamoDB, S3 lakes, ElastiCache</td>
      <td><strong>Monthly</strong> (Planned maintenance)</td>
      <td>Extreme — Database &amp; Platform Storage Team</td>
    </tr>
    <tr>
      <td class="gnum">04-compute</td>
      <td>EKS clusters, node groups, ALBs, ECS tasks, Lambdas</td>
      <td><strong>Daily / Weekly</strong> (Fast moving)</td>
      <td>Contained — Application &amp; DevOps Teams</td>
    </tr>
  </tbody>
</table>
</div>

### What layering gives you

- **Separate state and locks:** running `terraform apply` in `04-compute` locks only the compute state. The database and networking states aren't touched, so a compute change can't accidentally modify them.
- **Separate permissions:** in CI/CD (for example GitHub Actions with AWS OIDC), application teams assume an IAM role scoped to `04-compute` only. That role can't change `01-networking` or `03-data`.
- **Faster plans:** each layer holds tens of resources instead of hundreds, so `terraform plan` finishes much faster.

### Key rules for the standard module layout

- **Always include `versions.tf` in every module:** Pin the minimum compatible Terraform CLI and provider versions.
- **Always output resource IDs and ARNs:** A module that creates an S3 bucket or IAM role must output both `.id` and `.arn` so downstream modules can bind policies without querying data sources.
- **One primary job per module:** A module should represent a single logical system boundary (e.g. `vpc`, `aurora-cluster`, `eks-cluster`), not an entire datacenter in one file.

## Versioning · Exact pins in roots, ranges in modules

Where you declare a version matters as much as which version you pick:

### 1. In child modules: allow a range with `~>`
The pessimistic constraint operator `~>` lets a module accept compatible minor updates, so it works in more places:

<pre><code># modules/vpc/versions.tf
terraform {
  required_version = ">= 1.5.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30" # Accepts 5.30.x and 5.99.x, but rejects 6.0.0
    }
  }
}</code></pre>

### 2. In production roots: pin exact versions with `=`
A production plan should give the same result every time. If a provider release changes behaviour overnight, your pipeline shouldn't pick it up by surprise:

<pre><code># environments/prod/01-networking/versions.tf
terraform {
  required_version = "= 1.11.4" # 1.11+: native S3 state locking is generally available

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "= 5.48.0" # Strictly pinned for reproducible plans
    }
  }
}</code></pre>

## Failure Modes · Anti-patterns to avoid

### Anti-Pattern 1: The "Monolithic State Monster"
Putting VPC networking, Aurora clusters, IAM roles, and EKS deployments in a single `main.tf` file.
- **Why it fails:** one typo in an IAM policy can put the database in the same plan, and `terraform plan` gets slow across hundreds of resources.
- **Fix:** split state into separate layers (`01-networking`, `02-security`, `03-data`, `04-compute`).

### Anti-Pattern 2: Hardcoding Environment Logic Inside Modules
Writing `if var.env == "prod"` inside a reusable module.
- **Why it fails:** the module now only works for the environments it knows about, and every new environment means editing the module.
- **Fix:** pass the setting in as a variable instead (for example `retention_in_days = var.log_retention_days`).

### Anti-Pattern 3: Unpinned Modules in Git
Referencing modules using `source = "git::https://github.com/.../my-module.git"` without a tag or commit ref.
- **Why it fails:** Any push to `main` in the module repo immediately changes future plans in production.
- **Fix:** always pin to a release tag such as `?ref=v1.4.2`, or a commit SHA.
