---
title: Modernizing a telecom platform around its legacy constraints
summary: An engagement spanning database migration, automated recovery, hardware-bound licensing, key management, and repeatable cloud delivery.
role: Database modernization, high-availability architecture, and platform delivery
scope: Application and persistent service nodes, primary and recovery regions
---

## Problem · A cloud migration with dependencies that could not simply be replaced

The platform handled sensitive call and messaging data, but its database, recovery procedures, and software licensing had grown around an on-premises environment. Moving the virtual machines alone would have carried those constraints into the cloud.

The architectural contribution focused on modernizing the database, automating recovery, preserving the licensed network identity, adapting key management, and making node provisioning repeatable. The detailed case studies below explain the decisions and boundaries of each part of that work.

## Solution · Separate the decisions, coordinate the cutover

Database migration used baseline transfer and change-data capture (CDC) while schema and client compatibility were addressed. The final cutover included a brief pause in writes, replication catch-up, validation, and endpoint changes. That is a controlled cutover; it should not be read as a claim that every request continued without interruption.

Recovery automation brought together health alarms, orchestration, service checks, and a persistent network interface for licensed services. Provisioning automation then made the required host configuration reproducible across environments.

## Architecture · Distinct responsibilities for compute, data, and recovery

Application nodes handled call-processing services. Persistent service nodes hosted dependencies such as connection pools, the key service, and licensed interfaces, while Aurora hosted the relational data. Keeping these roles explicit helped separate replaceable compute from state and identity that had to survive replacement.

The regional network design separated application and hub VPC responsibilities and used Transit Gateway connectivity between the primary and recovery regions. Database and file replication addressed separate recovery needs. Network reachability alone does not establish an application recovery time: promotion, endpoint routing, service readiness, and client reconnection still need to be exercised together.

### Implementation notes

- **Regional delivery:** Terraform components were applied in dependency order across networking, keys, transit connectivity, databases, storage, and compute. State locking coordinated infrastructure changes; it was a delivery control rather than a disaster-recovery outcome.
- **Shared media storage:** AWS DataSync moved historical audio from on-premises NFS to EFS, followed by incremental synchronization. Final synchronization and mount changes were coordinated with a write restriction on the old export, then recording and playback were checked.
- **Storage isolation and retention:** EFS access points separated application paths, encrypted mounts protected transport, and lifecycle tiering moved infrequently accessed media into a lower-cost storage class. A tier price comparison is not a measured reduction in the total storage bill.

## Security · Protect data and constrain operational access

The work included private database placement, encrypted transport, scoped automation permissions, and a migration of the existing key-unwrapping integration to AWS KMS. These controls address specific risks; they do not, by themselves, establish regulatory compliance or an audit result.

## Delivery · Validate the whole service, not just running processes

The delivery process combined environment provisioning, database checks, application smoke tests, and recovery exercises. The CDR incident reinforced why a running process is not sufficient evidence of a healthy service: records must reach their destination, and reconciliation must account for missing or duplicated events.

## Trade-offs · Legacy compatibility still shapes the cloud design

Preserving licensed network identity limits where an interface can move. Retaining the existing crypto integration avoids a broad application rewrite but carries forward key-lifecycle and query-compatibility questions. Shared file storage and the batch ingestion path also retain operational dependencies that require monitoring.

## Outcome · A coordinated modernization and recovery approach

The engagement replaced several manual or hardware-dependent procedures with cloud-based delivery and recovery workflows. The strongest evidence in these stories is the constraint addressed, the implementation decision, and the validation described. Precise timing, savings, and success-rate claims need a defined measurement window and supporting records before being presented as benchmarks.

## Case studies · Four engineering stories and one incident write-up

<div class="case-study-links">
{{caseStudyLinks}}
</div>

## Next steps · Make recovery and performance evidence repeatable

The next priorities are a complete regional recovery exercise, repeatable database load measurements, key-lifecycle review, and retained validation records. These would establish the limits of the design more clearly than component counts or blanket availability claims.
