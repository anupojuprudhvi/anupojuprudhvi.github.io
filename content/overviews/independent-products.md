---
title: Two products I built and run myself, with AI as a closely supervised helper
summary: A simple HR management tool with a plain-language assistant, and a serverless PDF product taken from broken to audited, both built under a strict, written way of working with AI coding tools.
role: Solo Product Builder
scope: HR modules, cited policy search, keeping each company's data separate, WebAssembly, security review, and automated CI/CD checks
---

## Problem · Big ambitions, small team

Products built by one person tend to collect shortcuts that break once real users arrive. A solo engineer has to move quickly without letting security, test coverage, or careful root-cause work slip, and AI coding tools make it easy to move quickly and easy to let those things slip.

## Solution · Two products, one set of standards

This section covers two products, both built with AI coding tools working under clear rules:

1. **An AI-assisted HRMS tool:** one place for leave, attendance, shifts, timesheets, the org chart, assets, and policy documents. A built-in assistant takes plain-language requests and answers policy questions by quoting the company's own documents, with the page. It runs on Next.js, FastAPI, and PostgreSQL.
2. **Solo SaaS hardening:** a PDF processing product I took from a serverless deployment that didn't work to a security-reviewed WebAssembly engine about 93% lighter, with Supabase Postgres and verified payment handling. I built it alone, following a written working protocol.

## Architecture · Simple pieces, clear boundaries

```text
       AI-assisted HRMS tool
       ─────────────────────────────────────────────────
       • Next.js web app, FastAPI API, PostgreSQL
       • Leave, attendance, shifts, timesheets, org chart, assets, documents
       • Assistant acts through the API as the signed-in user
       • Policy answers quote the source document and page

       Solo SaaS hardening (PDF engine)
       ─────────────────────────────────────────────────────
       • WebAssembly rendering, no native binaries (runs locally and serverless)
       • Supabase Postgres with row-level security (RLS)
       • Signed webhook checks and protection against double charging
       • First load cut from 1.47 MB to 106 KB (about 93%)
```

### Implementation notes

- **Each company's data stays separate.** In the HRMS, every record carries an `organization_id`, and tests check that one company can't read or change another's records.
- **Policy answers must show their source.** Instead of letting an AI model guess at company policy, the HRMS assistant quotes the matching passage and names the document and page. When nothing matches, it says so.
- **No outside AI service in the HRMS.** Requests and policy questions are handled inside the app, so company documents aren't sent anywhere else.

## Delivery · How I work with AI coding tools

I built and run both products with AI coding tools, under written rules rather than ad-hoc autocomplete:

- **Rules written down for the AI.** Each repository has an AGENTS.md that sets out how changes are made. In the HRMS, every task also leaves a written handover.
- **Reproduce first, then fix.** In the HRMS, a bug is reproduced before it's fixed, and the fix comes with a test that would have caught it.
- **Nothing is taken on trust.** Claims, endpoints, and architecture are checked against the test suites and code reviews.

## Outcome · What changed

- **Everyday HR in one simple tool,** with policy answers anyone can check against the source document.
- **About 93% less to download on first load**, and nine security findings fixed, on the PDF product.

## Case studies · {{caseStudyCount}} detailed write-ups

<div class="case-study-links">
{{caseStudyLinks}}
</div>
