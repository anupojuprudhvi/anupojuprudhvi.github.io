---
title: Services & Cluster Networking: How Traffic Finds Your Pods
date: 2026-09-29
track: kubernetes-operations
order: 3
module: 3
summary: Pods come and go with new IP addresses, so nothing should talk to a pod directly. How Services give a stable name and address, how cluster DNS and kube-proxy route each request, how EKS gives pods real VPC IPs, and how traffic from the internet reaches a pod.
level: Foundations · Networking
readingTime: 10 min read
stack: [Kubernetes, Amazon EKS, AWS VPC CNI, CoreDNS, kube-proxy, AWS Load Balancer Controller]
tags: [kubernetes, services, networking, dns, vpc-cni, ingress, fundamentals]
related: [tolling/eks-ingress-incident-rca, healthcare/zero-public-ingress-network-security]
---

**Before you start:** this builds on [Pods, Deployments & Rollouts](pods-deployments-and-rollouts.html), especially labels and readiness probes. A basic idea of IP addresses, DNS, and VPC subnets helps.

## Principle · Never talk to a pod, talk to a Service

In the last module, every rollout created new pods with new IP addresses. If the `checkout` app called `orders-api` at `10.0.12.34`, that call would break on the next deploy. So Kubernetes adds a stable layer in front: a **Service**.

A Service gives a group of pods one name and one address that never change. It finds its pods using the same labels the Deployment uses, and keeps an up-to-date list of the ones that are **ready**. That list is stored as **EndpointSlices**, and it changes every time a pod starts, stops, or passes or fails its readiness probe.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: orders-api
  namespace: orders
spec:
  selector:
    app: orders-api        # the same label as the Deployment's pods
  ports:
    - port: 80             # the port callers use
      targetPort: 8080     # the port the container listens on
```

## Flow · One request from one pod to another, inside the cluster

Here's what happens when code in the `checkout` pod calls `http://orders-api.orders`:

```flow
title: Pod-to-pod traffic through a ClusterIP Service
checkout pod | calls http://orders-api.orders
-> DNS lookup inside the cluster
CoreDNS | orders-api.orders.svc.cluster.local resolves to 172.20.88.14
-> the request goes to that Service address (ClusterIP)
* Service orders-api | a virtual IP. No process listens on it; it's a routing rule
-> kube-proxy's rules on the node pick one ready pod and rewrite the address
paths
path: Ready
orders-api pod 1 | 10.0.12.34:8080 receives the request
path: Ready
orders-api pod 2 | 10.0.40.18:8080
path: Not ready
orders-api pod 3 | failing readiness, so not in the list and gets no traffic
end
```

Two things to take from this:

- **The DNS name is `<service>.<namespace>`.** From inside the same namespace, `orders-api` alone works. From another namespace, use `orders-api.orders`. The full form is `orders-api.orders.svc.cluster.local`.
- **The ClusterIP isn't a real machine.** It exists only as routing rules that **kube-proxy** writes on every node. That's why you can't ping it, and why a "connection refused" there usually means there are no ready pods behind it.

## EKS · Pods get real VPC IP addresses

On EKS, the **Amazon VPC CNI** plugin gives each pod an IP address from your VPC subnet, the same kind of address an EC2 instance gets. There's no overlay network in between. That has three practical consequences:

- **Anything in the VPC can reach a pod directly** (subject to security groups and network policies), and an ALB can send traffic straight to pod IPs.
- **Pods use up subnet IP addresses.** A small subnet runs out of pod IPs long before the nodes run out of CPU. Size EKS subnets generously (a `/19` or larger per AZ is common), or turn on prefix delegation.
- **Each instance type has a maximum pod count**, based on how many network interfaces and IPs it supports. Very small instances can hit that limit quickly.

## Service types · Choosing how a Service is exposed

| Type | Reachable from | Typical use on EKS |
| --- | --- | --- |
| `ClusterIP` (default) | Inside the cluster only | Service-to-service traffic. Most Services should be this. |
| `LoadBalancer` | Outside the cluster | The AWS Load Balancer Controller creates a Network Load Balancer, for TCP/UDP or non-HTTP traffic. |
| `NodePort` | Every node's IP, on a high port | Rarely used directly on EKS; a building block for older load-balancer setups. |
| Headless (`clusterIP: None`) | Inside the cluster | DNS returns the pod IPs themselves. Used by StatefulSets and client-side load balancing. |

For HTTP and HTTPS from outside, you don't expose each Service as a load balancer. You use an **Ingress**, which the next section shows.

## Flow · From the internet to a pod

An **Ingress** is a set of HTTP routing rules ("requests for `api.example.com/orders` go to the `orders-api` Service"). On its own it does nothing. A controller makes it real: on EKS, the **AWS Load Balancer Controller** watches Ingress objects and creates and configures an Application Load Balancer to match, using the same reconciliation loop from module 1.

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

The Service still matters here. The controller reads the Service's endpoints to know which pod IPs to register, so readiness probes control what the load balancer sends traffic to as well. How many ALBs to run, and when a second ingress controller makes sense, is a cost and design question covered in [Ingress Architecture & Cost](ingress-architecture-and-cost.html).

## Security · By default, every pod can reach every pod

Kubernetes networking is flat: out of the box, any pod can connect to any other pod in any namespace. A **NetworkPolicy** limits that, for example allowing only the `checkout` namespace to reach `orders-api`. On EKS, the VPC CNI enforces network policies once you turn the feature on in the add-on's configuration. Start with a "deny all incoming" default per namespace, then allow what each app needs.

## Try it · See the pieces in a running cluster

```text
# Services and their ClusterIPs
kubectl get services -n orders

# The pod IPs currently behind a Service (ready ones only)
kubectl get endpointslices -n orders -l kubernetes.io/service-name=orders-api

# Start a temporary pod and test DNS and HTTP from inside the cluster
kubectl run tmp-debug -n orders --rm -it --image=busybox:1.36 --restart=Never -- sh
  nslookup orders-api.orders
  wget -qO- http://orders-api.orders/healthz/ready
```

### Implementation notes

- **"Service has no endpoints" is the first thing to check** when requests fail. It almost always means the selector doesn't match the pod labels, or no pod is passing readiness.
- **`port` and `targetPort` are different things.** Callers use `port`; the container must be listening on `targetPort`. A mismatch gives connection errors even though everything looks healthy.
- **Plan subnet sizes before the first cluster.** Running out of pod IPs is painful to fix later, because it means new subnets and replacing node groups.
- **Debug layer by layer.** DNS, then Service, then endpoints, then pod. The [EKS ingress incident](../../case-studies/tolling/eks-ingress-incident-rca.html) case study applies exactly this order to a real outage.
