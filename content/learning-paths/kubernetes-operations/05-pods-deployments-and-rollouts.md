---
title: Pods, Deployments & Rollouts: How Your App Actually Runs
date: 2026-09-29
updated: 2026-10-01
track: kubernetes-operations
order: 5
module: 5
summary: The objects you'll write every day. Pods wrap your containers, Deployments keep the right number running and replace them safely, and probes tell Kubernetes when a container is really ready. Plus configuration, and a rolling update step by step.
level: Core concepts · Workloads
readingTime: 11 min read
stack: [Kubernetes, kubectl, Deployments, ReplicaSets, ConfigMaps]
tags: [kubernetes, pods, deployments, rollouts, probes, fundamentals]
redirectFrom: [pods-deployments-and-rollouts]
related: [healthcare/clinical-platform-modernization-and-cost-optimization]
---

**Before you start:** read [How a Cluster Works](04-how-a-cluster-works.html) first. This module assumes the idea of desired state and controllers, and that you know how to build and run a container image.

## Principle · A Pod is a wrapper around your container, and it's disposable

You never run a container on Kubernetes directly. You run a **Pod**: the smallest thing the cluster schedules. A pod holds one container (occasionally a few that must live together, such as an app plus a log-shipping helper), and everything in it shares one IP address and can share storage.

The key fact about pods is that **they're disposable**. When a node fails, a pod is evicted, or you deploy a new version, the old pod is deleted and a *new* one is created, with a new name and a new IP address. Nothing ever repairs a pod in place. So you almost never create pods yourself. You create a **Deployment**, and let it create and replace pods for you.

```flow
title: Who owns what: the chain from Deployment to container
* Deployment orders-api | you write this: image, replica count, update strategy
-> creates and manages one ReplicaSet per version of the pod template
ReplicaSet orders-api-7c9d | keeps exactly 3 pods matching this version running
-> creates or deletes pods to match the count
paths
path: Pod 1
orders-api-7c9d-a1 | container: orders-api:1.4, IP 10.0.12.34
path: Pod 2
orders-api-7c9d-b2 | container: orders-api:1.4, IP 10.0.40.18
path: Pod 3
orders-api-7c9d-c3 | container: orders-api:1.4, IP 10.0.71.9
end
```

## Pattern · A Deployment you can actually run in production

This is a complete, realistic Deployment. Every field below the image is there for a reason, and each is explained after the listing.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders-api
  namespace: orders
spec:
  replicas: 3
  selector:
    matchLabels:
      app: orders-api            # which pods this Deployment owns
  strategy:
    rollingUpdate:
      maxSurge: 1                # at most 1 extra pod during an update
      maxUnavailable: 0          # never drop below 3 ready pods
  template:                      # the pod template: what each pod looks like
    metadata:
      labels:
        app: orders-api
    spec:
      containers:
        - name: orders-api
          image: <account>.dkr.ecr.<region>.amazonaws.com/orders-api@sha256:<digest>
          ports:
            - containerPort: 8080
          envFrom:
            - configMapRef:
                name: orders-api-config
          resources:
            requests: { cpu: 250m, memory: 256Mi }
            limits: { memory: 512Mi }
          readinessProbe:
            httpGet: { path: /healthz/ready, port: 8080 }
            periodSeconds: 5
          livenessProbe:
            httpGet: { path: /healthz/live, port: 8080 }
            initialDelaySeconds: 15
            periodSeconds: 10
```

- **`selector` and `labels`** are how Kubernetes connects objects. The Deployment owns every pod labelled `app: orders-api`, and a Service will find the pods by the same label in the next module.
- **`resources`** says how much CPU and memory each container needs, and the most it may use. The next section explains it.
- **The image is pinned by digest**, so every pod runs exactly the same bytes. [Container Delivery](15-container-delivery-to-eks.html) explains why.

## Resources · Requests and limits

Every container should say how much CPU and memory it needs. Kubernetes uses two numbers:

- **Requests** are a reservation. The scheduler only places a pod on a node with that much unreserved CPU and memory left. If no node has room, the pod waits in `Pending`.
- **Limits** are a ceiling. A container that uses more CPU than its limit is slowed down (throttled). A container that uses more memory than its limit is killed and restarted, shown as `OOMKilled`.

CPU is measured in cores, so `250m` (250 millicores) is a quarter of a CPU. Memory uses binary units: `256Mi` is 256 mebibytes, `1Gi` is one gibibyte.

| Setting | What happens | If it's wrong |
| --- | --- | --- |
| CPU request | Reserves CPU on a node for scheduling | Too high wastes nodes; too low packs pods onto busy nodes |
| Memory request | Reserves memory on a node for scheduling | Too low lets nodes run out of memory and evict pods |
| CPU limit | Throttles the container above it | Too low makes the app slow even when the node is idle |
| Memory limit | Kills the container above it | Too low causes restarts under normal load |

A good starting point is the one in the Deployment above: CPU and memory requests based on real usage, a memory limit, and often no CPU limit, so a busy pod can borrow idle CPU. Requests also drive autoscaling and most of the cloud bill, which is why [Scaling & Cost](17-scaling-requests-and-cost.html) comes back to them in depth.

```text
# Real usage per pod (needs metrics-server; see the add-ons module)
kubectl top pods

