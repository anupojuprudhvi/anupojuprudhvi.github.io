---
title: Namespaces, RBAC & Cluster Access: Who Can Do What
date: 2026-09-29
track: kubernetes-operations
order: 4
module: 4
summary: How a kubectl command is checked before it's allowed. Your IAM identity signs you in, RBAC decides what you may do, and namespaces set the scope. Covers Roles and RoleBindings, how EKS maps IAM roles to Kubernetes groups, service accounts, and checking permissions safely.
level: Foundations · Access
readingTime: 9 min read
stack: [Kubernetes RBAC, Amazon EKS, AWS IAM, EKS access entries, kubectl]
tags: [kubernetes, rbac, namespaces, iam, access-control, fundamentals]
related: [tolling/cloud-foundation]
---

**Before you start:** this builds on [How Kubernetes and EKS Actually Work](how-kubernetes-and-eks-work.html), in particular that every action goes through the API server. You'll want to know what an IAM role is.

## Principle · Namespaces organize a cluster, RBAC controls it

A **namespace** is a named section of a cluster. Most objects (Deployments, Services, ConfigMaps, Secrets) live in exactly one namespace, and names only have to be unique within it. Teams typically get a namespace per application or per team, such as `orders` or `payments`, while cluster add-ons live in `kube-system`.

Namespaces are useful because other features can be scoped to them: permissions, resource quotas, and network policies. But a namespace by itself blocks nothing. Anyone allowed to act across the whole cluster can reach into every namespace, and some objects (nodes, CRDs, cluster-wide roles) belong to no namespace at all. That's why hard boundaries between environments need separate clusters, covered in [Multi-Environment Clusters](multi-environment-clusters-and-access-entries.html).

## Flow · What happens to every request before it's allowed

Each request to the API server, from a person, a pipeline, or a pod, passes three gates in order. Knowing which gate rejected you tells you what to fix.

```flow
title: The three checks every EKS API request passes
You or a pipeline | kubectl get pods -n orders
-> kubectl calls "aws eks get-token", which signs a token with your IAM identity
group: EKS control plane
Authentication | "Who are you?" EKS checks the IAM signature and looks up your access entry
-> you become a Kubernetes user, plus any Kubernetes groups
* Authorization (RBAC) | "May this user do this verb, on this resource, in this namespace?"
-> allowed
Admission | "Is this object acceptable?" Policies, quotas, and defaults are applied
end
-> stored in etcd and acted on
Result | success, or an error that names the gate that refused it
```

- **`You must be logged in to the server (Unauthorized)`** means authentication failed. Your IAM identity has no access entry on this cluster, or your AWS credentials have expired.
- **`... is forbidden: User "..." cannot list resource "pods"`** means authentication worked but RBAC said no. You need a role binding, not new AWS credentials.

## Mechanism · RBAC in four objects

Kubernetes RBAC is built from two kinds of object, each in a namespaced and a cluster-wide version:

| Object | What it says | Scope |
| --- | --- | --- |
| `Role` | A list of allowed verbs on resources, such as "get, list, watch pods" | One namespace |
| `ClusterRole` | The same, for cluster-wide resources, or reusable in any namespace | Whole cluster |
| `RoleBinding` | Gives a Role or ClusterRole to users, groups, or service accounts | One namespace |
| `ClusterRoleBinding` | Gives a ClusterRole everywhere | Whole cluster |

RBAC only ever *adds* permissions. There's no "deny" rule, so anything not granted is refused. Here's a read-only role for the `orders` namespace, given to a Kubernetes group called `orders-readers`:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: read-only
  namespace: orders
rules:
  - apiGroups: ["", "apps"]
    resources: ["pods", "pods/log", "services", "deployments", "replicasets"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: orders-readers
  namespace: orders
subjects:
  - kind: Group
    name: orders-readers
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: read-only
  apiGroup: rbac.authorization.k8s.io
```

Kubernetes also ships ready-made ClusterRoles (`view`, `edit`, `admin`, `cluster-admin`). Binding `view` or `edit` in a single namespace with a RoleBinding is often all a team needs.

## EKS · Connecting IAM roles to Kubernetes groups

Kubernetes has no user accounts of its own. On EKS, your IAM identity is the login, and an **access entry** says what it becomes inside the cluster. You can either attach one of the EKS access policies (the next module shows that), or map the IAM role to Kubernetes groups and let your own RBAC decide:

```text
# Anyone who signs in with this IAM role joins the "orders-readers" group,
# so the RoleBinding above applies to them
aws eks create-access-entry --cluster-name dev \
  --principal-arn arn:aws:iam::<your-account-number>:role/<orders-team-role> \
  --kubernetes-groups orders-readers
```

## Service accounts · Identities for pods

People and pipelines use IAM roles. Pods use **service accounts**. Every namespace has a `default` service account, and each pod runs as one. A service account is what RBAC checks when a pod calls the Kubernetes API itself; a controller that watches Deployments, for example, needs a Role that lets it do that. Most application pods never call the API, so they should run with a dedicated service account that has no Kubernetes permissions at all.

The same service account is also how a pod gets **AWS** permissions, which is a separate mechanism covered in [Workload Identity & Secrets](workload-identity-and-secrets.html).

## Try it · Check permissions without guessing

```text
# What namespaces exist?
kubectl get namespaces

# Can I do this? (answers yes or no, without doing it)
kubectl auth can-i create deployments -n orders

# Everything I'm allowed to do in a namespace
kubectl auth can-i --list -n orders

# Check on behalf of a service account, before a pod finds out the hard way
kubectl auth can-i list pods -n orders \
  --as=system:serviceaccount:orders:orders-api

# Who am I, as far as the cluster is concerned?
kubectl auth whoami
```

### Implementation notes

- **Bind roles to groups, not to individual users.** When someone joins or leaves a team, you change group membership in one place (your identity provider and IAM), not RBAC objects in every cluster.
- **Start from `view` and add what's needed.** Wide permissions are easy to grant and hard to take back once pipelines and people depend on them.
- **Treat `cluster-admin` and `secrets` access as sensitive.** Being able to read Secrets in a namespace means being able to read every credential in it.
- **Keep RBAC in Git.** Roles and bindings are ordinary YAML, so they can be reviewed and deployed like everything else, as described in [GitOps with Argo CD](gitops-with-argo-cd.html).
