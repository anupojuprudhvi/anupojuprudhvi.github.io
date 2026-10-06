---
title: An AI-assisted HRMS tool: leave, attendance, timesheets, and policy answers in one place
date: 2026-09-24
updated: 2026-10-06
nav: AI-Assisted HRMS
summary: A simple HR management tool I built with AI coding tools. It covers leave, attendance, shifts, timesheets, the org chart, company assets, and policy documents, and a built-in assistant handles everyday requests in plain language and answers policy questions by quoting the handbook, with the page.
project: independent-products
layer: Product engineering
order: 5
stack: [FastAPI, Next.js, PostgreSQL]
tags: [hrms, assistant, policy-search, multi-tenant, ai-assisted-engineering]
problem: |
  In many small and mid-sized companies, everyday HR work lives in spreadsheets, email threads, and a PDF handbook nobody reads. Employees don't know their leave balance, managers approve requests by replying to emails, and HR answers the same policy questions again and again.
solution: |
  I built a simple HRMS: one place for leave, attendance, shifts, timesheets, the org chart, assets, and policy documents. A built-in assistant takes plain-language requests such as "how much leave do I have?" and answers policy questions by quoting the company's own documents, with the page. I built it with AI coding tools under written working rules.
heroTitle: Everyday HR in one place, with policy answers you can check
intro: Leave requests, attendance, timesheets, and approvals usually end up spread across spreadsheets and email. This HRMS brings them into one simple tool. Its assistant handles everyday requests in plain language and answers policy questions by quoting the company's own handbook, with the document and page, so nobody has to take its word for it.
role: Solo Product Builder
scope: The HR modules, the plain-language assistant and policy search, keeping each company's data separate, and building it all with AI coding tools under written rules
closingText: Happy to go deeper on the policy search, how each company's data is kept separate, or how I work with AI coding tools.
scaffold: false
---

## Problem · Everyday HR lives in too many places

Small and mid-sized companies often run HR from a mix of spreadsheets, email, and a shared folder. It works, but it costs time every day:

- **Employees can't see their own data.** How much leave is left? Which shift am I on? They have to ask someone.
- **Approvals get lost in email.** A leave request or an overtime claim waits in a manager's inbox until somebody chases it.
- **The same policy questions come up again and again.** The answers are in the handbook, but the handbook is a long PDF, so people ask HR instead.

## Solution · One simple tool, plus an assistant that shows its sources

The tool covers everyday HR work in one place:

| Area | What it does |
| --- | --- |
| Leave | Leave types and yearly allowances per company, balances (half days included), requests that managers approve or reject, and a holiday calendar |
| Attendance and shifts | Clock in and out, breaks, a team view for today, overtime that managers approve, and shift schedules |
| Timesheets | Projects and tasks, time entries, a weekly summary, and an export |
| Org chart | A "reports to" structure that refuses loops, such as A reporting to B while B reports to A |
| Assets | Company equipment and software licences, and who has them |
| Policy documents | Handbooks and policies in folders, readable by everyone and managed by admins |
| Assistant | Plain-language requests and policy questions, answered from the company's own data |

## Architecture · A web app, an API, an assistant, and a database

```flow
title: How a request moves through the HRMS
Browser | employees, managers, and HR
-> HTTPS
Next.js web app | the pages; sign-in kept in an httpOnly cookie that page scripts can't read
-> API calls
FastAPI | leave, attendance, shifts, timesheets, org chart, assets, documents
-> plain-language requests
* Assistant | understands the request, then calls the same API as the signed-in user
-> reads and writes
PostgreSQL | every record tagged with the company it belongs to
```

### Implementation notes

- **Each company's data stays separate.** Every record carries an `organization_id`, and queries are filtered by it. Automated tests try to read and change another company's records and expect the request to be refused.
- **Roles decide what each person can do.** Employees, managers, HR, and admins each get their own permissions, and the API checks them before any data changes.
- **The assistant has no special powers.** It acts through the same API, as the person asking, so it can't do anything that person couldn't do themselves.

## Assistant · Plain-language requests, and answers you can check

The assistant covers two kinds of question.

**Everyday requests.** "How much leave do I have?", "request leave next Friday", "clock me in", "which shift am I on?", "who's in today?". If a detail is missing, such as the dates for a leave request, it asks for it before doing anything.

**Policy questions.** "What's our parental leave policy?" Instead of letting an AI model invent an answer, it searches the company's own policy documents and quotes the matching passage:

- **Every answer shows its source.** It names the document and the page, so anyone can open it and check.
- **No match, no guess.** If nothing in the documents matches, it says so plainly and suggests checking with HR.
- **No outside AI service.** Requests are understood and answered inside the app, so company documents and employee data aren't sent anywhere else.
- **One company never sees another's documents.** Searches are scoped to the company of the person asking.

## Delivery · Built with AI coding tools, under written rules

I built this tool with AI coding tools, and the way I worked mattered more than the tools:

- **Written rules for the AI.** An AGENTS.md file in the repository sets out how every change is made, and each task gets a written handover: what changed, which checks ran, and what's left.
- **Reproduce first, then fix.** A reported bug is reproduced before it's fixed, and the fix comes with a test that would have caught it.
- **Small, complete changes.** Each change is the smallest one that fully solves the problem, which keeps AI-written code easy to review.
- **Security is tested, not assumed.** Any change to permissions is tested with the wrong role and the wrong company, and expects to be refused. Failing tests and security checks are never switched off to get a change through.

The same approach is described step by step in the [My AI Journey](../../learning-paths/my-ai-journey/index.html) learning path.

## Trade-offs · Kept simple on purpose

- **Quoting, not generating.** The assistant quotes the handbook instead of writing its own answer. It reads less smoothly than a chatbot, but it can't make up a policy.
- **Keyword search.** Policy search matches words and phrases rather than meaning, so a question that uses very different words from the handbook may find nothing. It then says so rather than guessing.

## Next steps · Where it could go

- Leave and attendance reports for HR and managers.
- Reminders for approvals that have waited too long.