# Why is my pod Pending? The Events section names the missing resource
kubectl describe pod <pod-name>
```

## Probes · How Kubernetes knows your app is ready, and still alive

A container process being *started* doesn't mean the app is *ready*. It may still be loading config, warming a cache, or connecting to a database. Probes let the app tell Kubernetes the truth.

| Probe | Question it answers | What happens if it fails |
| --- | --- | --- |
| Readiness | "Can this pod take traffic right now?" | The pod is taken out of its Service's endpoints, so it gets no requests. It isn't restarted. |
| Liveness | "Is this container stuck beyond repair?" | The kubelet kills and restarts the container. |
| Startup | "Has a slow app finished starting yet?" | Holds off the liveness probe until startup succeeds, so slow starters aren't killed mid-boot. |

The most common mistake is making the liveness probe check a dependency, such as the database. When the database has a blip, every pod fails liveness at once, and Kubernetes restarts your whole app, which makes the outage worse. **Liveness should only check the process itself.** Put dependency checks in readiness.

## Flow · A rolling update, step by step

Change the image in the Deployment, and the Deployment controller replaces pods gradually, never dropping below the number of ready pods you asked for. With `maxSurge: 1` and `maxUnavailable: 0`, it looks like this:

```flow
title: Rolling update from v1.4 to v1.5 with 3 replicas
Start | 3 pods on v1.4, all ready and serving traffic
-> you change the image to v1.5 and apply
Surge | a new ReplicaSet starts 1 pod on v1.5 (4 pods for a moment)
-> the v1.5 pod passes its readiness probe and joins the Service
Swap | the old ReplicaSet scales down by 1 v1.4 pod
-> repeat, one pod at a time
* Done | 3 pods on v1.5; the old ReplicaSet stays at 0 pods, kept for rollback
```

If a new pod **never becomes ready**, the rollout simply stops at that step: old pods keep serving and users aren't affected. That's the safety net readiness probes give you, and it's why a Deployment without a readiness probe can take a working service down with a bad release.

```text
# Watch a rollout until it finishes, or report that it failed
kubectl rollout status deployment/orders-api -n orders

# See the ReplicaSets: one per version, the old one scaled to 0
kubectl get replicasets -n orders -l app=orders-api

# Go back to the previous version, reusing the kept ReplicaSet
kubectl rollout undo deployment/orders-api -n orders
```

## Configuration · ConfigMaps and Secrets

Build one image and configure it per environment, rather than baking settings into the image. A **ConfigMap** holds plain settings (log level, feature flags, URLs) and can be injected as environment variables, as in the Deployment above, or mounted as files.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: orders-api-config
  namespace: orders
data:
  LOG_LEVEL: info
  PAYMENTS_URL: http://payments.payments.svc.cluster.local
```

A Kubernetes **Secret** looks similar, but its values are only base64-encoded, not encrypted, so anyone who can read Secrets in that namespace can read the values. For real credentials, the better pattern is to keep them in AWS Secrets Manager and sync them in, covered in [Workload Identity & Secrets](13-workload-identity-and-secrets.html). One gotcha: pods read environment variables **once, at start-up**. Changing a ConfigMap doesn't change running pods until they restart (`kubectl rollout restart deployment/orders-api -n orders`).

Deployments suit apps whose pods are interchangeable and keep no data of their own. Databases, node agents, and one-off or scheduled tasks need other controllers (StatefulSets, DaemonSets, Jobs, and CronJobs), covered in [Storage & Other Workload Types](07-storage-and-workload-types.html).

### Implementation notes

- **Always set a readiness probe on anything that receives traffic.** Without one, a pod counts as ready the moment its process starts.
- **Always set memory requests, and a memory limit.** A container that goes over its memory limit is killed (`OOMKilled`). Without a limit, one leaking pod can starve every other pod on the node.
- **Run at least two replicas of anything users depend on.** A single pod means every deploy, node replacement, or crash is an outage.
- **Use `kubectl explain` to learn any field.** For example, `kubectl explain deployment.spec.strategy` prints the documentation for that field, straight from your cluster's version.
