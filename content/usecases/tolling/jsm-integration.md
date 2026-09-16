---
title: Connect service-management events to private application services
nav: Connect JSM to private services
label: Service integration
project: tolling
projectName: U.S. Tolling Infrastructure
engagement: usecases/governance/multi-account-governance-and-networking.html
layer: Applications
order: 20
stack: [API Gateway, Lambda authorizer, VPC Link, EKS, Terraform]
tags: [integration, security, serverless, api]
summary: Webhook authentication and private backend routing, without exposing the load balancer or EKS workloads to the internet.
problem: |
  Jira Service Management (JSM) and Jira Automation needed to send webhook
  events to application services running inside the tolling platform. The
  integration needed a reachable entry point, request authentication, and a
  route to the backend without exposing the application load balancer or EKS
  workloads directly to the internet.
solution: |
  I used an API Gateway HTTP API with a Lambda request authorizer, then routed
  accepted requests over a VPC Link to an internal load balancer and the
  application services. Terraform separates the gateway, authorization, and
  optional CloudFront edge components so environments can reuse the same
  pattern.
flow:
  - JSM webhook
  - HTTP API + authorizer
  - VPC Link
  - Internal load balancer
  - EKS service
flowLabel: JSM request path
enables: |
  Service-management events can reach private application workflows through a
  dedicated, authenticated integration boundary. The application backend
  remains inside the VPC.
---

### Architecture decisions

- **Authenticate before forwarding:** the authorizer supports signed JWT validation, including expiry and issuer checks, with configured credentials for automation requests.
- **Keep the backend private:** VPC Link provides the integration path to the internal load balancer.
- **Add edge controls where configured:** the CloudFront variant includes WAF filtering and an origin header checked by the authorizer to reject requests that bypass the intended edge path.
- **Make the pattern repeatable:** shared modules and separate environment roots carry the gateway configuration through development, staging, and production.
