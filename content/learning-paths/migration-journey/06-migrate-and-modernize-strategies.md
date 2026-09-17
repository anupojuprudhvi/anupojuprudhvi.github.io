---
title: Migrate & Modernize · In-Flight vs. Sequential Factory
track: migration-journey
order: 6
module: 6
totalModules: 6
summary: Deciding between sequential 2-step lift-and-shift vs. in-flight modernization during Mobilize, architecting cloud-native target platforms, and executing the migration factory.
level: Modernization Architecture
readingTime: 9 min read
stack: [AWS MAP, Amazon EKS, Amazon Aurora, Karpenter, AWS MGN, Refactoring]
tags: [modernization, migrate, eks, aurora, serverless, migration-factory]
---

## Principle · The modernization dilemma: sequential vs. in-flight

In traditional cloud adoption, enterprise migrations were treated as a strict sequential two-step process:
1. **Step 1 (Migrate):** Lift-and-shift VMs to Amazon EC2 as quickly as possible with minimal changes (Rehost).
2. **Step 2 (Modernize):** Refactor applications to cloud-native managed services post-migration.

While sequential migration offers the lowest cognitive load during initial datacenter evacuation, it introduces a severe business penalty known as the **"migration tax"**:
- The enterprise spends substantial capital to replicate legacy operational patterns, OS licenses, and VM patch maintenance in the cloud.
- Once in AWS, teams face operational fatigue, leaving workloads in an unoptimized, expensive state for years.

Consequently, forward-leaning enterprise clients actively demand a **hybrid dual-track approach**: mixing **Mobilize** and **Modernize** together. By modernizing strategic tiers *during* the migration cutover, organizations achieve immediate elasticity, eliminate hypervisor/database licensing liabilities, and bypass the migration tax entirely.

## Comparison · Sequential Factory vs. In-Flight Modernization

Choosing the optimal modernization strategy depends on workload criticality, technical debt, and business deadlines:

- **Sequential Factory (Rehost First, Modernize Later):**
  - **Core Mechanism:** Block-level server replication via **AWS Application Migration Service (MGN)** directly to Amazon EC2.
  - **Best For:** Hard datacenter lease termination dates (e.g. 60–90 day hard exit), complex monolithic third-party COTS applications, or organizations with nascent cloud engineering skills.
  - **Core Benefit:** Fast cutover velocity with minimal application code disturbance.
  - **Trade-Off:** Carries legacy technical debt into AWS; delays managed service cost savings.

- **In-Flight Modernization (Modernize During Cutover):**
  - **Core Mechanism:** Replatforming or refactoring workloads directly into managed AWS primitives during the migration wave.
  - **Best For:** Core proprietary applications, workloads facing punitive commercial database licensing renewals, or continuous integration/developer runner fleets.
  - **Core Benefit:** Immediate cost reduction (up to 40%–60%), serverless elasticity, and zero dual-migration operational tax.
  - **Trade-Off:** Requires higher upfront engineering effort, comprehensive regression testing, and active application team engagement.

## Architecture · In-Flight Modernization Patterns

The diagram below illustrates how enterprise estates decouple workloads during in-flight modernization:

<pre><code>[ On-Premises Legacy Footprint ]
  ├── Monolithic VM Web/API Tier   ──► In-Flight Modernization ──► Amazon EKS + Karpenter (Graviton3 ARM64)
  ├── Self-Managed SQL Server VMs  ──► In-Flight Modernization ──► Amazon Aurora PostgreSQL (Multi-AZ)
  ├── Legacy File Servers (NFS)    ──► Replatforming           ──► Amazon EFS / FSx for Windows
  └── Legacy COTS / Batch Servers  ──► Rehost (AWS MGN)        ──► Amazon EC2 (Scheduled for later review)</code></pre>

### 1. Compute: VMs to Amazon EKS with Karpenter
Rather than provisioning static EC2 instances that match legacy VM specs, containerized workloads transition directly to **Amazon EKS**:
- **Dynamic Node Provisioning:** Utilizing **Karpenter** to provision right-sized compute nodes just-in-time based on actual pod resource requests, eliminating idle worker node waste.
- **Architecture Shift to ARM64:** Deploying microservices onto **AWS Graviton3** processors, delivering 25% better compute performance and 20% lower cost compared to x86 equivalents.
- **Spot Fleet Offloading:** Routing ephemeral workloads (CI/CD build runners, background queue workers) to EC2 Spot instances, saving up to 90% off On-Demand rates with automated graceful draining.

### 2. Database: Commercial Engines to Amazon Aurora
Relational database tiers represent the highest ongoing licensing expense:
- **Replatforming to Aurora Multi-AZ:** Migrating self-hosted PostgreSQL/MySQL VMs to **Amazon Aurora**, replacing manual backup scripts and hypervisor maintenance with automated cross-AZ replication, 1-day point-in-time recovery, and storage autoscaling up to 128 TiB.
- **Heterogeneous Database Migration:** Utilizing the **AWS Schema Conversion Tool (SCT)** and **AWS Database Migration Service (DMS)** to convert proprietary Oracle or Microsoft SQL Server schemas into open-source compatible Amazon Aurora PostgreSQL, eliminating commercial database core licensing permanently.

### 3. Messaging & Integration: Monolith Queues to EventBridge
Replacing fragile host-bound message brokers with managed serverless primitives:
- **Amazon EventBridge & SQS:** Decoupling inter-service communication to prevent cascading failures during cutovers.
- **API Gateway & Lambda:** Offloading low-frequency administrative and webhook endpoints to serverless architectures, paying only for executed requests.

## Deliverables · The Migrate & Modernize Milestone Package

The Migrate & Modernize phase concludes with formal enterprise delivery artifacts:

1. **Industrialized Migration Factory Runbooks:** Standardized, automated pipelines orchestrating block-level and database cutovers across sequenced waves.
2. **Modernization Target Blueprints:** Production-hardened Helm charts, Terraform infrastructure modules for EKS/Aurora, and CI/CD deployment workflows.
3. **Cutover Validation & Sign-Off Reports:** Real-time post-cutover performance metrics, SLA compliance records, and business acceptance sign-offs.
4. **AWS MAP Post-Migration Governance Package:** Formal proof of migration submitted to AWS partner governance, unlocking financial cloud credits and ARR rebates.
5. **Datacenter Asset Decommissioning Certificates:** Verification of clean data wiping and decommissioning of on-premises physical hardware, securing final datacenter lease termination.
