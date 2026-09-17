---
title: Letting a SaaS webhook reach a private service, safely
nav: Connect JSM to private services
label: Service integration
heading: How a webhook reaches a private service
project: tolling
layer: Applications
order: 80
stack: [API Gateway HTTP API, CloudFront, AWS WAF, Lambda authorizer, VPC Link, EKS, Secrets Manager]
tags: [integration, security, api, webhooks, waf, authentication]
summary: A layered, authenticated path from Jira Service Management into a private service, with CloudFront and a Lambda authorizer retained because AWS platform constraints rule out the simpler alternatives.
problem: |
  Jira Service Management and Jira Automation needed to deliver webhook events
  into an internal service running on EKS. That service has no authentication
  logic of its own — it was built to process business logic from traffic it
  could already trust.

  So the entry point had to do all of it: be publicly reachable, because the
  events come from a SaaS product; verify the request signature and expiry; and
  never expose the load balancer or the pods behind it. Getting any one of
  those wrong makes the other two irrelevant. The design should not be read as
  a complete replay-prevention system: replay handling remains an application
  concern unless a nonce or event-id strategy is added.
solution: |
  A layered perimeter where each stage rejects a different class of request:
  edge filtering at CloudFront, a Lambda authorizer that verifies the signature
  cryptographically, and a private VPC Link into the internal load balancer.

  Two of those pieces are not design preferences. CloudFront and the Lambda are
  both there because of specific AWS platform limits, covered below — which is
  also why the architecture is documented rather than just built.
flowLabel: Request path, webhook to internal service
flow:
  - step: Jira Cloud webhook
    note: The event originates from a SaaS product, so the entry point has to be publicly reachable. This is the only hop exposed to the internet.
  - step: CloudFront edge + WAF
    note: WAF applies the currently configured Atlassian egress CIDRs and global rate limiting, rejecting traffic outside the configured network perimeter before it reaches AWS regional infrastructure. The CIDRs come from Atlassian's published feed and require periodic revalidation; CloudFront also injects a secret header that the authorizer checks later.
  - step: HTTP API
    note: Regional API Gateway endpoint. It is publicly resolvable, which is precisely why the next step exists.
  - step: Lambda request authorizer
    note: Checks the CloudFront secret header first, then verifies the HMAC-SHA256 signature and expiry against a key held in Secrets Manager. Anything that fails is rejected here, at the boundary, before it touches the VPC. This proves authenticity and freshness of the token, not that an event has never been delivered before.
  - step: VPC Link
    note: Authorized requests only. Traffic crosses into the private network through managed interface endpoints rather than any public route.
  - step: Internal load balancer and EKS service
    note: The load balancer has no public listener and the pods are not internet-reachable. From the service's point of view this is an ordinary internal call it can trust.
enables: |
  Service-management events reach a private application workflow through an
  authenticated boundary, with nothing behind the edge exposed to the internet
  and no authentication code required in the backend service.
---

## Why this way · Two architectural constraints shaped by AWS

The interesting part of this design is how little of it was preference. Two
components exist because the obvious approach is not available on this
platform, and it is worth being explicit about which is which.

**CloudFront is not there as a CDN.** AWS WAF cannot be associated with an
HTTP API — it attaches only to CloudFront, an Application Load Balancer, a REST
API, or AppSync. Putting WAF in front of an HTTP API therefore means putting
CloudFront in front of it. That makes CloudFront a mandatory part of the
security model, not an optimisation, and anyone later "simplifying" it away
removes the WAF layer entirely and publishes the API Gateway URL with no IP
filtering at all.

**The Lambda authorizer is not there for convenience.** Jira signs its webhooks
with symmetric HMAC-SHA256. API Gateway's native JWT authorizer only supports
asymmetric algorithms paired with OIDC discovery, and WAF can match strings and
patterns but cannot compute an HMAC against a secret. Nothing built in can
verify these signatures, so verification has to run somewhere — and running it
at the boundary keeps it out of the backend service.

**The allowlist is an operational control, not identity.** The WAF ranges must
be sourced from Atlassian's live published feed and reviewed when that feed
changes. The referenced implementation uses manual updates today, so an
out-of-date allowlist can block legitimate Jira traffic while an overly broad
range weakens the perimeter. The page intentionally does not present any
specific CIDRs as a timeless or complete Atlassian allowlist.

