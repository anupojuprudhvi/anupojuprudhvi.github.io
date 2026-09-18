---
title: Enterprise Cloud Migration · Assess, Mobilize & Modernize
track: migration-journey
summary: A guide to enterprise cloud migrations — rapid vs. deep assessments, 3-year TCO modeling, Landing Zone design, and Mobilize wave planning.
level: Intermediate to Executive
duration: 6 Modules · 50 min read
stack: [AWS MAP, AWS Transform, RVTools, TCO Modeling, Landing Zone, Well-Architected, Amazon EKS]
---

## Overview · The enterprise migration & modernization journey

Cloud migration at enterprise scale is rarely just an infrastructure project — it is a joint financial, operational, and architectural transformation. Organizations migrating legacy VMware estates, bare-metal datacenters, or colocation facilities to AWS must navigate rigid governance hurdles, executive financial justification, and strict risk mitigation before moving a single production workload.

The **AWS Migration Acceleration Program (MAP)** provides a structured, phased methodology to de-risk this transition across three distinct stages:

1. **Assess Phase:** Quantifying the technical estate, evaluating organizational readiness across the 6 Cloud Adoption Framework (CAF) pillars, and authoring a defensible 3–5 year Directional Business Case (DBC) that unlocks AWS co-funding grants.
2. **Mobilize Phase:** Bridging the business case to hands-on engineering — building the secure Multi-Account Landing Zone, mapping cross-application dependencies, refining 7Rs modernization strategies, and executing a lighthouse migration pilot.
3. **Migrate & Modernize Phase:** Industrialized factory execution across sequenced migration waves, retiring legacy datacenter leases while executing in-flight modernization (containers on EKS, managed Aurora databases, serverless integration).

## Rigorous Deliverables · Milestone outputs per phase

A successful enterprise engagement is measured by the quality, auditability, and rigor of its milestone deliverables:

### 1. MAP Assess Phase Deliverables
- **Migration Readiness Assessment (MRA):** An audited evaluation across the 6 AWS CAF pillars (Business, People, Governance, Platform, Security, Operations), delivering the organizational readiness scorecard, capability gap analysis, and executive risk mitigation matrix.
- **Total Cost of Ownership (TCO) & Financial Model:** A comprehensive 3-year financial model contrasting current on-premises run costs against AWS On-Demand, 1-Year Savings Plans, and 3-Year Savings Plans (All/Partial Upfront), complete with Microsoft Windows Server and SQL Server licensing optimization (BYOL vs. License-Included).
- **Target State Architecture Blueprint:** A Well-Architected technical layout detailing the multi-account Landing Zone, Transit Gateway network topology, hybrid connectivity (Direct Connect / VPN), security guardrails, and the 7Rs Workload Placement Matrix.
- **Directional Business Case (DBC):** The executive C-level justification document providing cash-flow projections, ROI timelines, payback periods, and qualifying the program for AWS MAP co-funding credits.

### 2. MAP Mobilize Phase Deliverables
- **Production-Ready Landing Zone:** A fully automated multi-account AWS environment provisioned via Infrastructure as Code (Terraform/Control Tower), complete with IAM Identity Center federation, SCP guardrails, and centralized logging.
- **Migration Wave Plan & Dependency Matrix:** Network communication dependency graphs clustered into discrete, risk-managed cutover waves aligned with corporate release cycles.
- **Validated Cutover Runbooks & Rollback Playbooks:** Detailed minute-by-minute operational runbooks with verified RTO/RPO recovery time objectives and zero-data-loss rollback mechanisms.
- **Wave 0 Lighthouse Pilot Package:** Production cutover execution report validating replication throughput, real-world downtime windows, and application performance benchmarks.
- **Skills Enablement & CCoE Operating Charter:** Cloud Center of Excellence governance structure, RACI operational boundaries, and training curriculum for internal engineering squads.

### 3. Migrate & Modernize Phase Deliverables
- **Industrialized Migration Factory Pipelines:** High-velocity replication workflows utilizing AWS Application Migration Service (MGN) and AWS Database Migration Service (DMS).
- **Modernization Blueprints:** Cloud-native target architectures containerizing workloads onto Amazon EKS with Karpenter, replatforming databases to Amazon Aurora PostgreSQL, and serverless messaging.
- **MAP Customer Sign-Off & Decommissioning Package:** Audited milestone completion packages submitted to AWS partner governance to release financial incentive credits, accompanied by official datacenter asset decommissioning certificates.

## Curriculum · The 6 delivery modules

<ul class="lp-syllabus">
  <li>
    <a class="lp-module-card" href="01-assessment-paths-rapid-vs-deep.html">
      <span class="lp-module-num">01</span>
      <div class="lp-module-body">
        <h3>Assessment Frameworks — Rapid (4–6 Wks) vs. Deep Enterprise (3–4 Mo)</h3>
        <p>Evaluating discovery timelines, Cloud Adoption Framework (CAF) stakeholder alignment, and choosing between rapid tooling assessments and deep organizational evaluations.</p>
      </div>
      <span class="lp-module-action">Start module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="02-discovery-telemetry-and-inventory.html">
      <span class="lp-module-num">02</span>
      <div class="lp-module-body">
        <h3>Discovery Telemetry — RVTools, AWS Transform &amp; Agentless Profiling</h3>
        <p>Extracting hypervisor inventory, continuous utilization percentiles, and applying right-sizing algorithms to avoid naive 1:1 lift-and-shift over-provisioning.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="03-financial-engineering-tco-and-licensing.html">
      <span class="lp-module-num">03</span>
      <div class="lp-module-body">
        <h3>Financial Engineering — 3-Year TCO Modeling &amp; Licensing Optimization</h3>
        <p>Modeling On-Demand vs. 1-Yr/3-Yr Savings Plans, Microsoft Windows and SQL Server BYOL vs. License-Included scenarios, and passing MAP milestone audits.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="04-target-architecture-and-landing-zone.html">
      <span class="lp-module-num">04</span>
      <div class="lp-module-body">
        <h3>Target State Blueprint — Landing Zone Foundation &amp; 7Rs Categorization</h3>
        <p>Architecting multi-account AWS Organizations, IAM Identity Center federation, Transit Gateway networking, and classifying workloads into 7Rs pathways.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="05-mobilize-wave-planning-and-pilot.html">
      <span class="lp-module-num">05</span>
      <div class="lp-module-body">
        <h3>The Mobilize Phase — Engineering Alignment, Wave Planning &amp; Lighthouse Pilot</h3>
        <p>Partnering with enterprise engineering teams, clustering dependency graphs into migration waves, executing a lighthouse pilot cutover, and team enablement.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="06-migrate-and-modernize-strategies.html">
      <span class="lp-module-num">06</span>
      <div class="lp-module-body">
        <h3>Migrate &amp; Modernize — In-Flight vs. Sequential Factory</h3>
        <p>Deciding between sequential 2-step lift-and-shift vs. in-flight modernization during Mobilize, architecting cloud-native target platforms, and executing the migration factory.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
</ul>
