---
title: Kubernetes on Amazon EKS: What AWS Runs, and What Changes
date: 2026-10-01
track: kubernetes-operations
order: 10
module: 10
summary: Everything from the core concepts still applies on EKS. What changes is who runs the control plane, where pod IP addresses come from, how you sign in, and how traffic gets in from the internet. This module maps each of those, then walks through a small EKS lab you can create and delete.
level: EKS platform · Concepts
readingTime: 12 min read
stack: [Amazon EKS, AWS VPC CNI, AWS IAM, EKS access entries, AWS Load Balancer Controller, eksctl]
tags: [eks, kubernetes, vpc-cni, iam, architecture, fundamentals]
related: [healthcare/clinical-platform-modernization-and-cost-optimization, partner-engagements/it-monitoring-tanzu-to-eks-map-assessment]
---

**In this module, you'll learn to:**

- Say exactly what AWS runs in EKS, and what stays your job
- Explain what changes when pods get real VPC IP addresses
- Follow how an IAM identity becomes a Kubernetes user, and how an ALB reaches a pod
- Create, explore, and delete a small EKS lab cluster

**Before you start:** this builds on the core concepts, especially [How a Cluster Works](04-how-a-cluster-works.html), [Services & Cluster Networking](06-services-and-cluster-networking.html), and [Namespaces, RBAC & Service Accounts](08-namespaces-rbac-and-cluster-access.html). You'll also want the basic AWS building blocks: a VPC and its subnets, and an IAM role.

## Principle · EKS is Kubernetes with the control plane run for you

Amazon EKS is Kubernetes where AWS runs the control plane. You don't install etcd, patch the API server, or back anything up; AWS runs the control plane across several Availability Zones and scales it for you. The control plane lives in an AWS-managed account, and it reaches your nodes through network interfaces that EKS places in your own subnets.

The objects, the YAML, and `kubectl` are exactly the same as on a local cluster. What you learned on kind carries over unchanged.

```flow
title: Where each part of an EKS cluster lives
group: AWS-managed account (run and patched by AWS)
* EKS control plane | API server, etcd, scheduler, and controllers across several AZs
end
-> reaches your nodes through network interfaces EKS creates in your subnets
group: Your AWS account and VPC (your responsibility)
paths
path: Nodes
Managed node groups or Karpenter | EC2 instances running kubelet and containerd
path: Add-ons
Cluster add-ons | VPC CNI, CoreDNS, kube-proxy, load balancer controller
path: Workloads
Your applications | Deployments, Services, config, and their IAM roles
end
end
```

| Part | Who runs it on EKS | What that means for you |
| --- | --- | --- |
| API server, etcd, scheduler | AWS | Nothing to install or back up. You choose the Kubernetes version and when to upgrade it. |
| Worker nodes | You (AWS helps) | Managed node groups or Karpenter create and replace EC2 instances, but you choose instance types, sizes, and when nodes are updated. |
| Networking | Shared | AWS provides the VPC CNI add-on. You design the VPC, subnets, and IP ranges it uses. |
| Add-ons | Shared | EKS managed add-ons are versioned by AWS. You pick versions, give them IAM roles, and install the rest yourself. |
| Access and identity | You | You decide who can reach the cluster, and what each workload may do in AWS. |
| Your applications | You | Everything you deploy, and how it's configured. |

The short version: AWS keeps the control plane alive. Everything that makes the cluster *useful*, and most of what goes wrong in practice, is still on your side. That's what the rest of this track is about.

## Compare · What changes from a local cluster

| | Local kind cluster | Amazon EKS |
| --- | --- | --- |
| Control plane | A container on your laptop | Run by AWS across several AZs |
| Nodes | Docker containers | EC2 instances in your VPC |
| Pod IP addresses | A private range inside Docker | Real IPs from your VPC subnets (VPC CNI) |
| How you sign in | A client certificate kind wrote to your kubeconfig | Your AWS IAM identity, mapped by an access entry |
| Traffic from the internet | `port-forward` or a NodePort | An ALB or NLB, created by the AWS Load Balancer Controller |
| Persistent disks | A folder on your laptop | EBS or EFS volumes, through CSI drivers |
| Cost | Free | An hourly fee per cluster, plus nodes, load balancers, and NAT |

