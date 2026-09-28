---
title: GitOps with Argo CD: Git as the Source of Truth
date: 2026-09-28
track: kubernetes-operations
order: 9
module: 9
totalModules: 10
summary: Letting Argo CD keep each cluster matching what's in Git, so a deploy is a reviewed pull request, drift gets fixed automatically, and rolling back means reverting a commit.
level: Delivery
readingTime: 8 min read
stack: [Amazon EKS, Argo CD, Helm, Kustomize, GitHub]
tags: [gitops, argo-cd, ci-cd, delivery, eks]
---

**Before you start:** this builds on module 3. There, CI built and pushed an image. Here, a separate process decides what actually runs in each cluster.

## Principle · The cluster should match Git, and nothing else

In a push-based pipeline, CI runs `kubectl apply` or `helm upgrade` against the cluster. That works, but the pipeline needs admin-level access to every cluster, and anything changed by hand in the cluster stays changed until someone notices.

GitOps flips it around. A controller *inside* the cluster (here, Argo CD) watches a Git repository and keeps the cluster matching it. If someone edits a deployment by hand, Argo CD puts it back. A deploy becomes a pull request, and the Git history is the deploy history.

## Setting up an application

An Argo CD `Application` says which part of which repository should be running where:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: orders-api-prod
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/<org>/<manifests-repo>.git
    targetRevision: main
    path: apps/orders-api/overlays/prod
  destination:
    server: https://kubernetes.default.svc
    namespace: orders
  syncPolicy:
    automated:
      prune: true      # remove resources that were deleted from Git
      selfHeal: true   # undo changes made directly in the cluster
    syncOptions:
      - CreateNamespace=true
```

`selfHeal` is what turns "Git is the source of truth" from a policy into something enforced. `prune` makes deleting a file from Git actually remove the resource from the cluster.

## How a deploy flows

1. CI builds and pushes the image, as in module 3, and records its digest.
2. CI (or a person) opens a pull request in the manifests repository that changes the image digest for one environment.
3. The pull request is reviewed and merged. For Production, this is where approval happens.
4. Argo CD notices the change and syncs the cluster to match.
5. To roll back, revert the commit. Argo CD syncs the cluster back to the previous version.

Keeping application code and deployment manifests in separate repositories is common. It lets you give "who can change what's running in Production" to a smaller group than "who can change the code".

### Structuring many environments and apps

- **One folder per environment**, using Kustomize overlays or per-environment Helm values, so the difference between QA and Production is a small, readable diff.
- **The "app of apps" pattern** (or an `ApplicationSet`) lets one Argo CD application create the rest, so adding a service or a cluster is also just a pull request.
- **Argo CD Projects** limit which repositories and namespaces each team's applications can use.

### Implementation notes

- **Keep secrets out of the manifests repo.** Use the External Secrets Operator from module 7, so Git holds only a reference to each secret.
- **Turn on self-heal gradually.** Start with automated sync and no self-heal while teams get used to it, then enable it once nobody relies on hand edits.
- **Watch for sync failures.** An application stuck "OutOfSync" or "Degraded" is an alert worth sending, as covered in module 8.
- **Protect Argo CD itself.** It can change everything in the cluster. Restrict who can use its UI and API, sign in through SSO, and keep its own configuration in Git as well.
