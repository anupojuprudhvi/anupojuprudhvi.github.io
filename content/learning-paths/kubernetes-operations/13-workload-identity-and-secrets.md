---
title: Workload Identity & Secrets: How Pods Get AWS Access
date: 2026-09-28
updated: 2026-10-01
track: kubernetes-operations
order: 13
module: 13
summary: Giving each workload its own narrowly scoped AWS permissions with EKS Pod Identity or IRSA, instead of sharing the node's role, and getting secrets into pods without putting them in Git or container images.
level: Platform · Security
readingTime: 11 min read
stack: [Amazon EKS, EKS Pod Identity, IRSA, AWS IAM, AWS Secrets Manager, External Secrets Operator]
tags: [security, iam, pod-identity, irsa, secrets, eks]
redirectFrom: [workload-identity-and-secrets, 07-workload-identity-and-secrets]
related: [tolling/cicd-delivery-engine]
motif: security
---

**In this module, you'll learn to:**

- Explain why pods shouldn't use the node's IAM role
- Give a workload its own AWS role with EKS Pod Identity or IRSA
- Get secrets into pods from AWS Secrets Manager without putting them in Git

**Before you start:** this builds on [Namespaces, RBAC & Service Accounts](08-namespaces-rbac-and-cluster-access.html) and [Multi-Environment Clusters](11-multi-environment-clusters-and-access-entries.html), which covered how *people* get into a cluster. This module is about how *workloads* get into AWS.

## Principle · Every workload gets its own identity

A pod that reads from S3 or writes to a queue needs AWS credentials. The easy mistake is to give the permissions to the node's IAM role. Then every pod on that node gets them, including ones that should never touch that bucket, and one compromised container can use all of them.

The fix is to give each workload its own IAM role, tied to its Kubernetes service account, with only the permissions it needs. EKS has two ways to do that.

## Option 1 · EKS Pod Identity (the simpler choice for new setups)

Pod Identity links an IAM role to a service account with one API call. You install the `eks-pod-identity-agent` add-on once per cluster, and the role's trust policy is the same for every cluster.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "pods.eks.amazonaws.com" },
      "Action": ["sts:AssumeRole", "sts:TagSession"]
    }
  ]
}
```

```text
# Link the role to the "orders-api" service account in the "orders" namespace
aws eks create-pod-identity-association --cluster-name prod \
  --namespace orders --service-account orders-api \
  --role-arn arn:aws:iam::<your-account-number>:role/<orders-api-role>
```

Any pod running as that service account now gets short-lived credentials for that role, automatically. Nothing needs to change in the application if it uses a current AWS SDK.

```flow
title: How a pod gets AWS credentials with EKS Pod Identity
group: EKS cluster (worker node)
orders-api pod | runs as service account "orders-api"; its AWS SDK needs credentials
-> EKS injects a credentials URL; the SDK calls the Pod Identity agent on the same node
Pod Identity agent | a DaemonSet add-on, one pod per node
end
-> asks EKS for credentials for this pod's service account
group: AWS
EKS Auth API | finds the association orders/orders-api → orders-api-role
-> the role is assumed, and the session is tagged with cluster, namespace, and service account
* Short-lived credentials | for orders-api-role only, refreshed automatically
end
-> the SDK signs requests with them
Amazon S3, SQS, and so on | IAM allows only what orders-api-role permits
```

## Option 2 · IRSA (IAM Roles for Service Accounts)

IRSA is the older approach and is still widely used. The cluster gets an OIDC identity provider in IAM, each role's trust policy names the exact service account allowed to use it, and the service account carries an annotation pointing at the role.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: orders-api
  namespace: orders
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::<your-account-number>:role/<orders-api-role>
```

It works well, but each role's trust policy is tied to one cluster's OIDC provider, which makes adding clusters or moving workloads between them more work. If you're starting fresh, Pod Identity is usually simpler; if IRSA is already working, there's no rush to switch.

