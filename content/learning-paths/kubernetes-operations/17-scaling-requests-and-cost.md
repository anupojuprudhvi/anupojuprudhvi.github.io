---
title: Scaling Without Surprises: Requests, Autoscaling & Cost
date: 2026-09-28
updated: 2026-10-01
track: kubernetes-operations
order: 17
module: 17
summary: Why resource requests drive almost everything in an EKS cluster — scheduling, autoscaling, and the bill — and how pod and node autoscaling fit together.
level: Production · Capacity
readingTime: 10 min read
stack: [Amazon EKS, Kubernetes, Horizontal Pod Autoscaler, Karpenter, Cluster Autoscaler]
tags: [autoscaling, cost, capacity, eks, kubernetes]
redirectFrom: [scaling-requests-and-cost, 05-scaling-requests-and-cost]
related: [partner-engagements/it-monitoring-tanzu-to-eks-map-assessment, healthcare/clinical-platform-modernization-and-cost-optimization]
---

**In this module, you'll learn to:**

- Explain why resource requests drive scheduling, autoscaling, and cost
- Combine pod autoscaling (HPA) with node autoscaling (Cluster Autoscaler or Karpenter)
- Protect workloads during scale-down with PodDisruptionBudgets

**Before you start:** you'll want metrics-server running in the cluster ([Platform Add-ons](12-platform-add-ons.html) covers installing it) and `kubectl top` working.

## Principle · Requests are a promise, and the cluster plans around them

Every scaling decision in Kubernetes starts from resource requests. The scheduler places a pod on a node only if the node has room for what the pod *requests*, not what it actually uses. Node autoscalers add nodes when pods can't be placed. The Horizontal Pod Autoscaler measures CPU as a percentage of the request.

So when requests are wrong, everything built on top of them is wrong too. Set them too high and you pay for nodes that sit half-empty. Set them too low, or leave them out, and pods get packed onto nodes that can't actually carry them.

```yaml
resources:
  requests:
    cpu: 250m        # what the scheduler reserves for this pod
    memory: 256Mi
  limits:
    memory: 512Mi    # hard ceiling: going over gets the container OOMKilled
```

Limits behave differently for CPU and memory. Going over a CPU limit slows the container down (it gets throttled). Going over a memory limit kills it. That's why many teams set a memory limit but leave CPU unlimited, so a busy pod can borrow idle CPU instead of being throttled while the node has spare capacity.

## Two layers of autoscaling

It helps to keep the two layers apart in your head:

- **Pods scale out** with the Horizontal Pod Autoscaler (HPA). It adds or removes replicas based on a metric, usually CPU or memory usage relative to the request.
- **Nodes scale out** with Cluster Autoscaler or Karpenter. They add capacity when pods are stuck in `Pending` because no node has room, and remove nodes that sit mostly idle.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70   # 70% of the CPU *request*, not of the node
```

The HPA needs metrics-server (or another metrics source) running in the cluster, and it needs requests set on the pods it watches. Without a CPU request there's nothing to calculate a percentage against, and it won't scale on CPU.

Here's how the two layers work together when traffic spikes:

```flow
title: A traffic spike, from busy pods to a new node
Traffic rises | the api pods average 90% of their CPU request
-> metrics-server reports usage; the HPA checks every 15 seconds
HPA | target is 70%, so it raises replicas from 3 to 5
-> the scheduler places what fits
paths
path: Room on existing nodes
New pod 4 | scheduled right away and serving within seconds
path: No room left
New pod 5 | stuck in Pending: no node has 250m CPU free
-> Karpenter or Cluster Autoscaler sees the Pending pod
* New EC2 node | joins the cluster in about a minute; pod 5 is scheduled on it
end
loop: when traffic falls, the HPA removes pods, then the node autoscaler removes nodes left mostly empty
```

### Choosing a node autoscaler

- **Cluster Autoscaler** works through your existing node groups. It grows or shrinks an Auto Scaling group, so every new node looks like the ones you defined up front. It's predictable and easy to reason about.
- **Karpenter** skips node groups and launches EC2 instances directly, picking instance types that fit the pods that are waiting. It usually packs workloads more tightly and reacts faster, and it can mix Spot and On-Demand capacity. The trade-off is that you describe what's *allowed* rather than exactly what you get.
- Whichever you choose, run one. Two node autoscalers acting on the same capacity will fight each other.

## Keeping scale-down from hurting you

Scaling in is where outages hide. When a node autoscaler removes a node, or a Spot instance is reclaimed (AWS gives a two-minute warning), the pods on it are evicted. A PodDisruptionBudget tells Kubernetes how many replicas must stay up during that kind of voluntary disruption.

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: api
```

A PDB only protects against *voluntary* disruptions: drains, scale-downs, upgrades. It does nothing for a crash or a node that dies outright. For that you still need more than one replica, spread across Availability Zones.

### Implementation notes

- **Start from real usage, not guesses.** Watch actual CPU and memory for a week (`kubectl top pods`, Container Insights, or your metrics stack) and set requests a little above the typical peak.
- **A PDB with `minAvailable` equal to the replica count blocks every drain.** It looks safe, but it quietly stops node upgrades and scale-down until someone notices.
- **Idle capacity is the most common hidden cost.** Nodes sized for requests that nobody uses cost exactly the same as busy ones. Check the gap between requested and used resources regularly.
- **Spot suits stateless, replicated workloads.** Keep anything that can't tolerate a two-minute eviction on On-Demand capacity.

## Recap · Key terms

- **HPA:** the Horizontal Pod Autoscaler, which changes replica counts based on a metric.
- **Cluster Autoscaler:** grows and shrinks node groups when pods can't be placed or nodes sit idle.
- **Karpenter:** launches right-sized EC2 instances directly for waiting pods.
- **PodDisruptionBudget (PDB):** how many replicas must stay up during voluntary disruptions.
- **Throttling:** slowing down a container that goes over its CPU limit.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: An HPA targets 70% CPU utilization. 70% of what?
- The node's CPU
* The pods' CPU request
- The pods' CPU limit
- The cluster's total CPU
= The HPA measures usage as a percentage of the request. Without a CPU request there's nothing to calculate against, so it won't scale on CPU.
S: The HPA adds pods, but some stay `Pending`. What adds capacity for them?
- The HPA itself
- The scheduler
* The node autoscaler (Cluster Autoscaler or Karpenter), reacting to the Pending pods
- metrics-server
= Pod autoscaling and node autoscaling are separate layers. Pending pods are the signal for the node autoscaler to add a node.
S: A PDB sets `minAvailable` equal to the Deployment's replica count. What's the side effect?
- Faster rollouts
* Node drains, upgrades, and scale-down are blocked, because no pod may ever be evicted
- More replicas are created
- Nothing; it's the safest setting
= A budget that allows zero disruptions stalls every voluntary eviction. It looks safe, but it quietly stops upgrades and scale-down.
Q: Requests are set far higher than what pods actually use. What's the main effect?
* You pay for nodes that sit mostly empty
- Pods get OOMKilled
- The HPA scales too slowly
- Pods are throttled
= The scheduler reserves what's requested, so nodes fill up on paper while staying idle in reality. That idle capacity is a common hidden cost.
Q: What doesn't a PodDisruptionBudget protect against?
- Node drains during an upgrade
- Scale-down by the node autoscaler
* A node that crashes outright
- `kubectl drain`
= PDBs only cover voluntary disruptions. For crashes you still need several replicas, spread across Availability Zones.
```
