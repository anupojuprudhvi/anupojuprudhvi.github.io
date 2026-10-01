---
title: GitOps with Argo CD: Git as the Source of Truth
date: 2026-09-28
updated: 2026-10-01
track: kubernetes-operations
order: 16
module: 16
summary: Letting Argo CD keep each cluster matching what's in Git, so a deploy is a reviewed pull request, drift gets fixed automatically, and rolling back means reverting a commit.
level: Production · Delivery
readingTime: 10 min read
stack: [Amazon EKS, Argo CD, Helm, Kustomize, GitHub]
tags: [gitops, argo-cd, ci-cd, delivery, eks]
redirectFrom: [gitops-with-argo-cd, 09-gitops-with-argo-cd]
related: [healthcare/ci-cd-delivery-pipeline-for-regulated-healthcare, tolling/cicd-delivery-engine]
---

**In this module, you'll learn to:**

- Explain how GitOps differs from a pipeline that runs `kubectl apply`
- Define an Argo CD Application with automated sync, prune, and self-heal
- Deploy and roll back through pull requests, across many environments

**Before you start:** this builds on [Container Delivery](15-container-delivery-to-eks.html). There, CI built and pushed an image. Here, a separate process decides what actually runs in each cluster.

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

1. CI builds and pushes the image, as in [Container Delivery](15-container-delivery-to-eks.html), and records its digest.
2. CI (or a person) opens a pull request in the manifests repository that changes the image digest for one environment.
3. The pull request is reviewed and merged. For Production, this is where approval happens.
4. Argo CD notices the change and syncs the cluster to match.
5. To roll back, revert the commit. Argo CD syncs the cluster back to the previous version.

```flow
title: A GitOps deploy: CI never touches the cluster
paths
path: CI (outside the cluster)
Application repo | a developer merges code
-> CI builds, tests, and pushes the image
Amazon ECR | new image digest
path: Manifests repo
Pull request | changes one image digest for one environment
-> reviewed and merged; approval happens here
* main branch | now describes the new desired state
end
-> Argo CD, running inside the cluster, pulls from Git every few minutes, or on a webhook
group: EKS cluster
Argo CD | compares Git with what's running, and applies the difference
-> sync
Deployment rolls out | pods pull the new digest from ECR
end
loop: Argo CD keeps comparing, so a manual change in the cluster is put back to match Git
```

Keeping application code and deployment manifests in separate repositories is common. It lets you give "who can change what's running in Production" to a smaller group than "who can change the code".

### Structuring many environments and apps

- **One folder per environment**, using Kustomize overlays or per-environment Helm values (both covered in [Helm & Kustomize](09-helm-and-kustomize.html)), so the difference between QA and Production is a small, readable diff.
- **The "app of apps" pattern** (or an `ApplicationSet`) lets one Argo CD application create the rest, so adding a service or a cluster is also just a pull request.
- **Argo CD Projects** limit which repositories and namespaces each team's applications can use.

### Implementation notes

- **Keep secrets out of the manifests repo.** Use the External Secrets Operator from [Workload Identity & Secrets](13-workload-identity-and-secrets.html), so Git holds only a reference to each secret.
- **Turn on self-heal gradually.** Start with automated sync and no self-heal while teams get used to it, then enable it once nobody relies on hand edits.
- **Watch for sync failures.** An application stuck "OutOfSync" or "Degraded" is an alert worth sending, as covered in [Observability](18-observability-and-alerting.html).
- **Protect Argo CD itself.** It can change everything in the cluster. Restrict who can use its UI and API, sign in through SSO, and keep its own configuration in Git as well.

## Recap · Key terms

- **GitOps:** a controller in the cluster keeps it matching what's in Git.
- **Argo CD Application:** says which repository path should run in which cluster and namespace.
- **Sync:** applying Git's desired state to the cluster.
- **Self-heal:** undoing changes made directly in the cluster.
- **Prune:** deleting cluster resources that were removed from Git.
- **Drift:** any difference between Git and the cluster.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: With GitOps, what does the CI pipeline do to the cluster?
- Runs `kubectl apply` with admin credentials
* Nothing directly: it pushes an image and changes Git, and Argo CD applies the change from inside the cluster
- Restarts every pod
- Runs `helm upgrade`
= Argo CD pulls from Git and applies. CI never needs cluster credentials, which removes a powerful secret from the pipeline.
S: Someone scales a Deployment by hand, and the Application has `selfHeal: true`. What happens?
- The change stays until the next commit
* Argo CD puts it back to what Git says
- Argo CD commits the change to Git
- The Application is deleted
= Self-heal treats manual changes as drift and reverts them, so Git stays the single source of truth.
Q: How do you roll back a bad release in a GitOps setup?
- `kubectl rollout undo` in every cluster
* Revert the commit that changed the image, and let Argo CD sync the cluster back
- Delete the Argo CD Application
- Rebuild the previous image
= The Git history is the deploy history, so a revert is a reviewed, recorded rollback. A kubectl undo would be put back by self-heal anyway.
S: You delete a manifest from Git, and the Application has `prune: true`. What happens to that object in the cluster?
* Argo CD deletes it
- It stays, unmanaged
- Argo CD restores the file in Git
- The sync fails
= Prune removes cluster resources that no longer exist in Git. Without it, deleted manifests leave orphaned objects behind.
Q: Why keep deployment manifests in a separate repository from application code?
- Argo CD can't read application repositories
* So the group allowed to change what runs in Production can be smaller than the group allowed to change code
- Git limits repository size
- It makes builds faster
= Separating them lets you protect the manifests repository, where a merge is a Production deploy, more tightly than the code.
```
