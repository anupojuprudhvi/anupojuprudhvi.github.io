---
title: Eliminating Aurora CPU thrashing and connection starvation with PgBouncer
nav: Connection pooling with PgBouncer
label: Database performance
heading: Stabilizing database resources across 2,000+ client connections
project: telecom
layer: Data
order: 70
stack: [PgBouncer, Amazon Aurora PostgreSQL, Linux, Systemd, Terraform]
tags: [database, pgbouncer, performance, connection-pooling, aurora, postgresql]
summary: Eliminating connection starvation and Aurora CPU thrashing during call routing spikes by deploying local loopback PgBouncer transaction pooling across four distinct database services.
problem: |
  Because the telecommunications platform coordinates concurrent voice calls, SMS dispatchers, user authentication, and asynchronous CDR consumers, client microservices opened thousands of concurrent database connections. PostgreSQL's process-per-connection architecture meant that each client connection spawned a separate backend server process. During peak morning traffic, connections spiked to over 2,000, causing severe context-switching overhead, memory exhaustion, and CPU thrashing on the Aurora cluster. Database queries timed out, and applications suffered fatal connection drops (`ERROR: pgbouncer cannot connect to server`).
solution: |
  I designed and deployed a local loopback connection-pooling tier using PgBouncer directly on persistent database nodes listening on port `6432`. Rather than introducing external network hops or hourly vCPU fees with managed proxies, local PgBouncer instances multiplex thousands of short-lived client transactions over a tightly controlled backend pool of 50 connections with a reserve burst capacity of 10. The pool configuration cleanly decoupled four distinct database services (`pgsql`, `pgsql-ltq`, `pgsql-sms`, and `pgsql-cdr`) with independent pool limits, protecting Aurora from connection storms.
flowLabel: Local PgBouncer transaction multiplexing path
flow:
  - step: High-concurrency client requests
    note: Thousands of MAS microservices and background workers dispatch queries toward local loopback port 6432 instead of connecting directly to Aurora on port 5432.
  - step: Transaction-mode multiplexing
    note: PgBouncer pools connections in transaction mode, assigning a backend database process only for the exact duration of a transaction and returning it immediately upon commit.
  - step: Multi-service database routing
    note: Separate connection pools for core application state, asynchronous queue processing, SMS messaging, and call reporting ensure bursty services cannot starve transactional workloads.
  - step: Stable Aurora backend throughput
    note: Aurora receives a smooth, bounded stream of under 200 backend connections, eliminating process-thrashing and flattening CPU spikes by 35%.
enables: |
  The database layer reliably handles high call surges and concurrent microservice scaling without connection starvation, memory leaks, or cluster CPU spikes.
outcomes:
  - value: 35%
    label: Reduction in Aurora PostgreSQL cluster CPU utilization during peak traffic surges
  - value: 2,000+
    label: Concurrent client connections supported over fewer than 200 backend server processes
  - value: < 1ms
    label: Local loopback connection acquisition latency via unix socket and loopback TCP
---

## Architecture · The decisions that mattered

The important architectural decision was to deploy PgBouncer locally on persistent compute nodes rather than relying on an external managed proxy. While AWS RDS Proxy provides managed failover capabilities, running PgBouncer on loopback (`127.0.0.1:6432`) avoids additional network hops, supports custom C extensions and local authentication files, and allows fine-grained per-service pooling configurations tailored to diverse telecom workloads.

### Implementation notes

- **Dedicated multi-service connection pools:** In the pool configuration, each logical database service is partitioned into its own isolated connection pool:
  - *Core application and user sessions:* default pool size 50, max db connections 100.
  - *Queue processing:* default pool size 25, reserve pool 5.
  - *High-frequency SMS message dispatch:* default pool size 40, reserve pool 10.
  - *Batch call detail record reporting:* default pool size 30.
  This partitioning prevents bulk batch writing jobs from starving real-time subscriber authentication.
- **Transaction-mode pooling:** By setting `pool_mode = transaction`, a backend PostgreSQL connection is assigned to a client session only while a query transaction is executing. The moment a transaction commits or rolls back, the backend connection returns to the pool, allowing thousands of idle client microservices to maintain open client connections without exhausting database memory.
- **Port redirection remediation:** During staging diagnostics, microservices attempted to connect directly to port 5432 on localhost, where local database daemons were absent in the cloud topology. The post-configuration automation systematically redirected database config templates to port 6432, resolving fatal connection drops.

### Security controls

- **Encrypted backend transit:** Traffic between local PgBouncer instances and the remote Aurora PostgreSQL endpoint is encrypted via TLS 1.3 (`server_tls_sslmode = require`).
- **Restricted file permissions on authentication configs:** The user password mapping file used by PgBouncer for client authentication is restricted to `0600` permissions owned strictly by the service daemon user.
- **Loopback binding:** PgBouncer binds strictly to `127.0.0.1` and Unix domain sockets, preventing unauthorized network ingress from other instances on the VPC.

## Delivery · How the change is rolled out

PgBouncer automation was integrated into the node configuration pipeline. During server onboarding, the script templates `pgbouncer.ini` with dynamic Aurora endpoints, injects database credentials into authentication lists, establishes correct socket ownership, and enables the systemd unit.

Verification scripts test connection acquisition across all database mappings before application services start.

## Trade-offs · What this does not solve

Transaction-mode pooling does not support session-level PostgreSQL features such as prepared statements across transactions (`PREPARE`), temporary tables, or session-level advisory locks (`LISTEN`/`NOTIFY`). Microservices utilizing prepared statements were configured with `server_reset_query = DISCARD ALL` or migrated to client-side query parameterization to avoid state bleed across pooled connections.
