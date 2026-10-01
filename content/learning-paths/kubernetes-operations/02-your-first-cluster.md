---
title: Your First Cluster: A Free Local Lab with kind
date: 2026-10-01
track: kubernetes-operations
order: 2
module: 2
summary: Build a real, multi-node Kubernetes cluster on your own laptop with kind, at no cost. Run an app, reach it from your browser, delete a pod and watch Kubernetes replace it, scale it up, look inside it, and clean up. This lab is used throughout Parts 1 and 2.
level: Basics · Hands-on lab
readingTime: 12 min read
stack: [kind, kubectl, Docker, Kubernetes]
tags: [kubernetes, kind, kubectl, lab, basics, beginner]
---

**In this module, you'll learn to:**

- Install Docker, kubectl, and kind, and create a three-node cluster on your laptop
- Run, expose, scale, and inspect an app with kubectl
- Watch Kubernetes replace a pod you delete, then clean everything up

**Before you start:** read [Why Kubernetes Exists](01-why-kubernetes.html). You'll need a laptop with about 4 GB of free memory and permission to install software.

## Principle · Learn on a cluster you can break for free

The fastest way to learn Kubernetes is to use it, break it, and watch what happens. That needs a cluster you own, that costs nothing, and that you can delete and recreate in a minute.

**kind** (Kubernetes in Docker) gives you exactly that. It runs each Kubernetes node as a Docker container on your laptop. It's a real cluster, running the same Kubernetes that runs in the cloud, so every command in Parts 1 and 2 of this track works on it. The Kubernetes project itself uses kind to test Kubernetes.

```flow
title: What kind builds on your laptop
group: Your laptop
You | type kubectl commands in a terminal
-> kubectl reads ~/.kube/config to find the cluster and your credentials
group: Docker
* lab-control-plane | a container running the API server, etcd, and scheduler
-> tells the worker nodes what to run
paths
path: Node 1
lab-worker | a container acting as a node; your pods run inside it
path: Node 2
lab-worker2 | a second node, so you can see pods spread out
end
end
end
```

Other local options exist, such as minikube and the Kubernetes switch in Docker Desktop. They work too; this track uses kind because it's light, quick to recreate, and makes multi-node clusters easy.

## Setup · Install Docker, kubectl, and kind

You need three tools:

- **Docker:** Docker Desktop on macOS and Windows (on Windows it uses WSL 2), or Docker Engine on Linux. kind needs it running.
- **kubectl:** the Kubernetes command-line tool. It works with every cluster, local or cloud.
- **kind:** creates and deletes the local cluster.

```text
# macOS, with Homebrew
brew install kubectl kind

# Windows, with winget (then restart the terminal)
winget install -e --id Kubernetes.kubectl
winget install -e --id Kubernetes.kind

# Linux: follow the "Installing from release binaries" steps on
# kind.sigs.k8s.io, and the kubectl install page on kubernetes.io

# Check everything is installed
docker version
kubectl version --client
kind version
```

## Create · A three-node cluster

Save this as `kind-lab.yaml`. It asks for one control-plane node and two workers, so you can see pods spread across machines:

```yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
  - role: worker
  - role: worker
```

```text
# Create the cluster (takes a minute or two the first time)
kind create cluster --name lab --config kind-lab.yaml

# kind points kubectl at the new cluster for you; check it worked
kubectl cluster-info --context kind-lab
kubectl get nodes

# The "nodes" are really Docker containers
docker ps --format "table {{.Names}}\t{{.Status}}"
```

You should see three nodes, `lab-control-plane`, `lab-worker`, and `lab-worker2`, all `Ready`.

## Run · Your first app on Kubernetes

Start two copies of the nginx web server, give them a stable address, and open it in your browser:

```text
# Ask for 2 copies of nginx. Kubernetes picks the nodes.
kubectl create deployment hello --image=nginx:1.27 --replicas=2

# Watch them start; -o wide shows which node each pod landed on
kubectl get pods -o wide

# Put a stable address (a Service) in front of both copies
kubectl expose deployment hello --port=80

# Forward a port from your laptop to the Service, then open
# http://localhost:8080 in a browser (Ctrl+C to stop)
kubectl port-forward service/hello 8080:80
```

You just did, in four commands, what the last module described: scheduled containers onto machines, kept a set number running, and put a stable address in front of them.

## Watch · Kubernetes fixing things on its own

This is the moment Kubernetes clicks for most people. Open a second terminal and watch the pods:

```text
# Terminal 1: watch pods live
kubectl get pods -w

# Terminal 2: delete one of the pods (use a real name from the list)
kubectl delete pod hello-<random-suffix>
```

