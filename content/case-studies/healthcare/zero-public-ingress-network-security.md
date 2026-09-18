---
title: Zero-public-ingress network architecture for HIPAA
nav: Zero-public-ingress security
summary: A network design where no compute or database resource has a public IP, engineering access is mutual-TLS VPN only, and the CDN is tuned for clinical apps.
project: healthcare
layer: Network & security
order: 30
stack: [AWS Client VPN, AWS CloudFront, AWS WAF, AWS KMS]
tags: [security, hipaa, networking, vpn, cdn]
problem: |
  As a platform handling Protected Health Information (PHI) under HIPAA, every application server,
  Kubernetes worker node, analytics engine, and database needed to be reachable by engineers for
  operations and by patients/clinicians for the product itself — without either path creating a
  direct public attack surface into the environments actually holding patient data.
solution: |
  A network design with two entirely separate front doors: patient- and clinician-facing traffic
  reaches the platform only through a CDN and web application firewall in front of the public
  application tier, while engineering and administrative access to every private subnet goes
  through mutual-TLS VPN endpoints scoped per environment — and no compute or database resource
  in either path carries a public IPv4 address.
heroTitle: Two front doors, and neither one touches patient data directly
intro: A HIPAA-governed platform has to stay reachable for both its users and its engineers, without turning either access path into a way to reach the systems holding patient data directly. This case study covers the network segmentation, VPN design, and edge-caching architecture built to keep that boundary real rather than theoretical.
role: Network security & HIPAA compliance architecture
scope: VPN access design, edge/CDN policy, and at-rest encryption strategy
closingText: I'm happy to go deeper on the per-environment VPN segmentation, the CDN cache-policy split, or the encryption approach.
outcomes:
  - value: 0
    label: Compute or database resources with a public IPv4 address
  - value: 3
    label: Mutual-TLS VPN scopes segmenting Dev/Sandbox, QA/Staging, and Production access
  - value: KMS
    label: Customer-managed encryption for every storage layer at rest
scaffold: false
---

## Problem · Two audiences, one platform, and neither should reach patient data directly

A remote patient monitoring platform has two fundamentally different groups that need access: clinicians and patients using the product itself, and engineers operating and maintaining it. Handling both naively — for example, giving engineers a bastion host with a public IP, or letting application servers sit in public subnets because it's simpler to reach them — creates a direct network path from the internet into the systems holding PHI. Under HIPAA's technical safeguards, that's not an acceptable trade for convenience.

## Architecture · Separate the user path from the operator path completely

```text
   Clinicians & Patients                    Engineering & Operations
          │                                          │
          ▼                                          ▼
  [ AWS WAF ]                              [ AWS Client VPN ]
          │                                  (mutual TLS, per-environment)
          ▼                                          │
  [ AWS CloudFront ]                                 │
          │                                          │
          └──────────────┬───────────────────────────┘
                          ▼
        [ Private VPC — zero public ingress ]
          • EKS clusters (Dev / QA / Staging / Production)
          • Integration & analytics hosts
          • RDS (KMS-encrypted at rest)
          • ElastiCache (encrypted in transit)
```

Both paths terminate at the edge of the private network — the CDN and WAF handle public application traffic, and the VPN handles everything else — and nothing behind that edge has a public IPv4 address to reach directly, from either direction.

### Implementation notes

- **VPN access is scoped by environment tier, not one shared tunnel.** Dev/sandbox, QA/staging, and production each have their own Client VPN endpoint and connection profile, so gaining access to one tier's subnets doesn't imply access to another's — and production access specifically requires a separate, more tightly audited profile than development.
- **The CDN's cache policy is split by content type, not applied uniformly.** Compiled JS/CSS bundles are cached aggressively for up to a year, since the build pipeline appends a content hash to every filename and a new deploy simply ships a new one; the single-page app's HTML entry point is pinned to a zero-TTL policy on every route, so a new deployment is visible to every client on the next page load instead of waiting out a cache window.
- **Encryption is layered, not just switched on.** Storage at rest uses customer-managed KMS keys rather than default AWS-managed ones, and in-transit encryption is enforced on every internal hop — load balancer to application pod, application to cache, application to the integration tier — not just at the network's public edge.
- **Audit logging exists specifically to catch what should never appear in it.** Authentication events and API access are centrally logged, with filters specifically designed to keep patient names, phone numbers, raw telemetry values, and auth tokens out of application logs and stdout in the first place, rather than relying on redacting them after the fact.

### Trade-offs

Mutual-TLS VPN access for engineering is meaningfully more operational overhead than a bastion host or a shared VPN — every engineer needs a per-environment profile, and profile issuance and revocation has to be a deliberate process rather than a shared credential. That overhead is the direct cost of the environments never having a public network path into them at all; for a platform handling PHI, that trade was made deliberately rather than defaulted into.