## Secrets · Keep them out of Git and out of images

Kubernetes `Secret` objects are only base64-encoded, not encrypted, so anyone who can read them in the API or in Git can read the value. Two habits keep them safe:

- **Store the real value in AWS Secrets Manager (or Parameter Store)** and sync it into the cluster, instead of committing Secret manifests.
- **Encrypt Secrets at rest in the cluster with a KMS key** (EKS envelope encryption), so the stored copies are protected too.

The External Secrets Operator does the syncing. You commit a small manifest that says *which* secret to fetch, and the operator creates the Kubernetes Secret from Secrets Manager using its own workload identity:

```yaml
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: orders-db
  namespace: orders
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: orders-db
  data:
    - secretKey: password
      remoteRef:
        key: prod/orders/db
        property: password
```

The Secrets Store CSI Driver with the AWS provider is an alternative that mounts secrets as files without creating Kubernetes Secrets at all.

### Implementation notes

- **One service account per workload.** Sharing a service account shares the permissions. Give each deployment its own, even if two happen to need the same access today.
- **Keep the node role minimal.** Nodes need permissions to join the cluster and pull images, not to reach application data. If an app only works with the node role, that's a sign its own identity is missing.
- **Scope policies to specific resources.** `s3:GetObject` on one bucket prefix, not `s3:*` on `*`. Workload roles are easy to over-grant because nobody logs in with them.
- **Rotate at the source.** When a secret changes in Secrets Manager, the operator picks it up on its next refresh. Make sure the app re-reads it (or restarts) rather than caching the old value forever.

## Recap · Key terms

- **Workload identity:** an AWS identity tied to one Kubernetes service account.
- **EKS Pod Identity:** links an IAM role to a service account with one API call and an agent add-on.
- **IRSA:** IAM Roles for Service Accounts, using the cluster's OIDC provider and a service account annotation.
- **External Secrets Operator:** syncs secrets from a store such as Secrets Manager into Kubernetes Secrets.
- **Envelope encryption:** encrypting Kubernetes Secrets at rest with a KMS key.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
S: To unblock a release, a teammate adds S3 read access for one app's bucket to the nodes' IAM role. It works. What's the risk?
- Nodes can't call S3, so it will break on the next restart
* Every pod on those nodes can now read that bucket, including pods that shouldn't
- It only works for one pod per node
- The app will be slower than with Pod Identity
= Node permissions are shared by everything on the node. A role per workload means one compromised container can't use another app's access.
Q: With EKS Pod Identity, what links a pod to its IAM role?
- An annotation on the pod
- The node's instance profile
* A pod identity association for the pod's namespace and service account
- An environment variable holding access keys
= You create an association for a namespace and service account. Any pod running as that service account gets short-lived credentials for the role.
Q: Why aren't plain Kubernetes Secret manifests safe to commit to Git?
- Git can't store YAML
* Their values are only base64-encoded, so anyone who can read the repo can read them
- Kubernetes rejects Secrets that come from Git
- They expire after an hour
= Base64 is encoding, not encryption. Keep the value in Secrets Manager and commit only a reference to it, such as an ExternalSecret.
Q: When is IRSA still a reasonable choice?
* When it's already working in your clusters; there's no rush to switch
- Never; it no longer works
- Only for pods without service accounts
- Only on Windows nodes
= Pod Identity is simpler for new setups, but IRSA is widely used and works well. Its trust policies are tied to one cluster's OIDC provider, which makes adding clusters more work.
S: A secret is rotated in Secrets Manager. What else has to happen before the app uses the new value?
- Nothing; the app sees it instantly
* The operator syncs it on its next refresh, and the app must re-read it or restart
- You must delete the namespace
- You must rebuild the image
= The External Secrets Operator updates the Kubernetes Secret on its refresh interval. An app that caches the old value keeps using it until it reloads or restarts.
```
