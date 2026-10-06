---
title: Assessment Frameworks · Rapid vs. Deep Enterprise
date: 2026-09-17
updated: 2026-10-06
track: migration-journey
order: 1
module: 1
summary: Choosing between a rapid 4–6 week assessment driven by tools and a deep 3–4 month study of the organization across the six AWS Cloud Adoption Framework (CAF) perspectives, and the signs that tell you which one you need.
level: Strategic Assessment
readingTime: 7 min read
stack: [AWS MAP, AWS CAF, RVTools, Discovery Strategy]
tags: [assessment, discovery, caf, migration-strategy, governance]
---

**In this module, you'll learn to:**

- Choose between a rapid 4–6 week assessment and a deep 3–4 month one
- Name the six AWS Cloud Adoption Framework (CAF) perspectives a deep assessment covers
- Spot the signs that a rapid assessment won't be enough

**Before you start:** nothing beyond a general idea of how servers and applications run in a datacenter. This is the first module of the track.

## Principle · Two ways to assess

Every migration starts with an assessment, but organizations arrive in very different situations. Most assessments follow one of two models:

1. **Rapid assessment (4–6 weeks):** driven by tools and data. It answers three questions quickly: what do we have, what will it cost on AWS, and what licensing problems are waiting for us?
2. **Deep assessment (3–4 months):** the same data, plus workshops across the whole organization. It also looks at people, skills, governance, and how the teams will run things in the cloud.

Picking the wrong one hurts either way. A three-month study when the datacenter lease ends in 90 days leaves no time to move. A four-week tool scan at a heavily regulated bank, without the security and operations teams on board, produces a plan that stalls in Mobilize.

## Comparison · Rapid vs. deep

| | Rapid (4–6 weeks) | Deep (3–4 months) |
| --- | --- | --- |
| **Usually triggered by** | An urgent cost case, or a lease or licence renewal deadline | A large estate, strict compliance (HIPAA, PCI DSS, SOC 2), or a lot of legacy |
| **Data** | RVTools exports and a short run of an agentless collector | 30–90 days of usage data, to catch month-end and quarter-end peaks, plus application-owner questionnaires |
| **Who's involved** | Infrastructure, virtualization, and finance leads | Leadership, security, architecture, finance, HR, and application owners |
| **Main output** | A business case with a 3-year cost model and a first strategy per workload | A full readiness assessment, a detailed cost and licensing model, a wave plan, and a plan for the cloud team |
| **Strength** | Fast, light on people's time, and gets to MAP funding quickly | Fewer surprises later, and real agreement across teams |
| **Weakness** | Little insight into application dependencies or how ready the organization is | Takes real time and effort from busy teams |

## Method · The six CAF perspectives

In a deep assessment, the server inventory is only half the picture. Workshops cover the six perspectives of the AWS Cloud Adoption Framework:

1. **Business:** what the migration is for: lower cost, faster delivery, new regions, or sustainability targets.
2. **People:** the skills teams have, the gaps, training, and readiness for new ways of working.
3. **Governance:** program management, cloud cost management (FinOps), and how success is measured.
4. **Platform:** current architecture, hybrid connectivity, CI/CD maturity, and the target landing zone.
5. **Security:** identity, encryption, compliance, vulnerability management, and incident response.
6. **Operations:** monitoring, backup and disaster recovery, the service desk, and on-call practices.

## Decision · Which one to choose

**Choose rapid when:**
- The main need is a credible cost case, to win budget or MAP funding.
- The estate is mostly VMware, well named, with administrators who know it.
- A commercial deadline is close, such as a hypervisor licence renewal or a colocation contract ending.

**Choose deep when:**
- The estate includes many physical servers, mainframe links, or several different hypervisors.
- Compliance requires documented data flows and a formal security review before any cloud networking is approved.
- The way teams are organized has to change, for example from separate sysadmin teams to a platform team.

## Recap · Key terms

- **Rapid assessment:** 4–6 weeks, driven by tools such as RVTools and a short collector run. It produces a business case and a first strategy per workload.
- **Deep assessment:** 3–4 months. It adds 30–90 days of usage data and workshops across the organization.
- **AWS CAF:** the Cloud Adoption Framework's six perspectives: business, people, governance, platform, security, and operations.
- **MAP:** the AWS Migration Acceleration Program, in three phases: assess, mobilize, and migrate and modernize.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: What does a rapid assessment mainly produce?
* A business case with a 3-year cost model and a first strategy for each workload
- A full readiness assessment of the whole organization
- A finished landing zone
- The first migrated wave
= A rapid assessment answers what you have, what it will cost on AWS, and what licensing problems are waiting. The deeper organizational work comes with a deep assessment.
Q: Which of these is one of the six AWS CAF perspectives?
- Procurement
* Operations
- Marketing
- Hardware
= The six are business, people, governance, platform, security, and operations.
Q: Why does a deep assessment collect 30–90 days of usage data?
- MAP requires exactly 90 days
* To catch month-end and quarter-end peaks
- Collectors take that long to install
- To match the licence renewal cycle
= A short sample can miss the busiest days. A longer one shows the peaks the estate really has to handle.
S: The datacenter lease ends in 90 days, and the estate is mostly well-documented VMware. Which assessment fits?
* Rapid
- Deep
- Neither; skip the assessment
- Deep first, then rapid
= A three-month study would leave no time to move. A well-run VMware estate with a near deadline is what a rapid assessment is for.
S: A heavily regulated bank needs documented data flows and a formal security review before any cloud networking is approved. Which assessment fits?
- Rapid, because it's faster
* Deep, with the security and operations teams involved from the start
- Rapid, adding security after the business case
- None until the review is done
= A quick tool scan without security and operations on board produces a plan that stalls in Mobilize.
```