<div class="table-scroll"><table class="gtable"><tr><th>Alternative</th><th>Why it was rejected</th></tr><tr><td class="gnum">Native JWT authorizer</td><td>No Lambda, no custom code — but it cannot validate symmetric HS256 signatures at all. A platform blocker, not a trade-off.</td></tr><tr><td class="gnum">WAF rule matching</td><td>WAF inspects headers, but cannot compute an HMAC-SHA256 signature or evaluate an expiry claim. It can tell you a token is present, not that it is genuine.</td></tr><tr><td class="gnum">Migrate to REST API</td><td>Would allow WAF to attach directly and remove CloudFront. Costs roughly 3.5x more per request, adds latency, and drops the simple authorizer response format — a poor trade for a single-route webhook receiver.</td></tr><tr><td class="gnum">WAF at the load balancer only</td><td>Regional, so it only filters traffic that has already entered the VPC. Edge filtering rejects non-Atlassian traffic before it reaches regional infrastructure at all.</td></tr><tr><td class="gnum">Validate in the backend service</td><td>The right long-term answer, and the roadmap below describes it. The service does not implement signature verification today, so removing the Lambda now would accept forged events.</td></tr><tr><td class="gnum">No authentication, WAF only</td><td>Anyone able to originate from within the allowlisted ranges could forge arbitrary webhook events. IP allowlisting is a filter, not an identity check.</td></tr></table></div>

## What makes it hold up

**Each layer rejects something the others cannot.** Edge WAF stops traffic from
the wrong network. The secret header stops traffic that found the API Gateway
URL directly and tried to skip the edge — a real exposure, since HTTP API
endpoints are publicly resolvable. Signature verification stops forged or
expired payloads from the right network. Private networking stops anything that
somehow got past all three from reaching a pod. Removing any one of them leaves
a specific, nameable gap.

**Authorization caching is disabled deliberately.** A cached result means a
rotated or compromised secret stays valid until the cache expires, and API
Gateway's authorizer cache has no invalidation API — you cannot flush one
identity. For a receiver handling operational ticket and SLA data, a window of
accepted-but-revoked tokens was not worth the saved invocations. The cost of
that choice is a Lambda invocation per request, partly offset by running on
ARM64; if it ever became a problem the right fix is provisioned concurrency,
not re-enabling the cache.

**Both sender styles are handled in one place.** Webhooks arrive with a signed
token; Automation rules send a static pre-shared one. Rather than splitting
these across two entry points, the authorizer accepts either and applies the
matching check.

**Operations are part of the security model.** Secret rotation is handled
through Secrets Manager, with authorization caching disabled so a changed key
takes effect on the next request. The Atlassian IP allowlist is a separate,
manual maintenance path in the current implementation: operators must compare
the published feed with the configured WAF IP set, update infrastructure code,
apply it, and verify both an expected webhook and an out-of-policy request.
That runbook matters because an IP-feed change can otherwise look like a
silent application outage.

**It is designed to be deleted.** If the backend service ever implements
signature verification itself and the load balancer validates the origin header
natively, the Lambda becomes redundant — and a single flag removes the
function, its role and its secret without touching the API, VPC Link,
CloudFront or WAF. Knowing the exit condition for a component is part of
justifying its existence.

### Implementation notes

- **Empty identity sources are load-bearing.** With an identity source configured, API Gateway pre-checks that header and returns `401` itself when it is missing — the Lambda is never invoked, so the origin-bypass check silently never runs. The security layer looks correct while not executing. Leaving identity sources empty guarantees the authorizer owns every decision.
- **The edge WAF must live in a specific region.** CloudFront-scoped WAF has to be created in `us-east-1` regardless of where the rest of the stack runs; a provider alias handles that rather than leaving it as a deployment footnote.
- **The signing key is held in Secrets Manager**, not in a function environment variable, so rotation is a secret update rather than a redeploy — which is only meaningful because caching is off and rotation takes effect on the next request.
- **Separate deployment roots per environment** carry the same module through development, staging and production, so the security posture is identical in each rather than reconstructed by hand.
