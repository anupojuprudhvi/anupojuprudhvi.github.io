---
title: Make Aurora DR behave like the primary, not merely exist beside it
nav: Keep Aurora DR in configuration parity
label: Data resilience
heading: Closing the configuration gaps in a multi-region Aurora design
project: tolling
projectName: U.S. Tolling Infrastructure
engagement: usecases/tolling/index.html
layer: Data
order: 30
stack: [Amazon Aurora Global Database, AWS Secrets Manager, AWS KMS, Terraform]
tags: [resilience, disaster-recovery, database, terraform, security, multi-region]
summary: Closing the two gaps that can make a replicated Aurora environment fail differently during recovery: secondary parameter-group drift and missing regional secret availability.
problem: |
  A multi-region Aurora design can report that replication is enabled while still carrying a dangerous difference between the primary and secondary. Custom cluster and DB parameter groups may exist in the primary region while secondary resources fall back to AWS defaults. Database extensions, connection settings, planner tuning, and logging could therefore change during failover. A database secret that exists only in the primary region also leaves recovery dependent on primary-region access.
solution: |
  Terraform makes the DR contract conditional and declarative. When global replication is enabled, an aliased secondary-region provider creates parameter groups from the same normalized JSON inputs used by the primary, attaches them to the secondary cluster and instances, replicates the encrypted Secrets Manager secret, and adds the secondary endpoint to the payload. Single-region environments do not create secondary-only resources or lookups. Provider configuration remains with the environment that calls the reusable module.
flowLabel: Recovery configuration path
flow:
  - step: Environment configuration
    note: An explicit global-replication flag and secondary region determine whether the DR contract is required.
  - step: Shared parameter inputs
    note: One environment-owned pair of JSON parameter files is normalized and consumed by both primary and secondary parameter-group resources.
  - step: Secondary Aurora resources
    note: The aliased provider creates and attaches matching cluster and DB parameter groups in the DR region.
  - step: Regional secret access
    note: Secrets Manager replicates the encrypted secret and its payload includes both primary and secondary cluster endpoints.
enables: |
  A planned or unplanned regional recovery can use the same database behavior and resolve its required connection data and endpoints locally in the recovery region, without copying parameter files or depending on a cross-region secret read at the point of failure.
outcomes:
  - value: 2
    label: Independent DR gaps closed: parameter parity and secret/endpoint availability
  - value: 1
    label: Declarative parameter source shared by primary and secondary regions
  - value: 0
    label: Secondary-only resources created for single-region environments
---

## Architecture · The decisions that mattered

The important design decision was to treat disaster recovery as a behavioral contract, not a collection of standby resources. A secondary cluster that has different extensions, logging, connection limits, or planner settings is not an equivalent recovery target. Likewise, a secret that cannot be resolved in the recovery region adds a hidden dependency to the failover path.

### Implementation evidence

- **Conditional secondary providers:** The root environment passes both the primary and aliased secondary AWS providers into the RDS module. The child module does not create its own provider configuration, keeping deployment settings and environment boundaries outside the reusable module.
- **Parameter-group parity:** When global replication is enabled, `aws_rds_cluster_parameter_group.secondary` and `aws_db_parameter_group.secondary` use the same normalized parameter collections as the primary resources. The secondary cluster and its reader and writer instances explicitly reference those groups instead of inheriting AWS defaults.
- **Secret replication:** The database secret has a conditional Secrets Manager replica in the secondary region. Its JSON payload retains the primary cluster and reader endpoints and adds the secondary cluster endpoint when replication is enabled.
- **Single-region safety:** Secondary parameter groups and the secondary KMS lookup are created only when global replication is enabled. Development, staging, and migration configurations therefore avoid resources and data lookups that do not apply to them.

### Security controls

- **Encryption boundary:** The secret remains protected by the environment’s KMS design while Secrets Manager handles cross-region replication. The secondary KMS lookup is conditional, avoiding an invalid dependency in environments without a replicated database.
- **Least-privilege provider ownership:** Provider configuration stays with the root caller, where the deployment identity and environment boundary are visible. The reusable module receives provider instances instead of embedding local access settings.
- **No secret material in the design narrative:** The architecture exposes endpoint fields in the secret payload, not access values.

## Delivery · How the change is rolled out

The change is delivered as a Terraform module update with environment-level inputs remaining the source of truth. The safe sequence is to validate the module and its provider aliases, run speculative plans for each environment, and apply the production global-replication configuration only after the plan shows the intended secondary parameter groups, attachments, secret replica, and endpoint payload changes. Single-region plans should confirm that no secondary KMS lookup or DR-only resource is attempted.

The implementation also removed environment-specific provider assumptions from the child module. Explicit provider injection allows the same module to run through different approved deployment environments without embedding local configuration.

## Trade-offs · What this does not solve

- **Regional failure is not every failure:** Replication across regions improves regional resilience, but it does not protect against every account, identity, or application-level failure.
- **Replication is not application recovery:** Parameter parity and local secret availability remove two hidden failure modes; they do not prove that an application, DNS cutover, permissions, or dependent services will recover. Those paths still require a tested runbook and recovery exercise.
- **Parameter changes may require care:** Some RDS parameters are static or require a reboot. A shared source prevents drift, but rollout timing and reboot behavior still need to be evaluated for the engine version and workload.
- **More replicated resources cost more:** Secondary parameter groups and secret replication are intentionally limited to environments that enable global replication. They remain an operational and billing consideration for production DR.

## Outcome · What changed

The documented design closes two concrete recovery gaps. The secondary Aurora cluster and instances are no longer allowed to silently fall back to default parameter groups, and recovery-region workloads can obtain the replicated secret and discover the secondary endpoint locally. The result is stronger failover readiness and one declarative parameter source, while single-region environments avoid unnecessary DR resources.

The measurable claims here are implementation outcomes rather than an invented recovery-time guarantee: **two documented DR gaps closed**, **one shared parameter source**, and **zero secondary-only resources for configurations where global replication is disabled**.

## Next · Improvements worth funding

The next validation step should be a controlled regional recovery exercise that checks more than Terraform state: secret retrieval from the secondary region, application connection behavior, parameter-dependent extensions, endpoint selection, DNS or service discovery, and rollback. The exercise should record actual recovery time and any manual actions before publishing an RTO/RPO claim.