---
title: Dual Ingress Architecture & Its Cost Mechanics
track: kubernetes-operations
order: 1
module: 1
totalModules: 4
summary: When to route API traffic through a shared AWS ALB versus an internal Nginx Ingress controller, and why grouping services onto one load balancer is a real, measurable saving rather than a micro-optimization.
level: Core Architecture
readingTime: 8 min read
stack: [Amazon EKS, AWS Load Balancer Controller, Nginx Ingress, AWS VPC CNI]
tags: [ingress, alb, nginx, cost-optimization, eks]
---

## Problem · One load balancer per microservice adds up fast

The default instinct when exposing a new microservice on EKS is to give it its own Ingress and let the AWS Load Balancer Controller provision a dedicated Application Load Balancer for it. That works, and it's simple to reason about — but each ALB is a standing monthly cost on top of its data-processing charges, and that cost scales linearly with the number of services, independent of how much traffic any of them actually carry.

At even a modest number of independently-deployed APIs, that adds up to a meaningful, entirely avoidable line item.

## Pattern · Two ingress controllers, used for what each is actually good at

Rather than picking one ingress approach for everything, a dual-ingress design uses each controller for the traffic shape it's actually suited to:

- **AWS Load Balancer Controller, with Ingress Grouping, for backend APIs.** Multiple independent services share a single ALB by annotating each Ingress with the same `group.name`, instead of each service provisioning its own load balancer.
- **Nginx Ingress Controller for frontend single-page applications.** SPAs frequently need regex-based URL rewriting (stripping a path prefix before it reaches the container, for example) that's more naturally expressed in Nginx's ingress annotations than through ALB rules.

### Shared-ALB ingress grouping

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: orders-api
  namespace: prod
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/group.name: api
    alb.ingress.kubernetes.io/group.order: '10'
spec:
  rules:
    - http:
        paths:
          - path: /orders
            pathType: Prefix
            backend:
              service:
                name: orders-api
                port:
                  number: 80
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: billing-api
  namespace: prod
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/group.name: api
    alb.ingress.kubernetes.io/group.order: '20'
spec:
  rules:
    - http:
        paths:
          - path: /billing
            pathType: Prefix
            backend:
              service:
                name: billing-api
                port:
                  number: 80
```

Both Ingress resources share `group.name: api`, so the AWS Load Balancer Controller provisions and reuses one ALB for both, adding routing rules for each rather than a load balancer per service. `target-type: ip` also matters here — it routes traffic directly to a pod's VPC IP via the AWS VPC CNI instead of hopping through a NodePort first, which removes an extra network hop on every request.

### Nginx Ingress for frontend rewrites

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: customer-portal
  namespace: prod
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/use-regex: 'true'
spec:
  rules:
    - http:
        paths:
          - path: /portal
            pathType: Prefix
            backend:
              service:
                name: customer-portal
                port:
                  number: 80
```

### Implementation notes

- **Ingress Grouping doesn't require the services to know about each other.** Each team still owns its own Ingress manifest; the only coordination needed is agreeing on a shared `group.name` and non-conflicting `group.order` values.
- **Target-type `ip` requires the VPC CNI and enough available IPs per subnet.** Plan subnet sizing with this in mind — it's a common surprise when a subnet runs out of assignable IPs under pod scale-up, not at cluster creation time.
- **Nginx Ingress and ALB Ingress can coexist on the same cluster indefinitely.** There's no need to standardize on one; the deciding factor is the routing behavior each specific workload actually needs.

### When not to share an ALB

A handful of scenarios genuinely warrant a dedicated load balancer instead of grouping: a service with materially different security-group or WAF requirements from the rest of the group, or a service whose traffic pattern makes shared connection draining or health-check tuning impractical. Sharing by default and carving out an exception when one of these applies is a more defensible starting point than defaulting to one ALB per service.
