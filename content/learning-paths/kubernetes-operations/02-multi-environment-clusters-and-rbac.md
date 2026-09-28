---
title: Multi-Environment Clusters & IAM/RBAC
date: 2026-09-18
updated: 2026-09-28
track: kubernetes-operations
order: 2
module: 2
totalModules: 10
summary: Isolating Dev, QA, Staging, and Production as separate clusters, and granting people and pipelines cluster access with EKS access entries instead of a shared superuser.
level: Access Control
readingTime: 8 min read
stack: [Amazon EKS, AWS IAM, Kubernetes RBAC, EKS access entries]
tags: [rbac, iam, eks, multi-environment, security]
---

**Before you start:** you'll want the AWS CLI and `kubectl`, permission to manage EKS clusters, and a rough idea of how IAM roles work.

## Principle · Separate clusters, not separate namespaces, for hard environment boundaries

Namespaces are a good way to organize workloads inside one cluster, but they're a soft boundary. A misconfigured RBAC role or a cluster-wide resource (a CRD, a webhook, a node setting) can still reach across them. When environments carry very different risks, such as a development sandbox versus a production cluster serving live traffic, a real boundary means separate clusters, each with its own control plane, node groups, and IAM trust.

The deployment this track is based on ran one EKS cluster each for Development, QA, Staging, and Production. Engineers connected to whichever cluster their task needed, rather than to one shared, always-on context.

## Mechanism · IAM identities become Kubernetes identities through access entries

EKS doesn't keep its own list of users. Signing in to a cluster is IAM authentication, and **access entries** decide what each IAM role can do once it's in. You create an access entry for a role, then attach an access policy to it, either for the whole cluster or for specific namespaces.

```text
# Let the platform team's SSO role administer the whole cluster
aws eks create-access-entry --cluster-name prod \
  --principal-arn arn:aws:iam::<account-id>:role/<platform-admin-role>

aws eks associate-access-policy --cluster-name prod \
  --principal-arn arn:aws:iam::<account-id>:role/<platform-admin-role> \
  --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy \
  --access-scope type=cluster

# Let the CI/CD deploy role manage workloads in one namespace only
aws eks create-access-entry --cluster-name prod \
  --principal-arn arn:aws:iam::<account-id>:role/<ci-deploy-role>

aws eks associate-access-policy --cluster-name prod \
  --principal-arn arn:aws:iam::<account-id>:role/<ci-deploy-role> \
  --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSEditPolicy \
  --access-scope type=namespace,namespaces=orders
```

Access entries are ordinary AWS API calls, so they show up in CloudTrail, can be managed in Terraform, and can't be broken by a typo in a YAML file.

### What about aws-auth?

Older clusters, including the one this track is based on, used the `aws-auth` ConfigMap in `kube-system` to map IAM roles to Kubernetes groups. AWS has deprecated it in favour of access entries. If you still have it, switch the cluster's authentication mode to `API_AND_CONFIG_MAP`, recreate each mapping as an access entry, check everyone can still get in, and then move to `API` only.

```text
aws eks update-cluster-config --name prod \
  --access-config authenticationMode=API_AND_CONFIG_MAP
```

### Implementation notes

- **Grant access to roles, not IAM users.** People should sign in through SSO and assume a role. That way, removing someone from the identity provider removes their cluster access too, and there are no long-lived access keys to leak.
- **Give cluster admin on purpose, per environment.** Someone who is admin in Development shouldn't automatically be admin in Production. Each cluster has its own access entries, which is exactly the point of separate clusters.
- **Avoid `system:masters`.** Membership in that group bypasses RBAC entirely and can't be taken away by an RBAC change. The access policies above do the same job and can be revoked.
- **Treat access changes like IAM policy changes.** They decide who can reach the cluster at all, so review them the same way. A mistake can lock everyone out, or let the wrong people in.

### Switching context safely between environments

```text
# Point kubectl at a specific cluster
aws eks --region <region> update-kubeconfig --name <cluster-name>

# Check which cluster and namespace you're actually pointed at
kubectl config current-context
kubectl config set-context --current --namespace=<namespace>
```

Running `kubectl config current-context` before anything destructive is a cheap habit that prevents the most common multi-cluster mistake: running a command meant for QA against Production because a terminal tab was left on the wrong context earlier in the day.

### Trade-offs

Separate clusters per environment cost more than namespaces on one shared cluster, since each has its own control plane and minimum set of nodes. When a mistake in Development must never be able to reach Production data or traffic, that's a deliberate trade, not waste. For lower-stakes workloads, namespaces on fewer clusters are a reasonable, cheaper option.