The next three sections cover the rows that catch people out: networking, sign-in, and traffic from the internet.

## Networking · Pods get real VPC IP addresses

On EKS, the **Amazon VPC CNI** plugin gives each pod an IP address from your VPC subnet, the same kind of address an EC2 instance gets. There's no overlay network in between. That has three practical consequences:

- **Anything in the VPC can reach a pod directly** (subject to security groups and network policies), and an ALB can send traffic straight to pod IPs.
- **Pods use up subnet IP addresses.** A small subnet runs out of pod IPs long before the nodes run out of CPU. Size EKS subnets generously (a `/19` or larger per AZ is common), or turn on prefix delegation.
- **Each instance type has a maximum pod count**, based on how many network interfaces and IPs it supports. Very small instances can hit that limit quickly.

## Access · Your IAM identity is your login

Kubernetes has no user accounts of its own, so on EKS your AWS IAM identity is the login. `kubectl` asks the AWS CLI for a short-lived token signed with your IAM credentials, and the cluster checks that signature. An **access entry** then says what that IAM role becomes inside the cluster: either an EKS access policy (such as admin, or edit in one namespace), or a set of Kubernetes groups that your own RBAC bindings grant permissions to.

```flow
title: From an IAM role to a Kubernetes permission
Engineer | signed in to AWS with an IAM role, for example through SSO
-> kubectl calls "aws eks get-token", which signs a token with that identity
group: EKS control plane
Authentication | EKS checks the signature and finds the role's access entry
-> the role becomes a Kubernetes user, in the groups the access entry lists
* RBAC | the same Roles and RoleBindings as on any cluster decide what's allowed
end
```

```text
# Anyone who signs in with this IAM role joins the "orders-readers" group,
# so a RoleBinding for that group applies to them
aws eks create-access-entry --cluster-name dev \
  --principal-arn arn:aws:iam::<your-account-number>:role/<orders-team-role> \
  --kubernetes-groups orders-readers
```

The two errors from the RBAC module mean specific things here. `Unauthorized` means your IAM identity has no access entry on this cluster, or your AWS credentials have expired. `forbidden` means you got in, but RBAC or the access policy doesn't allow that action. [Multi-Environment Clusters](11-multi-environment-clusters-and-access-entries.html) uses access entries to give each environment its own, separate set of permissions.

## Flow · From the internet to a pod on EKS

On EKS, the **AWS Load Balancer Controller** is the usual ingress controller. It watches Ingress objects and creates and configures an Application Load Balancer to match. Because pods have VPC IP addresses, the ALB can send each request straight to a pod.

```flow
title: A request from a user's browser to a pod on EKS
group: Internet
User | https://api.example.com/orders
end
-> DNS resolves the name to the load balancer (Route 53, often kept in sync by ExternalDNS)
group: Your VPC
Application Load Balancer | terminates TLS with an ACM certificate, applies the Ingress rules
-> path /orders matches; target type "ip" sends the request straight to pod IPs
group: EKS cluster
* orders-api pods | only ready pods are registered as targets in the ALB's target group
end
end
```

The AWS Load Balancer Controller, ExternalDNS, and the rest of what a cluster needs before apps arrive are installed in [The Platform Add-on Layer](12-platform-add-ons.html). How many ALBs to run is covered in [Ingress Architecture & Cost](14-ingress-architecture-and-cost.html).

## Try it · A small EKS lab you create, explore, and delete

`eksctl` is the quickest way to get a practice cluster. It creates the VPC, the control plane, and a node group in one command. **This costs money while it runs**: the cluster's hourly fee, two EC2 instances, and a NAT gateway. Check current EKS pricing, and delete the cluster when you're done.

