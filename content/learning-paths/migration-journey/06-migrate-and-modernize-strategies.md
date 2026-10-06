---
title: Migrate & Modernize · In-Flight vs. Sequential Factory
date: 2026-09-17
updated: 2026-10-06
track: migration-journey
order: 6
module: 6
summary: Move first and improve later, or modernize during the move? When each approach fits, the common modernization targets (containers on EKS, Aurora, and managed messaging), and what the final phase hands over.
level: Modernization Architecture
readingTime: 6 min read
stack: [AWS MGN, Amazon EKS, Karpenter, Amazon Aurora, AWS DMS, Amazon EventBridge]
tags: [modernization, migrate, eks, aurora, serverless, migration-factory]
---

## Principle · Move first, or modernize on the way?

Migrations used to be done in two separate steps:

1. **Migrate:** lift and shift every VM to EC2 as quickly as possible (rehost).
2. **Modernize:** improve the applications later, once they're in AWS.

Doing it in that order keeps the move simple. But it has a cost, sometimes called the **migration tax**: you pay to recreate the old setup in the cloud (the same VM sizes, operating system licences, and patching work), and "later" often never comes once the deadline pressure is gone.

So many migrations now mix the two: most servers are rehosted, while the parts where modernizing pays off most are changed **during** the move.

## Comparison · Two approaches

**Move first, modernize later (rehost)**
- **How:** copy servers as they are to EC2 with **AWS Application Migration Service (MGN)**.
- **Best for:** a hard deadline such as a datacenter exit in 60–90 days, complex vendor software you can't change, or teams new to AWS.
- **Strength:** fast, with very little change to the applications.
- **Weakness:** old problems and costs move with you, and the savings from managed services are delayed.

**Modernize during the move**
- **How:** move straight to managed AWS services (replatform or refactor) as part of the wave.
- **Best for:** your own core applications, databases facing an expensive licence renewal, and CI/CD runner fleets.
- **Strength:** lower running costs sooner, better scaling, and no second migration later.
- **Weakness:** more engineering effort up front, more testing, and the application team must be closely involved.

## Patterns · Common modernization targets

A typical mix, workload by workload:

- **Web and API tiers on VMs:** into containers on **Amazon EKS**, with Karpenter.
- **Self-managed SQL Server VMs:** to **Amazon Aurora PostgreSQL**, where the application can be changed and tested.
- **File servers:** to **Amazon EFS** (Linux) or **Amazon FSx for Windows File Server**.
- **Vendor software and batch servers:** rehosted to EC2 with MGN, and reviewed again later.

### 1. Compute: from VMs to Amazon EKS

Instead of fixed EC2 instances sized like the old VMs, containerized workloads run on **Amazon EKS**:

- **Karpenter adds nodes to fit the pods** that are actually waiting, and removes them when they're empty, so you're not paying for idle capacity. (The [Kubernetes track](../kubernetes-operations/17-scaling-requests-and-cost.html) covers this in depth.)
- **AWS Graviton (ARM64) nodes,** where the container images are built for ARM64, for better price-performance (Module 02).
- **Spot Instances** for interruptible work such as CI/CD build runners and queue workers. AWS quotes savings of up to 90% off On-Demand, in exchange for capacity that can be taken back at short notice.

### 2. Databases: to Amazon Aurora

Databases are often the biggest licence cost, and the most work to look after:

- **Self-managed PostgreSQL or MySQL to Aurora:** the backups, replication across Availability Zones, point-in-time recovery, and storage growth are handled for you, instead of by scripts and maintenance windows.
- **SQL Server or Oracle to Aurora PostgreSQL:** the **AWS Schema Conversion Tool (SCT)** converts the schema, and **AWS Database Migration Service (DMS)** moves the data. This removes the commercial database licence, but stored procedures and application queries usually need real changes and careful testing.

### 3. Messaging: from self-hosted brokers to managed services

- **Amazon SQS and EventBridge** replace message brokers running on VMs, so one slow service doesn't take others down with it.
- **API Gateway and Lambda** suit small, occasional endpoints such as admin tools and webhooks, where you pay only when they're called.

## Deliverables · What the final phase hands over

1. **Repeatable migration runbooks** for servers and databases, used wave after wave.
2. **The code for the new platform:** Terraform modules for EKS and Aurora, Helm charts, and CI/CD pipelines.
3. **Cutover reports and sign-off:** performance after each cutover, and acceptance by the application owners.
4. **MAP close-out reporting,** as required by AWS or your partner.
5. **Datacenter exit:** old hardware securely wiped and retired, so the lease or colocation contract can end.
