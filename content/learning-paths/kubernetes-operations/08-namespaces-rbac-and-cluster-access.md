---
title: Namespaces, RBAC & Service Accounts: Who Can Do What
date: 2026-09-29
updated: 2026-10-01
track: kubernetes-operations
order: 8
module: 8
summary: How a kubectl command is checked before it's allowed. Authentication says who you are, RBAC decides what you may do, and namespaces set the scope. Covers Roles and RoleBindings, the built-in roles, service accounts for pods, and checking permissions safely.
level: Core concepts · Access
readingTime: 11 min read
stack: [Kubernetes RBAC, Namespaces, Service accounts, kubectl]
tags: [kubernetes, rbac, namespaces, access-control, fundamentals]
redirectFrom: [namespaces-rbac-and-cluster-access]
related: [tolling/cloud-foundation]
---

**In this module, you'll learn to:**

- Name the three checks every API request passes, and read the error each one gives
- Grant permissions with Roles, ClusterRoles, and bindings
- Give pods their own identity with service accounts, and check permissions with `kubectl auth can-i`

**Before you start:** this builds on [How a Cluster Works](04-how-a-cluster-works.html), in particular that every action goes through the API server.

## Principle · Namespaces organize a cluster, RBAC controls it

A **namespace** is a named section of a cluster. Most objects (Deployments, Services, ConfigMaps, Secrets) live in exactly one namespace, and names only have to be unique within it. Teams typically get a namespace per application or per team, such as `orders` or `payments`, while cluster add-ons live in `kube-system`.

Namespaces are useful because other features can be scoped to them: permissions, resource quotas, and network policies. But a namespace by itself blocks nothing. Anyone allowed to act across the whole cluster can reach into every namespace, and some objects (nodes, CRDs, cluster-wide roles) belong to no namespace at all. That's why hard boundaries between environments need separate clusters, covered in [Multi-Environment Clusters](11-multi-environment-clusters-and-access-entries.html).

## Flow · What happens to every request before it's allowed

Each request to the API server, from a person, a pipeline, or a pod, passes three gates in order. Knowing which gate rejected you tells you what to fix.

```flow
title: The three checks every API request passes
You or a pipeline | kubectl get pods -n orders
-> kubectl sends your credentials: a certificate in kind, a cloud-signed token on EKS
group: Control plane
Authentication | "Who are you?" The credentials are checked
-> you become a Kubernetes user, plus any Kubernetes groups
* Authorization (RBAC) | "May this user do this verb, on this resource, in this namespace?"
-> allowed
Admission | "Is this object acceptable?" Policies, quotas, and defaults are applied
end
-> stored in etcd and acted on
Result | success, or an error that names the gate that refused it
```

- **`You must be logged in to the server (Unauthorized)`** means authentication failed. The cluster doesn't recognise your credentials, or they've expired.
- **`... is forbidden: User "..." cannot list resource "pods"`** means authentication worked but RBAC said no. You need a role binding, not new credentials.

Kubernetes has no user accounts of its own. Who you are comes from outside: a client certificate, an identity provider, or, on Amazon EKS, your AWS IAM identity. [Kubernetes on Amazon EKS](10-kubernetes-on-eks.html) shows how an IAM role becomes a Kubernetes user and group. Everything after that first gate works the same on every cluster.

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

## Service accounts · Identities for pods

People and pipelines sign in from outside. Pods use **service accounts**. Every namespace has a `default` service account, and each pod runs as one. A service account is what RBAC checks when a pod calls the Kubernetes API itself; a controller that watches Deployments, for example, needs a Role that lets it do that. Most application pods never call the API, so they should run with a dedicated service account that has no Kubernetes permissions at all.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: orders-api
  namespace: orders
automountServiceAccountToken: false   # this app never calls the Kubernetes API
```

The pod template then sets `serviceAccountName: orders-api`. On EKS, the same service account is also how a pod gets **AWS** permissions, which is a separate mechanism covered in [Workload Identity & Secrets](13-workload-identity-and-secrets.html).

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

- **Bind roles to groups, not to individual users.** When someone joins or leaves a team, you change group membership in one place (your identity provider), not RBAC objects in every cluster.
- **Start from `view` and add what's needed.** Wide permissions are easy to grant and hard to take back once pipelines and people depend on them.
- **Treat `cluster-admin` and `secrets` access as sensitive.** Being able to read Secrets in a namespace means being able to read every credential in it.
- **Keep RBAC in Git.** Roles and bindings are ordinary YAML, so they can be reviewed and deployed like everything else, as described in [GitOps with Argo CD](16-gitops-with-argo-cd.html).

## Recap · Key terms

- **Authentication:** proving who you are to the API server.
- **Authorization (RBAC):** deciding what that identity may do.
- **Role and ClusterRole:** a list of allowed verbs on resources, in one namespace or across the cluster.
- **RoleBinding and ClusterRoleBinding:** give a role to users, groups, or service accounts.
- **Service account:** the identity a pod runs as.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
S: kubectl says `pods is forbidden: User "dev" cannot list resource "pods"`. What's wrong?
- Your credentials have expired
* You're signed in, but RBAC doesn't allow that action
- The pods don't exist
- The API server is down
= "Forbidden" means authentication worked and authorization refused, so you need a role binding. An authentication failure says "Unauthorized" instead.
Q: How do you take away a permission that a RoleBinding granted?
- Add a deny rule to the user's Role
* Remove or change the binding, or the Role, that grants it
- Create a NetworkPolicy
- Delete the namespace
= RBAC only adds permissions; there are no deny rules. Anything not granted is refused, so removing the grant removes the permission.
S: A team needs read-only access to everything in the `orders` namespace, and nowhere else. What's the simplest correct setup?
- A ClusterRoleBinding to the built-in `view` ClusterRole
* A RoleBinding in `orders` to the built-in `view` ClusterRole
- A ClusterRoleBinding to `cluster-admin`
- A new namespace for the team
= A RoleBinding limits whatever it grants to its own namespace, even when the role is a ClusterRole. A ClusterRoleBinding would grant it everywhere.
Q: Your app never calls the Kubernetes API. Which service account setup is best?
- The namespace's `default` service account, bound to `edit`
* A dedicated service account with no permissions, and token mounting turned off
- `cluster-admin`, so it never fails
- No service account at all
= Every pod runs as some service account. A dedicated one with no roles means a compromised container can't do anything in the cluster.
Q: Why isn't a namespace enough to separate Production from Development?
- Namespaces can't hold Deployments
* A namespace blocks nothing by itself; cluster-wide permissions and resources reach across all of them
- Namespaces are deleted on every upgrade
- Pods in different namespaces can't talk to each other
= Namespaces are a scope for permissions, quotas, and policies, not a wall. A hard boundary between environments needs separate clusters.
```
