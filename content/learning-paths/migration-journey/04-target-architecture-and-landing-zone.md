---
title: Target State Blueprint · Landing Zone & 7Rs Roadmap
date: 2026-09-17
updated: 2026-10-06
track: migration-journey
order: 4
module: 4
summary: The foundation to build before anything moves. A multi-account landing zone with guardrails, single sign-on, and hub networking, and the 7Rs, the strategy that decides what happens to each workload.
level: Solution Architecture
readingTime: 7 min read
stack: [AWS Organizations, Landing Zone, Transit Gateway, 7Rs Framework]
tags: [landing-zone, architecture, 7rs, networking, governance]
---

## Principle · Build the foundation first

Before any application server moves, the target environment needs to exist. Migrating into a single, ad-hoc AWS account creates security gaps, tangled networking, and sprawl that takes years to undo.

The target architecture has two parts:

1. **The landing zone:** a multi-account AWS environment with guardrails, built with AWS Control Tower or infrastructure as code (Terraform or CDK).
2. **The 7Rs plan:** a decision, for every workload found in discovery, about how it will move, or whether it moves at all.

## Architecture · The multi-account layout

A landing zone separates responsibilities into AWS accounts, grouped into organizational units (OUs):

<pre><code>[ AWS Organization ]
  ├── [ Core OU ]
  │     ├── Management account     billing, organization settings, SCPs
  │     ├── Log archive account    central, write-once CloudTrail and VPC flow logs
  │     └── Security account       GuardDuty, Security Hub, KMS
  │
  ├── [ Infrastructure OU ]
  │     ├── Network account        Transit Gateway, inspection VPC, Direct Connect / VPN
  │     └── Shared services        DNS, CI/CD runners, directory services
  │
  └── [ Workloads OU ]
        ├── Development            sandboxes and testing
        ├── Staging                same configuration as production
        └── Production             no manual changes; deployed by pipeline only</code></pre>

### The guardrails that matter most

- **Service control policies (SCPs):** rules set at the OU level that no account can override. Typical ones block unapproved regions, require encryption, and stop anyone switching off CloudTrail or security tooling.
- **Single sign-on:** people sign in through the company identity provider using **AWS IAM Identity Center** (SAML and SCIM), and get short-lived credentials with MFA. No long-lived IAM user keys.
- **Hub networking:** an **AWS Transit Gateway** in the network account connects every workload VPC. **Direct Connect** or redundant site-to-site VPN links AWS to the datacenter, so old and new environments can talk during the migration.

## Strategy · The 7Rs

Every server, service, and database found in discovery gets one of seven strategies:

1. **Rehost (lift and shift):** copy the server as it is to EC2 with **AWS Application Migration Service (MGN)**. Best for tight deadlines, or vendor software you can't change.
2. **Replatform (lift and reshape):** move to a managed service without changing the application's code. Databases to **Amazon RDS or Aurora**, file servers to **Amazon EFS or FSx**, apps into containers on **Amazon EKS or ECS**.
3. **Refactor (re-architect):** rebuild parts of the application to be cloud-native, for example as event-driven services with Amazon EventBridge and AWS Lambda. Worth it for systems that change often or need to scale a lot.
4. **Repurchase (drop and shop):** replace a home-grown system with a SaaS product, such as moving an on-premises ticketing tool to a SaaS one.
5. **Retain (keep for now):** leave it on-premises for the time being, for example because it depends on a mainframe, data must stay in-country, or it needs very low latency to something that can't move yet.
6. **Retire (switch off):** turn it off for good. Assessments regularly turn up forgotten test servers, unowned development boxes, and abandoned projects. Retiring them saves money with no migration effort at all.
7. **Relocate:** move VMware VMs as they are to a VMware environment running on AWS, without changing how they're run.

## Deliverable · The workload placement list

The architecture work ends with one list that covers every application:

- the application and the servers that belong to it;
- each server's current size and its right-sized AWS target, for example `APP01` at 8 vCPU / 32 GB becoming an `m7g.large` at 2 vCPU / 8 GB (Module 02);
- its 7R strategy, its target account and VPC, and its planned migration wave.
