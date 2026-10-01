---
title: Day-2 Operations & Incident Triage
date: 2026-09-18
updated: 2026-10-01
track: kubernetes-operations
order: 19
module: 19
summary: Switching cluster context safely, verifying a rollout actually succeeded instead of assuming it did, and a repeatable sequence for triaging a stuck deployment.
level: Production · Incidents
readingTime: 10 min read
stack: [Amazon EKS, kubectl, Kubernetes]
tags: [operations, incident-response, kubectl, eks]
redirectFrom: [incident-triage, 04-day-2-operations-and-incident-triage]
related: [tolling/eks-ingress-incident-rca]
---

**In this module, you'll learn to:**

- Check that a rollout actually succeeded, instead of assuming it did
- Work a fixed triage sequence: context, then events, then pod status
- Decide between rolling back and rolling forward

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

## Recap · Key terms

- **CrashLoopBackOff:** a container keeps crashing, and Kubernetes waits longer between each restart.
- **ImagePullBackOff:** the node can't pull the image.
- **Events:** the cluster's recent record of what happened to objects, and why.
- **Roll back and roll forward:** returning to the last good version, or shipping a fix.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: During an incident, what's the very first step before touching anything?
- Delete the failing pods
* Confirm you're on the right cluster and namespace
- Roll back the deployment
- Read the application logs from the top
= `kubectl config current-context` first, always. Fixing the wrong cluster makes an incident worse.
S: A pod is in `CrashLoopBackOff`. Which command shows why it crashed?
- `kubectl get nodes`
* `kubectl logs <pod> --previous`
- `kubectl rollout status`
- `kubectl get svc`
= The current container has just restarted and has nothing useful in its logs yet. `--previous` shows the output of the run that crashed.
S: Pods show `ImagePullBackOff`, but the image exists in the registry. What should you check next?
* The tag or digest, the registry permissions, and the network path from that cluster
- The readiness probe path
- The HPA settings
- The Service selector
= The node can't fetch the image. A wrong tag, missing pull permissions, or no route to the registry all look the same from the pod.
Q: Why should a pipeline run `kubectl rollout status` instead of stopping after `kubectl apply`?
- It's faster
* It waits until the rollout really finishes or fails, so the pipeline knows the result
- It rolls back automatically
- `apply` doesn't work in pipelines
= `apply` only confirms the API server stored the change. `rollout status` reports whether the new pods actually came up healthy.
Q: "It works in QA but not in Production." With the same image promoted by digest, what's the first thing to check?
- A bug in the code
* An environment-specific config or IAM permission difference
- A Kubernetes bug
- Whether the image is different
= The code is identical when the digest is the same. Configuration and permissions are what usually differ between environments.
```
