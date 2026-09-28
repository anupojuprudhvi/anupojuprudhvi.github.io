---
title: NexusCore AI: one system for workforce identity, access, and HR policy
date: 2026-09-24
nav: NexusCore AI
summary: Bringing account access, joiner-mover-leaver (JML) automation, attendance, and HR policy answers into one platform, with offboarding in under 5 seconds. It targets the modelled ~$1,400 per employee that scattered identity tooling costs.
project: independent-products
layer: Product engineering
order: 5
stack: [FastAPI, Next.js 15, Temporal SDK, PostgreSQL 16, Amazon EKS, ArgoCD GitOps, External Secrets, Terraform]
tags: [identity-governance, distributed-systems, agentic-ai, temporal, security, finops, kubernetes]
problem: |
  Companies run dozens of SaaS apps per employee, spread across HR systems, identity tools, and cloud accounts that don't talk to each other. That costs an estimated $1,400 per employee a year in forgotten licences, slow onboarding, and IT tickets. When offboarding misses an account, it leaves a security gap and a compliance problem (including the SEC's cybersecurity disclosure rules), and HR spends its days answering questions that are already in a PDF handbook nobody reads.
solution: |
  I designed and built NexusCore AI: separate services around a PostgreSQL identity graph, Temporal workflows that complete joiner-mover-leaver changes in under 5 seconds and undo themselves if a step fails, a SHA-256 audit trail that shows any tampering, and policy search that cites the exact PDF page.
heroTitle: Joiners, movers, and leavers handled in seconds, with policy answers you can check
intro: Companies lose a lot of money to unused SaaS licences, manual IT tickets, and slow onboarding, because their HR system, cloud accounts, and identity provider each work on their own. NexusCore AI brings access management, joiner-mover-leaver (JML) automation, attendance, and handbook questions into one platform. It runs on Temporal workflows, removes SaaS access in under 5 seconds, and keeps each customer's data separate.
role: Enterprise Platform Architect & Systems Engineer
scope: Splitting a monorepo into services, Temporal workflows, cited policy search, multi-tenant isolation, and Kubernetes GitOps
closingText: Happy to go deeper on the Temporal saga design, the policy-retrieval engine, or the multi-tenant isolation model.
outcomes:
  - value: 66.7%
    label: Modelled net TCO reduction ($240,000/yr for a 500-employee company, 3.8-month payback) — a projection, not a measured result
  - value: <5s
    label: Automated Joiner-Mover-Leaver provisioning and 100% session de-provisioning with zero ghost credentials
  - value: 509
    label: Passing automated tests (340 API, 36 Worker, 17 AI, 80 Web Unit, 36 Browser E2E) across 5 continuous test suites
  - value: 89%
    label: Modelled IT helpdesk ticket deflection via self-service manager queues, sub-team access profiles, and grounded policy AI
scaffold: false
---

## Problem · What scattered identity tools really cost: about $1,400 per employee

Modern enterprises run an average of 42 disparate SaaS applications per knowledge worker. Because identity providers (Okta), HRIS systems (Workday, BambooHR), and cloud infrastructure (AWS, GitHub) operate in disconnected silos, the costs and security gaps pile up in four places:

1. **Identity Sprawl & Zombie Licenses:** When employees change departments or leave, their cloud and SaaS access remains active for weeks. 12% to 18% of paid enterprise SaaS seats remain assigned to departed or moved staff, which means paying every month for licences nobody uses.
2. **Onboarding Productivity Drag:** New engineers and knowledge workers wait an average of 7.2 business days to receive full access to their department-specific tools, repositories, and cloud environments, resulting in substantial lost productivity.
3. **IT Helpdesk Overhead:** IT teams spend hundreds of hours manually processing repetitive Joiner, Mover, and Leaver (JML) tickets, resetting passwords, and chasing managers for routine leave and timesheet signoffs.
4. **Compliance Exposure & SEC Cybersecurity Disclosure:** Forgotten accounts and access that keeps growing are easy targets for attackers. Under the SEC's 2023 cybersecurity rules, public companies must disclose material incidents within four business days (Form 8-K Item 1.05) and describe their cyber-risk management (Regulation S-K Item 106). Manual spreadsheets and unversioned scripts fail external SOC 2 Type II and SOX audits.

