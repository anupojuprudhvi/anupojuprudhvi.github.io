---
title: Assessment Frameworks · Rapid vs. Deep Enterprise
date: 2026-09-17
updated: 2026-10-06
track: migration-journey
order: 1
module: 1
summary: Choosing between a rapid 4–6 week assessment driven by tools and a deep 3–4 month study of the organization across the six AWS Cloud Adoption Framework (CAF) perspectives, and the signs that tell you which one you need.
level: Strategic Assessment
readingTime: 6 min read
stack: [AWS MAP, AWS CAF, RVTools, Discovery Strategy]
tags: [assessment, discovery, caf, migration-strategy, governance]
---

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
