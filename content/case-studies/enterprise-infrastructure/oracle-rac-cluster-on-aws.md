---
title: 21-node Oracle RAC cluster on AWS without shared-SAN storage
nav: Oracle RAC on AWS
summary: A 21+ node Oracle RAC cluster running active-active database failover on AWS, built around software-defined clustered storage to work around AWS's lack of native shared-SAN block storage.
project: enterprise-infrastructure
layer: Data
order: 10
stack: [Oracle RAC, FlashGrid, AWS EC2, AWS EBS, AWS DMS, CentOS]
tags: [database, high-availability, oracle, clustering, aws]
problem: |
  A large education-services platform ran mission-critical academic and financial operations —
  registrations, fee processing, and examination results — on a database tier that had to absorb
  extreme, predictable concurrency spikes (an exam-results release could multiply load by an order
  of magnitude in minutes) without downtime or throttling. Oracle RAC is the standard answer for
  active-active database high availability, but RAC has traditionally required shared-SAN block
  storage that AWS doesn't provide natively — EBS volumes attach to one instance at a time.
solution: |
  A 21+ node active-active Oracle RAC cluster on AWS EC2, using a software-defined clustered
  storage layer (FlashGrid) to emulate shared-SAN semantics across independently-attached EBS
  volumes, with tuned ASM diskgroups, provisioned-IOPS storage, and kernel-level I/O tuning to hit
  sub-2ms latency under load.
heroTitle: Twenty-one active nodes, no shared SAN, zero downtime at peak load
intro: Oracle RAC's active-active model is built around an assumption AWS doesn't meet natively — shared block storage every node can see at once. This case study covers how that gap was closed with a software-defined storage fabric, and the tuning and operational discipline that kept a 21-node cluster stable through the platform's highest-concurrency events.
role: Lead cloud architect / database infrastructure engineer
scope: Cluster architecture, storage-fabric design, and rolling-patch operational runbooks
closingText: I'm happy to go deeper on the FlashGrid storage-fabric design, the ASM diskgroup tuning, or the rolling-patch procedure.
outcomes:
  - value: 21+
    label: Active Oracle RAC nodes running active-active on AWS EC2
  - value: 0
    label: Native AWS shared-SAN storage used — a software-defined layer emulates it instead
  - value: <2ms
    label: Sustained I/O latency on the tuned, EBS-backed ASM diskgroups
scaffold: false
---

## Problem · Active-active clustering on storage that wasn't built to share

Oracle RAC gets its high availability from every node in the cluster reading and writing the same underlying storage at once — if one node fails, the others already have live access to its data and simply absorb its workload. That model assumes a shared SAN. AWS EBS volumes don't work that way: each volume attaches to exactly one EC2 instance at a time, which is the standard blocker that keeps most RAC deployments off public cloud entirely, or forces them onto more expensive dedicated-hardware options.

The platform this ran on also had an unusually spiky load profile: routine day-to-day traffic, punctuated by short, extreme surges (an examination-results release, an admissions deadline) where concurrent connections and transaction volume could jump by an order of magnitude with no warning window to scale into ahead of time. A cluster that could only fail over gracefully, but not sustain that kind of peak, wouldn't have solved the actual problem.

## Architecture · A software-defined storage fabric standing in for a SAN

```text
                   [ Application tier / ERP / web services ]
                                     │
                     ┌───────────────┴───────────────┐
                     │                               │
              [ RAC node 01 ]     ...           [ RAC node 21+ ]
               (AWS EC2, r5)                      (AWS EC2, r5)
                     │                               │
                     └───────────────┬───────────────┘
                                     │
                     [ FlashGrid cluster fabric ]
                    (virtual shared-SAN over EBS)
                                     │
                     ┌───────────────┴───────────────┐
                     │                               │
           [ ASM diskgroup +DATA ]           [ ASM diskgroup +RECO ]
          (tablespaces, indexes)          (redo logs, archive, FRA)
```

Each node runs on memory-optimized EC2 instances with dedicated network interfaces separating client traffic, cluster administration, and the private cache-fusion interconnect RAC nodes use to coordinate with each other — that separation matters because cache-fusion traffic is latency-sensitive and shouldn't compete with application or management traffic on the same interface.

### Implementation notes

- **The storage fabric is the load-bearing piece.** FlashGrid's software-defined layer presents independently-attached EBS volumes to every node as if they were one shared SAN, which is what makes Oracle ASM's diskgroup model — and RAC's active-active assumption — work on AWS at all. Without it, this would have to be either a single-node deployment with manual failover, or run on non-AWS infrastructure.
- **Storage is tuned, not just attached.** Provisioned-IOPS (io1) EBS volumes are striped across the diskgroups to guarantee sustained throughput, and the OS is tuned specifically for Oracle's I/O pattern — kernel hugepages, asynchronous I/O via libaio, and IPC-related sysctl parameters — to hold latency under 2ms even while the cluster is under peak concurrent load.
- **Rolling patches, not maintenance windows.** Security and Oracle PSU patches are applied one node at a time: drain connections and stop the instance on that node, apply the patch, restart Clusterware, and confirm cache-fusion has re-synchronized before moving to the next node. The cluster stays fully available to applications throughout, since the other 20 nodes are still serving traffic.
- **Replication feeds analytics without touching the transactional path.** AWS DMS streams changes out to S3-based data lakes for business intelligence and cross-account analytics, so reporting workloads never compete with the OLTP cluster for resources.

Verifying cluster health day to day comes down to a small set of commands run against Clusterware, the storage fabric, and ASM directly:

```bash
# Grid Infrastructure / Clusterware status
crsctl check cluster -all
crsctl status resource -t

# Storage fabric quorum and disk access
flashgrid-cluster status
flashgrid-node status

# ASM diskgroup throughput
su - grid -c "asmcmd lsdg"
```

### Trade-offs

Running RAC yourself on EC2 with a third-party clustered-storage layer is a heavier operational commitment than a managed database service — every node, the storage fabric, and the patching cadence are yours to own, and that's a real ongoing cost against something like Aurora's operational simplicity. It was the right trade here because the workload's failure mode wasn't "an outage is inconvenient," it was "an outage during a results release affects a very large population of students and families with no way to reschedule the event" — active-active RAC with zero-downtime patching bought headroom a simpler managed setup at the same scale wouldn't have.