**Where the $1,400 per employee goes each year**

| Cost | What happens | Per employee, per year |
| --- | --- | --- |
| Zombie SaaS Seats | 12-18% of licenses remain assigned to departed staff or unused roles | $420 / employee |
| IT Ticket Overhead | 4.5 JML/access tickets per employee per year ($85 fully burdened cost) | $380 / employee |
| Onboarding Drag | 7.2 business days until full new hire engineering productivity | $450 / employee (salary waste) |
| Compliance Exposure | Audit prep, external sampling, and manual spreadsheet evidence | $150 / employee |
| Total | Adds up quietly every year | $1,400 |

## Architecture · Decoupled microservices, durable sagas, and GitOps delivery

NexusCore AI started as one codebase and is now six separate repositories, one per service. Each can be released on its own schedule, runs in its own container, and can be rolled out without downtime.

```text
   [ Knowledge Workers / Line Managers / CxO Leadership ]
                           │ (HTTPS / TLS 1.3)
                           ▼
             [ AWS Application Load Balancer ]
             ┌─────────────┴─────────────┐
             │ Path: /                   │ Path: /api/v1/*
             ▼                           ▼
   ┌───────────────────┐       ┌───────────────────┐
   │   nexus-core-web  │       │   nexus-core-api  │
   │  Next.js 15 (BFF) │◄─────►│  FastAPI (Python) │
   │  Proxy & Sessions │       │  9 Domain Modules │
   └───────────────────┘       └─────────┬─────────┘
             │ Path: /api/v1/ai          │
             ▼                           │ Workflow Tasks
   ┌───────────────────┐                 ▼
   │   nexus-core-ai   │       ┌───────────────────┐
   │  Dual-Lens Copilot│       │ nexus-core-worker │
   │  Policy RAG (BM25)│       │  Temporal SDK     │
   └─────────┬─────────┘       │  Durable Sagas    │
             │                         └─────────┬─────────┘
             │                                   │
             └─────────────┬─────────────────────┘
                           ▼
             ┌───────────────────────────┐
             │   Amazon RDS PostgreSQL   │
             │   Identity Graph Schema   │
             │   SHA-256 Audit Ledger    │
             └───────────────────────────┘
                           ▲
             ┌─────────────┴─────────────┐
             │   AWS EKS & ArgoCD GitOps │
             │   External Secrets (ESO)  │
             │   Terraform 4-Layer IaC   │
             └───────────────────────────┘
```

### Implementation notes

- **Decoupled microservices topology:** Separated into six domain-specific repositories: `nexus-core-web` (Next.js 15 App Router with server-side BFF proxy and zero client token exposure), `nexus-core-api` (FastAPI REST gateway with 9 domain modules: attendance, leave, timesheets, assets, workflows, documents, identity, platform, and project management), `nexus-core-ai` (grounded Policy RAG engine and dual-lens copilot), `nexus-core-worker` (Temporal durable execution workers), `nexus-core-infra` (modular 4-layer Terraform IaC), and `nexus-core-manifests` (Helm v3 charts and ArgoCD GitOps manifests).
- **Dual deployment flexibility:** Supports two production topologies: an enterprise auto-scaling architecture on AWS EKS (ALB Ingress Controller, External Secrets Operator syncing from AWS Secrets Manager, ArgoCD GitOps synchronization), and a standalone single-node EC2 deployment (Docker Compose + Nginx reverse proxy with internal services and database strictly bound to `127.0.0.1` for dev/PoC agility without EKS control plane overhead).
- **Strict multi-tenant boundary enforcement:** Every relational entity is partitioned by `organization_id` foreign key predicates. Negative-authorization mutation tests verify that cross-tenant entity manipulation returns strict 404/403 responses, preventing data leakage across organizational tenants.
- **Cryptographic SHA-256 audit ledger:** Security-critical mutations — including user creation, manager reassignments, password updates, and organization status toggles — are recorded in an append-only, tamper-evident hash chain, creating immutable proof for SOC 2 Type II compliance reviews.

