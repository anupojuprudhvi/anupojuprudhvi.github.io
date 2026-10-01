---
title: Container Delivery — Build, Tag, Push, Promote
date: 2026-09-18
updated: 2026-10-01
track: kubernetes-operations
order: 15
module: 15
summary: Build an image once and promote that exact image to each environment, using immutable tags and digests, plus the registry login detail that only breaks once a pipeline, not a person, runs the command.
level: Production · Delivery
readingTime: 8 min read
stack: [Amazon ECR, Docker, Amazon EKS, CI/CD]
tags: [ecr, ci-cd, container-delivery, eks]
redirectFrom: [container-delivery-to-eks, 03-container-delivery-to-eks]
related: [healthcare/ci-cd-delivery-pipeline-for-regulated-healthcare]
---

**Before you start:** you'll want Docker, the AWS CLI v2, an ECR repository, and a CI/CD system that can assume an AWS role.

## Principle · Build once, then promote the same image

Building an image is the easy part. What matters in operation is being able to say exactly which image is running in which environment, and moving *that same image* forward instead of rebuilding it for each environment. Rebuilding from the same commit usually gives you the same thing, but "usually" isn't a guarantee: a base image or dependency can change in between.

### How the original deployment tagged images

The deployment this track is based on put the environment and a build number in the tag, for example `qa1.0.42`, then retagged the image for production (`prod1.0.10`). It was readable at a glance and it kept the rule that the image isn't rebuilt. But the tag says nothing about what's *inside* the image, and a tag can be moved to point at a different image later.

### A sturdier approach: immutable tags and digests

- **Tag each build with something that never changes**, such as the git commit SHA (`sha-3f9c2e1`).
- **Turn on tag immutability in ECR**, so a tag, once pushed, can never be overwritten.
- **Deploy by digest.** Every image has a content hash (`sha256:...`). A manifest that references the digest will always run exactly that image, whatever happens to tags.

```text
# Build and push once, tagged with the commit
docker build -t <registry>/my-service:sha-3f9c2e1 .
docker push <registry>/my-service:sha-3f9c2e1

# Make tags permanent for this repository (one-time setup)
aws ecr put-image-tag-mutability --repository-name my-service \
  --image-tag-mutability IMMUTABLE

# Look up the image's digest
aws ecr describe-images --repository-name my-service \
  --image-ids imageTag=sha-3f9c2e1 --query 'imageDetails[0].imageDigest'
```

```yaml
# Promotion means changing this one line in each environment, never rebuilding
containers:
  - name: my-service
    image: <registry>/my-service@sha256:<digest>
```

```flow
title: One image, built once, promoted through every environment
CI pipeline | builds from commit 3f9c2e1, runs the tests, pushes once
-> push my-service:sha-3f9c2e1 (tags can't be overwritten)
* Amazon ECR | one image, identified by its digest sha256:9b1e...
-> each environment's manifest points at that same digest
paths
path: Dev
Dev cluster | deployed automatically on merge
path: QA
QA cluster | tested here
path: Production
Production cluster | a reviewed one-line change to the same digest; nothing is rebuilt
end
```

Promoting to Production is then a small, reviewable change that points Production at the digest QA already tested. You can still add a friendly tag such as `prod-2026-09-28` for people to read, but the digest is what guarantees the match.

## The gotcha · Registry login breaks in headless CI/CD

`docker login` normally asks for a password at the terminal. That's invisible when you try the command by hand, because it just works. Then the same step runs in a CI/CD job, where there's no terminal to type into, and it fails with:

```text
Error: Cannot perform an interactive login from a non-TTY device
```

### Fix

```text
# Prompts for a password, so it fails in a headless CI/CD job:
docker login --username AWS <registry>

# Headless-safe: pipe a short-lived token in through stdin
aws ecr get-login-password --region <region> \
  | docker login --username AWS --password-stdin <registry>
```

The fix passes a temporary token through standard input instead of a prompt, which is exactly what a job with no terminal needs. (Older scripts may use `aws ecr get-login`, which only existed in AWS CLI v1 and was removed in v2; replace it with the command above.) This kind of bug is worth calling out because it never shows up in local testing. It only appears once the pipeline runs for real, which is usually later than you'd like.

### Implementation notes

- **Test registry login in a real headless job, not just locally.** A command that works in your shell isn't proof it works in CI. Run it in the same kind of non-interactive runner the pipeline uses.
- **Registry tokens are short-lived.** A token from `aws ecr get-login-password` lasts 12 hours. A long pipeline that logs in at the start and pushes much later can fail with an expired token that doesn't look like a login problem at first.
- **Being in the registry isn't the same as being pullable.** A cluster in a different network path, or without permission to that repository, can fail to pull an image that pushed perfectly well. Check the pull from the target environment.
