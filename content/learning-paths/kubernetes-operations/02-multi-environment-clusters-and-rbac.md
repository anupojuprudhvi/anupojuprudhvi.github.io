---
title: Multi-Environment Clusters & IAM/RBAC
track: kubernetes-operations
order: 2
module: 2
totalModules: 4
summary: Isolating Dev, QA, Staging, and Production as separate clusters, and mapping IAM identities to Kubernetes RBAC via aws-auth, without a shared superuser.
level: Access Control
readingTime: 7 min read
stack: [Amazon EKS, AWS IAM, Kubernetes RBAC, aws-auth]
tags: [rbac, iam, eks, multi-environment, security]
---

## Principle · Separate clusters, not separate namespaces, for hard environment boundaries

Namespaces are a reasonable way to organize workloads within one cluster, but they're a soft boundary — a misconfigured RBAC role or a cluster-wide resource (a CRD, a webhook, a node-level setting) can still cross a namespace line. For environments with materially different risk profiles — a development sandbox versus a production cluster serving live traffic — a genuinely hard boundary means separate clusters, each with its own control plane, its own node groups, and its own IAM trust relationship.

A typical layout: one EKS cluster each for Development, QA, Staging, and Production, with engineers authenticating to whichever cluster their current task requires rather than one shared always-on context.

## Mechanism · IAM identities become Kubernetes identities through aws-auth

EKS doesn't have its own separate user database — cluster authentication is IAM authentication, and the `aws-auth` ConfigMap in `kube-system` is what maps an IAM role or user to a Kubernetes RBAC group.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: aws-auth
  namespace: kube-system
data:
  mapRoles: |
    - rolearn: arn:aws:iam::<account-id>:role/eks-node-group-role
      username: system:node:{{EC2PrivateDNSName}}
      groups:
        - system:bootstrappers
        - system:nodes
  mapUsers: |
    - userarn: arn:aws:iam::<account-id>:user/<engineer-username>
      username: <engineer-username>
      groups:
        - system:masters
```

### Implementation notes

- **`mapRoles` covers machine identities (node groups, CI/CD deployment roles); `mapUsers` covers individual engineers.** Keeping this distinction explicit makes it obvious at a glance which entries in the ConfigMap are humans and which are automation.
- **`system:masters` is cluster-admin — grant it deliberately, per environment, not by default.** An engineer with `system:masters` in a Development cluster shouldn't automatically have it in Production; each cluster's `aws-auth` is edited independently, which is exactly the point of the hard cluster boundary.
- **Editing `aws-auth` directly is a privileged, auditable action.** Because it controls who has cluster access at all, changes to it deserve the same review discipline as an IAM policy change — a mistake here doesn't just misconfigure a workload, it can lock out (or over-grant) cluster access entirely.

### Switching context safely between environments

```text
# Point kubectl at a specific cluster's context
aws eks --region <region> update-kubeconfig --name <cluster-name>

# Confirm which cluster and namespace you're actually pointed at
kubectl config current-context
kubectl config set-context --current --namespace=<namespace>
```

Running `kubectl config current-context` before any destructive or production-affecting command is a cheap habit that directly prevents the most common multi-cluster mistake: running a command intended for QA against Production because a terminal tab had the wrong context set from earlier in the day.

### Trade-offs

Separate clusters per environment cost more than namespace isolation on one shared cluster — each has its own control plane and minimum node footprint. For a platform where a Development-cluster misconfiguration must never be able to reach Production data or traffic, that's a deliberate, defensible trade rather than an oversight; for lower-stakes workloads, namespace isolation on fewer clusters is a reasonable and cheaper alternative.
