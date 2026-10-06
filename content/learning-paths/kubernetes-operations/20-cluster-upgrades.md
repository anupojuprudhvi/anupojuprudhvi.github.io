---
title: Cluster Upgrades Without Drama
date: 2026-09-28
updated: 2026-10-01
track: kubernetes-operations
order: 20
module: 20
summary: How to upgrade EKS one version at a time: check for removed APIs first, then upgrade the control plane, add-ons, and nodes, in an order that keeps workloads running.
level: Production · Upgrades
readingTime: 10 min read
stack: [Amazon EKS, Kubernetes, kubectl, Managed Node Groups]
tags: [upgrades, lifecycle, eks, kubernetes, operations]
redirectFrom: [cluster-upgrades, 06-cluster-upgrades]
---

**In this module, you'll learn to:**

- Explain why small, regular upgrades are safer than rare, big ones
- Find APIs the new version removes before you upgrade
- Upgrade the control plane, add-ons, and nodes in the right order, rehearsed outside Production

**Before you start:** you'll want a non-production cluster to rehearse on, and your cluster version defined in code (Terraform or similar).

## Principle · Upgrades are routine work, so make them boring

Kubernetes ships a new minor version roughly three times a year, and each EKS version gets a fixed window of standard support. After that, a cluster moves to extended support, which costs several times the standard per-cluster price, and eventually it's upgraded for you whether you're ready or not.

The teams that struggle with upgrades are usually the ones that do them rarely. A small, repeatable upgrade every few months is far less risky than a big jump once the deadline arrives.

Two rules shape everything else:

- **The control plane moves one minor version at a time.** You can't go from 1.28 straight to 1.31. Each step is its own upgrade.
- **Nodes can lag behind the control plane, never lead it.** Upgrade the control plane first, then bring the nodes up to match.

## Step 1 · Find what the new version removes

Most upgrade failures aren't caused by the upgrade itself. They come from manifests or Helm charts that still use an API version the new release has removed. The cluster upgrades fine, then the next deploy fails.

```text
# Check the EKS upgrade insights for the cluster
aws eks list-insights --cluster-name <cluster>

# See which API versions the cluster currently serves
kubectl api-versions
```

EKS upgrade insights flag deprecated API usage the cluster has actually seen, which is more reliable than grepping a repository. Tools such as `pluto` can scan your manifests and Helm releases as well. Fix everything they find *before* you start. Changing an API version on a live cluster is easy; finding out after the upgrade is not.

## Step 2 · Control plane, then add-ons, then nodes

Upgrade one minor version at a time (for example 1.32 to 1.33), in this order:

1. **Control plane.** Run `aws eks update-cluster-version`, or change the version in Terraform. EKS replaces the API servers in the background, and running workloads keep going.
2. **Core add-ons.** Move the VPC CNI, CoreDNS, and kube-proxy to versions made for the new release. For managed add-ons this is a version bump; self-managed ones need their manifests updated.
3. **Nodes.** For managed node groups, start a version update, and EKS replaces the nodes one at a time, cordoning and draining each. With Karpenter, updating the AMI or the node class makes it replace nodes gradually. Until this step finishes, the nodes run one version behind the control plane, which is allowed.
4. **Everything else.** Controllers that talk to the Kubernetes API, such as the AWS Load Balancer Controller, an ingress controller, or Argo CD, have their own supported version ranges. Check each against the new version.

Then repeat for the next minor version if you're more than one behind.

```text
# Watch nodes come up on the new version as the rollout proceeds
kubectl get nodes -L eks.amazonaws.com/nodegroup \
  -o custom-columns=NAME:.metadata.name,VERSION:.status.nodeInfo.kubeletVersion
```

## Step 3 · Prove it on a non-production cluster first

Run the same upgrade on Dev or Staging a week or two before Production, with real deploys happening on it in between. Most surprises show up as a failed deploy or a controller that stops reconciling, and you want to meet those somewhere quiet.

### Implementation notes

- **Draining respects PodDisruptionBudgets.** A PDB that allows zero disruptions will stall the node rollout. Check PDBs before the upgrade, not when the node group update hangs.
- **Single-replica workloads will blip.** Every pod is evicted once as its node is replaced. If something can't tolerate that, give it a second replica before you start.
- **Keep the cluster version in code.** A Terraform variable or a pinned value in your cluster config makes the upgrade a reviewed change with a clear history, rather than a console click nobody remembers.
- **Put the next upgrade in the calendar.** Knowing when each version leaves standard support turns upgrades into planned work instead of an emergency.

## Recap · Key terms

- **Minor version:** a Kubernetes release such as 1.32 or 1.33; upgrades go one at a time.
- **Standard and extended support:** EKS's support window for a version, and the more expensive period after it.
- **Upgrade insights:** EKS checks that flag deprecated APIs your cluster has actually used.
- **Cordon and drain:** stop new pods landing on a node, then evict the pods already on it.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: Can you upgrade an EKS cluster from 1.30 straight to 1.33?
- Yes, in one step
* No; the control plane moves one minor version at a time
- Only with Karpenter
- Only if the nodes are upgraded first
= Each minor version is its own upgrade, so going from 1.30 to 1.33 takes three.
Q: What's the right order for an upgrade?
- Nodes, then the control plane, then add-ons
* Control plane, then core add-ons, then nodes, then other controllers
- Add-ons, then nodes, then the control plane
- Everything at once
= Nodes may lag behind the control plane but never lead it, so the control plane goes first. Then bring add-ons and nodes up to match.
S: The control plane upgrade finishes cleanly. The next deploy fails with `no matches for kind "..." in version "..."`. What happened?
- AWS rolled back the upgrade
* A manifest or chart uses an API version that the new release removed
- The nodes haven't been upgraded yet
- The image registry is unreachable
= Removed APIs are the most common upgrade failure: the cluster is fine, but old manifests no longer match. Upgrade insights and tools such as pluto find them before you start.
S: A node group update hangs while draining nodes. What should you check first?
- The control plane version
* PodDisruptionBudgets that allow zero disruptions
- The registry login
- The Ingress rules
= Draining respects PDBs, and a budget that can never be met stalls the rollout. Check PDBs before the upgrade.
Q: Why upgrade every few months, rather than waiting for the end of standard support?
* Small, regular upgrades are less risky, and extended support costs much more
- AWS charges per upgrade
- New versions are always faster
- Upgrades delete old workloads
= Teams that upgrade rarely face big jumps under deadline pressure. A routine upgrade every few months is cheaper and calmer.
```
