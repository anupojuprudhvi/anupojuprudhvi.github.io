---
title: Financial Engineering · 3-Year TCO & Licensing
date: 2026-09-17
updated: 2026-10-06
track: migration-journey
order: 3
module: 3
summary: Building the cost case. On-Demand vs. 1-year and 3-year Savings Plans, a blended commitment strategy, Windows Server and SQL Server licensing choices, how MAP funding fits in, and what goes into the business case leadership signs.
level: Financial Architecture
readingTime: 9 min read
stack: [TCO Modeling, AWS Pricing, Savings Plans, Microsoft Licensing, AWS MAP]
tags: [finops, tco, savings-plans, byol, licensing, business-case]
---

**In this module, you'll learn to:**

- Compare On-Demand with 1-year and 3-year Savings Plans, and blend them
- Weigh bringing your own licence against licence-included for Windows Server and SQL Server
- Assemble a business case that separates measured numbers from assumptions

**Before you start:** read [Discovery Telemetry](02-discovery-telemetry-and-inventory.html). The cost model is built on its right-sized estimate.

## Principle · Leadership decides on cash flow

Engineers often argue for the cloud with agility, autoscaling, and modern services. Finance leaders decide with three numbers: **total cost of ownership (TCO)**, **when the money goes out**, and **how long until it pays back**.

So the Assess phase ends with a **business case** (AWS calls it a Directional Business Case). It turns the discovery data into a 3-year comparison: what the current estate costs to run, against the right-sized AWS cost under different commitment options.

## Pricing · Three ways to pay for compute

### 1. On-Demand

The baseline.

- **What it is:** pay by the second, no commitment.
- **In the model:** the most expensive case, and the baseline every saving is measured against. Useful in the first waves, before usage settles down.

### 2. 1-year Savings Plans

A middle ground.

- **What it is:** commit to a set amount of compute spend per hour for one year.
- **In the model:** a solid discount for workloads you expect to change, shrink, or modernize within a year or two.

### 3. 3-year Savings Plans

The biggest saving, for the longest commitment.

- **What it is:** the same commitment for three years, paid with no upfront, partial upfront, or all upfront.
- **In the model:** the biggest discount. AWS quotes up to 66% off On-Demand for Compute Savings Plans, and up to 72% for EC2 Instance Savings Plans. Use it for the steady core that will still be there in three years: core databases, ERP and CRM systems, domain controllers.

### Blend the commitments

Committing the whole estate to three years on day one is risky, because the estate will change as you migrate and modernize. A blended plan is safer, for example:

- **Steady core, about 60%:** 3-year Savings Plans.
- **Likely to change, about 25%:** 1-year Savings Plans.
- **Variable or short-lived, about 15%:** On-Demand and Spot (test environments, bursts).

The percentages are a starting point. Set them from the discovery data, and review them after each wave.

## Licensing · Windows Server and SQL Server

In many VMware estates, Microsoft licensing costs more than the hardware it runs on. The cost model needs to compare two ways of licensing on AWS.

### Option A: bring your own licence (BYOL)

Use the licences you already own.

- **Windows Server:** BYOL needs **EC2 Dedicated Hosts**, and generally only licences bought before 1 October 2019 (or added as a true-up under an agreement active then) are eligible.
- **SQL Server:** with active Software Assurance, License Mobility lets you run it on normal shared EC2 instances.
- **AWS License Manager** tracks cores and sockets so you stay within your licence terms.
- **The catch:** you keep paying Microsoft for the agreements and Software Assurance.

### Option B: licence included

Pay for the licence as part of the instance.

- **What it is:** AWS supplies the Windows Server or SQL Server licence, billed by the second as part of the instance price.
- **The benefit:** no upfront licence purchase, and fewer licences to renew when your Microsoft agreement comes up.

### Bigger savings: change the database

The largest licensing savings usually come from changing the database itself.

- **SQL Server Enterprise to Standard:** after right-sizing, many databases fit within Standard edition limits, which costs much less per core.
- **SQL Server to Aurora PostgreSQL:** moving to an open-source engine removes the database licence altogether, but needs real migration and testing work (Module 06).

## Funding · Where MAP fits

The **AWS Migration Acceleration Program (MAP)** can help pay for the migration, typically in three ways: funding toward the assessment, support for Mobilize work, and credits linked to the AWS spend that the migration creates. The amounts, rules, and eligibility change over time and differ from deal to deal, so confirm the current terms with AWS or your AWS partner before you put any figure in the business case.

## Delivery · What goes into the business case

- **Summary:** the projected 3-year saving, and the main reasons for it.
- **Cost comparison, year by year:** on-premises (hardware depreciation, colocation, power and cooling, hypervisor licences) against AWS (compute, storage, data transfer, support).
- **Migration costs:** partner and internal effort, a period of running both environments at once, and any MAP funding that offsets them.
- **Payback:** a month-by-month view showing when the move breaks even, usually after the datacenter is closed.

<div class="callout"><b>Keep it honest.</b> A business case is a model, not a result. Say which numbers come from measured usage and which are assumptions, so nobody mistakes a projection for a promise.</div>

## Recap · Key terms

- **TCO:** total cost of ownership, compared over three years for today's estate and the right-sized AWS one.
- **Savings Plan:** a commitment to an amount of compute spend per hour, for one or three years, in exchange for a discount.
- **Blended commitment:** for example about 60% on 3-year plans, 25% on 1-year plans, and 15% On-Demand or Spot, set from discovery data.
- **BYOL:** using licences you own. Windows Server needs Dedicated Hosts; SQL Server with Software Assurance can use License Mobility on shared instances.
- **Licence included:** AWS supplies the Windows Server or SQL Server licence, billed per second with the instance.
- **Directional Business Case:** AWS's name for the business case that ends the Assess phase.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: Which workloads belong under a 3-year Savings Plan?
* The steady core that will still be there in three years, such as core databases and ERP systems
- Test environments
- Workloads you plan to modernize next year
- Short bursts of traffic
= The longest commitment gets the biggest discount, so it goes on what certainly won't change.
Q: What does bringing your own Windows Server licence to AWS generally require?
- Nothing; any licence works on shared instances
* EC2 Dedicated Hosts, with licences generally bought before 1 October 2019
- Only active Software Assurance
- AWS License Manager instead of a Microsoft agreement
= License Mobility with Software Assurance applies to SQL Server, not to Windows Server itself.
Q: What should a business case say about its numbers?
- Present every figure as a confirmed saving
* Which numbers come from measured usage and which are assumptions
- Only the 3-year total
- Only the MAP funding amount
= A business case is a model, not a result. Labelling assumptions stops a projection being read as a promise.
S: The team wants to commit the whole estate to 3-year Savings Plans on day one, to show the biggest saving. What's the risk, and what's safer?
- No risk; Savings Plans can be cancelled at any time
* The estate will change as you migrate and modernize; blend 3-year, 1-year, and On-Demand, and review after each wave
- Put everything on 1-year plans instead
- Commit nothing until every wave is finished
= Commitments made before the estate settles can end up paying for capacity you no longer run.
S: After right-sizing, a SQL Server Enterprise database fits within Standard edition limits. What does that mean for the cost model?
- Nothing; both editions cost the same per core
* A large licensing saving, because Standard costs much less per core
- It must move to Aurora PostgreSQL
- It now needs Dedicated Hosts
= Changing the edition, or the database engine, is often where the biggest licensing savings come from.
```
