---
title: A private image API without a proxy application to operate
nav: Upload and retrieve images
label: Image handling
heading: How a request actually reaches S3
project: tolling
layer: Applications
order: 100
stack: [API Gateway, Amazon S3, Route 53, VPC endpoints, IAM, Terraform]
tags: [storage, security, api, networking, dns, cost]
summary: Removing a load balancer and a Lambda proxy from the image path, leaving API Gateway talking to S3 directly through one shared private endpoint.
problem: |
  Internal tolling services needed to upload and retrieve images in S3 over
  HTTP. The interface worked, but the path in front of it had accumulated
  layers: a load balancer, and behind it a Lambda function acting as an HTTP
  proxy. Both cost money on every request and added latency, and the proxy was
  application code — with its own error handling, timeout behaviour and
  deployment lifecycle — for work that amounts to handing bytes to S3.

  It also had to behave identically across development, staging and production,
  resolve through a consistent private domain in each, and keep every part of
  the path unreachable from the internet.
solution: |
  API Gateway talking to S3 directly, with nothing in between. A private REST
  API per environment uses an AWS service integration for GET and PUT: the
  gateway assumes a role, signs the request, and S3 authorizes against that
  role. No compute sits in the transfer path.

  Each environment resolves its own custom domain through a single private
  hosted zone in the Shared Services account, pointing at one shared interface
  endpoint rather than one per account. It took four iterations to get there,
  each removing something.
flowLabel: Request path, upload or retrieve
flow:
  - step: Internal service
    note: Calls its environment's custom domain over HTTPS from inside its own VPC. The same code and hostname pattern works in every environment.
  - step: Private hosted zone
    note: Resolution goes to a hosted zone owned by the Shared Services account and associated with all three environment VPCs, so every environment resolves the same way without each one running its own DNS.
  - step: Shared interface endpoint
    note: The zone's alias record points at a single shared `execute-api` interface endpoint. One endpoint serves development, staging and production; each environment's own endpoint stays associated too, so workloads reaching it over VPN or Direct Connect still get through.
  - step: Private REST API for that environment
    note: The custom domain routes to that environment's API. Reaching the DNS name is not the same as being let in — four separate policy layers still have to agree, covered below.
  - step: IAM role assumed by API Gateway
    aside: true
    note: Not a network hop. API Gateway assumes a role and signs the S3 call, and S3 authorizes against that role's permissions. This is the piece that removes the need for a proxy — no peering or extra networking sits between the gateway and S3.
  - step: Amazon S3
    note: PUT stores the object, GET returns it. Path parameters carry the bucket and object key including nested paths, and binary media-type configuration preserves the image bytes in both directions.
enables: |
  A reusable private interface for image uploads and reads, identical across
  environments, with no proxy runtime to deploy, patch, scale or debug — and no
  point on the path reachable from the internet.
---

## Why this way · Every layer had to justify itself

The end state looks obvious in hindsight. It wasn't the starting point, and
each layer was removed for a specific reason rather than a preference for
minimalism.

**The Lambda proxy went first.** It was translating HTTP requests into S3 calls
— work API Gateway can do natively through a service integration. Keeping it
meant paying per invocation, adding a cold-start tail to image uploads, and
maintaining error handling and timeout logic for a component whose entire job
was to forward bytes.

**The load balancer went next.** With the proxy gone it was routing to a single
backend, and its host and URL rewrite rules needed careful configuration to
keep doing so correctly. It remained an extra hop and a standing cost for no
remaining function.

**Then the complexity that replaced them had to go too.** The first version of
the native custom domain needed cross-account Terraform state and IAM roles
just to create DNS records, which moved complexity rather than removing it. The
next put the DNS in the shared account but created endpoint associations with
bash scripts outside Terraform state — so they orphaned on destroy and needed
manual cleanup before a redeploy. Only the current version uses native
association resources with a provider alias, which puts the lifecycle back
under Terraform.

That last step changed no infrastructure at all. It mattered because an
association Terraform creates but cannot destroy is a resource that quietly
breaks the next deployment. One script survives, for a policy with no native
Terraform attribute — a documented exception rather than an accident.

## What makes it hold up

**Authorization is four layers, not one.** A private custom domain requires
explicit authorization at each stage, and a request that satisfies three and
fails the fourth looks, from the caller's side, exactly like a DNS problem:

- **Management policy** — grants the Shared Services account permission to attach its endpoint to this custom domain at all.
- **Endpoint access associations** — link specific endpoints to the domain. Traffic from any endpoint not explicitly associated is rejected, whatever DNS says.
- **Domain invocation policy** — authorizes requests that arrived through an allowed endpoint to invoke the domain itself.
- **API resource policy** — authorizes again at the REST API stage, matched on the originating endpoint, before anything reaches the S3 integration.

Knowing which of the four is refusing you is most of the work of operating
this, which is why access logging and explicit integration responses matter
here more than they would on a simpler path — they separate a rejected caller
from a missing object from a genuine backend error, instead of collapsing all
three into one 403.

**Private DNS is disabled on the shared endpoint deliberately.** Left enabled,
AWS creates its own `execute-api` records that compete with the private hosted
zone and make resolution unpredictable across VPCs. Disabling it gives the
hosted zone sole control, which is what lets the per-environment custom domains
resolve cleanly.

**One shared endpoint, but not shared access.** Interface endpoints bill per
endpoint per availability zone, so collapsing three into one is a standing
saving. Each environment's API still enforces its own source-endpoint
condition, so sharing the entry point is not sharing entry.

**Both endpoints stay associated.** The shared endpoint carries traffic that
resolved through the central hosted zone; each environment's own endpoint
serves workloads inside that VPC or reaching it over VPN or Direct Connect.
Dropping either one silently strands a class of caller.
