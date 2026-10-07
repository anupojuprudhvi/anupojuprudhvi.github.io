---
title: Target State Blueprint · Landing Zone & 7Rs Roadmap
date: 2026-09-17
updated: 2026-10-06
track: migration-journey
order: 4
module: 4
summary: The foundation to build before anything moves. A multi-account landing zone with guardrails, single sign-on, and hub networking, and the 7Rs, the strategy that decides what happens to each workload.
level: Solution Architecture
readingTime: 8 min read
stack: [AWS Organizations, Landing Zone, Transit Gateway, 7Rs Framework]
tags: [landing-zone, architecture, 7rs, networking, governance]
motif: network
---

**In this module, you'll learn to:**

- Lay out a multi-account landing zone and the guardrails that matter most
- Connect people and networks safely: single sign-on, Transit Gateway, and links to the datacenter
- Choose one of the 7Rs for every workload, and record it in the placement list

**Before you start:** read [Discovery Telemetry](02-discovery-telemetry-and-inventory.html). Its right-sized targets go into the placement list at the end of this module.

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

## Recap · Key terms

- **Landing zone:** a multi-account AWS environment in organizational units (core, infrastructure, workloads), built with Control Tower or infrastructure as code.
- **Service control policy (SCP):** a rule set on an OU that no account under it can override.
- **IAM Identity Center:** single sign-on from the company identity provider, with short-lived credentials and MFA.
- **Transit Gateway:** the hub that connects every workload VPC, with Direct Connect or VPN back to the datacenter.
- **7Rs:** rehost, replatform, refactor, repurchase, retain, retire, and relocate.
- **Workload placement list:** every application with its servers, right-sized target, 7R strategy, account, VPC, and wave.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: Which account keeps the central, write-once CloudTrail and VPC flow logs?
- Management
* Log archive
- Network
- Production
= Keeping logs in their own account means no one working in a workload account can change or delete them.
Q: What makes a service control policy different from a policy inside one account?
* It's set on the OU, and no account under it can override it
- It only applies to the management account
- It grants permissions to users
- It expires after a day
= SCPs set the outer limits for every account in the OU, such as blocking unapproved regions or stopping anyone from turning off CloudTrail.
Q: Which of the 7Rs moves a database to Amazon RDS without changing the application's code?
- Rehost
* Replatform
- Refactor
- Relocate
= Replatforming moves to a managed service while the application stays as it is.
S: Discovery finds 40 test servers that nobody owns and nobody has signed in to for a year. Which strategy?
- Rehost
- Retain
* Retire
- Repurchase
= Switching off forgotten servers saves money with no migration effort at all.
S: A system depends on a mainframe that isn't moving yet, and needs very low latency to it. What's its strategy for now?
- Rehost it in the first wave
* Retain: keep it on-premises for the time being
- Refactor it to Lambda
- Retire it
= Retain is for systems that can't move yet. Revisit them when what they depend on moves.
```
