---
title: Two products I built and run myself, with AI as a closely supervised helper
summary: A workforce identity platform built on reliable Temporal workflows, and a serverless PDF product taken from broken to audited, both built under a strict, written way of working with AI coding tools.
role: Platform Architect, Systems Engineer & Solo Product Builder
scope: Temporal workflows, cited policy search, splitting a monorepo into services, WebAssembly, security review, and automated CI/CD checks
---

## Problem · Big ambitions, small team

Independent products run into two problems. Enterprise software usually needs a large team to keep its integrations with identity providers, HR systems, and cloud infrastructure working. Products built by one person tend to collect shortcuts that break once real users arrive.

Companies spend a lot on identity tools that don't talk to each other and on SaaS licences nobody remembered to cancel. A solo engineer, meanwhile, has to move quickly without letting security, test coverage, or careful root-cause work slip.

## Solution · Two products, one set of standards

This section covers two products, both built with AI coding tools working under clear rules:

1. **NexusCore AI:** one system for workforce identity and policy. It brings together account access (IAM), joiner-mover-leaver (JML) automation, attendance, and answers to handbook questions. It runs on Temporal, Next.js 15, FastAPI, and PostgreSQL 16, and is designed to replace five separate subscriptions and remove a departing employee's access in under five seconds.
2. **Solo SaaS hardening:** a PDF processing product I took from a serverless deployment that didn't work to a security-reviewed WebAssembly engine about 93% lighter, with Supabase Postgres and verified payment handling. I built it alone, following a written working protocol.

## Architecture · Workflows that finish or undo themselves

In NexusCore AI, multi-step employee changes don't rely on webhooks or loose Lambda scripts that can fail quietly when a third-party API starts rate-limiting. Each change runs as a Temporal workflow. If a downstream SaaS API fails, the workflow retries with backoff, and if it still can't finish, it undoes the earlier steps. Nobody is left with half-configured access.

Every security-sensitive action (creating a user, raising privileges, changing a manager, changing a tenant's status) is written to an append-only audit log protected with SHA-256 hashing, so it's ready for SOC 2 Type II and SOX reviews.

```text
       NexusCore AI (workforce & identity platform)
       ─────────────────────────────────────────────────
       • 6 separate services: web, API, AI, worker, infra, manifests
       • Temporal workflows with automatic undo on failure
       • Policy search: in-memory BM25 + S3 vectors, with page citations
       • Amazon EKS + ArgoCD GitOps delivery
       • 509 automated tests, all passing

       Solo SaaS hardening (PDF engine)
       ─────────────────────────────────────────────────────
       • WebAssembly rendering, no native binaries (runs locally and serverless)
       • Supabase Postgres with row-level security (RLS)
       • Signed webhook checks and protection against double charging
       • First load cut from 1.47 MB to 106 KB (about 93%)
```

### Implementation notes

- **Each customer's data stays separate.** Every table is scoped by `organization_id` and checked with foreign keys. Handbooks loaded into the policy search are kept apart in memory and in storage, so one company's question can never pull in another company's documents.
- **Policy answers must show their source.** Instead of letting a language model guess at company policy, every answer quotes the exact clause and PDF page. Questions that don't match anything closely enough go to the HR team instead.
- **Infrastructure in code, delivered through Git.** Infrastructure is built with four layers of Terraform, the services run on Amazon EKS managed by ArgoCD, and secrets come from AWS Secrets Manager through the External Secrets Operator.
- **Two ways to deploy.** It runs either on an autoscaling EKS cluster with ArgoCD, or on a single EC2 instance with Docker Compose and ports bound to localhost, for a quick trial without Kubernetes.

## Delivery · How I work with AI coding tools

I built and run both products with AI coding tools, under written rules rather than ad-hoc autocomplete:

- **Explain, propose, then change.** Every fix or new feature starts with a written root-cause explanation and a list of files to touch, before any code changes.
- **Tests only ratchet up.** Automated test suites (509 tests in NexusCore AI, 10 suites in the PDF product) block changes that would break something.
- **Nothing is taken on trust.** Claims, endpoints, and architecture are checked against the test suites and code reviews.

## Outcome · What the numbers say

- **$240,000 a year in modelled net savings** for a 500-employee company using NexusCore AI: a 66.7% cut in identity costs with a 3.8-month payback. This is a projection, not a measured result.
- **Access changes in under 5 seconds** for joiners, movers, and leavers, compared with the multi-day onboarding waits the case study describes.
- **89% modelled drop in IT tickets**, from self-service manager approvals and policy answers people can check.
- **About 93% less to download on first load**, and nine security findings fixed, on the PDF product.

## Case studies · {{caseStudyCount}} detailed write-ups

<div class="case-study-links">
{{caseStudyLinks}}
</div>
