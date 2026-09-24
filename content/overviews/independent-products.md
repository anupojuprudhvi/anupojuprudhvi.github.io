---
title: Sovereign enterprise software and AI-assisted platform engineering
summary: From autonomous workforce identity governance with distributed sagas to hardened serverless platforms — architecting, building, and operating production software with formal AI-agent engineering discipline.
role: Platform Architect, Systems Engineer & Solo Product Builder
scope: Distributed state machines, deterministic policy RAG, monorepo-to-polyrepo microservices, WebAssembly compilation, security auditing, and automated CI/CD guardrails
---

## Problem · Bridging the gap between software ambition and operational reality

Building and operating independent software products presents two steep challenges: enterprise software typically requires large teams to maintain complex integrations across identity providers, HR systems, and cloud infrastructure; and solo-built products often suffer from architectural shortcuts that fail when deployed under real production constraints.

Enterprises bleed hundreds of thousands of dollars annually on disconnected identity tools and orphaned SaaS licenses, while solo engineers struggle to maintain velocity without sacrificing security, automated test coverage, and systematic root-cause discipline.

## Solution · Two distinct platforms, one uncompromising engineering standard

This engagement track showcases two software products engineered to solve complex operational problems through disciplined architecture and formal AI-agent collaboration:

1. **NexusCore AI (Flagship Enterprise OS):** An autonomous enterprise workforce, identity, and policy operating system that unifies Identity Governance (IAM), employee Joiner-Mover-Leaver (JML) automation, attendance tracking, and handbook policy retrieval. Powered by Temporal distributed state machines, Next.js 15, FastAPI, and PostgreSQL 16, it replaces five disconnected enterprise subscriptions, eliminating the $1,400/employee identity fragmentation tax with guaranteed sub-5s de-provisioning.
2. **Solo SaaS Hardening (PDF Performance & Security):** A production document processing platform taken from a broken serverless deployment to an audited, 93% lighter WebAssembly engine with Supabase Postgres and automated payment verification — engineered solo against a strict operating protocol.

## Architecture · Durable state machines and sovereign execution

NexusCore AI is designed for zero-trust enterprise sovereignty. Instead of fragile webhooks or unversioned Lambda scripts that fail silently when third-party APIs rate-limit, all multi-step employee lifecycle operations run as **atomic distributed sagas** orchestrated by Temporal. If any downstream SaaS API encounters an error, exponential backoff retries and automated compensating rollback transactions prevent half-configured ghost credentials from lingering in production.

All security-sensitive operations — including user creation, privilege elevation, manager reassignments, and tenant status changes — are cryptographically recorded in an append-only, tamper-evident SHA-256 audit ledger ready for SOC 2 Type II and SOX compliance reviews.

```text
       NexusCore AI (Enterprise Workforce & Identity OS)
       ─────────────────────────────────────────────────
       • 6 Decoupled Services: Web, API, AI, Worker, Infra, Manifests
       • Temporal Durable Execution Engine & Saga Compensation
       • Grounded Policy RAG: In-Memory BM25 + S3 Vectors with Page Citations
       • AWS EKS + ArgoCD GitOps Continuous Delivery
       • 509 Continuous Automated Tests (100% Pass Rate)

       Solo SaaS Hardening (High-Performance Document Engine)
       ─────────────────────────────────────────────────────
       • Zero-Native WASM Rendering Pipeline (Runs Local & Serverless)
       • Managed Supabase Postgres with Strict Row-Level Security (RLS)
       • Cryptographic Webhook Verification & Double-Spend Protection
       • 93% Payload Reduction (1.47MB down to 106KB)
```

### Implementation notes

- **Enterprise multi-tenancy & zero data leakage:** In NexusCore AI, relational schemas are strictly scoped by `organization_id` with foreign-key validation guards. Handbooks ingested into the Policy RAG engine are partitioned in memory and storage, ensuring that natural-language policy queries from one tenant can never retrieve or synthesize another tenant's proprietary documents.
- **Deterministic AI with mathematical guardrails:** Rather than allowing generic LLMs to hallucinate corporate policies, NexusCore AI requires verbatim clause and PDF page citations for every policy answer. Queries falling below a strict relevance threshold are automatically routed to human HR teams.
- **Polyrepo GitOps delivery:** Infrastructure is provisioned via 4-layer modular Terraform, managed on Kubernetes (AWS EKS) through ArgoCD GitOps, and decoupled from application secrets via the External Secrets Operator (ESO) bridging to AWS Secrets Manager.
- **Dual deployment topologies:** Deploys either as an auto-scaling Kubernetes cluster on AWS EKS with ArgoCD, or as an air-gapped standalone EC2 instance with Docker Compose and 127.0.0.1 port isolation for rapid proof-of-concept evaluations without Kubernetes overhead.

## Delivery · The AI-agent engineering operating protocol

Both platforms were built and operated through a formalized, written AI-agent engineering workflow. Rather than treating AI as an ad-hoc autocomplete tool, development was governed by strict operating guardrails:

- **Mandatory explain-propose-implement cycles:** Every bug fix and architectural addition required a written root-cause explanation and file-touch proposal before modifying code.
- **Continuous test ratchets:** Rigorous multi-suite automated gates (509 passing tests in NexusCore AI; 10 suites in the PDF platform) prevented regressions from ever landing in production branches.
- **Zero-hallucination verification:** All claims, endpoints, and architectural components are validated against live test suites and formal codebase audits.

## Outcome · Measured enterprise and product impact

Across both systems, this architectural discipline delivered verified, quantifiable outcomes:

- **$240,000 net annual recurring savings** for a 500-employee enterprise adopting NexusCore AI, cutting identity TCO by 66.7% with a 3.8-month payback period.
- **Sub-5 second Joiner-Mover-Leaver execution**, eliminating the 7.2-day onboarding lag and preventing security credential leaks.
- **89% IT ticket deflection** via self-service manager approval queues and grounded policy retrieval.
- **93% reduction in first-load page weight** and nine closed security vulnerabilities on the solo document platform.

## Case studies · {{caseStudyCount}} technical deep dives and platform stories

<div class="case-study-links">
{{caseStudyLinks}}
</div>
