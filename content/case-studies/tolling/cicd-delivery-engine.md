---
title: A reusable CI/CD engine with safe-by-default infrastructure delivery
nav: Build the delivery engine
label: CI/CD architecture
heading: How Terraform changes move from pull request to environment
project: tolling
layer: Foundation
order: 50
stack: [GitHub Actions, Terraform, AWS IAM OIDC, AWS STS, GitHub Environments]
tags: [cicd, github-actions, terraform, oidc, security, deployment, governance]
summary: Bootstrapping AWS OIDC roles once with SSO, then using one reusable GitHub Actions engine for speculative plans and explicitly gated, single-environment Terraform deployments.
problem: |
  A multi-account Terraform platform needs more than a workflow that runs
  `terraform apply`. The delivery path must authenticate without long-lived AWS
  keys, show the impact of a pull request before merge, keep one service from
  touching another service's state, and make a production change deliberate.

  There is also a dependency that is easy to miss: GitHub Actions cannot assume
  an OIDC role that does not exist yet. The CI/CD identity boundary therefore has
  to be bootstrapped locally with an administrator's AWS SSO session before the
  hosted pipeline can deploy anything.
solution: |
  I separated the system into a one-time identity bootstrap and a reusable
  delivery engine. The `00-foundation/cicd-oidc/` Terraform roots create the
  GitHub OIDC provider plus dedicated plan and apply roles in each target
  account. Once those roles exist, GitHub Actions exchanges its short-lived OIDC
  token for temporary AWS credentials through STS.

  A single central workflow engine owns authentication, provider handling,
  Terraform initialization, plan formatting, summaries, and safety gates.
  Small service caller workflows provide only the module path, state key,
  target account mapping, and environment list. Pull requests use read-only
  speculative plans; deployments are manually dispatched one module and one
  environment at a time.
flowLabel: Delivery path, pull request to controlled apply
flow:
  - step: Terraform change and pull request
    note: A change is reviewed in its source module. The caller workflow identifies the module and the environments whose impact must be inspected.
  - step: Speculative plan
    note: GitHub Actions assumes the plan role through OIDC and runs read-only Terraform plans, including parallel environment checks where configured. The result is summarized in the workflow and posted to the pull request for review.
  - step: Merge to the deployment branch
    note: Merging records the reviewed source change, but does not automatically apply infrastructure. Promotion remains an operator decision rather than an implicit side effect of merging.
  - step: Manual workflow dispatch
    note: An operator selects one service and one target environment. The workflow defaults to plan-only mode, so an ordinary or mistaken click produces a dry run rather than a write.
  - step: Confirmation and environment gate
    note: A live apply requires disabling plan-only mode, typing the exact environment name, and passing the configured GitHub Environment restrictions and any reviewer approval.
  - step: Deterministic Terraform apply
    note: Terraform writes a saved binary plan and applies that exact plan only after the earlier checks pass. AWS CloudTrail and GitHub Actions retain the execution history.
outcomes:
  - value: One
    label: Central workflow engine maintained for all service callers
  - value: Under 2 minutes
    label: Time to onboard a Terraform module with a small caller workflow
  - value: Zero
    label: Long-lived AWS access keys required by the hosted pipeline
---

## Why this way · Bootstrap the identity before automating delivery

The first deployment cannot be performed by the pipeline itself. The GitHub
Actions runner needs an AWS IAM OIDC provider and a trusted role before it can
obtain credentials, so those resources are applied once from an administrator's
workstation using AWS SSO. This is a deliberate bootstrap boundary, not a gap in
automation.

After the bootstrap, the same `THEA-cicd-plan` and `THEA-cicd-apply` role pattern
can be reused by service workflows in the accounts they target. The plan role is
read-only, while the apply role is reserved for the explicitly gated deployment
path. Short-lived STS credentials replace static access keys and reduce the
rotation and exposure problem of storing cloud credentials in CI secrets.

## The reusable workflow pattern

The delivery system has three layers:

1. **Router:** one operator-facing workflow exposes the service, environment,
   and plan-only inputs instead of filling the Actions sidebar with bespoke
   deployment interfaces.
2. **Caller workflows:** small service-specific templates declare the Terraform
   directory, state key, environment catalog, and any build hook required by the
   module. A new module inherits the central controls instead of copying a large
   YAML file.
3. **Central engine:** one reusable workflow owns OIDC authentication, provider
   profile overrides, Terraform caching, formatting, locking behavior, plan
   output, PR comments, summaries, and apply conditions.

This keeps the module boundary visible in every run. A deployment for an API
module targets that module's state and selected environment; it is not a
monolithic apply across networking, databases, and applications.

## Safety is a job-graph property

The important controls are layered rather than dependent on an operator
remembering a command-line convention:

- Pull-request jobs have no apply step and use the read-only plan role.
- Manual deployments default to `plan_only: true`.
- A live apply requires the exact target environment name as a confirmation
  string, so an environment mismatch fails before Terraform runs.
- GitHub Environments restrict deployment promotion and can require reviewers.
- The workflow creates a detailed Terraform plan and applies that saved binary
  plan, rather than calculating a different change between review and apply.
- The apply job is conditionally skipped unless the required checks and inputs
  all pass.

The result is not “CI/CD makes production impossible to change.” It is a more
useful boundary: production changes remain possible, but the unsafe path is
harder than the reviewed and auditable path.

### Implementation notes

- **Bootstrap first:** apply `00-foundation/cicd-oidc/` locally with AWS SSO for
  each account before adding that environment to a service workflow. Otherwise
  OIDC authentication fails because the trusted role does not exist.
- **Promote one commit:** test the same commit in development, then promote it
  to staging and production rather than rebuilding different branch contents at
  each environment.
- **Keep state isolated:** each caller supplies its own module path and state
  key. The workflow's convenience must not become permission to touch unrelated
  Terraform state.
- **Handle clean runners:** modules that need generated artifacts, such as an
  ARM64 Lambda package, build those artifacts in a prebuild hook before
  Terraform plans the change.
- **Keep full logs available:** large plans can exceed pull-request comment
  limits, so summaries should be concise while the Actions run remains the
  source for the complete execution output.

## What it enables

The platform team can add delivery to another Terraform module by declaring its
module-specific inputs in a small caller workflow. Authentication hardening,
Terraform upgrades, plan presentation, and deployment gates remain centralized.
That gives engineers a repeatable promotion path across the account hierarchy
without turning every service team into a CI/CD platform maintainer.