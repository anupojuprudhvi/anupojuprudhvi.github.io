---
title: Target State Blueprint · Landing Zone & 7Rs Roadmap
track: migration-journey
order: 4
module: 4
totalModules: 5
summary: Architecting multi-account AWS Organizations, IAM Identity Center federation, Transit Gateway networking, and classifying workloads into 7Rs pathways.
level: Solution Architecture
readingTime: 8 min read
stack: [AWS Organizations, Landing Zone, Transit Gateway, 7Rs Framework]
tags: [landing-zone, architecture, 7rs, networking, governance]
---

## Principle · The target foundation must precede workload migration

Before moving application servers, an enterprise must establish its **target operational foundation**. Migrating into an ad-hoc, single-account AWS setup creates unmanageable security risks, routing bottlenecks, and sprawl that takes years to untangle.

The target state architecture blueprint delivers two essential components:
1. **The Multi-Account Landing Zone:** A governed, secure multi-account environment provisioned via AWS Control Tower or Infrastructure as Code (Terraform/CDK).
2. **The 7Rs Portfolio Categorization:** A structured decision framework assigning every discovered workload to an explicit migration strategy.

## Architecture · Multi-Account Organizational Blueprint

A Well-Architected enterprise landing zone partitions responsibilities across isolated AWS accounts grouped into Organizational Units (OUs):

<pre><code>[ AWS Organization Root ]
  ├── [ Core / Governance OU ]
  │     ├── Management Account      (Consolidated billing, SCP management, Org formation)
  │     ├── Log Archive Account     (Centralized immutable S3 storage for CloudTrail &amp; Flow Logs)
  │     └── Security Tooling Account(Amazon GuardDuty, Security Hub, IAM Identity Center, KMS)
  │
  ├── [ Infrastructure OU ]
  │     ├── Network Hub Account     (Transit Gateway, Inspection VPC, Direct Connect / VPN)
  │     └── Shared Services Account (Enterprise DNS Route 53, CI/CD runners, AD domain controllers)
  │
  └── [ Workloads OU ]
        ├── Development Account     (Isolated non-prod developer sandbox and testing)
        ├── Staging Account         (Pre-production environment with production configuration parity)
        └── Production Account      (Zero developer write access, automated deployment only)</code></pre>

### Essential Guardrails
- **Service Control Policies (SCPs):** Top-down preventative guardrails enforced at the OU level. SCPs block unapproved AWS regions, deny creation of unencrypted EBS volumes or S3 buckets, and prevent tampering with CloudTrail logs or security agent roles.
- **Identity Federation:** Corporate SAML 2.0 / SCIM integration via **AWS IAM Identity Center**, eliminating long-lived IAM user access keys in favor of short-lived STS credentials with Multi-Factor Authentication (MFA).
- **Centralized Hybrid Networking:** An **AWS Transit Gateway (TGW)** deployed in the Network Hub account. Workload VPCs connect via VPC attachments, while dedicated **Direct Connect (DX)** or redundant IPsec VPN tunnels link cloud subnets directly to on-premises datacenters for dual-run hybrid operations.

## Methodology · The 7Rs workload migration framework

Every server, service, and database identified during discovery is classified across the **7Rs migration strategies**:

1. **Rehost (Lift & Shift):**
   - *Pattern:* Block-level replication of running servers directly into Amazon EC2 using **AWS Application Migration Service (MGN)**.
   - *When to use:* Strict cutover timelines (e.g., immediate datacenter evacuation) or commercial off-the-shelf (COTS) software where application source code cannot be modified.
2. **Replatform (Lift & Reshape):**
   - *Pattern:* Moving compute or data tiers to managed cloud equivalents without altering core application code.
   - *When to use:* Replacing self-managed VM databases with **Amazon RDS / Aurora**, migrating file servers to **Amazon EFS / FSx**, or containerizing applications on **Amazon EKS / ECS**.
3. **Refactor / Rearchitect (Cloud Native):**
   - *Pattern:* Rewriting monolithic application layers into decoupled microservices, event-driven architectures (Amazon EventBridge, AWS Lambda), or distributed NoSQL databases (Amazon DynamoDB).
   - *When to use:* Workloads requiring extreme scalability, high continuous development velocity, or high licensing cost reduction.
4. **Repurchase (Drop & Shop):**
   - *Pattern:* Retiring custom on-premises applications in favor of modern cloud SaaS platforms (e.g., migrating legacy on-prem email or ticketing to SaaS).
5. **Retain (Keep On-Premises):**
   - *Pattern:* Leaving workloads in the on-premises datacenter temporarily.
   - *When to use:* Systems tied to legacy mainframe hardware, active regulatory data sovereignty blockers, or applications with high cross-rack latency dependencies that cannot be separated.
6. **Retire (Decommission):**
   - *Pattern:* Turning off servers permanently.
   - *When to use:* In almost every enterprise assessment, **10% to 20% of discovered VMs are orphaned test environments, unowned dev boxes, or abandoned projects**. Identifying and retiring these servers delivers immediate cost elimination with zero migration effort.
7. **Relocate (Hypervisor Mobility):**
   - *Pattern:* Relocating virtual machine workloads to VMware Cloud on AWS (VMC) without modifying configuration or operational tooling.

## Deliverable · The Workload Placement Matrix

At the conclusion of Assess, the architectural blueprint delivers a unified **Workload Placement Matrix**:

- Lists each discovered application suite and its constituent servers.
- Details mapped source-to-target specifications (e.g., `VM-PROD-APP01` [8 vCPU / 32 GB] ──► `m7g.large` [2 vCPU / 8 GB Graviton3]).
- Defines assigned 7Rs pathway, target AWS account, target subnet/VPC, and estimated migration wave sequence.
