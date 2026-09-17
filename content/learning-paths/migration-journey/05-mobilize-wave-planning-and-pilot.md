---
title: The Mobilize Phase · Wave Planning & Lighthouse Pilot
track: migration-journey
order: 5
module: 5
totalModules: 6
summary: Partnering with enterprise engineering teams, clustering dependency graphs into migration waves, executing a lighthouse pilot cutover, and team enablement.
level: Migration Engineering
readingTime: 9 min read
stack: [AWS Mobilize, AWS MGN, Wave Planning, Lighthouse Pilot, CCoE]
tags: [mobilize, wave-planning, migration-factory, pilot, operational-readiness]
---

## Principle · Shifting from strategy to factory engineering

Securing executive sign-off on the Directional Business Case (DBC) and qualifying for AWS MAP co-funding marks the successful conclusion of the **Assess** phase. The initiative now transitions into **Mobilize**.

Where Assess answered *"Why should we migrate and what will it cost?"*, Mobilize answers *"How do we build the target platform, validate cutover runbooks, and train our engineering teams to operate it safely?"*

Mobilize bridges high-level architecture to industrialized execution through three critical workstreams:
1. **Landing Zone Deployment:** Standing up the multi-account foundation, security guardrails, and hybrid connectivity designed in Assess.
2. **Dependency Mapping & Wave Planning:** Clustering hundreds of interdependent servers into sequenced, manageable cutover waves.
3. **The Lighthouse Pilot (Wave 0):** Migrating a representative production workload end-to-end to validate replication pipelines, prove cutover timing, and exercise rollback procedures.

## Collaboration · Partnering with client engineering teams

Mobilize succeeds or fails on organizational alignment. A migration cannot be executed in isolation by external consultants; it requires a joint delivery model partnering consulting architects with the client's internal engineering squads:

<pre><code>[ Joint Cloud Center of Excellence (CCoE) ]
  ├── Consulting Migration Lead &amp; Client Program Manager (Pacing, scope, MAP governance)
  ├── Lead Cloud Architect &amp; Client Principal Architect (Landing zone, networking, security)
  ├── Migration Platform Engineers (AWS MGN/DMS replication, automation pipelines, IaC)
  └── Application Tier Owners &amp; QA Leads (Cutover testing, data validation, sign-off)</code></pre>

### Establishing the Joint Cadence
- **Weekly Sprint Planning:** Tracking landing zone milestones, replication agent deployments, and network connectivity tests.
- **RACI Operational Matrix:** Defining clear boundaries: platform engineers manage replication infrastructure (AWS MGN), security engineers approve IAM roles and SCPs, while application owners retain final sign-off on cutover acceptance testing.

## Methodology · Dependency clustering into migration waves

Attempting to migrate an enterprise estate in one massive "big bang" weekend is an unacceptably high operational risk. Instead, workloads are sequenced into **discrete migration waves** (typically 15 to 40 servers per wave) based on four structural criteria:

1. **Network Communication Affinity:** Ingesting network connection telemetry (source/destination IP traffic from hypervisors or netflow logs). Servers that exchange high-volume synchronous RPC or database queries must migrate in the **same wave** to avoid high-latency cross-datacenter application degradation.
2. **Business Criticality & Tiering:** 
   - Non-production (Dev/Test) environments migrate first to exercise tools with zero revenue risk.
   - Internal Tier-2 corporate tooling (reporting, staging utilities) migrate next.
   - Core Tier-1 customer-facing transaction platforms migrate in later, highly refined waves.
3. **Change Freeze & Compliance Windows:** Aligning wave schedules with corporate blackout periods (e.g., month-end financial book closings or peak seasonal retail windows).
4. **Target Modernization Strategy:** Grouping servers utilizing the same migration tooling (e.g., block-level replication via **AWS Application Migration Service [MGN]** vs. database replication via **AWS Database Migration Service [DMS]**).

## Execution · The Wave 0 Lighthouse Pilot

The most vital milestone in Mobilize is the **Lighthouse Pilot (Wave 0)**.

The pilot application must meet three specific criteria:
- It must be **low business risk** (so unexpected delays do not impact revenue or customers).
- It must be **architecturally representative** (e.g., a three-tier web application with a web frontend, application tier, and relational database).
- It must have an **engaged, supportive application owner** willing to participate actively in testing.

### What the Lighthouse Pilot Proves

The pilot is a comprehensive rehearsal that tests every operational boundary:

```
[ Pre-Cutover Preparation ]
  ├── Continuous block-level replication established via AWS MGN
  └── Relational data synchronization established via AWS DMS / native replication
          │
[ The Cutover Maintenance Window ]
  ├── Step 1: Drain active application traffic and pause background queue processing
  ├── Step 2: Final incremental storage synchronization (flushing dirty disk blocks)
  ├── Step 3: EC2 instance launch in target VPC with automated post-launch scripts
  ├── Step 4: Internal DNS / Route 53 record updates pointing to the new cloud endpoint
  └── Step 5: QA validation test suite execution (smoke tests, synthetic transactions)
          │
[ Decision Gate: Commit or Rollback ]
  ├── Success ──► Point public traffic to AWS; release maintenance window
  └── Abort   ──► Revert DNS back to on-premises IP; zero data loss rollback
```

### Key Metrics Captured During Pilot
- **Actual Cutover Duration:** Validates whether the maintenance window can fit within scheduled downtime (e.g., proving a database switchover takes 12 minutes rather than a projected 2 hours).
- **Network Latency & Performance:** Measuring real-world application response times across AWS subnets vs. legacy physical racks.
- **Rollback SLA:** Verifying that should an unforeseen defect occur, reverting traffic back to the on-premise baseline takes less than 15 minutes.

## Outcome · Passing the Mobilize gate to begin Migration Factory

The Mobilize phase concludes with formal delivery of:
1. **The Production Landing Zone:** Validated multi-account AWS environment with enforced security guardrails, centralized logging, and active hybrid connectivity.
2. **The Industrialized Migration Wave Plan:** Sequenced roadmap scheduling all remaining application waves through the Migrate & Modernize phase.
3. **The Validated Migration Runbook:** Standardized operational procedure refined during the lighthouse cutover, ready for automated factory execution.
4. **AWS MAP Mobilize Completion Package:** Submitted to AWS partner governance to release Mobilize co-funding credits and approve migration-phase incentive allocations.

With the platform built, runbooks proven, and internal teams enabled, the organization is fully equipped to execute high-velocity, repeatable workload migrations with confidence.
