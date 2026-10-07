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
motif: monitor
---

**In this module, you'll learn to:**

- Check that a rollout actually succeeded, instead of assuming it did
- Work a fixed triage sequence: context, then events, then pod status
- Decide between rolling back and rolling forward

**Before you start:** you'll want `kubectl` access to a cluster (see [Multi-Environment Clusters](11-multi-environment-clusters-and-access-entries.html)) and a deployment you can safely break in a non-production environment.

## Principle · "It deployed" and "it's healthy" are different questions

When `kubectl apply` returns without an error, it only means the API server accepted the change. It doesn't mean the new pods started, passed their readiness checks, or are serving traffic. Treating those as the same thing is how a broken rollout goes unnoticed until a user reports it.

```text
# Confirm the rollout actually finished, not just that it started
kubectl rollout status deployment/<name> -n <namespace>

# Check pod-level health, not just deployment-level status
kubectl get pods -n <namespace> -l app=<name>
kubectl describe pod <pod-name> -n <namespace>

# Tail logs from the specific pod that's misbehaving
kubectl logs <pod-name> -n <namespace> --previous
```

`kubectl rollout status` waits until the rollout has really finished or failed, so it makes a much better pipeline check than `apply`. After a crash loop, `kubectl logs --previous` matters: it shows the logs from the run that crashed, not from the fresh restart, which is usually empty.

## A repeatable triage sequence for a stuck deployment

Guessing under pressure is slow. Work the same sequence every time instead. It follows the path a deploy takes through the cluster ([How a Cluster Works](04-how-a-cluster-works.html)), so each step rules out one stage:

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
-> then decide
* Users affected? | roll back first and find the cause after; otherwise fix forward
```

A few habits make each step faster:

- **Check the context first, every time.** `kubectl config current-context` before you touch anything. Fixing the wrong cluster makes things worse.
- **Start from events, not logs.** `kubectl get events -n <namespace> --sort-by='.lastTimestamp'` usually names the real failure: scheduling, image, or admission.
- **Pod problem or node problem?** A crash, an OOMKill, or a failing probe is a pod problem. Not enough capacity, a taint, or an unschedulable node is a node problem. `kubectl describe pod` shows both, but they need different fixes.
- **"In the registry" isn't the same as "pullable".** A registry login or network problem looks exactly like a bad image from the pod's side. Check that this cluster can actually pull it.

## When to roll back versus roll forward

```text
# Roll back to the previous known-good revision
kubectl rollout undo deployment/<name> -n <namespace>

# Roll back to a specific earlier revision
kubectl rollout history deployment/<name> -n <namespace>
kubectl rollout undo deployment/<name> -n <namespace> --to-revision=<n>
```

**Roll back** when users are affected and the previous version is known to be good. That's most production incidents: restore service first, then find the cause. Don't deploy forward again until you know it, or the same failure comes straight back.

**Roll forward** with a fix when the previous version has its own known problems, or when the fix is small, well understood, and quicker than rolling back and redeploying.

### Implementation notes

- **A slow rollout and a failed one look the same at first.** `kubectl rollout status` tells you which, so you don't have to guess from pod counts.
- **Write down why you rolled back.** A rollback with no recorded cause just hands the same failure to whoever deploys next.
- **"It worked in QA but not in Production" is usually configuration, not code.** A missing setting or a different IAM permission is the most common cause, so check those before reading logs from the top.

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
