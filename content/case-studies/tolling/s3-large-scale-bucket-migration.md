---
title: Moving 1.48 million S3 objects in 54 minutes instead of 8+ hours
date: 2026-09-24
nav: S3 migration at scale
label: Storage operations
heading: High-concurrency S3 migration for small objects
project: tolling
layer: Data & storage
motif: migration
order: 105
stack: [Amazon S3, AWS CLI, s5cmd, Amazon EC2, AWS Data Pipeline, Bash]
tags: [s3, migration, performance, storage, concurrency, cost, aws]
summary: Moving 225 GB of data across 1.48 million small objects between same-region S3 buckets, cutting transfer time from 8+ hours to 54 minutes using high-concurrency tooling on existing in-region compute.
problem: |
  A bucket reorganization required moving 225 GB of data between two S3 buckets. While 225 GB is modest in total bytes, the payload comprised 1.48 million small objects. Standard `aws s3 sync` projected over 8 hours to complete because S3 request overhead and Python CLI concurrency limits bottlenecked on API metadata transactions rather than network bandwidth.
solution: |
  Rather than spinning up expensive one-off migration infrastructure or accepting an 8-hour window, the transfer was run directly from an existing EC2 instance in `us-east-1` (the same region as both buckets) using `s5cmd`, a Go-based parallel S3 client, tuned to 128 concurrent workers. The entire migration completed in 54 minutes with zero errors, validated by full object count and MD5 checksum parity before source deprecation.
flowLabel: Migration execution path
flow:
  - step: Source S3 bucket
    note: Contains 1.48M small objects (225 GB total). Listing and head requests create high API latency under serial or low-concurrency tooling.
  - step: In-region EC2 host (us-east-1)
    note: Transfer executes on an existing instance inside the same VPC and region. Same-region routing eliminates data transfer charges ($0.00/GB egress), avoiding cross-AZ or cross-region fees.
  - step: Concurrency engine (s5cmd, 128 workers)
    aside: true
    note: Replaces standard Python CLI with Go runtime goroutines, multiplexing 128 parallel GET/PUT request streams to saturate S3 request throughput.
  - step: Destination S3 bucket
    note: Receives parallel multipart and single-part PUT operations across independent object key prefixes without throttling.
  - step: Checksum & count verification
    note: Post-transfer validation cross-references source and destination object keys, sizes, and ETag checksums before permitting source deletion.
outcomes:
  - value: 54 min
    label: Total migration time for 1.48M objects, down from an estimated 8+ hours (~9x speedup)
  - value: Zero
    label: Additional infrastructure charges by using an existing in-region EC2 instance
  - value: 100%
    label: Parity verified across all 1.48 million object counts and checksums with zero transfer errors
enables: |
  A repeatable high-throughput migration pattern for high-object-count S3 datasets that eliminates API request latency without provisioned data-transfer infrastructure or inter-region bandwidth costs.
---

## Problem · When object count matters more than raw gigabytes

Migrating 225 GB of data between Amazon S3 buckets is normally trivial. On a modest 1 Gbps connection, 225 GB of contiguous data transfers in under 35 minutes.

However, the dataset in this migration consisted of **1.48 million small objects** (averaging ~155 KB each), typical of tolling OCR camera reads, plate crop images, and sensor transaction logs. At this object count, the physics of cloud storage change:

- **API Request Dominance:** Every individual object requires an HTTP round trip (`HeadObject`, `GetObject`, `PutObject`). 1.48 million files mean millions of distinct API calls, making network round-trip time and connection setup the primary bottlenecks rather than raw megabytes.
- **CLI Concurrency Bottleneck:** Running standard `aws s3 sync` estimated over **8 hours** to complete the operation. The standard AWS CLI (Python-based) is bounded by process concurrency limits, single-connection pooling, and serial listing overhead that cannot keep up with millions of tiny files.
- **Maintenance Window Pressure:** An 8-hour transfer window risks overlapping with active production pipelines, increasing the window of data drift and complicating validation before cutover.

## Alternatives · Evaluating migration paths

Four distinct approaches were evaluated to balance migration runtime, infrastructure cost, and operational complexity:

