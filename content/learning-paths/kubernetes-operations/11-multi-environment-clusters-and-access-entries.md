---
title: Multi-Environment Clusters & EKS Access Entries
date: 2026-09-18
updated: 2026-10-01
track: kubernetes-operations
order: 11
module: 11
summary: Isolating Dev, QA, Staging, and Production as separate clusters, and granting people and pipelines cluster access with EKS access entries instead of a shared superuser.
level: Platform · Access
readingTime: 10 min read
stack: [Amazon EKS, AWS IAM, Kubernetes RBAC, EKS access entries]
tags: [rbac, iam, eks, multi-environment, security]
redirectFrom: [multi-environment-clusters-and-access-entries, 02-multi-environment-clusters-and-rbac]
related: [tolling/cloud-foundation]
motif: network
---

**In this module, you'll learn to:**

- Decide when environments need separate clusters rather than namespaces
- Grant people and pipelines access with EKS access entries and access policies
- Move off the deprecated `aws-auth` ConfigMap, and switch contexts safely

**Before you start:** you'll want the AWS CLI and `kubectl`, permission to manage EKS clusters, the RBAC basics from [Namespaces, RBAC & Service Accounts](08-namespaces-rbac-and-cluster-access.html), and how access entries work from [Kubernetes on Amazon EKS](10-kubernetes-on-eks.html). This module takes those ideas across several clusters.

## Principle · Separate clusters, not separate namespaces, for hard environment boundaries

Namespaces are a good way to organize workloads inside one cluster, but they're a soft boundary. A misconfigured RBAC role or a cluster-wide resource (a CRD, a webhook, a node setting) can still reach across them. When environments carry very different risks, such as a development sandbox versus a production cluster serving live traffic, a real boundary means separate clusters, each with its own control plane, node groups, and IAM trust.

The deployment this track is based on ran one EKS cluster each for Development, QA, Staging, and Production. Engineers connected to whichever cluster their task needed, rather than to one shared, always-on context.

## Mechanism · IAM identities become Kubernetes identities through access entries

EKS doesn't keep its own list of users. Signing in to a cluster is IAM authentication, and **access entries** decide what each IAM role can do once it's in. You create an access entry for a role, then attach an access policy to it, either for the whole cluster or for specific namespaces.

```flow
title: One identity provider, separate access in every cluster
Engineer or CI pipeline | signs in through SSO, or OIDC for pipelines
-> assumes an IAM role, such as platform-admin or ci-deploy
paths
path: Dev cluster
Access entry: platform-admin | cluster admin
Access entry: ci-deploy | edit, in app namespaces
path: Production cluster
* Access entry: platform-admin | cluster admin, for a smaller group
Access entry: ci-deploy | edit, in the orders namespace only
end
-> each cluster decides on its own; admin in Dev grants nothing in Production
```

```text
# Let the platform team's SSO role administer the whole cluster
aws eks create-access-entry --cluster-name prod \
  --principal-arn arn:aws:iam::<your-account-number>:role/<platform-admin-role>

aws eks associate-access-policy --cluster-name prod \
  --principal-arn arn:aws:iam::<your-account-number>:role/<platform-admin-role> \
  --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy \
  --access-scope type=cluster

# Let the CI/CD deploy role manage workloads in one namespace only
aws eks create-access-entry --cluster-name prod \
  --principal-arn arn:aws:iam::<your-account-number>:role/<ci-deploy-role>

aws eks associate-access-policy --cluster-name prod \
  --principal-arn arn:aws:iam::<your-account-number>:role/<ci-deploy-role> \
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

## Recap · Key terms

- **Access policy:** an EKS-managed permission set, such as cluster admin or edit, attached to an access entry.
- **Access scope:** whether an access policy applies to the whole cluster or to named namespaces.
- **aws-auth:** the older, deprecated ConfigMap that mapped IAM roles to Kubernetes groups.
- **Authentication mode:** whether a cluster reads access entries (`API`), `aws-auth`, or both.
- **system:masters:** a group that bypasses RBAC entirely; avoid it.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: Why give each environment its own cluster, rather than a namespace on one shared cluster?
- Namespaces can't run more than one app
* Cluster-wide resources and permissions reach across namespaces, so only separate clusters give a hard boundary
- Separate clusters are cheaper
- EKS allows only one namespace per cluster
= CRDs, webhooks, node settings, and cluster-wide roles span every namespace. When a mistake in Dev must never reach Production, the boundary has to be a cluster.
S: A CI pipeline should deploy only to the `orders` namespace in Production. What's the right access entry setup?
- Add the pipeline's role to `system:masters`
- Attach `AmazonEKSClusterAdminPolicy` with a cluster scope
* Attach `AmazonEKSEditPolicy` with a namespace scope of `orders`
- Share an engineer's admin credentials with the pipeline
= Scope access to exactly what the pipeline deploys. Admin rights for a pipeline turn a compromised build into a compromised cluster.
S: An engineer is cluster admin in Dev. What access do they have in Production?
- The same, because they use the same IAM role
* Only what Production's own access entries grant them
- Read-only, automatically
- None, ever
= Each cluster has its own access entries. Admin in one grants nothing in another, which is exactly the point of separate clusters.
Q: What's the safe order for migrating from `aws-auth` to access entries?
- Switch to `API` mode, then recreate the mappings
* Switch to `API_AND_CONFIG_MAP`, recreate each mapping as an access entry, check access, then switch to `API`
- Delete `aws-auth`, then create access entries
- They can't be migrated; build a new cluster
= Running both modes first means nobody is locked out while you recreate the mappings. Drop `aws-auth` only once everyone can still get in.
Q: What's the cheapest habit that prevents running a QA command against Production?
* Running `kubectl config current-context` before anything destructive
- Using the same context name for every cluster
- Giving everyone admin in every cluster
- Keeping a single kubeconfig entry
= A terminal left on the wrong context is the classic multi-cluster mistake, and checking takes a second.
```
