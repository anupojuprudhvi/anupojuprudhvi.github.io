---
title: One DNS model for public services and private environments
nav: Share DNS across environments
label: DNS architecture
heading: How one Route 53 design serves every environment
project: tolling
projectName: U.S. Tolling Infrastructure
engagement: usecases/tolling/index.html
layer: Shared Services
order: 90
stack: [Amazon Route 53, Route 53 Resolver, VPC, Transit Gateway, Terraform]
tags: [dns, route53, networking, multi-account, shared-services, terraform]
summary: Separating public internet resolution from private VPC resolution, then associating one centrally managed private hosted zone with shared and environment VPCs across accounts.
problem: |
  The tolling platform had more than one kind of DNS name to operate. Public
  services needed to resolve from the internet, while internal endpoints had to
  resolve only from approved AWS networks. Treating both as the same zone would
  make the security boundary unclear; giving every environment its own private
  zone would duplicate records and create drift.

  The private namespace also had to work from the Shared Services VPC and from
  development, staging, production, and other environment VPCs. Those VPCs do
  not all belong to the account that owns the DNS zone, so the design had to make
  the AWS cross-account association workflow explicit rather than hiding it in
  scripts or manual console changes.
solution: |
  Route 53 owns two deliberate surfaces. A public hosted zone contains records
  intended for internet clients. A private hosted zone contains internal records
  and is associated with the Shared Services VPC plus each approved environment
  VPC, so the same private names resolve consistently wherever the platform
  allows them.

  Terraform manages the zone definitions and same-account VPC associations in
  the central Shared Services account. For a VPC in another account, the zone
  owner first creates `aws_route53_vpc_association_authorization`; the VPC owner
  then creates `aws_route53_zone_association` using its own credentials. The
  association is therefore a two-account contract, with the zone owner deciding
  who is allowed and the environment owner completing its side.
flowLabel: DNS query path, public or private name
flow:
  - step: Workload or internet client
    note: A client requests a hostname. Its network location determines whether the query can use the public DNS surface or a private VPC-associated namespace.
  - step: Amazon VPC DNS resolver
    note: Workloads use the VPC-provided resolver. It evaluates the VPC's Route 53 associations and resolver rules before falling back to public DNS resolution.
  - step: Private hosted zone
    note: For an internal name, the centrally owned private hosted zone answers only for associated VPCs. The Shared Services VPC and approved environment VPCs therefore use one controlled record set rather than separate copies.
  - step: Route 53 Resolver forwarding
    note: Queries for domains outside AWS, such as corporate or on-premises namespaces, can be forwarded through controlled inbound or outbound Resolver endpoints over the approved network path.
  - step: Public hosted zone
    note: For an internet-facing name, the public hosted zone answers through Route 53 authoritative DNS. Its records are independent of the private zone and are not a way into private workloads.
  - step: Target service
    note: The returned record leads to the intended public endpoint, private load balancer, interface endpoint, or other service target. DNS provides resolution; security groups, endpoint policies, IAM, and application controls still authorize access.
outcomes:
  - value: One
    label: Centrally governed private namespace shared across approved VPCs
  - value: Two
    label: Explicit hosted-zone surfaces: public internet DNS and private VPC DNS
  - value: Zero
    label: Per-environment copies of shared private records to reconcile
enables: |
  A predictable DNS boundary for the whole tolling platform: public names remain
  internet-resolvable, private names remain limited to associated VPCs, and new
  environments can be onboarded through a documented Terraform association flow.
---

## Why this way · Public and private DNS solve different problems

The important choice was not simply to create a Route 53 zone. It was to make
the visibility boundary part of the design. Public and private hosted zones can
use the same domain name, but they answer in different contexts: public DNS is
authoritative for internet queries, while a private zone is visible only inside
the VPCs associated with it. The private zone is not a firewall and association
does not grant network access by itself.

**Public hosted zones are for public reachability.** They hold records that
internet clients must resolve, such as an edge endpoint. Their presence does not
make a load balancer, API, or workload private resource reachable; the target's
own exposure and security controls still determine whether a connection works.

**Private hosted zones are for internal naming.** Route 53 returns private-zone
records only to queries from associated VPCs. Associating several environment
VPCs with one zone gives development, staging, production, and shared services
the same naming contract without asking each environment to maintain a separate
copy of the records.

**Cross-account association has two owners.** AWS requires the account that owns
the private zone to authorize a specific VPC first. The account that owns that
VPC then completes the association. These are separate Terraform roots and
credentials: adding an authorization without the consumer-side association does
not make the zone visible, and creating the association before authorization
fails.

## What makes it hold up

**The Shared Services account owns the namespace.** Hosted zones and their
records have one accountable owner. Environment accounts consume the private
namespace through explicit associations rather than creating lookalike zones.

**The association list is treated as shared state.** A consumer account creates
its own cross-account association, so the zone module ignores externally added
VPC association drift instead of trying to remove it on the next plan. Changes
to same-account VPC inputs remain managed by the zone module. Production zones
also need a destroy safeguard and an approved removal process because deleting a
zone can affect every associated environment.

**DNS is not the authorization layer.** A successful lookup only returns a
destination. Private routing, Transit Gateway or resolver connectivity, security
groups on port 53, endpoint policies, IAM, and the target service's own controls
still have to permit the resulting traffic. This separation keeps a DNS change
from being mistaken for a network or application access grant.

### Implementation notes

- **Adding an environment:** register its VPC and region with the shared DNS
  owner, apply the authorization there, then apply the consumer association in
  the environment account and verify resolution from that VPC.
- **Removing an environment:** remove the consumer association first, review the
  impact, then remove the corresponding authorization. Do not delete the zone
  merely to remove one environment.
- **Troubleshooting:** test from the requesting VPC, confirm the VPC is actually
  associated with the expected private zone, inspect Resolver forwarding rules,
  and only then investigate routes, security groups, or the target service.