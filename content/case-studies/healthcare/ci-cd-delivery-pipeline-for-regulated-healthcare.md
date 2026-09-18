---
title: CI/CD delivery pipeline for a regulated healthcare platform
nav: Regulated CI/CD delivery
summary: A GitFlow-to-Kubernetes pipeline with per-branch promotion gates, headless registry authentication, and deployment lead time cut from hours to minutes.
project: healthcare
layer: Delivery engineering
order: 40
stack: [Jenkins, Bitbucket, AWS ECR, Amazon EKS]
tags: [ci-cd, devops, jenkins, delivery-engineering]
problem: |
  Every microservice needed a repeatable path from a developer's commit to a running container in
  the right environment, with enough process around it to satisfy change control for a HIPAA
  platform — without that process turning into a manual runbook that only one or two engineers
  knew how to execute correctly under pressure.
solution: |
  A GitFlow branching model where the branch itself determines the target environment, driving
  Jenkins declarative pipelines that compile, test, containerize, and promote each service through
  Development, QA, Staging, and Production with an explicit approval gate before anything reaches
  a live clinical environment.
heroTitle: The branch is the deployment target, not a separate decision
intro: A delivery pipeline for a regulated platform has to be both fast enough that engineers actually use it, and structured enough that a release manager can point to exactly what approval gate a given deployment passed through. This case study covers the branch-to-environment pipeline built to do both, and a specific automation gotcha that had to be solved to make it work headlessly.
role: CI/CD & delivery engineering
scope: Multi-service Jenkins pipeline design and branch promotion policy
closingText: I'm happy to go deeper on the pipeline structure, the promotion policy, or the headless registry-authentication fix below.
outcomes:
  - value: 4hrs → <5min
    label: Deployment lead time, from commit-ready build to running in the target environment
  - value: 5
    label: Independently deployable services on the same pipeline pattern
  - value: 4
    label: Promotion gates from a feature branch to a live production deployment
scaffold: false
---

## Problem · A manual release process doesn't scale, and doesn't survive an audit

Before automation, shipping a change meant an engineer manually building the application, constructing a container image by hand, authenticating to the registry, and applying Kubernetes manifests directly against a cluster — a process that worked, but depended entirely on whichever engineer was doing it that day getting every step right, in order, under time pressure. For a HIPAA platform, that's also a weak position for change control: there's no consistent, enforced record of what was tested and approved before it reached production.

## Architecture · The branch determines the environment, the pipeline does the rest

| Branch | Target environment | Promotion trigger |
| :--- | :--- | :--- |
| `feature/*` | Local / dev sandbox | Developer commit, automated test suite |
| `develop` | Development cluster | Pull request merge, peer review |
| `qa` | QA cluster | Merge to QA branch, automated regression suite |
| `staging` | Staging (pre-production) | Release-manager approval |
| `live` | Production | Change-control sign-off, rolling update |

A commit's branch is the only input the pipeline needs to know where it's headed — there's no separate deployment ticket or manual environment selection, which removes an entire class of "deployed to the wrong environment" mistakes.

### Implementation notes

- **Every stage of the pipeline is declarative, not a loose collection of scripts.** Build, automated test, containerize, sync configuration, authenticate, push, and deploy are explicit named stages in one Jenkins pipeline definition per service, so a failure is immediately attributable to a specific stage rather than "the deploy script broke somewhere."
- **Environment-specific configuration is pulled at build time, not baked into the image.** Each pipeline run syncs the target environment's configuration from a dedicated bucket immediately before building the container, so the same pipeline definition produces environment-correct artifacts without maintaining separate images per environment.
- **Image tags encode the environment and build number**, so a specific artifact — `qa1.0.42`, for example — can be traced back to exactly which pipeline run produced it and promoted forward without rebuilding.

## Production gotcha · Headless container-registry authentication

Jenkins agents run as headless, non-interactive processes, and the registry's standard login flow expected an interactive terminal — every pipeline run failed at the authentication stage with a "cannot perform an interactive login from a non-TTY device" error.

### Fix

```text
# What failed (interactive-only):
docker login -u AWS -p $(aws ecr get-login) <registry>

# What works headlessly:
aws ecr get-login-password --region <region> \
  | docker login --username AWS --password-stdin <registry>
```

Piping the temporary authentication token directly into `docker login` over standard input avoids the interactive prompt entirely, letting a headless CI runner authenticate the same way a human would at a terminal — just without a terminal. This is a small, easy-to-miss detail that breaks registry authentication specifically in automated pipelines while working fine when tested by hand, which is exactly why it surfaced only after the pipeline was wired up end-to-end.

### Result

Replacing the manual build-and-deploy process with this pipeline took deployment lead time — from a commit ready to ship, to that change running in its target environment — from roughly four hours down to under five minutes, while adding more approval structure to the path to production, not less.
