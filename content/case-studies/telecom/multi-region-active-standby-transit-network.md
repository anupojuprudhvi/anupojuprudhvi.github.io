---
title: Active-standby multi-region disaster recovery network mesh
nav: Multi-region DR network mesh
label: Disaster recovery
heading: Designing dual-region VPCs and Transit Gateway peering for telecom resilience
project: telecom
layer: Foundation
order: 50
stack: [AWS Transit Gateway, VPC, AWS Backup, Terraform, S3 Native State Locking]
tags: [networking, multi-region, disaster-recovery, transit-gateway, terraform, dual-vpc]
summary: Deploying an active-standby multi-region topology across Frankfurt and Paris spanning dual VPCs, 24 subnets, Transit Gateway inter-region peering, and S3 native state locking.
problem: |
  Telecommunications carrier agreements required the core platform to survive the catastrophic failure of an entire AWS cloud region with an RPO under one second and an RTO under fifteen minutes. Operating across regions with separate application, database, and administrative networks created severe routing complexity. Managing dozens of point-to-point VPC peering connections between primary (`eu-central-1`) and secondary (`eu-west-3`) regions would produce an unmaintainable mesh prone to routing loops, asymmetric return paths, and state lock contention during concurrent Terraform deployments.
solution: |
  I architected an active-standby multi-region cloud topology codified into twelve modular Terraform components. Each region deploys a dual-VPC architecture: an Application VPC for compute workloads and a Network Hub VPC for Transit Gateways, NAT Gateways, and bastion jump hosts. The primary region in Frankfurt connects to the disaster-recovery region in Paris through an encrypted AWS Transit Gateway inter-region peering attachment. Cross-region data resilience is anchored by Aurora Global Database storage replication and automated AWS Backup vaults, with Terraform state concurrency protected by S3 native state locking (`use_lockfile = true`).
flowLabel: Multi-region Transit Gateway and storage replication path
flow:
  - step: Dual-VPC regional topology
    note: Primary (172.17.0.0/16) and DR (172.18.0.0/16) regions each deploy separate App and Hub VPCs across three Availability Zones and 24 structured subnets.
  - step: Transit Gateway inter-region peering
    note: Hub VPCs host Transit Gateways interconnected via encrypted inter-region TGW peering tunnels with explicit route table associations and propagations.
  - step: Continuous cross-region storage replication
    note: Aurora Global Database synchronizes storage blocks from Frankfurt to Paris with sub-second replication latency; AWS Backup replicates EFS snapshots daily.
  - step: S3 native state locking
    note: 12 modular Terraform tiers deploy using native S3 object lockfiles (use_lockfile = true), eliminating DynamoDB lock table overhead.
enables: |
  The telecommunications platform provides a proven disaster recovery path capable of sustaining a total regional outage while maintaining sub-second data synchronization.
outcomes:
  - value: < 1s
    label: Recovery Point Objective (RPO) maintained via Aurora Global Database storage replication
  - value: < 15m
    label: Recovery Time Objective (RTO) achieved during cross-region failover simulation drills
  - value: 24
    label: Discrete VPC subnets provisioned across 6 Availability Zones in two AWS regions
---

## Architecture · The decisions that mattered

The core architectural decision was to separate workload execution from network transit by establishing a Hub-and-Spoke model in each region. Having application instances route directly across regional boundaries creates brittle routing configurations. By funneling all egress and cross-region traffic through Transit Gateway hubs, routing policies, inspection paths, and VPN connections are managed centrally without touching application subnets.

### Implementation evidence

- **Dual-VPC regional segmentation:** The environment divides responsibilities cleanly between two VPCs per region:
  - *App VPC:* Contains isolated tiers across three Availability Zones—public subnets for load balancers, private subnets for Media Application Servers (MAS), and private database subnets for Aurora and persistent nodes (`172.17.0.0/16` in Frankfurt, `172.18.0.0/16` in Paris).
  - *Network Hub VPC:* Houses Transit Gateway attachments, NAT Gateways, bastion jump hosts (`c5.4xlarge`), and IPsec VPN endpoints terminating connections from legacy datacenters.
- **Inter-region Transit Gateway peering:** Rather than configuring VPC-to-VPC peering across regions, the primary TGW in Frankfurt (`eu-central-1`) and secondary TGW in Paris (`eu-west-3`) are connected via an `aws_ec2_transit_gateway_peering_attachment`. Static route table entries steer inter-region database and replication traffic across AWS's private global fiber backbone.
- **S3 native state locking (`use_lockfile = true`):** Managing twelve separate Terraform modules across multiple environments historically required provisioning and maintaining dedicated DynamoDB state-locking tables. Adopting Terraform's native S3 lockfile functionality simplified deployment automation, eliminated lock-table provisioning overhead, and guaranteed race-free pipeline runs.

### Security controls

- **Zero public database ingress:** Database subnets have no route to Internet Gateways; all administrative database access is brokered through hardened bastion hosts in the Hub VPC via AWS Systems Manager Session Manager.
- **Encrypted inter-region backbone:** Transit Gateway inter-region traffic is encrypted at the physical layer using AWS-managed keys across the private AWS global network.
- **Isolated route tables:** Workload subnets advertise only their local CIDR to the Transit Gateway; route propagation is restricted to approved destination subnets, preventing unintentional cross-account exposure.

## Delivery · How the change is rolled out

The infrastructure was deployed in strict dependency order via automated shell wrappers (`apply.sh`):
1. `networking/`: Dual VPCs, internet gateways, NAT gateways, and subnets.
2. `kms/`: Customer Managed Keys in both regions.
3. `tgw/` & `tgw-peering/`: Regional Transit Gateways and inter-region peering.
4. `aurora-rds-global/`: Primary cluster in Frankfurt with secondary read replica in Paris.
5. `EFS/` & `ec2-persistent-server/`: Multi-AZ file storage and compute nodes.

Each tier was validated via speculative `terraform plan` reviews against environment-specific tfvars (`stage_terraform.tfvars` and `stage_dr_terraform.tfvars`).

## Trade-offs · What this does not solve

While Transit Gateway peering provides private IP reachability between Frankfurt and Paris, it does not perform automated DNS failover for client devices. External SIP endpoints and mobile app traffic require Route 53 latency-based or failover routing policies to steer incoming subscriber connections to the secondary region during a disaster event.