## Design choices · How this differs from the usual approaches

Most companies handle joiners, movers, and leavers with some mix of an SSO provider, an HR system, and scripts that glue them together. Each is good at its own job. The gaps show up in the hand-offs between them, and that's what NexusCore AI was designed around:

| Concern | NexusCore AI | Typical setup |
| --- | --- | --- |
| A step fails halfway through offboarding | The workflow undoes the earlier steps automatically | Often needs someone to notice and clean up by hand |
| Removing a leaver's access | Under 5 seconds, across connected apps | Depends on batch jobs or IT tickets |
| Answering policy questions | Answers quote the clause and PDF page | People search the handbook or ask HR |
| Access for specialised teams | Ready-made bundles per sub-team | Broader group rules |

- **Why not just scripts and webhooks?** Many teams start with Lambda scripts or Zapier-style webhooks. They work until a SaaS API rate-limits or changes shape, then fail quietly and leave accounts active for weeks. Auditors also want a versioned record of what ran, which ad-hoc scripts rarely provide. Temporal workflows retry, undo on failure, and keep a full history of every run.
- **Why a separate platform instead of more add-ons?** SSO providers and HR systems each cover part of the job. NexusCore AI's aim is to run the whole joiner-mover-leaver process in one place, from the HR record to the last SaaS account.

## Workflows · Durable Joiner-Mover-Leaver sagas with atomic rollback

Temporal is at the heart of NexusCore AI. Instead of firing off API calls and hoping they all work, every joiner, mover, or leaver change runs as a multi-step workflow that either finishes completely or undoes itself.

```text
  [ Admin / HR Triggers Onboarding ]
                  │
                  ▼
  ┌──────────────────────────────────┐
  │  Activity 1: Create Core User    │ ──► [ Persists user in Identity Graph ]
  └─────────────────┬────────────────┘
                    │
                    ▼
  ┌──────────────────────────────────┐
  │  Activity 2: Grant Leave Quotas  │ ──► [ Applies org birthright leave policy ]
  └─────────────────┬────────────────┘
                    │
                    ▼
  ┌──────────────────────────────────┐      ┌──────────────────────────────────┐
  │  Activity 3: Provision SaaS Apps │ ──►  │ Google Workspace, Slack, GitHub, │
  └─────────────────┬────────────────┘      │ AWS IAM, Jira, Salesforce        │
                    │                       └──────────────────────────────────┘
                    │ (If any API fails: Compensating rollback executes in reverse)
                    ▼
  ┌──────────────────────────────────┐
  │  Activity 4: Dispatch Invite     │ ──► [ Single-use welcome activation token ]
  └─────────────────┬────────────────┘
                    │
                    ▼
  [ Saga Status: COMPLETED in <5s · Recorded in SHA-256 Tamper-Evident Ledger ]
```

### Workflow capabilities

- **Sub-5 second Leaver de-provisioning:** Offboarding takes one click. The saga simultaneously invalidates active JWT session tokens, revokes access across all connected SaaS applications, deallocates hardware assets, and registers an immutable timestamped event in the audit trail.
- **Sub-Team Access Profiles:** Organization Admins configure curated tool bundles for specialized sub-teams (e.g., Engineering → SecOps, DevOps, Tier-2 Support). During onboarding, HR can inspect a pre-flight checklist and fine-tune individual tool access prior to triggering the provisioning saga.
- **Miller-Column organization hierarchy:** Interactive cascading org charts maintain a formal "Reports To" parent-child relationship persisted in the Identity Graph. Built-in graph validation prevents circular hierarchy deadlocks (e.g., User A reporting to User B while User B reports to User A).
- **Live execution Gantt observability:** An interactive sliding drawer provides real-time visibility into Temporal workflow execution histories, activity runtimes, retry attempts, and structured JSON payloads for rapid audit verification.

## Policy answers · Every answer shows where it came from

