---
title: Container Delivery — Build, Tag, Push, Promote
track: kubernetes-operations
order: 3
module: 3
totalModules: 4
summary: A registry-to-cluster promotion workflow for EKS, and the one headless-authentication detail that only breaks once a human isn't the one typing the command.
level: Delivery
readingTime: 7 min read
stack: [AWS ECR, Docker, Amazon EKS, CI/CD]
tags: [ecr, ci-cd, container-delivery, eks]
---

## Workflow · A consistent tag format is what makes promotion safe

Building an image is the easy part; the part that actually matters operationally is having a tagging convention that makes it unambiguous which exact artifact is running in which environment, and lets that same artifact be promoted forward without rebuilding it.

A simple, effective convention is `<environment><major>.<minor>.<build-number>` — for example `qa1.0.42` — so the tag itself tells you the environment it was built for and the build that produced it, without needing to cross-reference a separate build log.

```text
# 1. Build the image locally
docker build -t my-service:latest .

# 2. Tag it for the target environment
docker tag my-service:latest <registry>/my-service:qa1.0.42

# 3. Push to the registry
docker push <registry>/my-service:qa1.0.42

# 4. Promote the *same* artifact forward — retag, don't rebuild
docker tag <registry>/my-service:qa1.0.42 <registry>/my-service:prod1.0.10
docker push <registry>/my-service:prod1.0.10
```

Retagging rather than rebuilding for promotion matters more than it looks: it guarantees the artifact that passed QA is bit-for-bit the same one that reaches Production, instead of trusting that rebuilding from the same commit produces an identical image.

## The gotcha · Registry login fails specifically in headless CI/CD

A container registry's standard login flow is built around an interactive terminal session. That's invisible when you're testing the command by hand — it works fine — right up until the same command runs inside a headless CI/CD agent, where it fails with something like:

```text
Error: Cannot perform an interactive login from a non-TTY device
```

### Fix

```text
# Interactive-only — breaks in a headless CI/CD runner:
docker login -u AWS -p $(aws ecr get-login) <registry>

# Headless-safe — pipes the token via stdin instead:
aws ecr get-login-password --region <region> \
  | docker login --username AWS --password-stdin <registry>
```

The fix consumes a temporary authentication token through standard input rather than an interactive prompt, which is exactly what a non-interactive CI agent needs — no pseudo-terminal required. The reason this is worth calling out specifically: it's a class of bug that's invisible in local testing and only surfaces once the pipeline is actually wired up end-to-end in its real, headless environment, which is often later than you'd like to discover it.

### Implementation notes

- **Test registry authentication changes in an actual headless context, not just locally.** A command that works in an interactive shell isn't proof it works in CI — run it inside the same kind of non-interactive agent the real pipeline uses before trusting it.
- **Registry tokens are short-lived by design.** `aws ecr get-login-password` returns a token valid for a fixed window (12 hours for ECR); a long-running pipeline stage that authenticates once at the start and pushes much later can hit an expired-token failure that looks unrelated to authentication at first glance.
- **Rolling updates depend on the image actually being pullable from the target environment's network path**, not just present in the registry — a private registry with restrictive network policy can push successfully while a cluster in a different network path still fails to pull.
