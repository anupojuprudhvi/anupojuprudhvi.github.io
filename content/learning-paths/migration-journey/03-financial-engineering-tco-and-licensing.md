---
title: Financial Engineering · 3-Year TCO & Licensing
track: migration-journey
order: 3
module: 3
totalModules: 6
summary: Modeling On-Demand vs. 1-Yr/3-Yr Savings Plans, Microsoft Windows and SQL Server BYOL vs. License-Included scenarios, and passing MAP milestone audits.
level: Financial Architecture
readingTime: 9 min read
stack: [TCO Modeling, AWS Pricing, Savings Plans, Microsoft Licensing, AWS MAP]
tags: [finops, tco, savings-plans, byol, licensing, business-case]
---

## Principle · The language of the C-suite is cash flow

Engineering teams often pitch cloud migration around agility, autoscaling, and modern APIs. Chief Financial Officers (CFOs) evaluate cloud migration through three pragmatic metrics: **Total Cost of Ownership (TCO)**, **net cash-flow timing**, and **payback period**.

A successful Assess phase culminates in the **Directional Business Case (DBC)**. The DBC translates raw server telemetry into an audited 3-year financial comparison, contrasting current on-premises capital and operational expenditures (CapEx/OpEx) against right-sized AWS run costs under diverse commitment models.

## Framework · Sizing the 3 commitment tiers

The financial model projects target AWS infrastructure spend across three pricing horizons:

### 1. On-Demand Pricing (The Baseline Ceiling)
- **Characteristics:** Pay-per-second with zero long-term commitment.
- **Role in Model:** Represents the maximum cost envelope. Useful during initial migration waves before usage patterns stabilize.
- **Financial Metric:** Full list price — serves as the baseline from which all optimization savings are calculated.

### 2. 1-Year Commitments (Moderate Flexibility)
- **Characteristics:** 1-Year Compute Savings Plans or EC2 Instance Savings Plans.
- **Discounts:** ~25% to 40% discount off On-Demand rates.
- **Role in Model:** Ideal for transient workloads, applications slated for major refactoring within 18 months, or organizations cautious about multi-year commitments.

### 3. 3-Year Commitments (Maximum Efficiency)
- **Characteristics:** 3-Year Compute Savings Plans (No Upfront, Partial Upfront, or All Upfront).
- **Discounts:** Up to **66% to 72% discount** off On-Demand rates.
- **Role in Model:** Applied to predictable baseline core infrastructure (core database servers, continuous enterprise ERP/CRM services, domain controllers).

### The Recommended Blended Commitment Strategy
Enterprise financial models avoid committing 100% of an estate to 3-year reservations on Day 1. Instead, they structure a **blended portfolio commitment**:

<pre><code>Enterprise Cloud Spend Allocation:
├── 60% Baseline Workloads   ───► 3-Year Compute Savings Plans (Max discount, covers immutable core)
├── 25% Medium-Term Workloads ───► 1-Year Compute Savings Plans (Moderate discount, covers refactoring horizon)
└── 15% Variable / Ephemeral ───► On-Demand &amp; EC2 Spot (Zero commitment, covers test farms &amp; bursts)</code></pre>

## Licensing · The Microsoft Windows & SQL Server optimization curve

In enterprise VMware environments, commercial software licensing — specifically **Microsoft Windows Server** and **Microsoft SQL Server** — frequently costs more than the physical compute hardware it runs on.

The assessment must model two competing licensing pathways:

### Option A: Bring Your Own License (BYOL)
- **Prerequisites:** Active Microsoft Software Assurance (SA) or eligible licenses purchased before October 1, 2019.
- **Execution:** Deployed onto **Amazon EC2 Dedicated Hosts** or shared EC2 instances using AWS License Manager to track physical socket and core allocations.
- **Financial Impact:** Eliminates the per-hour OS and SQL licensing charge on AWS. However, the organization remains responsible for ongoing Microsoft Enterprise Agreement (EA) renewal fees.

### Option B: AWS License-Included (LI)
- **Execution:** Instances are provisioned with Amazon-provided Windows Server and SQL Server licenses billed per second on standard multi-tenant EC2.
- **Financial Impact:** Converts upfront annual software capital expenditures into utility operating expenses. Allows organizations to retire expensive Microsoft Enterprise Agreements upon contract expiration.

### Modernization Pathway: Replatforming SQL Server
The DBC evaluates replatforming commercial SQL Server databases to managed cloud alternatives:
- **SQL Server Enterprise to Standard:** Right-sizing database vCPUs often brings workloads within SQL Server Standard limits, slashing per-core licensing fees by ~70%.
- **Commercial to Open Source:** Mapping relational databases to **Amazon Aurora PostgreSQL** eliminates proprietary database licensing liabilities entirely.

## Funding · Unlocking AWS MAP partner co-funding

The AWS Migration Acceleration Program (MAP) provides substantial financial incentives to offset migration costs:

1. **Assess Phase Funding:** Fixed partner cash or cloud credits (typically $15,000 to $60,000 depending on estate size) to fund the partner's discovery and business case delivery.
2. **Mobilize Phase Funding:** Cash and credit subsidies (often covering up to 50% of the partner's professional services fees to build the landing zone and migration tooling).
3. **Migrate Phase Funding:** AWS cloud credits calculated as a percentage of post-cutover annual recurring revenue (ARR), typically offsetting 15% to 25% of Year 1 cloud spend.

## Delivery · The Directional Business Case (DBC) package

Passing the Assess phase milestone gate requires presenting a validated DBC package to executive leadership:

- **Executive Summary:** Projected 3-year TCO savings percentage (typically 25%–45% lower than current on-prem run costs).
- **Cash Flow Comparison:** Side-by-side annual expenditure breakdown: On-Prem (hardware depreciation, colocation leases, power, cooling, hypervisor licenses) vs. AWS (compute, storage, data transfer, support).
- **Migration Investment:** Mobilize consulting costs, temporary dual-run licensing during cutover, and AWS MAP incentive offsets.
- **Payback Period & ROI:** Month-by-month payback timeline showing the break-even point post-datacenter exit.
