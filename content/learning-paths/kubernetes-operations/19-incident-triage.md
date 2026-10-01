---
title: Day-2 Operations & Incident Triage
date: 2026-09-18
updated: 2026-10-01
track: kubernetes-operations
order: 19
module: 19
summary: Switching cluster context safely, verifying a rollout actually succeeded instead of assuming it did, and a repeatable sequence for triaging a stuck deployment.
level: Production · Incidents
readingTime: 8 min read
stack: [Amazon EKS, kubectl, Kubernetes]
tags: [operations, incident-response, kubectl, eks]
redirectFrom: [incident-triage, 04-day-2-operations-and-incident-triage]
related: [tolling/eks-ingress-incident-rca]
---

**Before you start:** you'll want `kubectl` access to a cluster (see [Multi-Environment Clusters](11-multi-environment-clusters-and-access-entries.html)) and a deployment you can safely break in a non-production environment.

## Principle · "It deployed" and "it's healthy" are different questions

A `kubectl apply` returning without error only confirms the manifest was accepted by the API server — not that the resulting pods came up healthy, passed their readiness checks, and are actually serving traffic. Treating those as the same thing is how a broken rollout goes unnoticed until a user reports it.

```text
# Confirm the rollout actually finished, not just that it started
kubectl rollout status deployment/<name> -n <namespace>

# Check pod-level health, not just deployment-level status
kubectl get pods -n <namespace> -l app=<name>
kubectl describe pod <pod-name> -n <namespace>

# Tail logs from the specific pod that's misbehaving
kubectl logs <pod-name> -n <namespace> --previous
```

`kubectl rollout status` waits until the rollout really completes or fails, which makes it a better automation gate than treating `apply` as the finish line. `--previous` on `kubectl logs` matters specifically after a crash loop — it retrieves logs from the container's last run, not the fresh, log-empty restart that's currently in `CrashLoopBackOff`.

## A repeatable triage sequence for a stuck deployment

Guessing under pressure is slower and less reliable than working a fixed sequence. It follows the same path a deploy takes through the cluster (see [How a Cluster Works](04-how-a-cluster-works.html)), so each step rules out one stage:

```flow
title: Triage a stuck deployment one layer at a time
Right cluster and namespace? | kubectl config current-context
-> yes
Events | kubectl get events --sort-by=.lastTimestamp shows the real error first
-> then look at the pod status
paths
path: Pending
Scheduling problem | no node has room, a taint, or a zone mismatch; check requests and the node autoscaler
path: ImagePullBackOff
Image problem | wrong tag or digest, registry auth, or no network path to ECR
path: CrashLoopBackOff
App problem | kubectl logs --previous; often missing config or an IAM difference
path: Running, not ready
Readiness problem | the probe fails; check dependencies and the probe path
end
-> cause found
* Roll back or fix forward | now based on a known cause
```

A useful default order:

### Triage checklist

- Confirm you're in the correct cluster context and namespace before touching anything — `kubectl config current-context` first, always.
- Check `kubectl get events -n <namespace> --sort-by='.lastTimestamp'` for the actual scheduling or admission failure, rather than starting from pod logs.
- Check whether the failure is at the pod level (crash, OOMKill, failed readiness probe) or the node level (insufficient capacity, taints, an unschedulable node) — `kubectl describe pod` reports both, but they call for different fixes.
- If the image itself is suspect, verify it's pullable from that specific cluster's network path, not just present in the registry — a registry-auth or network-policy issue looks identical to a bad image from the pod's perspective.
- Only roll back once the actual failure mode is identified. A rollback without a root cause just reintroduces the same failure the next time someone deploys forward.

## When to roll back versus roll forward

```text
# Roll back to the previous known-good revision
kubectl rollout undo deployment/<name> -n <namespace>

# Roll back to a specific earlier revision
kubectl rollout history deployment/<name> -n <namespace>
kubectl rollout undo deployment/<name> -n <namespace> --to-revision=<n>
```

Rolling back is the right call when the previous revision is known-good and restoring service matters more than root-causing immediately — which is most production incidents. Rolling forward with a fix is preferable when the previous revision has its own known issues, or when the fix is small, well-understood, and faster to ship than a rollback-then-redeploy cycle would be.

### Implementation notes

- **A stuck rollout and a failing rollout look identical from the outside at first.** `kubectl rollout status` distinguishes them for you rather than requiring you to infer it from pod counts.
- **Recording *why* a rollback happened, not just that it did, is what makes the next on-call engineer's job easier.** An undocumented rollback just moves the unknown failure mode to the next deployment attempt.
- **The single most common root cause of "it worked in QA, not in Production" is an environment-specific config or IAM permission difference, not the code.** Checking that first is usually faster than re-reading application logs from the top.
