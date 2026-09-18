---
title: A Transit Gateway hub that keeps account routing deliberate
nav: Connect accounts through Transit Gateway
label: Network architecture
heading: How the hub-and-spoke network makes cross-account paths explicit
project: tolling
layer: Foundation
order: 20
stack: [AWS Transit Gateway, AWS RAM, VPC, Terraform, AWS Network Firewall]
tags: [networking, transit-gateway, multi-account, segmentation, terraform]
summary: Connecting shared services, workload accounts, security inspection, and a recovery region through one governed Transit Gateway, not a full mesh of VPC routes.
problem: |
  A multi-account platform needs private connectivity between approved workloads,
  shared services, inspection controls, and recovery environments. A collection
  of VPC peering links would grow as accounts were added and would make route
  ownership and inspection paths difficult to review. The network also needed to
  preserve separation between environments instead of turning connectivity into
  implicit trust.
solution: |
  A Transit Gateway served as the regional routing hub, shared with
  approved accounts through AWS RAM. VPC attachments and route tables are owned
  by Terraform, with separate routing domains for workload, shared-service,
  inspection, and recovery paths. Spoke VPCs advertise only the prefixes they
  own; routes to other domains are added deliberately and can be sent through
  the inspection path where policy requires it.
flowLabel: Private traffic path through the network hub
flow:
  - step: Workload or shared-service VPC
    note: A resource sends traffic toward a destination prefix through its local VPC route table.
  - step: Transit Gateway attachment
    note: The VPC attachment presents the source network to the regional routing hub without exposing the workload to the public internet.
  - step: Transit Gateway route domain
    note: The hub selects the approved destination or inspection route; missing routes fail closed rather than discovering an unintended path.
  - step: Inspection or destination VPC
    note: Traffic reaches the security inspection VPC or the approved shared, workload, or recovery VPC after the relevant controls are applied.
enables: |
  Account onboarding becomes an explicit network contract: attach the VPC,
  associate the correct route table, propagate only approved prefixes, and
  validate the inspection and return paths before the environment is considered
  connected.
outcomes:
  - value: One
    label: Regional routing hub for approved account-to-account paths
  - value: Four
    label: Deliberate routing domains represented in the platform design
  - value: Zero
    label: Dependence on a growing mesh of point-to-point VPC peering links
---

## Architecture · The decisions that mattered

The important choice was to make connectivity a set of route-table relationships,
not a side effect of sharing a network. A Transit Gateway centralizes the routing
decision, but it does not automatically make every attached VPC trusted. The
attachment, association, propagation, and inspection path remain separate
decisions that can be reviewed in a Terraform plan.

### Implementation notes

- **Hub ownership:** The networking layer owns the Transit Gateway and shares it
  with approved accounts through AWS RAM. Workload accounts consume an attachment
  contract rather than creating independent hubs.
- **Route isolation:** Separate Transit Gateway route tables represent the
  platform's routing domains. A new propagation or static route is treated as an
  access decision and reviewed accordingly.
- **Return paths:** Every allowed destination is checked in both directions. A
  one-way route is not treated as working connectivity.

## Security · Connectivity is not authorization

Transit Gateway routing only establishes a possible network path. Security groups,
network ACLs, Network Firewall policy, endpoint policies, IAM, and application
authentication still control whether the connection is useful. Inspection routes
are explicit so a workload cannot bypass a required control simply by attaching
to the hub.

## Delivery · How the change is rolled out

The safe sequence is to create or update the hub, share it with the target account,
create the VPC attachment, associate the intended route table, and then add the
smallest required propagations or static routes. Terraform plans should be
reviewed for both the new path and any route removal. Connectivity is verified
from the source VPC and from the destination's return path before onboarding is
closed.

## Trade-offs · What this does not solve

- A centralized hub introduces a shared routing dependency and requires clear
  ownership, monitoring, and change control.
- Transit Gateway does not replace DNS, security groups, firewall policy, or
  application authorization.
- Cross-region recovery paths need their own routing, data replication, and
  failover validation; an attachment alone is not a recovery plan.

## Outcome · What changed

The platform has a repeatable network boundary for adding accounts and VPCs.
Routes are visible in plans, route domains make intended trust relationships
explicit, and inspection paths can be validated independently from workload
deployment. The outcome is a governed connectivity model rather than a claim of
universal reachability.

## Next · Improvements worth funding

The next exercise should combine route validation with firewall-policy tests,
failure of an attachment, and a recovery-region traffic drill. Those tests would
provide operational evidence for availability and recovery claims that are not
asserted by the architecture alone.