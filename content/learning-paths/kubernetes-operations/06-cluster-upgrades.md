---
title: Cluster Upgrades Without Drama
date: 2026-09-28
track: kubernetes-operations
order: 10
module: 10
totalModules: 10
summary: How to upgrade EKS one version at a time — checking for removed APIs first, then the control plane, add-ons, and nodes, in an order that keeps workloads running.
level: Operations · Upgrades
readingTime: 8 min read
stack: [Amazon EKS, Kubernetes, kubectl, Managed Node Groups]
tags: [upgrades, lifecycle, eks, kubernetes, operations]
---

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

### Upgrade order

- **Control plane.** `aws eks update-cluster-version` (or change the version in Terraform). EKS runs the API servers across several Availability Zones and replaces them in the background; running workloads keep going.
- **Core add-ons.** Bring the VPC CNI, CoreDNS, and kube-proxy up to versions that match the new release. Managed add-ons make this a version bump; self-managed ones need their manifests updated.
- **Nodes.** For managed node groups, start a version update and EKS replaces nodes in a rolling fashion, cordoning and draining each one. With Karpenter, updating the AMI or the node class causes it to replace nodes gradually.
- **Everything else.** Controllers that talk to the Kubernetes API, such as the AWS Load Balancer Controller or an ingress controller, often have their own compatibility ranges. Check them against the new version.

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
