---
title: Workload Identity & Secrets: How Pods Get AWS Access
date: 2026-09-28
track: kubernetes-operations
order: 4
module: 4
totalModules: 10
summary: Giving each workload its own narrowly scoped AWS permissions with EKS Pod Identity or IRSA, instead of sharing the node's role, and getting secrets into pods without putting them in Git or container images.
level: Foundations · Security
readingTime: 9 min read
stack: [Amazon EKS, EKS Pod Identity, IRSA, AWS IAM, AWS Secrets Manager, External Secrets Operator]
tags: [security, iam, pod-identity, irsa, secrets, eks]
---

**Before you start:** this builds on module 2, which covered how *people* get into a cluster. This module is about how *workloads* get into AWS.

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
  --role-arn arn:aws:iam::<account-id>:role/<orders-api-role>
```

Any pod running as that service account now gets short-lived credentials for that role, automatically. Nothing needs to change in the application if it uses a current AWS SDK.

## Option 2 · IRSA (IAM Roles for Service Accounts)

IRSA is the older approach and is still widely used. The cluster gets an OIDC identity provider in IAM, each role's trust policy names the exact service account allowed to use it, and the service account carries an annotation pointing at the role.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: orders-api
  namespace: orders
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::<account-id>:role/<orders-api-role>
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
