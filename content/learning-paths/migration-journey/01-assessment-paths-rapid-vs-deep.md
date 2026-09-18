---
title: Assessment Frameworks · Rapid vs. Deep Enterprise
track: migration-journey
order: 1
module: 1
totalModules: 6
summary: Comparing rapid 4–6 week tooling-driven assessments with 3–4 month organizational evaluations across the 6 AWS Cloud Adoption Framework (CAF) pillars.
level: Strategic Assessment
readingTime: 8 min read
stack: [AWS MAP, AWS CAF, RVTools, Discovery Strategy]
tags: [assessment, discovery, caf, migration-strategy, governance]
---

## Principle · The two paths to cloud readiness

Every cloud migration starts with the **Assess** phase, but no two enterprise estates arrive with the same timeline, governance constraints, or organizational readiness. 

When entering an assessment, architects and migration leads must select between two primary delivery engagement models:

1. **The Rapid Assessment (4–6 Weeks):** A focused, telemetry-led evaluation engineered for speed. It leverages automated tooling to answer the core financial and infrastructure questions: *"What do we have, what will it cost on AWS, and what are our immediate licensing liabilities?"*
2. **The Deep Enterprise Assessment (3–4 Months):** A holistic organizational and technical transformation study. It pairs automated discovery with extensive cross-functional stakeholder workshops across all six **AWS Cloud Adoption Framework (CAF)** perspectives, analyzing people, skills, governance, and operating models alongside server inventory.

Selecting the wrong engagement model introduces severe delivery friction: executing a multi-month discovery when a datacenter lease expires in 90 days causes paralysis, while running a rapid 4-week tooling scan on a heavily regulated bank without organizational buy-in leads to stalled Mobilize initiatives.

## Comparison · Rapid vs. Deep engagement models

The table below contrasts the scope, cadence, deliverables, and trade-offs of both assessment paths:

- **Rapid Assessment (4–6 Weeks):**
  - **Primary Trigger:** Immediate financial justification needed, impending datacenter lease expirations, or hypervisor licensing renewal cliffs.
  - **Discovery Mechanism:** Automated RVTools exports and lightweight AWS Transform agentless OVA appliances.
  - **Stakeholder Footprint:** Infrastructure, virtualization, and cloud finance leads.
  - **Key Deliverable:** Directional Business Case (DBC) with 3-year TCO modeling (On-Demand vs. Savings Plans) and high-level 7Rs workload mapping.
  - **Core Advantage:** Fast time-to-value, low organizational tax, unlocks AWS MAP funding eligibility quickly.
  - **Known Trade-off:** Limited visibility into application-level interdependencies and organizational change management readiness.

- **Deep Enterprise Assessment (3–4 Months):**
  - **Primary Trigger:** Large-scale enterprise estate exit (500+ VMs), complex regulatory compliance (HIPAA, PCI-DSS, SOC2), or significant legacy operational debt.
  - **Discovery Mechanism:** Continuous telemetry over 30–90 days (capturing quarter-end processing peaks) combined with deep application owner questionnaires.
  - **Stakeholder Footprint:** Full executive suite: CIO, CISO, VP of Infrastructure, Enterprise Architecture, FinOps, HR/Enablement, and Application Tier owners.
  - **Key Deliverable:** Comprehensive Migration Readiness Assessment (MRA) across 6 CAF pillars, detailed Total Cost of Ownership (TCO) with BYOL licensing audit, detailed wave planning, and Cloud Center of Excellence (CCoE) operating charter.
  - **Core Advantage:** High architectural precision, deep cross-functional alignment, minimizes unexpected surprises during Mobilize.
  - **Known Trade-off:** Substantial time investment and organizational energy required across engineering and business teams.

## Methodology · The 6 Cloud Adoption Framework (CAF) pillars

In a Deep Assessment, technical inventory is only half the equation. The evaluation conducts structured workshops across the six AWS CAF pillars to gauge organizational maturity:

1. **Business Perspective:** Aligns migration objectives with business outcomes — separating cost optimization goals from agility, geographic expansion, or ESG carbon footprint mandates.
2. **People Perspective:** Evaluates workforce cloud readiness, existing skill gaps, cloud training pathways, and institutional readiness for DevOps operating models.
3. **Governance Perspective:** Audits program management, cloud financial management (FinOps), portfolio management, and KPI measurement frameworks.
4. **Platform Perspective:** Assesses current infrastructure architectures, hybrid connectivity, CI/CD maturity, containerization viability, and target landing zone blueprints.
5. **Security Perspective:** Evaluates identity federation (SAML/SCIM), data perimeter encryption, compliance regimes, vulnerability management, and incident response readiness.
6. **Operations Perspective:** Examines observability (metrics, logs, traces), backup and disaster recovery SLAs, service desk integration (ITIL/ITSM), and site reliability engineering (SRE) practices.

## Decision Matrix · Selecting the right path

Use the following decision criteria to align leadership on the appropriate assessment model:

- **Choose the Rapid Path (4–6 Weeks) when:**
  - The immediate priority is obtaining an audited TCO to secure executive budget or AWS MAP co-funding.
  - The estate is heavily virtualized on VMware vCenter with clean naming standards and active hypervisor administrators.
  - The organization has a pending commercial renewal deadline (e.g., hypervisor license renewal or colocation termination).
- **Choose the Deep Enterprise Path (3–4 Months) when:**
  - The estate contains significant bare-metal footprints, mainframe integration, or heterogeneous hypervisors.
  - Strict compliance requires audited data-flow diagrams and formal CISO architectural review before approving cloud networking.
  - The organizational operating model must be restructured from siloed sysadmin teams into modern platform engineering squads.
