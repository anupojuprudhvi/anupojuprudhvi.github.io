---
title: Enterprise migration assessments and cloud strategy
summary: Architectural advisory and migration delivery across AWS Partner Network engagements — agentless discovery, TCO business cases, and target landing zones.
role: APN Cloud Migration Architect & Technical Lead
scope: Enterprise VMware estates, multi-region discovery, AWS Transform business cases, and target architecture design
---

## Problem · Navigating migration scale, legacy constraints, and executive justification

Enterprise organizations transitioning from legacy virtualized infrastructure or monolithic architectures to AWS face severe friction: lack of workload dependency visibility, uncertain multi-year financial returns, unquantified migration risks, and institutional inertia. Without structured discovery and formal TCO modeling, enterprise cloud initiatives stall before migration begins.

As part of AWS Partner Network (APN) delivery engagements, my role centered on guiding enterprise clients through the **AWS Migration Acceleration Program (MAP)** framework — moving from automated on-premises discovery to executive-validated Directional Business Cases (DBC) and production-ready target architecture blueprints.

## Solution · A phased, data-driven migration lifecycle

The engagements followed the structured AWS MAP methodology, establishing empirical data baselines before planning infrastructure mobilization:

1. **Assess Phase**: Automated inventory collection, 6-pillar Cloud Adoption Framework (CAF) evaluation, and 3–5 year TCO financial modeling in AWS Transform.
2. **Mobilize Phase**: Well-Architected Landing Zone planning, cross-account security guardrails, service-to-service mapping, and 7Rs workload categorization.
3. **Migrate & Modernize Phase**: Migration wave sequencing, cutover runbooks, containerization, and managed database adoption.

## Architecture · Discovery tooling, identity federation, and target blueprints

Discovery requires high fidelity with zero operational disturbance to running production environments. Depending on client security boundaries, discovery was executed via **AWS Transform Agentless Collector OVA appliances** deployed directly into VMware vCenter clusters, or automated ingestion and normalization of deep RVTools exports.

Where enterprise identity systems presented friction — such as legacy SAML configurations blocking assessment workspace access — coexistence architectures bridged the enterprise SAML IdP with **AWS IAM Identity Center (SAML + SCIM)** without disrupting existing developer workflows.

### Implementation notes

- **Precision utilization modeling:** Captured real-world CPU, RAM, and disk utilization percentiles over 24+ hour collection windows to avoid naive 1:1 lift-and-shift server sizing.
- **Licensing optimization:** Modeled Microsoft Windows Server and SQL Server Bring-Your-Own-License (BYOL) vs. AWS License-Included scenarios, uncovering substantial licensing cost reductions.
- **Dependency mapping:** Ingested source/destination IP connection flows to package interconnected application tiers into coherent migration waves, preventing split-brain network dependencies during cutover.

## Security · Least privilege discovery and air-gapped support

Discovery mechanisms operated strictly within read-only service account boundaries. For air-gapped or restricted financial environments, the discovery tool operated fully offline, collecting performance metrics locally and exporting encrypted assessment files for offline ingestion into AWS Transform.

## Delivery · Unlocking migration funding and executive sponsorship

The primary milestone of the Assess phase is delivering the **Directional Business Case (DBC)** and **Migration Readiness Assessment (MRA)** report. These documents provide the rigorous financial and technical justification required for C-level investment approval and unlock AWS MAP partner co-funding for the subsequent Mobilize and Migrate phases.

## Outcome · Measured clarity across diverse enterprise estates

Across multiple client engagements, this structured methodology transformed opaque on-premise infrastructure footprints into concrete, right-sized AWS architectures, surfacing millions in projected infrastructure savings and providing actionable 7Rs roadmaps.

## Case studies · Four APN migration and modernization engagements

<div class="case-study-links">
{{caseStudyLinks}}
</div>
