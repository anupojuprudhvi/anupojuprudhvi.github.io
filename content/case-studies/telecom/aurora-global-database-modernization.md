---
title: Modernizing a legacy telecom database with a controlled cutover
nav: Database migration and connection pooling
label: Database modernization
project: telecom
layer: Data
order: 10
stack: [Aurora PostgreSQL, AWS DMS, PgBouncer, C client libraries, Terraform]
tags: [database, migration, cdc, aurora, pgbouncer, performance]
summary: Combining schema and client compatibility work, continuous replication, and local connection pooling to move a legacy telecom database tier to Aurora.
scaffold: false
problem: Legacy database compatibility and bursts of client connections complicated a telecom migration with a limited cutover window.
solution: Separate schema remediation, replication, connection pooling, and application cutover, with validation before write traffic moves.
---

## Problem · Compatibility and connection pressure had to be addressed together

The telecom platform depended on an older PostgreSQL environment, legacy schema behavior, and native client code. Call processing, messaging, account management, and reporting also competed for database connections. A database move had to preserve those application paths while avoiding an extended offline copy.

## Solution · Prepare the database while the existing platform keeps serving traffic

I separated schema remediation, native client compatibility, data replication, and application cutover. AWS DMS handled the baseline transfer and change synchronization described in the migration workflow. Local PgBouncer instances provided a controlled connection path to Aurora, instead of allowing application concurrency to translate directly into backend connection growth.

## Architecture · Separate data movement from application switchover

Logical databases separated workload responsibilities, including core state, queue processing, messaging, and call reporting. Schema and client changes were validated before switching the application endpoints. Keeping replication running during preparation reduced the amount of data that needed to catch up at cutover.

Migration tooling depends on the source engine version and its supported replication path. A verified source inventory and compatibility checks are prerequisites for repeating this approach.

### Implementation notes

- **Schema and native clients:** Deprecated syntax, implicit casts, and compatibility functions were reviewed alongside C client build settings and library paths. These were application-compatibility changes, not merely infrastructure provisioning.
- **Local connection pooling:** PgBouncer sat on the persistent service nodes. Application settings were updated to use the pool endpoint rather than an absent local PostgreSQL listener. Separate workload mappings and pool limits reduced competition between batch processing and interactive requests.
- **Proxy trade-off:** Local pools fitted the existing host and client integration, but their configuration, credentials, and recovery became part of node operations. This choice should be evaluated against a managed proxy for each workload.
- **Validation:** The migration workflow included row-count and checksum comparisons, sequence checks, and application smoke tests. A successful copy alone was not sufficient evidence that call ingestion, messaging, and authentication still worked.

## Security · Protect the migration path and pool credentials

Migration traffic used the private VPN/transit path. Aurora was placed in private subnets with encryption at rest. Pool authentication files required restricted ownership and permissions; database transport used TLS. Certificate and hostname verification must be checked explicitly rather than inferred from an encryption setting.

## Delivery · Pause writes, reconcile, then change endpoints

Schema and configuration changes progressed through non-production environments before production cutover. During the final window, writes to the old database were briefly paused, remaining changes were applied, data checks were completed, and application endpoints were switched through the connection pool. Smoke tests then exercised the business paths before normal traffic resumed.

This describes a migration with a brief write pause. It does not claim uninterrupted writes or establish a universal zero-downtime result.

## Trade-offs · Pooling changes the connection contract

Transaction pooling requires a review of session state, temporary objects, prepared statements, and other connection-specific behavior. Per-pool limits also need to be evaluated across all nodes and database/user combinations; a limit on one host is not a cluster-wide cap.

Replication validation and a rollback decision are separate concerns. Once applications write to the new target, switching back requires a plan for those new writes rather than simply restoring the previous endpoint.

## Outcome · Migration and connection management became one delivery workflow

The platform moved to Aurora with compatibility work and connection pooling incorporated into deployment. Data validation and application checks supported the cutover. Performance improvements require comparable workload measurements before they can be quantified.

## Next steps · Establish a repeatable performance baseline

Retain a source/version inventory, cutover validation report, and rollback criteria. Compare pool wait time, connection counts, query latency, CPU, and error rates under the same workload before publishing performance improvements.
