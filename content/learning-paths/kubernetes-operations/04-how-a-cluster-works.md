---
title: How a Kubernetes Cluster Actually Works
date: 2026-09-29
updated: 2026-10-01
track: kubernetes-operations
order: 4
module: 4
summary: The mental model everything else builds on. You declare the state you want, and controllers keep working to make it true. This module covers the parts of a cluster and what happens, step by step, when you run kubectl apply.
level: Core concepts · Architecture
readingTime: 8 min read
stack: [Kubernetes, kubectl, containerd, etcd]
tags: [kubernetes, control-plane, architecture, fundamentals]
redirectFrom: [how-kubernetes-and-eks-work]
---

**Before you start:** you've run a container and used `kubectl` against a cluster at least once. A free local cluster is all you need for this module.

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

Almost everything in this track is this same loop applied to a different problem. A Deployment controller keeps the right number of pods running. A load balancer controller keeps a cloud load balancer matching your Ingress. Argo CD keeps the cluster matching Git. Once this idea clicks, the rest of Kubernetes stops looking like magic.

## Architecture · The control plane decides, the nodes do the work

A cluster has two halves.

The **control plane** is the brain. It stores the desired state, decides where things should run, and runs the controllers. Its main parts:

- **API server:** the front door. Every tool, including `kubectl`, the nodes, and every controller, reads and writes cluster state only through it.
- **etcd:** the database where the API server keeps all cluster state.
- **Scheduler:** picks a node for each new pod, based on the resources the pod requests and the rules it sets.
- **Controller manager:** runs the built-in controllers (Deployments, ReplicaSets, Jobs, and others).

The **worker nodes** are the muscle. They're ordinary machines (a Docker container in a local kind cluster, EC2 instances on Amazon EKS) that actually run your containers. Each node runs:

- **kubelet:** the node's agent. It asks the API server which pods belong on its node, and makes sure they're running.
- **Container runtime** (usually containerd): pulls images and starts containers, the same job Docker does on your laptop.
- **kube-proxy** and a **network plugin (CNI):** give each pod an IP address and route traffic to it. The networking module covers these.

```flow
title: The two halves of every cluster
group: Control plane
* API server | the only way in, for people, tools, nodes, and controllers
etcd | stores every object
Scheduler and controllers | decide where pods go, and keep fixing differences
end
-> nodes ask the API server what they should be running
group: Worker nodes
kubelet | starts and watches the pods assigned to this node
containerd | pulls images and runs containers
kube-proxy and CNI | pod IP addresses and routing
end
```

## Flow · What really happens when you run kubectl apply

This is the path a single change takes through a cluster. Knowing it tells you where to look when something doesn't happen: each arrow is a place where things can get stuck.

```flow
title: From kubectl apply to a running container
You | kubectl apply -f deployment.yaml
-> HTTPS request, carrying your credentials
group: Control plane
API server | checks who you are and whether you're allowed, then validates the object
-> stores the new desired state
etcd | now holds "Deployment orders-api: 3 replicas"
-> the Deployment and ReplicaSet controllers notice and create 3 Pod objects
Scheduler | picks a node for each pod that has room for its CPU and memory requests
end
-> the pod is now assigned to a node
group: Worker node
kubelet | sees a new pod assigned to its node
-> asks the runtime to start it
containerd | pulls the image from the registry and starts the container
-> the network plugin gives the pod its own IP address
* Pod running | readiness probe passes, and the pod starts receiving traffic
end
```

Notice that `kubectl apply` returns as soon as the API server has stored your change, near the top of the diagram. Everything below it happens afterwards, without you. That's why "the command succeeded" and "the app is running" are two different questions, a point the [Incident Triage](19-incident-triage.html) module returns to.

On a managed service such as Amazon EKS, the control plane half of this diagram is run by the cloud provider and the worker nodes are yours. [Kubernetes on Amazon EKS](10-kubernetes-on-eks.html) covers exactly where that line falls.

## Try it · Look around a cluster

These read-only commands work on any cluster, including a local kind cluster:

```text
# The worker nodes, with their Kubernetes version and internal IPs
kubectl get nodes -o wide

# Everything running in every namespace, including the system pods in kube-system
kubectl get pods -A

# On kind you can see the control plane itself: etcd, the API server,
# the scheduler, and the controller manager all run as pods in kube-system
kubectl get pods -n kube-system -o wide

# Every kind of object the API server knows about
kubectl api-resources

# Watch the reconciliation loop: delete a pod a Deployment owns,
# and a replacement appears within seconds
kubectl get pods -w
```

### Implementation notes

- **Everything is an API object.** Pods, Services, even the rules about who can do what, are records stored through the API server. Tools like Terraform, Helm, and Argo CD are just different ways of writing those records.
- **Nobody talks to etcd or the nodes directly.** Even the kubelet on each node gets its instructions from the API server. If the API server is unreachable, running pods keep running, but nothing new can be changed.
- **Keep the model in your head when debugging.** A pod stuck in `Pending` is a scheduler problem, meaning no node has room. `ImagePullBackOff` happens at the containerd step. A pod that runs but gets no traffic is a readiness or Service problem. The diagram above is the map.
