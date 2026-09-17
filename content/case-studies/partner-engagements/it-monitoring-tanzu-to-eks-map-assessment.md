---
title: Enterprise IT monitoring platform · VMware Tanzu to Amazon EKS MAP assessment
nav: IT monitoring Tanzu to EKS MAP
label: Kubernetes modernization
heading: Assessing VMware Tanzu workloads, Dell VxRail footprints, and architecting Amazon EKS target states
project: partner-engagements
layer: Architecture & Kubernetes
order: 25
stack: [Amazon EKS, VMware Tanzu, Karpenter, AWS Transform, RVTools, Dell VxRail, AWS MAP]
tags: [kubernetes, eks, tanzu, vmware, migration, map-assess, karpenter, finops]
summary: Leading the AWS MAP Assess technical evaluation for a European IT monitoring software enterprise, transitioning on-premises VMware Tanzu Kubernetes to Amazon EKS with Karpenter and delivering executive TCO analysis.
problem: |
  A European enterprise IT infrastructure and network monitoring software leader operated
  its core commercial platforms, continuous integration runner fleets, and extensive QA test
  farms across on-premises Dell VxRail clusters running VMware Tanzu. Facing impending
  hypervisor licensing price increases and substantial physical colocation datacenter lease
  overheads, the organization initiated an AWS Migration Acceleration Program (MAP) assessment.
  The initiative required deep container-level discovery, VPC CNI IP capacity planning,
  stateful data persistence mapping, and an audited 3-year TCO financial justification to validate
  a complete datacenter exit.
solution: |
  Serving as Lead Cloud Architect, I spearheaded the technical workload assessment and EKS
  target state architecture. I formulated a comprehensive 33-question evaluation matrix spanning
  container resource requests/limits, network policies, and pod storage drivers. I designed the
  target AWS architecture transitioning VMware Tanzu workloads to Amazon EKS utilizing Karpenter
  with AWS Graviton and Spot instances, mapped relational databases to Amazon Aurora, and authored
  the compute right-sizing report (projecting ≥ 25% compute savings) and official AWS MAP Customer
  Sign-Off package.
flowLabel: VMware Tanzu to Amazon EKS migration assessment pipeline
flow:
  - step: On-premise Tanzu & VxRail discovery
    note: Analyzing Dell VxRail hyperconverged clusters, VMware Tanzu worker nodes, persistent volume claims, and Fiber Channel SAN storage.
  - step: Kubernetes architectural gap analysis
    note: Evaluating VPC CNI subnet IP capacity, IAM Roles for Service Accounts (IRSA), Velero cluster backup SLAs, and container security scanning.
  - step: Target Amazon EKS architecture design
    note: Designing multi-AZ VPC infrastructure, Karpenter-managed node provisioning on Graviton3/Spot instances, and managed AWS data services.
  - step: TCO modeling & MAP customer sign-off
    note: Calculating VMware licensing cost avoidance, colocation datacenter lease elimination, and delivering executive business case deliverables.
enables: |
  Decouples the enterprise from restrictive on-premises hypervisor licensing,
  automates container autoscaling via Karpenter on modern Graviton processors, and
  establishes the blueprint for a seamless colocation datacenter retirement.
outcomes:
  - value: ≥ 25%
    label: Projected compute cost reduction via EKS right-sizing and Karpenter
  - value: 100%
    label: VMware Tanzu workloads mapped to cloud-native Amazon EKS
  - value: Official
    label: AWS MAP Customer Sign-Off package validated and delivered
---

## Assessment · Overcoming hypervisor licensing pressure with cloud-native Kubernetes

Enterprise software providers maintaining on-premises hyperconverged infrastructure face severe economic and operational pressure: escalating virtualization licensing fees, physical hardware maintenance cycles (Dell servers, Fiber Channel SANs), and inflexible compute capacity that limits continuous integration (CI) testing throughput.

As Lead Cloud Architect for this AWS Migration Acceleration Program (MAP) Assess engagement, my responsibility was to lead the technical discovery of the client's on-premises environment across their European headquarters and colocation datacenters, and architect a modern, cost-optimized target state on AWS centered on **Amazon EKS**.

### Implementation notes

- **Kubernetes assessment framework:** To address gaps in standard hypervisor discovery, I developed an in-depth Kubernetes assessment questionnaire spanning 33 architectural dimensions, covering pod resource `requests` and `limits`, ingress controllers, network policy enforcement, and Prometheus metrics retention.
- **VPC CNI IP capacity planning:** Evaluated AWS VPC CNI behavior where secondary private IPs are assigned directly to pods. Architected secondary CIDR blocks (`100.64.0.0/16`) for pod networking to prevent private IPv4 address exhaustion in production subnets.
- **Dynamic autoscaling with Karpenter:** Modeled replacing static on-premise Dell VxRail worker nodes with Amazon EKS using **Karpenter**. By combining Graviton (ARM64) for baseline microservices with auto-scaling EC2 Spot instances for ephemeral GitLab CI runners and QA probe test farms, the architecture projected over 25% compute cost savings.
- **Persistent storage replatforming:** Analyzed stateful container workloads backed by Fiber Channel SAN and NFS shares. Defined clear replatforming pathways: moving transactional relational databases to **Amazon Aurora PostgreSQL**, shared developer file storage to **Amazon EFS** and **FSx for Windows**, and backup repositories to **AWS Backup** with automated S3 lifecycle tiering.

## Architecture · Current state vs. target Amazon EKS platform

The target state architecture transitioned physical hyperconverged hardware and self-managed Kubernetes into managed cloud-native AWS primitives:

- **Compute & Orchestration:**
  - *Current State:* VMware Tanzu Kubernetes running across 4 Dell VxRail ESXi physical hosts with static CI runner fleets.
  - *Target State:* Amazon EKS (Multi-AZ) with Karpenter just-in-time node provisioning, leveraging AWS Graviton3 (ARM64) for baseline microservices and auto-scaling EC2 Spot instances for ephemeral CI/CD runners.
- **Relational Databases & Persistent Storage:**
  - *Current State:* Self-managed PostgreSQL and BI reporting databases residing on physical Fiber Channel SAN arrays.
  - *Target State:* Amazon Aurora PostgreSQL Multi-AZ with automated storage autoscaling and cross-AZ read replica offloading.
- **Shared File Storage & Backup Repositories:**
  - *Current State:* On-premises Windows SMB shares and Veeam NFS backup storage targets.
  - *Target State:* Amazon FSx for Windows File Server, Amazon EFS, and AWS Backup with automated lifecycle transitions to Amazon S3 Glacier Deep Archive.

## FinOps & TCO · Quantifying VMware cost avoidance and datacenter exit

The financial business case evaluated three core economic drivers:
1. **VMware Licensing Cost Avoidance:** Transitioning from VMware Tanzu to managed Amazon EKS eliminated substantial annual hypervisor core licensing fees.
2. **Hardware Refresh Avoidance:** Retiring Dell servers, rack storage, and SAN switches eliminated multi-million dollar capital expenditure (CapEx) hardware refresh commitments.
3. **Colocation Lease Elimination:** Decommissioning the colocation facility eliminated recurring power, cooling, rack space, and dedicated physical transit costs.

## Outcome · Official AWS MAP customer sign-off

The assessment concluded with the formal delivery of the **Amazon EKS Target Architecture Blueprint**, the **Compute Right-Sizing & Savings Plans Report**, and the **AWS MAP Customer Sign-Off Template**. The deliverables received executive approval from client leadership and AWS partner governance, clearing the gateway to begin the MAP Mobilize phase.