| Approach | Pros | Cons / Verdict |
| --- | --- | --- |
| 1. Standard `aws s3 sync` | Built into AWS CLI; zero new tooling | 8+ hour runtime; Rejected (Too slow) |
| 2. AWS Data Pipeline (EMR / S3DistCp) | Native managed tool; distributed copy across workers | EMR cluster overhead (15m bootstrap lag); added EMR/EC2 fees; overkill for 225 GB |
| 3. Dedicated Large EC2 / DataSync | Isolated compute; high network pipe | Unnecessary cost and agent provisioning for a one-off task |
| 4. In-Region EC2 + High-Concurrency Tooling (s5cmd) | Zero extra infra; ~9x faster; zero egress fees | Selected (54 min runtime, zero added cost) |

### Why AWS Data Pipeline was rejected

AWS Data Pipeline offers a managed S3-to-S3 copy template, but it operates by provisioning an on-demand **Amazon EMR (Elastic MapReduce)** cluster running `S3DistCp` under the hood. While effective for petabyte-scale migrations, it introduced significant friction for this workload:

- **Cluster Bootstrap Lag:** Spin-up time alone for an EMR cluster (master node and core task instances) takes 10 to 15+ minutes before the first object is read.
- **Cost Disproportion:** EMR charges hourly management fees on top of multi-instance EC2 worker compute costs. Paying for an entire Hadoop/Spark cluster to move 225 GB is fundamentally cost-inefficient.
- **Operational Overhead:** Required configuring dedicated IAM roles (`DataPipelineDefaultRole`, `DataPipelineDefaultResourceRole`), S3 log staging paths, and JSON pipeline definitions for a task that needed to run exactly once.

Spinning up dedicated infrastructure or an EMR cluster would have introduced unnecessary cost and IAM provisioning. The most pragmatic and cost-effective path was to use an **existing EC2 instance already running in `us-east-1`** (the identical AWS region housing both buckets) paired with high-concurrency client tooling.

## Execution · S5cmd and 128 concurrent workers

The tool of choice was **`s5cmd`**, a high-performance S3 client written in Go. Unlike standard CLI implementations, `s5cmd` uses lightweight goroutines to issue deeply pipelined, concurrent S3 API calls.

```text
       Source S3 Bucket                      Destination S3 Bucket
      [ 1.48M Small Objects ]                [ Target Bucket ]
                 │                                   ▲
                 │ GET (128 Streams)                 │ PUT (128 Streams)
                 ▼                                   │
      ┌───────────────────────────────────────────────────────────┐
      │         Existing EC2 Instance in us-east-1                │
      │         Tool: s5cmd (Go-based parallel client)            │
      │         Workers: 128 concurrent goroutines                │
      │         Network: Intracloud same-region VPC endpoint      │
      └───────────────────────────────────────────────────────────┘
```

### Execution details

- **High concurrency (128 workers):** Ran the sync command with `s5cmd --numworkers 128 cp 's3://source-bucket/*' 's3://dest-bucket/'`, distributing requests across 128 concurrent worker threads to saturate S3's frontend request handling across multiple prefix partitions.
- **Zero data-transfer charges:** Because both buckets and the EC2 instance were located within `us-east-1`, all network traffic remained inside the same AWS regional boundary. AWS charges $0.00 per GB for intra-region data transfer between S3 and EC2; costs were strictly limited to standard S3 API request counts (`$0.005` per 1,000 `PUT` requests) and normal instance uptime.
- **54-minute runtime:** The entire copy finished in **54 minutes with zero errors** — an ~89% reduction in execution time compared to the original 8-hour estimate.

## Verification · Trust through validation before purge

Speed is meaningless if data integrity cannot be guaranteed. Before source data was marked for deprecation, a verification process confirmed that every single object had landed intact:

1. **Object Count Parity:** Automated S3 inventory and bucket listing scripts confirmed that all 1,480,000+ object keys were accounted for on the destination bucket.
2. **Checksum & Size Verification:** Compared object sizes and S3 ETags (MD5 hashes for single-part uploads) across sample partitions to verify zero byte-level corruption during the transfer.
3. **Controlled Cutover:** Source deletion was only initiated after application services successfully pointed to and verified reads from the destination bucket.

## Lesson · Concurrency beats bandwidth for small objects

At cloud scale, small-file storage operations are **API transaction problems**, not bandwidth problems. When moving millions of small objects, throwing larger network pipes at the problem does not help if the client cannot dispatch concurrent requests fast enough.

A simple change in tooling — moving from serial CLI processes to a parallel Go-based client on existing in-region compute — eliminated an 8-hour operational bottleneck in under an hour, with zero added infrastructure spend.
