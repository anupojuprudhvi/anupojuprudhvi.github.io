---
title: Dual Ingress Architecture & Its Cost Mechanics
date: 2026-09-18
updated: 2026-10-01
track: kubernetes-operations
order: 14
module: 14
summary: When to route traffic through a shared ALB versus a separate ingress controller, why grouping services onto one load balancer is a real saving, and where Gateway API fits now that ingress-nginx is retired.
level: Platform · Networking
readingTime: 11 min read
stack: [Amazon EKS, AWS Load Balancer Controller, Nginx Ingress, Gateway API, AWS VPC CNI]
tags: [ingress, alb, nginx, gateway-api, cost-optimization, eks]
redirectFrom: [ingress-architecture-and-cost, 01-dual-ingress-architecture]
related: [tolling/eks-ingress-incident-rca, healthcare/zero-public-ingress-network-security]
motif: network
---

**In this module, you'll learn to:**

- Explain why one ALB per service gets expensive, and share one with ingress groups
- Decide when a second ingress controller is worth running
- Plan the move off the retired ingress-nginx, toward the Gateway API

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

The community **ingress-nginx** controller used in this design has been retired. In November 2025 the Kubernetes project announced it would get only best-effort maintenance until March 2026, with no further releases or security fixes after that. The pattern above (a separate controller for rewrite-heavy frontends) still makes sense, but new clusters shouldn't start on ingress-nginx, and existing ones need a migration plan.

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

## Recap · Key terms

- **Ingress group:** several Ingresses sharing one ALB through the same `group.name`.
- **IngressClass:** says which controller handles an Ingress, through `spec.ingressClassName`.
- **Rewrite:** changing a request's path before it reaches the app.
- **Gateway API:** the successor to Ingress, splitting Gateways (platform) from routes (apps).
- **HTTPRoute:** a Gateway API object holding one app's routing rules.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
S: Ten APIs each have their own Ingress, and each gets its own ALB. What's the problem?
- ALBs can't route by path
* Each ALB has a fixed monthly cost, so ten cost far more than one shared ALB
- Kubernetes allows only one Ingress per namespace
- The APIs can't reach each other
= Every ALB carries a fixed charge however little traffic it gets. Sharing one ALB across services through an ingress group removes most of that.
Q: How do two Ingresses end up on the same ALB?
- They must be in the same file
* They use the same `alb.ingress.kubernetes.io/group.name` annotation
- They point at the same Service
- They must be in the same namespace
= The AWS Load Balancer Controller merges every Ingress with the same group name into one ALB, adding a rule for each. `group.order` sets the rule priority.
S: For a single-page app at `/portal`, what goes wrong with `rewrite-target: /` instead of `/$2`?
- Nothing; they're equivalent
* Every request, including CSS and JavaScript files, reaches the app as `/`, so it breaks
- The Ingress is rejected
- Only the home page loads slowly
= `/$2` keeps the part of the path after `/portal`. A plain `/` throws it away, so every asset request gets the HTML page back.
Q: Why should new clusters avoid the community ingress-nginx controller?
- It doesn't support HTTPS
* It's been retired, so it no longer gets releases or security fixes
- It only runs on kind
- It can't share load balancers
= The Kubernetes project retired it, with best-effort maintenance ending in March 2026. New setups should pick a maintained controller, ideally one that implements the Gateway API.
Q: In the Gateway API, who usually owns the Gateway, and who owns the HTTPRoutes?
* The platform team owns the Gateway; app teams own their HTTPRoutes
- App teams own both
- AWS owns the Gateway
- The Gateway API has no ownership model
= Splitting the load balancer (the Gateway) from each app's rules (HTTPRoutes) lets teams change their routes without touching shared infrastructure.
```