In terminal 1, the pod you deleted goes to `Terminating`, and a **new pod with a different name** appears and starts running within seconds. You didn't ask for that. You'd asked for two copies, there was one, so Kubernetes made another. That's the **reconciliation loop**, and [How a Cluster Works](04-how-a-cluster-works.html) explains exactly how it works.

```flow
title: What happened when you deleted a pod
* Desired state | the Deployment says: 2 copies of hello
-> you deleted one pod
Actual state | only 1 copy running
-> a controller notices the difference within a second
Fix | a new pod is created and scheduled onto a node
loop: the cluster keeps checking, so this happens every time, without anyone watching
```

## Explore · Scale, look inside, and read logs

```text
# Scale to 4 copies, then back to 2
kubectl scale deployment hello --replicas=4
kubectl get pods -o wide
kubectl scale deployment hello --replicas=2

# Read a pod's logs (each request you made through port-forward shows up)
kubectl logs deployment/hello

# The full story of one pod: node, IP, image, and recent events
kubectl describe pod hello-<random-suffix>

# Open a shell inside a running container, look around, then type exit
kubectl exec -it deployment/hello -- sh
```

When you build your own image, kind can load it straight into the cluster without a registry:

```text
docker build -t my-app:dev .
kind load docker-image my-app:dev --name lab
kubectl create deployment my-app --image=my-app:dev
```

## Clean up · Delete and recreate whenever you like

```text
# Remove just the app
kubectl delete service hello
kubectl delete deployment hello

# Or delete the whole cluster; recreating it takes a minute
kind delete cluster --name lab
```

Get used to deleting the cluster. A fresh cluster is the quickest fix for a lab that's in a confusing state, and it costs nothing.

### Implementation notes

- **Check which cluster you're talking to.** `kubectl config current-context` shows it. On a laptop with a lab cluster and real work clusters, running a command against the wrong one is the classic mistake. [Multi-Environment Clusters](11-multi-environment-clusters-and-access-entries.html) returns to this.
- **Pin image versions, even in a lab.** `nginx:1.27` behaves the same tomorrow; `nginx` (which means `nginx:latest`) might not.
- **`ImagePullBackOff` with a local image** usually means you forgot `kind load docker-image`, or the tag in the Deployment doesn't match the one you loaded.
- **If Docker isn't running, kind can't create anything.** Most install problems come down to that, or to too little memory allocated to Docker Desktop.

## Recap · Key terms

- **kind:** a tool that runs a Kubernetes cluster as Docker containers on your machine.
- **kubectl:** the command-line tool for talking to any Kubernetes cluster.
- **kubeconfig:** the file (`~/.kube/config`) that tells kubectl which clusters exist and how to sign in to them.
- **Context:** one cluster-plus-credentials entry in your kubeconfig; `kubectl config current-context` shows the active one.
- **Port-forward:** a temporary tunnel from your laptop to something inside the cluster, for testing.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: In a kind cluster, what is each Kubernetes node?
- A virtual machine created by kind
* A Docker container on your laptop
- A process running directly on your operating system
- A cloud server that kind rents for you
= kind runs each node, including the control plane, as a Docker container. That's why Docker must be running, and why `docker ps` lists the nodes.
S: You delete one pod of a Deployment that asks for 2 replicas. What happens?
- The Deployment runs 1 replica until you scale it again
- The pod restarts with the same name and IP address
* A new pod with a new name is created to get back to 2
- The whole Deployment is deleted
= The desired state is 2 copies. A controller sees only 1 and creates a replacement, with a new name and IP. Pods are never repaired in place.
Q: How does kubectl know which cluster to send commands to?
- It asks Docker for the nearest cluster
* It reads the current context from your kubeconfig file
- It always uses the cluster you created most recently
- You pass the cluster's IP address with every command
= `kind create cluster` writes a context into `~/.kube/config` and makes it current. `kubectl config current-context` shows which one is active, a habit worth keeping once you have real clusters too.
Q: What's `kubectl port-forward service/hello 8080:80` for?
- Publishing the Service to the internet on port 8080
- Changing the Service's port from 80 to 8080
* Reaching the Service from your own laptop while the command runs
- Forwarding traffic between two pods
= Port-forward opens a temporary tunnel from your machine, through the API server, to the Service. It stops when you press Ctrl+C, and it isn't a way to serve real users.
S: Your Deployment uses an image you built locally, and on kind its pods show `ImagePullBackOff`. What's the most likely fix?
- Restart Docker Desktop
* Run `kind load docker-image` so the image is inside the cluster's nodes
- Recreate the Deployment with more replicas
- Push the image to the control plane
= kind's nodes can't see images in your laptop's Docker until you load them in. Without that, or a registry, the node tries to pull the image and fails.
```
