---
title: Dual Ingress Architecture & Its Cost Mechanics
date: 2026-09-18
updated: 2026-10-01
track: kubernetes-operations
order: 14
module: 14
summary: When to route traffic through a shared ALB versus a separate ingress controller, why grouping services onto one load balancer is a real saving, and where Gateway API fits now that ingress-nginx is retired.
level: Platform · Networking
readingTime: 9 min read
stack: [Amazon EKS, AWS Load Balancer Controller, Nginx Ingress, Gateway API, AWS VPC CNI]
tags: [ingress, alb, nginx, gateway-api, cost-optimization, eks]
redirectFrom: [ingress-architecture-and-cost, 01-dual-ingress-architecture]
related: [tolling/eks-ingress-incident-rca, healthcare/zero-public-ingress-network-security]
---

**Before you start:** you'll want an EKS cluster with the AWS Load Balancer Controller installed, and the basics from [Services & Cluster Networking](06-services-and-cluster-networking.html): what a Service and an Ingress are, plus how the VPC CNI gives pods VPC IP addresses from [Kubernetes on Amazon EKS](10-kubernetes-on-eks.html).

## Principle · Share load balancers unless there's a reason not to

The default instinct when exposing a new microservice on EKS is to give it its own Ingress and let the AWS Load Balancer Controller create a dedicated Application Load Balancer for it. That works, and it's easy to reason about. But every ALB is a fixed monthly cost on top of its traffic charges, and that cost grows with the number of services, however little traffic each one gets.

With even a modest number of separately deployed APIs, that turns into a noticeable line item you don't need to pay.

## Pattern · Two ingress paths, each used for what it's good at

The deployment this track is based on didn't pick one ingress approach for everything. It used each controller for the kind of traffic it suits:

- **AWS Load Balancer Controller with ingress grouping, for backend APIs.** Several services share one ALB by giving each Ingress the same `group.name`, instead of each service getting its own load balancer.
- **An Nginx-based ingress controller for frontend single-page apps.** SPAs often need regex URL rewriting (stripping a path prefix before the request reaches the container, for example), which is easier to express in Nginx than in ALB rules.

```flow
title: Two ingress paths into the same cluster
group: Internet
Users and API clients | api.example.com and app.example.com
end
-> Route 53 sends each hostname to its own entry point
paths
path: Backend APIs
* One shared ALB | ingress group "api": path rules for /orders, /billing, /payments
-> target type "ip": straight to pod IPs
orders-api, billing-api, payments-api pods | one ALB for every API, not one each
path: Frontend apps
Load balancer for Nginx | one entry point for the web frontends
-> forwards to the Nginx controller pods
Nginx ingress controller | rewrites paths with regex, then routes
-> to the frontend Service
Frontend SPA pods | the paths arrive already rewritten
end
```

### Shared-ALB ingress grouping

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: orders-api
  namespace: prod
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/group.name: api
    alb.ingress.kubernetes.io/group.order: '10'
spec:
  ingressClassName: alb
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
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/group.name: api
    alb.ingress.kubernetes.io/group.order: '20'
spec:
  ingressClassName: alb
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

Both Ingresses share `group.name: api`, so the controller creates one ALB and adds a routing rule for each service. `spec.ingressClassName` picks the controller; the older `kubernetes.io/ingress.class` annotation is deprecated, so avoid it in new manifests. `target-type: ip` sends traffic straight to each pod's VPC IP (through the VPC CNI) instead of going through a NodePort first, which removes a hop from every request.

### Nginx ingress for frontend rewrites

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: customer-portal
  namespace: prod
  annotations:
    nginx.ingress.kubernetes.io/use-regex: 'true'
    nginx.ingress.kubernetes.io/rewrite-target: /$2
spec:
  ingressClassName: nginx
  rules:
    - http:
        paths:
          - path: /portal(/|$)(.*)
            pathType: ImplementationSpecific
            backend:
              service:
                name: customer-portal
                port:
                  number: 80
```

The regex captures everything after `/portal`, and `rewrite-target: /$2` passes just that part to the container. So `/portal/assets/app.js` reaches the app as `/assets/app.js`. A plain `rewrite-target: /` would send *every* request to `/`, which quietly breaks the app's CSS and JavaScript.

## Update · ingress-nginx is retired, so plan the next step

The community **ingress-nginx** controller used in this design is being retired. In November 2025 the Kubernetes project announced it would get only best-effort maintenance until March 2026, and no further releases or security fixes after that. The pattern above (a separate controller for rewrite-heavy frontends) still makes sense, but new clusters shouldn't start on ingress-nginx, and existing ones need a migration plan.

The long-term direction is the **Gateway API**, the successor to Ingress. It splits the job into a `Gateway` (the load balancer, owned by the platform team) and `HTTPRoute`s (routing rules, owned by each app team), and it supports path rewrites without controller-specific annotations:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: customer-portal
  namespace: prod
spec:
  parentRefs:
    - name: public-gateway
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /portal
      filters:
        - type: URLRewrite
          urlRewrite:
            path:
              type: ReplacePrefixMatch
              replacePrefixMatch: /
      backendRefs:
        - name: customer-portal
          port: 80
```

Several maintained controllers implement Gateway API, and the AWS Load Balancer Controller has been adding support for it too. Check the current status of whichever you choose before committing to it.

### Implementation notes

- **Ingress grouping doesn't need the services to know about each other.** Each team still owns its own Ingress; they only need to agree on a shared `group.name` and non-overlapping `group.order` values.
- **Target type `ip` needs the VPC CNI and enough free IPs in each subnet.** Size subnets with this in mind. Running out of IPs tends to happen during a scale-up, not when the cluster is created.
- **Two controllers can run side by side indefinitely.** There's no need to standardize on one. What matters is the routing each workload needs, and that each controller is still maintained.

### When not to share an ALB

A few situations call for a dedicated load balancer: a service with clearly different security-group or WAF needs from the rest of the group, or one whose traffic makes shared connection draining or health-check settings impractical. Share by default and make an exception when one of these applies. That's easier to defend than one ALB per service by default.
