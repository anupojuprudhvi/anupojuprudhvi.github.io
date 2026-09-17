---
title: Enterprise Repository & Module Layout
track: terraform
order: 1
module: 1
totalModules: 6
summary: The canonical enterprise pattern for structuring Terraform codebases — separating reusable child modules from root deployment environments and establishing strict version pinning.
level: Core Architecture
readingTime: 8 min read
stack: [Terraform, HCL, AWS]
tags: [architecture, module-design, repo-structure, best-practices]
---

## Principle · The two types of Terraform modules

In enterprise environments, confusing a **reusable child module** with a **root deployment module** is the primary reason codebases become unmaintainable spaghetti.

A clean architecture enforces strict boundaries between these two concerns:

- **Child Modules (The Building Blocks):** Pure, parameterized blueprints. They do not declare backends, do not hardcode account IDs, and do not reference specific environments. They are published and versioned like software libraries.
- **Root Modules (The Deployments):** Concrete instantiations. They define the S3/DynamoDB remote state backend, provider configurations with credentials/regions, instantiate child modules, and pass environment-specific `.tfvars`.

## Structure · The canonical directory layout

For enterprise AWS delivery, organize your Terraform repositories into clear layers of responsibility:

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
    │   ├── 00-bootstrap/            # S3 state bucket, DynamoDB lock table, KMS CMKs
    │   │   ├── backend.tf           # (Local backend during first run, then migrated)
    │   │   └── main.tf
    │   ├── 01-networking/           # Foundation: VPC, Transit Gateway, Route 53
    │   │   ├── backend.tf           # S3 + DynamoDB state lock configuration
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
      <th style="width: 18%;">Layer</th>
      <th style="width: 32%;">Responsibility &amp; Components</th>
      <th style="width: 20%;">Volatility</th>
      <th style="width: 30%;">Blast Radius &amp; Team Ownership</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="gnum">00-bootstrap</td>
      <td>S3 state bucket, DynamoDB lock table, KMS CMKs</td>
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

### Three architectural guarantees of environment layering:

- **State File & Lock Isolation:** Running `terraform apply` in `04-compute` locks *only* the compute state file. Database and networking states remain 100% unlocked and completely immune to accidental modifications.
- **Role-Based Access Control (RBAC):** In your CI/CD pipeline (e.g. GitHub Actions with AWS OIDC), application teams only assume an IAM role scoped to execute in `04-compute`. They physically cannot destroy `01-networking` or `03-data`.
- **Fast Plans (< 30 seconds):** Because each layer contains 20-40 resources instead of 500+, `terraform plan` executes in seconds instead of timing out.

### Key rules for the standard module layout

- **Always include `versions.tf` in every module:** Pin the minimum compatible Terraform CLI and provider versions.
- **Always output resource IDs and ARNs:** A module that creates an S3 bucket or IAM role must output both `.id` and `.arn` so downstream modules can bind policies without querying data sources.
- **One primary job per module:** A module should represent a single logical system boundary (e.g. `vpc`, `aurora-cluster`, `eks-cluster`), not an entire datacenter in one file.

## Versioning · Strict root pinning vs optimistic module constraints

A subtle but critical rule in enterprise Terraform is how version constraints are declared:

### 1. In Reusable Child Modules: Use pessimistic operators (`~>`)
Child modules should allow safe backward-compatible minor updates:

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

### 2. In Production Root Deployments: Strictly pin exact versions (`=`)
Production plans must be **100% deterministic**. If a provider releases a breaking change at 2 AM, your CI pipeline must not break unexpectedly:

<pre><code># environments/prod/01-networking/versions.tf
terraform {
  required_version = "= 1.8.5"

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
- **Why it fails:** A single typo in an IAM policy risks destroying or re-planning the database. `terraform plan` takes 15 minutes to run across hundreds of resources.
- **Production Solution:** Split state boundaries into isolated layers (`01-networking`, `02-security`, `03-data`, `04-apps`).

### Anti-Pattern 2: Hardcoding Environment Logic Inside Modules
Writing `if var.env == "prod"` inside a reusable module.
- **Why it fails:** Child modules should be agnostic to environments.
- **Production Solution:** Pass feature flags or resource specifications as variables (e.g., `retention_in_days = var.log_retention_days`).

### Anti-Pattern 3: Unpinned Modules in Git
Referencing modules using `source = "git::https://github.com/.../my-module.git"` without a tag or commit ref.
- **Why it fails:** Any push to `main` in the module repo immediately changes future plans in production.
- **Production Solution:** Always pin releases with `?ref=v1.4.2` or a Git commit SHA.