```text
# Create a small practice cluster (takes about 15 minutes)
eksctl create cluster --name lab --region <region> \
  --node-type t3.medium --nodes 2

# eksctl updates ~/.kube/config for you; for any other cluster:
aws eks update-kubeconfig --region <region> --name lab

# The same commands as on kind, now against EC2 nodes
kubectl get nodes -o wide
kubectl get pods -A

# Pod IPs now come from your VPC subnets
kubectl get pods -A -o wide

# The control plane's version and API endpoint, as EKS reports them
aws eks describe-cluster --name lab --query "cluster.{version:version,endpoint:endpoint}"

# Delete everything eksctl created, so it stops costing money
eksctl delete cluster --name lab --region <region>
```

In production, clusters are usually defined in Terraform rather than `eksctl`, so their configuration is reviewed and versioned like the rest of your infrastructure.

### Implementation notes

- **You can't SSH into the EKS control plane, and you shouldn't need to.** Its logs (API server, audit, authenticator) can be sent to CloudWatch by turning on control plane logging. Turn on at least the audit log for production clusters.
- **Plan subnet sizes before the first cluster.** Running out of pod IPs is painful to fix later, because it means new subnets and replacing node groups.
- **The cluster creator gets admin access by default.** Whoever created the cluster can administer it until you change that. Give access deliberately through access entries instead of relying on who happened to create it.
- **Delete practice clusters the same day.** Load balancers and volumes created from inside the cluster are AWS resources too. Delete Ingresses and PersistentVolumeClaims before the cluster, or check for leftovers afterwards.

## Recap · Key terms

- **Amazon EKS:** managed Kubernetes, where AWS runs the control plane.
- **VPC CNI:** the network plugin that gives each pod an IP address from your VPC subnets.
- **Access entry:** maps an IAM role to what it can do inside an EKS cluster.
- **AWS Load Balancer Controller:** creates ALBs and NLBs from Ingress and Service objects.
- **Target type ip:** the ALB sends traffic straight to pod IP addresses.
- **eksctl:** a command-line tool for creating EKS clusters quickly.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: On EKS, who patches the API server and backs up etcd?
* AWS
- You, through managed node groups
- The VPC CNI add-on
- Nobody; EKS doesn't use etcd
= AWS runs the control plane across several Availability Zones. You choose the version and when to upgrade, but patching and backups are AWS's job.
S: Your EKS nodes have plenty of free CPU, but new pods are stuck and the events mention IP addresses. What's the likely cause?
- The control plane is overloaded
* The subnets have run out of free IP addresses, because each pod uses one
- The ALB has too many targets
- The images are too large
= With the VPC CNI, every pod takes a real subnet IP. Small subnets run out of IPs long before nodes run out of CPU. Size subnets generously, or use prefix delegation.
S: An engineer gets `Unauthorized` from kubectl on an EKS cluster. What's the most likely cause?
- Their RBAC Role is missing the `get` verb
* Their IAM role has no access entry on this cluster, or their AWS credentials have expired
- The namespace doesn't exist
- The cluster has no nodes
= `Unauthorized` is an authentication failure: EKS doesn't recognise the IAM identity. A missing RBAC permission gives `Forbidden` instead.
Q: With `target-type: ip`, where does the Application Load Balancer send a request?
- To a NodePort on every node
- To kube-proxy, which picks a pod
* Straight to a ready pod's VPC IP address
- To the EKS control plane
= Because pods have VPC IPs, the ALB can target them directly and skip a hop. Only ready pods are registered, so readiness probes still decide who gets traffic.
Q: You've finished with your `eksctl` lab cluster. What should you do?
- Scale the node group to zero and leave it
- Nothing; idle clusters are free
* Delete the Ingresses and PVCs that created AWS resources, then delete the cluster
- Terminate the nodes from the EC2 console
= The control plane, the NAT gateway, and any load balancers or volumes cost money while they exist. Remove what the cluster created, then the cluster itself.
```