A general-purpose language model will happily make up an HR rule or guess an expense limit, and a careless setup can leak one company's policies to another. NexusCore AI only answers from the company's own handbook, using retrieval-augmented generation (RAG), and shows its source every time.

```text
  [ Corporate Employee Handbook (PDF / Text) ]
                       │
                       ▼
  ┌─────────────────────────────────────────┐
  │  Semantic Clause & Section Chunking     │
  └────────────────────┬────────────────────┘
                       │
                       ▼
  ┌─────────────────────────────────────────┐
  │  Hybrid Indexing: In-Memory BM25 Index  │
  │  + Scoped AWS S3 Vector Embeddings      │
  └────────────────────┬────────────────────┘
                       │
  [ Employee Natural Language Inquiry ] ────► Hybrid Search Match
                                                    │
                                                    ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │ Grounded Synthesis: Verbatim answer with Clause Heading & PDF Page Cit.│
  │ (Relevance score checked: If below confidence threshold, alerts HR)    │
  └────────────────────────────────────────────────────────────────────────┘
```

### How the policy search works

- **Verifiable citations:** Answers come only from handbooks the company has uploaded (and verified), and each one names the file, the clause heading, and the exact PDF page.
- **No guessing:** If nothing in the handbook matches a question closely enough, the system doesn't make up an answer. It passes the question to HR.
- **Strict tenant isolation:** Multi-tenant vectors are scoped strictly by organization. Automated negative tests verify that queries from Tenant B return strictly 0 results for documents owned by Tenant A.
- **Dual-Lens Copilot architecture:**
  - *Line Manager Queue:* Self-service operational approvals for leave requests, shift adjustments, overtime signoffs, and weekly timesheets.
  - *CxO Governance Cockpit:* Executive heatmaps showing policy inquiry trends, overtime compliance alerts, and dual-authorization gates for employee terminations.

## ROI Model · Financial impact for a 500-employee enterprise

NexusCore AI is designed to replace five separate subscriptions with one platform. The figures below are a model built from list prices and staffing assumptions. They're a projection, not results measured at a real company.

```text
Current setup (separate tools):
├── Okta SSO + Identity Governance ($25/user/mo)  : $150,000 / yr
├── Core HRIS (BambooHR / Workday) ($10/user/mo)  :  $60,000 / yr
├── Policy Wiki / Knowledge Hub ($5/user/mo)     :  $30,000 / yr
└── Dedicated IT Helpdesk Support (1.0 FTE)       : $120,000 / yr
──────────────────────────────────────────────────────────────────
TOTAL CURRENT ANNUAL COST                         : $360,000 / yr

With NexusCore AI:
├── NexusCore AI Enterprise Tier ($14/user/mo)    :  $84,000 / yr
├── Cloud Infrastructure / Database Hosting       :  $12,000 / yr
└── Remaining IT Oversight (0.2 FTE)              :  $24,000 / yr
──────────────────────────────────────────────────────────────────
TOTAL NEXUSCORE AI ANNUAL RUN-RATE                : $120,000 / yr

==================================================================
NET ANNUAL FINANCIAL SAVINGS                     : $240,000 / YEAR
PERCENTAGE TCO BUDGET REDUCTION                  : 66.7% NET CUT
PAYBACK PERIOD FROM SIGNATURE                     : 3.8 MONTHS
ENGINEERING HOURS RECLAIMED                       : 1,800 HOURS / YR
IT TICKET DEFLECTION                             : 89% REDUCTION
==================================================================
```

### Quality & test verification

- **509 passing automated tests:** 340 API tests (multi-tenant scoping, RBAC permissions catalogue, leave balance deductions), 36 Temporal Worker tests (saga compensations and reconciliation loops), 17 AI engine tests (RAG retrieval and tenant isolation), 80 Web Unit tests (BFF proxy routing and token security), and 36 Playwright Browser E2E specs (responsive drawers, theme contrast, and full lifecycle journeys).
- **Codebase guardrails:** Enforced zero raw HTML controls across user interfaces (`raw_html_controls: 0`) and strict permission checks on all 126 backend API routes.
