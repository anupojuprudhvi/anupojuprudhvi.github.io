---
title: Services & Cluster Networking: How Traffic Finds Your Pods
date: 2026-09-29
updated: 2026-10-01
track: kubernetes-operations
order: 6
module: 6
summary: Pods come and go with new IP addresses, so nothing should talk to a pod directly. How Services give a stable name and address, how cluster DNS and kube-proxy route each request, the Service types, and how an Ingress brings traffic in from outside the cluster.
level: Core concepts · Networking
readingTime: 9 min read
stack: [Kubernetes, CoreDNS, kube-proxy, Services, Ingress, NetworkPolicy]
tags: [kubernetes, services, networking, dns, ingress, fundamentals]
redirectFrom: [services-and-cluster-networking]
related: [tolling/eks-ingress-incident-rca, healthcare/zero-public-ingress-network-security]
---

**Before you start:** this builds on [Pods, Deployments & Rollouts](05-pods-deployments-and-rollouts.html), especially labels and readiness probes. A basic idea of IP addresses, ports, and DNS helps.

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

Where do the pod IP addresses themselves come from? A **network plugin** (CNI) on each node hands them out. In a local kind cluster they come from a private range inside Docker; on Amazon EKS they're real addresses from your VPC subnets, which has consequences covered in [Kubernetes on Amazon EKS](10-kubernetes-on-eks.html).

## Service types · Choosing how a Service is exposed

| Type | Reachable from | Typical use |
| --- | --- | --- |
| `ClusterIP` (default) | Inside the cluster only | Service-to-service traffic. Most Services should be this. |
| `LoadBalancer` | Outside the cluster | A cloud controller creates a real load balancer for it (a Network Load Balancer on EKS), for TCP/UDP or non-HTTP traffic. |
| `NodePort` | Every node's IP, on a high port | Handy in a local lab; in the cloud, mostly a building block for load balancers. |
| Headless (`clusterIP: None`) | Inside the cluster | DNS returns the pod IPs themselves. Used by StatefulSets and client-side load balancing. |

For HTTP and HTTPS from outside, you don't expose each Service as a load balancer. You use an **Ingress**, which the next section shows.

## Flow · From outside the cluster to a pod

An **Ingress** is a set of HTTP routing rules ("requests for `api.example.com/orders` go to the `orders-api` Service"). On its own it does nothing. An **ingress controller** makes it real: it watches Ingress objects and configures a proxy or a cloud load balancer to match, using the same reconciliation loop from [How a Cluster Works](04-how-a-cluster-works.html).

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: orders-api
  namespace: orders
spec:
  ingressClassName: alb      # which controller handles it
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /orders
            pathType: Prefix
            backend:
              service:
                name: orders-api
                port:
                  number: 80
```

```flow
title: A request from a user's browser to a pod, through an Ingress
group: Outside the cluster
User | https://api.example.com/orders
-> DNS resolves the name to the load balancer
Load balancer or proxy | configured by the ingress controller; TLS usually ends here
end
-> the /orders rule matches, so the request goes to the orders-api Service's pods
group: Cluster
* orders-api pods | only ready pods receive traffic
end
```

The Service still matters here. The controller reads the Service's endpoints to know which pods to send to, so readiness probes control what the load balancer sends traffic to as well. On Amazon EKS the controller is usually the AWS Load Balancer Controller, and the load balancer is an Application Load Balancer. [Kubernetes on Amazon EKS](10-kubernetes-on-eks.html) follows that exact path, and [Ingress Architecture & Cost](14-ingress-architecture-and-cost.html) covers how many load balancers to run and Ingress's successor, the Gateway API.

## Security · By default, every pod can reach every pod

Kubernetes networking is flat: out of the box, any pod can connect to any other pod in any namespace. A **NetworkPolicy** limits that, for example allowing only the `checkout` namespace to reach `orders-api`. A policy only takes effect if the cluster's network plugin enforces it; on EKS, the VPC CNI does once you turn the feature on in the add-on's configuration. Start with a "deny all incoming" default per namespace, then allow what each app needs.

```yaml
# Deny all incoming traffic to every pod in the namespace, then add
# narrower policies that allow what each app actually needs
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: orders
spec:
  podSelector: {}
  policyTypes: [Ingress]
```

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

# Reach a Service from your laptop without any load balancer
kubectl port-forward -n orders service/orders-api 8080:80
```

### Implementation notes

- **"Service has no endpoints" is the first thing to check** when requests fail. It almost always means the selector doesn't match the pod labels, or no pod is passing readiness.
- **`port` and `targetPort` are different things.** Callers use `port`; the container must be listening on `targetPort`. A mismatch gives connection errors even though everything looks healthy.
- **`kubectl port-forward` is a debugging tool, not a way to serve users.** It tunnels through the API server from your machine only, and stops when you close the terminal.
- **Debug layer by layer.** DNS, then Service, then endpoints, then pod. The [EKS ingress incident](../../case-studies/tolling/eks-ingress-incident-rca.html) case study applies exactly this order to a real outage.
