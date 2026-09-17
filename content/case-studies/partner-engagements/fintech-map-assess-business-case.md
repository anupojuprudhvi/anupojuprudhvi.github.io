---
title: Institutional digital asset platform · AWS MAP assess and directional business case
nav: Digital asset platform MAP assess
label: Migration assessment
heading: Automating VMware discovery and modeling 3-year cloud TCO for digital asset accounting
project: partner-engagements
layer: Strategy & Discovery
order: 10
stack: [AWS Transform, VMware vCenter, RVTools, AWS IAM Identity Center, JumpCloud SAML, AWS CAF]
tags: [migration, map-assess, tco, vmware, identity-center, finops, enterprise]
summary: Executing an agentless VMware inventory discovery, resolving a JumpCloud-to-Identity Center SAML blocker, and delivering an executive Directional Business Case (DBC) for an institutional financial data platform.
problem: |
  An institutional digital asset and accounting platform running on-premises in
  VMware required a comprehensive evaluation for migration to AWS under the
  Migration Acceleration Program (MAP). To unlock executive sponsorship and AWS MAP
  co-funding, the engineering and finance leadership required empirical utilization
  baselines, right-sized EC2 compute recommendations, licensing optimization models,
  and a formal 6-pillar Migration Readiness Assessment (MRA). Furthermore, the client's
  existing JumpCloud SAML integration blocked access to AWS Transform workspaces,
  and strict financial compliance demanded a zero-agent discovery methodology.
solution: |
  I designed and executed a dual-path discovery architecture utilizing automated RVTools
  exports alongside an agentless AWS Transform OVA collector deployed directly into
  the private VMware vCenter cluster. To resolve the authentication deadlock, I engineered
  an identity bridge configuring JumpCloud as an external IdP for AWS IAM Identity Center
  via SAML and SCIM sync, allowing coexistence with legacy access. The ingested telemetry
  was evaluated in AWS Transform to produce a 3-year Directional Business Case (DBC),
  licensing comparison (BYOL vs. License Included), and a phased 7Rs workload migration roadmap.
flowLabel: Discovery, identity federation, and business case pipeline
flow:
  - step: VMware vCenter cluster
    note: Read-only service account interfaces with vSphere API to extract hypervisor inventory and performance peaks across compute, memory, and datastores.
  - step: Agentless discovery appliance
    note: AWS Transform OVA collector runs within the private hypervisor network, streaming hourly hardware metrics and SQL metadata without installing OS agents.
  - step: Identity Center SAML bridge
    note: JumpCloud federates with AWS IAM Identity Center via SAML 2.0 and automated SCIM user provisioning, satisfying AWS Transform workspace access requirements.
  - step: Business case & TCO engine
    note: AWS Transform normalizes server specs, models 3-year Reserved Instances, evaluates BYOL vs License-Included licensing, and outputs executive reports.
enables: |
  Establishes the factual, technical, and financial foundation required to pass
  AWS MAP Assess milestone audits, unlocking co-funding grants and providing the
  engineering organization with a sequenced wave roadmap.
outcomes:
  - value: 3-Year
    label: Directional Business Case and financial TCO comparison validated
  - value: Zero
    label: Software agents installed on target production financial servers
  - value: 6 Pillars
    label: Cloud Adoption Framework (CAF) Migration Readiness Assessed
---

## Assessment · Quantifying the cloud business case without disrupting operations

Financial and crypto accounting platforms operate under stringent regulatory and uptime constraints. When evaluating a cloud transition under the AWS Migration Acceleration Program (MAP), executive leadership required proof that moving to AWS would deliver both structural cost reductions and operational scalability, without introducing security vulnerabilities or unbudgeted licensing penalties.

The discovery process had to answer three critical questions:
1. **What is the true on-premises resource utilization?** Rather than allocating AWS instances based on allocated vCPU and RAM (which leads to massive over-provisioning), the assessment required empirical utilization percentiles (average vs. peak CPU, memory, and disk throughput).
2. **What will AWS cost compared to on-premises over 3 to 5 years?** Detailed total cost of ownership (TCO) modeling across compute, storage, data transfer, and support.
3. **Is the organizational structure ready for cloud operations?** Comprehensive maturity scoring across security, governance, platform, operations, people, and business pillars.

### Implementation notes

- **Dual-path discovery selection:** Implemented Path 1 (rapid point-in-time inventory extraction via RVTools `.xlsx` parsing) for immediate sizing sanity checks, coupled with Path 2 (agentless collector OVA deployed in vCenter) to record multi-day workload utilization cycles.
- **Identity Center integration:** AWS Transform requires IAM Identity Center. The existing direct JumpCloud-to-IAM SAML role federation did not support Transform workspaces. I configured JumpCloud as an external IdP in IAM Identity Center via SAML + SCIM, enabling both setups to coexist without interrupting active developer access.
- **Licensing strategy analysis:** Compared Microsoft Windows Server and SQL Server Bring-Your-Own-License (BYOL) against AWS License-Included pricing, identifying optimal instance types (e.g. AWS Graviton vs x86 for database tiers) to minimize core-licensing liabilities.

## Architecture · 7Rs portfolio analysis and target state design

The collected inventory was systematically mapped across the **7Rs migration strategies**:
- **Rehost (Lift & Shift):** Legacy operational utility servers with limited life expectancy.
- **Replatform (Lift & Reshape):** Relational databases transitioned from self-managed SQL Server VMs to Amazon RDS Multi-AZ, eliminating hypervisor maintenance.
- **Refactor (Cloud Native):** High-throughput financial transaction ledgers and calculation engines targeted for containerization on Amazon EKS Graviton ARM64.
- **Retire:** Decommissioned legacy staging and orphaned test environments identified during the vCenter datastore sweep.

## Security & Governance · Preserving data confidentiality in discovery

The discovery tool operated strictly on read-only API permissions, collecting resource capacity, CPU/RAM utilization curves, disk throughput, and network connection metadata (source/destination IP and port). It collected **zero** application data, financial transaction payloads, database records, or customer personal information (PII).

## Outcome · Passing the MAP Assess milestone gate

The assessment concluded with the delivery of the executive **Directional Business Case (DBC)** PDF generated from AWS Transform, the formal **Migration Readiness Assessment (MRA)** scorecard, and a phased migration wave roadmap. These deliverables satisfied all AWS MAP governance gates, securing executive approval to proceed to the Mobilize phase.
