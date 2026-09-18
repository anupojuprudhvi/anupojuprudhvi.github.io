---
title: Distributed S3-compatible storage spanning AWS, on-prem VMware, and OpenStack
nav: Hybrid object storage
summary: A self-hosted distributed object storage layer unifying backups, ERP media, and mail archives across a public cloud, an on-prem data center, and a private OpenStack cloud behind one S3 API.
project: enterprise-infrastructure
layer: Platform
order: 20
stack: [MinIO, Docker Compose, Nginx, Restic, AWS S3 Glacier, Python, Boto3]
tags: [storage, hybrid-cloud, backups, cost-optimization]
problem: |
  The organization's footprint was genuinely hybrid, not hybrid-in-name — production compute in
  AWS, enterprise virtualization in an on-prem data center running VMware, and a private
  OpenStack cloud, each with its own block storage and no shared way to store unstructured data:
  ERP file attachments, database dumps, and system backups. Every environment's storage was
  siloed, expensive to scale, and reachable only through whatever tooling that specific platform
  supported — there was no common access pattern across all three.
solution: |
  A distributed, S3-compatible object storage platform (MinIO) deployed behind an Nginx TLS
  reverse proxy, reachable via the same S3 API from all three environments, with automated
  Restic-encrypted backup pipelines and AWS S3 Glacier lifecycle tiering for long-term retention.
heroTitle: One S3 API in front of three separate infrastructure environments
intro: A genuinely hybrid footprint — public cloud, an on-prem VMware data center, and a private OpenStack cloud — had no shared way to store backups or application media beyond each environment's own local block storage. This case study covers building a distributed object storage layer that gave all three the same S3 interface, and the backup and cost-tiering automation built on top of it.
role: Lead platform engineer / distributed storage architect
scope: Cluster deployment, backup pipeline design, and lifecycle-based cost tiering
closingText: Happy to go deeper on the erasure-coding setup, the Restic backup integration, or the Glacier tiering rules.
outcomes:
  - value: 3
    label: Independent infrastructure environments unified behind one S3 API — AWS, on-prem VMware, and OpenStack
  - value: 40%
    label: Reduction in recurring storage costs after automated Glacier lifecycle tiering
  - value: <5 min
    label: Tenant provisioning time after decoupling application state onto the storage layer, down from a two-day manual process
scaffold: false
---

## Problem · Three infrastructure environments, three storage silos

Public cloud compute, an on-prem VMware data center, and a private OpenStack cloud each came with their own block storage, and none of it talked to the others. Application media, PostgreSQL dumps, and system backups piled up as local files on whichever host generated them, which meant every new service or tenant inherited that host's storage limits, and disaster recovery meant restoring from whatever happened to be on that one machine — not a separately-stored, environment-independent copy.

Traditional block storage was also the wrong tool for the actual access pattern: most of what needed storing was unstructured (media files, PDFs, backup archives), needed to be reachable the same way from all three environments, and needed a retention policy — hot for 30 days, cold after that — rather than living forever on primary disk.

## Architecture · A distributed object store as the shared layer underneath everything

```text
              [ Client applications / backup agents / ERP ]
                                │
                    [ HTTPS — ports 443 / 9000 ]
                                │
                  ┌─────────────┴─────────────┐
                  │   Nginx reverse proxy,    │
                  │      TLS termination      │
                  └─────────────┬─────────────┘
                                │
                  [ MinIO distributed S3 cluster ]
                     (erasure-coded, multi-disk)
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
 [ ERP media &          [ Restic encrypted        [ AWS S3 Glacier
   attachments ]           backup snapshots ]        cold tier ]
```

### Implementation notes

- **One deployment pattern, reachable from anywhere.** MinIO runs as a Docker Compose stack behind Nginx, with a dedicated S3 REST API port for application and backup traffic and a separate admin console port for bucket and IAM policy management. Because the interface is standard S3, the same client code and CLI tooling works identically whether the caller is in AWS, on a VM in the data center, or on OpenStack.
- **Resilience comes from erasure coding, not just replication.** The cluster distributes data across multiple disks with erasure coding, so it tolerates individual drive or node failures without a full replica of every object sitting idle.
- **Applications got to stop worrying about their own storage.** ERP file attachments and generated reports were redirected from local container filesystems into dedicated storage buckets with per-tenant access policies, which meant the application containers themselves became stateless — a real prerequisite for the tenant-provisioning time dropping from two days to under five minutes, since spinning up a new tenant no longer meant provisioning and wiring up its own storage first.
- **Backups are encrypted client-side before they leave the source host.** A Restic-based pipeline snapshots critical directories directly into the object store, with AES-256 encryption applied before data ever leaves the source machine — so the storage layer itself never holds a plaintext copy in transit or at rest — plus deduplication that meaningfully cuts the size of daily incremental snapshots.
- **Cost tiering is automatic, not a manual cleanup task.** Lifecycle policies transition aging backups from the hot object-storage tier to AWS S3 Glacier after 30 days, which is what delivered the bulk of the 40% storage-cost reduction while still meeting multi-year audit retention requirements.

```bash
# Trigger an encrypted backup into the object store
./minio_restic_backup.sh /data /etc/app-config

# Upload or list objects via the Python/Boto3 CLI
python3 minio_s3_client.py upload /tmp/db_dump.sql backups/db_dump.sql
python3 minio_s3_client.py list --prefix backups/
```

### Trade-offs

Self-hosting a distributed object store is a real operational commitment compared to just using a managed cloud object store directly — you own the cluster's health, its erasure-coding configuration, and its upgrade path, where a managed service would hand all of that to the provider. That trade only made sense because two of the three environments weren't AWS at all; a managed AWS-only object store couldn't have been the shared layer for the on-prem and OpenStack workloads regardless of how well it worked for the AWS side.
