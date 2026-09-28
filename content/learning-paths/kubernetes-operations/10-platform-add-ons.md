---
title: The Platform Add-on Layer: What Every Cluster Needs Before Apps Arrive
date: 2026-09-28
track: kubernetes-operations
order: 10
module: 10
totalModules: 10
summary: The small set of add-ons a new EKS cluster needs before any application can run well (load balancing, DNS, metrics, autoscaling, logs, storage), each with its own IAM role, installed in a way you can repeat safely.
level: Platform
readingTime: 9 min read
stack: [Amazon EKS, AWS Load Balancer Controller, ExternalDNS, metrics-server, Cluster Autoscaler, Fluent Bit, EBS CSI, EFS CSI, Helm]
tags: [eks, add-ons, external-dns, irsa, storage, platform]
---

**Before you start:** this pulls together modules 1, 5, 7, and 8. It's based on the add-on setup used in the multi-environment deployment this track draws on, with every name, account, and domain replaced by a placeholder.

## Principle · A new cluster is an empty building

Terraform can create an EKS cluster and its node groups, but a fresh cluster can't do much yet. It can't create a load balancer for an Ingress, publish DNS names, report pod CPU to an autoscaler, add nodes when it runs out of room, ship logs anywhere, or give pods persistent disks. Each of those is a separate add-on.

It helps to treat these as their own layer: installed right after the cluster exists, the same way in every environment, before any application team deploys anything.

### The add-on set in the original deployment

| Add-on | What it does | Covered in |
| --- | --- | --- |
| AWS Load Balancer Controller | Creates ALBs and NLBs from Ingress and Service objects | Module 1 |
| ExternalDNS | Creates DNS records for services and ingresses | Below |
| metrics-server | Reports pod CPU and memory, needed by `kubectl top` and the HPA | Module 5 |
| Cluster Autoscaler | Adds and removes nodes as pods need room | Module 5 |
| Fluent Bit | Ships container logs to a central store, such as CloudWatch Logs | Module 8 |
| EBS and EFS CSI drivers | Give pods persistent volumes | Below |

## Each add-on gets its own IAM role

Most of these add-ons call AWS APIs, so each needs AWS permissions. The original setup gave every add-on its **own** IAM role, attached to its own service account in `kube-system` using IRSA (module 7): one role for the load balancer controller, one for ExternalDNS, one for the autoscaler, one for Fluent Bit. An application that talked to a managed message broker got its own role in the same way.

```text
# One service account per add-on, each pointing at its own role
kubectl create serviceaccount external-dns -n kube-system
kubectl annotate serviceaccount external-dns -n kube-system \
  eks.amazonaws.com/role-arn=arn:aws:iam::<account-id>:role/<cluster-name>-external-dns \
  --overwrite

# A running pod keeps its old credentials, so restart it to pick up the change
kubectl -n kube-system rollout restart deployment/external-dns
```

That separation matters. The autoscaler can resize node groups but can't touch DNS; ExternalDNS can edit one hosted zone but can't create load balancers. If one add-on is compromised or misbehaves, the damage stays small.

## ExternalDNS across accounts, for a private zone

In a multi-account setup the DNS zone often lives in a shared-services account, not in the cluster's account (the same pattern as the shared Route 53 case study). ExternalDNS can manage records there by assuming a role in the other account:

```yaml
args:
  - --provider=aws
  - --source=service
  - --source=ingress
  - --domain-filter=internal.example        # only touch records under this domain
  - --aws-zone-type=private                 # only private hosted zones
  - --aws-assume-role=arn:aws:iam::<shared-services-account-id>:role/<dns-role>
  - --policy=upsert-only                    # create and update, never delete
  - --registry=txt
  - --txt-owner-id=<cluster-name>           # marks which records this cluster owns
```

A few of these flags are there purely for safety:

- **`--domain-filter` and `--aws-zone-type=private`** stop it from ever touching public records or other domains in the same account.
- **`--policy=upsert-only`** means it never deletes a record. That's a sensible start, but stale records then need cleaning up by hand.
- **`--txt-owner-id`** should be unique per cluster. If several clusters write to the same zone with the same owner ID, they can overwrite each other's records.

## Storage classes that respect Availability Zones

An EBS volume lives in one Availability Zone and can only attach to a node in that zone. If a volume is created before the pod is scheduled, it can end up in a zone where the pod can't run. `WaitForFirstConsumer` waits until the pod has a node, then creates the volume in that node's zone:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ebs-sc
provisioner: ebs.csi.aws.com
volumeBindingMode: WaitForFirstConsumer
```

EFS doesn't have this limit (it's reachable from every zone in the VPC), which makes it a good fit for data that several pods, in different zones, need to share.

## Two gotchas from the original install script

**1. `safe-to-evict` goes on the pod, not the Deployment.** The script annotated the Cluster Autoscaler *Deployment* with `cluster-autoscaler.kubernetes.io/safe-to-evict: "false"`, to stop the autoscaler from removing the node it runs on. The command succeeds, but it does nothing: the autoscaler only reads that annotation from **pods**. It has to go in the pod template:

```yaml
spec:
  template:
    metadata:
      annotations:
        cluster-autoscaler.kubernetes.io/safe-to-evict: "false"
```

**2. "latest" isn't a version.** The script installed some add-ons straight from `.../releases/latest/...` and `.../master/...` URLs. Run the same script on two different days and you can get two different versions, so staging and production quietly drift apart. Pin every add-on to a specific version, and change versions on purpose, one environment at a time.

### Implementation notes

- **Make the install repeatable.** The original script checked whether each thing existed before creating it, so it could be re-run safely. Keep that property whatever tool you use.
- **Give each piece one owner.** The OIDC provider was first created by the script and later moved into Terraform, and the script was changed to stop deleting it. Two tools managing the same resource will eventually fight.
- **Prefer managed add-ons and pinned Helm charts over raw manifests.** EKS managed add-ons (VPC CNI, CoreDNS, kube-proxy, the EBS CSI driver, Pod Identity agent, and others) get versioned upgrades with the cluster. The rest can be pinned Helm releases, ideally managed through Argo CD (module 9) so every cluster gets the same set.
- **Graviton nodes need ARM64 images.** If the node groups use AWS Graviton, every add-on and application image must be published for `arm64`. Most well-known add-ons are multi-architecture, but check anything custom before switching.
