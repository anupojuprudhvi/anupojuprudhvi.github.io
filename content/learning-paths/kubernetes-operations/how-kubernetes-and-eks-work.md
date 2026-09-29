---
title: How Kubernetes and Amazon EKS Actually Work
date: 2026-09-29
track: kubernetes-operations
order: 1
module: 1
summary: The mental model everything else builds on. You declare the state you want, and controllers keep working to make it true. This module covers the parts of a cluster, what happens when you run kubectl apply, and exactly what AWS runs for you in EKS and what stays your job.
level: Foundations · Concepts
readingTime: 9 min read
stack: [Kubernetes, Amazon EKS, kubectl, containerd, etcd]
tags: [kubernetes, eks, control-plane, architecture, fundamentals]
related: [healthcare/clinical-platform-modernization-and-cost-optimization, partner-engagements/it-monitoring-tanzu-to-eks-map-assessment]
---

<div class="callout"><b>Before you start: what this track assumes.</b> You know what a container image is, you've built one with a Dockerfile, pushed it to a registry, and run it with <code>docker run</code>. You're comfortable in a terminal and know the basic AWS building blocks (a VPC and its subnets, an IAM role). You don't need any Kubernetes experience; that starts here. If containers are new to you, work through <a href="https://docs.docker.com/get-started/">Docker's getting-started guide</a> first, then come back. The rest of the track will make much more sense.</div>

## Principle · You describe what you want, and Kubernetes keeps making it true

With a plain server, you give instructions: start this process, copy that file, restart the service. If the process crashes at 3 a.m., it stays down until something or someone restarts it.

Kubernetes works the other way round. You write down the **desired state** ("three copies of the `orders-api` image, version 1.4, each with half a CPU"), and you hand it to the cluster. From then on, small programs called **controllers** keep comparing what you asked for with what's actually running, and fix any difference they find. A crashed container gets replaced. A lost node's pods get rescheduled somewhere else. You never tell the cluster *how* to recover; you only told it *what* should exist.

```flow
title: The reconciliation loop behind every Kubernetes feature
* Desired state | what you declared in YAML: "3 replicas of orders-api:1.4"
-> a controller watches both sides
Actual state | what is really running right now: 2 healthy pods
-> the controller sees a difference
Action | start one more pod to get back to 3
-> the cluster changes; the controller checks again
loop: this never stops, so drift and failures are corrected automatically
```

Almost everything in this track is this same loop applied to a different problem. A Deployment controller keeps the right number of pods running. The AWS Load Balancer Controller keeps an ALB matching your Ingress. Argo CD keeps the cluster matching Git. Once this idea clicks, the rest of Kubernetes stops looking like magic.

## Architecture · The control plane decides, the nodes do the work

A cluster has two halves.

The **control plane** is the brain. It stores the desired state, decides where things should run, and runs the controllers. Its main parts:

- **API server:** the front door. Every tool, including `kubectl`, the nodes, and every controller, reads and writes cluster state only through it.
- **etcd:** the database where the API server keeps all cluster state.
- **Scheduler:** picks a node for each new pod, based on the resources the pod requests and the rules it sets.
- **Controller manager:** runs the built-in controllers (Deployments, ReplicaSets, Jobs, and others).

The **worker nodes** are the muscle. They're ordinary virtual machines (EC2 instances on EKS) that actually run your containers. Each node runs:

- **kubelet:** the node's agent. It asks the API server which pods belong on its node, and makes sure they're running.
- **Container runtime** (containerd on EKS): pulls images and starts containers, the same job Docker does on your laptop.
- **kube-proxy** and the **VPC CNI plugin:** give each pod an IP address and route traffic to it. The networking module covers these.

## Flow · What really happens when you run kubectl apply

This is the path a single change takes through a cluster. Knowing it tells you where to look when something doesn't happen: each arrow is a place where things can get stuck.

```flow
title: From kubectl apply to a running container
You | kubectl apply -f deployment.yaml
-> HTTPS request, signed with your IAM identity
group: Control plane
API server | checks who you are and whether you're allowed, then validates the object
-> stores the new desired state
etcd | now holds "Deployment orders-api: 3 replicas"
-> the Deployment and ReplicaSet controllers notice and create 3 Pod objects
Scheduler | picks a node for each pod that has room for its CPU and memory requests
end
-> the pod is now assigned to a node
group: Worker node (EC2 instance in your VPC)
kubelet | sees a new pod assigned to its node
-> asks the runtime to start it
containerd | pulls the image from ECR and starts the container
-> the VPC CNI gives the pod its own IP address from your subnet
* Pod running | readiness probe passes, and the pod starts receiving traffic
end
```

Notice that `kubectl apply` returns as soon as the API server has stored your change, near the top of the diagram. Everything below it happens afterwards, without you. That's why "the command succeeded" and "the app is running" are two different questions, a point the [Incident Triage](incident-triage.html) module returns to.

## EKS · What AWS runs for you, and what stays your job

Amazon EKS is Kubernetes where AWS runs the control plane. You don't install etcd, patch the API server, or back anything up; AWS runs the control plane across several Availability Zones and scales it for you. The control plane lives in an AWS-managed account, and it reaches your nodes through network interfaces that EKS places in your own subnets.

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

## Try it · Look around a cluster

If you have access to any EKS cluster, even an empty one, these read-only commands show the pieces from this module:

```text
# Point kubectl at the cluster (this writes an entry into ~/.kube/config)
aws eks update-kubeconfig --region <region> --name <cluster-name>

# The worker nodes, with their Kubernetes version and internal IPs
kubectl get nodes -o wide

# Everything running in every namespace, including the system add-ons in kube-system
kubectl get pods -A

# Every kind of object the API server knows about
kubectl api-resources

# The control plane's version and API endpoint, as EKS reports them
aws eks describe-cluster --name <cluster-name> --query "cluster.{version:version,endpoint:endpoint}"
```

### Implementation notes

- **Everything is an API object.** Pods, Services, even the rules about who can do what, are records stored through the API server. Tools like Terraform, Helm, and Argo CD are just different ways of writing those records.
- **You can't SSH into the EKS control plane, and you shouldn't need to.** Its logs (API server, audit, authenticator) can be sent to CloudWatch by turning on control plane logging. Turn on at least the audit log for production clusters.
- **Keep the model in your head when debugging.** A pod stuck in `Pending` is a scheduler problem, meaning no node has room. `ImagePullBackOff` happens at the containerd step. A pod that runs but gets no traffic is a readiness or Service problem. The diagram above is the map.
