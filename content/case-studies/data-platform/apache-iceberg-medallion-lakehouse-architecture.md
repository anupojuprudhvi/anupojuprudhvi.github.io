---
title: Building a multi-domain Apache Iceberg lakehouse on AWS
date: 2026-10-24
nav: Multi-domain Iceberg lakehouse
label: Lakehouse architecture
project: data-platform
layer: Data & storage
order: 10
stack: [Apache Iceberg, AWS Glue, PySpark, Amazon S3, AWS Step Functions, Amazon Athena, Terraform]
tags: [iceberg, lakehouse, data-lake, glue, pyspark, s3, athena, step-functions]
summary: Designing an ACID-compliant Medallion lakehouse on AWS with domain-isolated S3 storage, PySpark transformations, and automated audit trails.
scaffold: false
problem: Enterprise operational data across business domains suffered from schema evolution failures, lack of ACID guarantees on S3, and cross-domain blast radius risks.
solution: Implement a 4-tier Medallion architecture on Apache Iceberg with per-domain encryption keys, serverless AWS Glue ETL, and Step Functions DAG orchestration.
---

## Problem · Lakehouse scale without cross-domain data leakage

An enterprise utility infrastructure provider managed multi-domain operational data across field construction, customer billing, and supply chain logistics. The existing data environment struggled with three core architectural challenges:

1. **Lack of ACID guarantees on object storage:** Concurrent read/write pipelines on native S3 CSV/Parquet files frequently resulted in inconsistent reads, incomplete partitions during batch failures, and expensive full-table rewrites.
2. **Blast-radius and cross-domain compliance:** Engineering teams required strict domain isolation. Billing and field telemetry could not share encryption keys or IAM execution roles, yet enterprise analytics required consolidated dimensional reporting.
3. **Runaway idle compute costs:** Previous designs relied on persistent Spark clusters running 24/7, driving substantial compute waste during off-peak ingestion windows.

## Solution · Medallion architecture with Apache Iceberg and serverless ETL

The platform was architected around a serverless Medallion pattern built on Apache Iceberg format:

```
 Landing (Raw) ──► Bronze (Append) ──► Silver (Cleaned & SCD2) ──► Gold (Aggregated Marts)
```

- **Raw Layer (Landing):** Native CSV/JSON extracts ingested via S3 event notifications with a strict 90-day lifecycle rule.
- **Bronze Layer (Ingestion):** AWS Glue PySpark jobs convert raw files into append-only Apache Iceberg tables, appending ingestion metadata and snapshot timestamps without mutating previous state.
- **Silver Layer (Single Source of Truth):** Enforces data quality rules, deduplicates records using Iceberg `MERGE INTO`, and manages Slowly Changing Dimensions (SCD Type 2) tracking. Corrupted rows are diverted to quarantined audit tables with error codes.
- **Gold Layer (Business Marts):** Dimensional star schemas and pre-computed analytical views optimized for Amazon Athena and BI dashboards.

## Architecture · Domain isolation and decoupled storage

```flow
title: Per-domain pipeline, orchestrated by Step Functions
EventBridge Scheduler | cron trigger
-> starts
* Step Functions | domain state machine with retries, backoff and SNS alerts
-> runs the Glue jobs in order
group: AWS Glue PySpark jobs
Job 1: Bronze append | landing_to_bronze.py
-> then
Job 2: Silver cleansing | bronze_to_silver.py
-> then
Job 3: Gold aggregation | silver_to_gold.py
end
-> reads and writes
group: Per-domain S3 buckets, encrypted with the domain's KMS key
Raw | CSV and JSON extracts
Bronze | append-only Iceberg
Silver | deduplicated SCD2 Iceberg
Gold | star-schema marts for Athena and BI
Audit | quarantined files and rejected rows
end
```

### Implementation notes

- **Iceberg metadata tree:** Apache Iceberg separates table state into hierarchical metadata files (`Snapshots` → `Manifest Lists` → `Manifests` → `Data Files`). Engines plan queries from this metadata instead of listing S3 prefixes, so planning stays fast as tables grow.
- **Partition evolution without rewriting:** Field operations frequently added new regional codes. Iceberg allowed changing table partition schemes without rewriting historical Parquet files or invalidating existing downstream queries.
- **Controlled bucket layout:** Rather than provisioning separate S3 buckets for every dataset, each business domain received five standardized buckets (`raw`, `bronze`, `silver`, `gold`, `audit`), isolating datasets into dedicated directory prefixes and Glue catalog namespaces.
- **Serverless state machine orchestration:** AWS Step Functions state machines coordinate multi-job execution with native retry blocks, exponential backoff, and Amazon SNS dead-letter alerting.

## Security · Dedicated KMS keys and least-privilege IAM

- **Domain-scoped CMKs:** Each business domain is encrypted under a dedicated AWS KMS Customer Managed Key (CMK). IAM execution policies explicitly deny cross-domain key usage, guaranteeing complete isolation at the storage layer.
- **Private network topology:** All ETL tasks run in private subnets, and S3 traffic stays on the AWS network through Gateway Endpoints.
- **Cost controls:** S3 Bucket Keys and the Gateway Endpoints also keep KMS and NAT charges down. The [FinOps and governance study](serverless-etl-orchestration-and-finops.html) covers them.

## Delivery · Modular Terraform infrastructure

The data platform infrastructure was engineered into 4 decoupled Terraform stacks:

1. **`01-network`:** Multi-AZ VPC, private isolated data subnets, route tables, and S3 Gateway VPC Endpoints.
2. **`02-data-platform`:** Domain-scoped S3 buckets, KMS keys, AWS Glue Catalogs, and audit logging repositories.
3. **`03-pipelines`:** Glue PySpark job definitions, Step Functions state machines, and EventBridge execution triggers.
4. **`04-governance`:** Centralized Athena workgroups, cost-control query limits, and IAM role boundaries.

## Trade-offs · Engine concurrency vs. file compaction

- **Small file compaction:** High-frequency streaming appends generate small Parquet files. Iceberg table maintenance required scheduling periodic maintenance jobs to run `rewrite_data_files` and expire obsolete snapshots, balancing write latency against read query performance.
- **Glue DPU autoscaling:** Serverless Glue DPUs offer zero idle costs, but require 1–2 minutes of container warm-up latency. For ultra-low latency requirements (<10 seconds), an event-driven Lambda micro-batching tier is the usual complement.

## Outcome · What the design guarantees

- **Consistent reads and writes:** Iceberg snapshots give each query a stable view of a table, so a failed batch no longer leaves readers with partial partitions.
- **Contained blast radius:** Each domain has its own buckets, catalog namespace, KMS key and execution role, so a mistake in one domain cannot reach another.
- **Traceable data quality:** Malformed files and rejected rows land in audit locations with error codes instead of silently disappearing or blocking the run.
- **No idle compute:** Pipelines run only when triggered, so compute spend follows data volume.

## Next steps · Natural extensions

- Add data-quality expectations as code, with failures surfaced in a dashboard rather than only in audit tables.
- Add column-level access controls and lineage tracking in the governance stack.
- Automate Iceberg table maintenance with alerts when small-file counts or snapshot age cross a threshold.
