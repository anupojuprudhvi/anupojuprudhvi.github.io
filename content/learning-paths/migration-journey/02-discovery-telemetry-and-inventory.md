---
title: Discovery Telemetry · RVTools, AWS Transform & Sizing
track: migration-journey
order: 2
module: 2
totalModules: 6
summary: Extracting hypervisor inventory, continuous utilization percentiles, and applying right-sizing algorithms to avoid naive 1:1 lift-and-shift over-provisioning.
level: Technical Discovery
readingTime: 8 min read
stack: [AWS Transform, VMware vCenter, RVTools, Right-Sizing]
tags: [discovery, telemetry, vmware, right-sizing, inventory]
---

## Principle · The trap of 1:1 infrastructure translation

The single most expensive mistake in cloud migration is **naive 1:1 translation** — taking an on-premises VM configured with 16 vCPUs and 64 GB RAM and blindly matching it to an `m5.4xlarge` EC2 instance.

On-premises infrastructure is chronically over-provisioned. Systems engineers historically purchased physical hosts with 3–5 year capacity buffers to avoid procurement lead times. In practice, enterprise VMware estates frequently operate at **average CPU utilization below 10%** and **RAM utilization below 35%**. 

Translating provisioned hardware 1:1 into AWS results in inflated cloud bills that destroy the business case. Precision discovery must capture **actual utilization curves** to calculate right-sized instance recommendations.

## Tooling · The dual-path discovery architecture

Modern discovery leverages two complementary data collection mechanisms:

1. **Point-in-Time Hypervisor Snapshots (RVTools):**
   - **How it works:** A read-only vSphere client utility connects to vCenter and exports an `.xlsx` multi-sheet workbook containing hardware configuration for every VM: provisioned vCPUs, memory, disk datastores, OS labels, and power states.
   - **Best for:** Immediate sanity checks within 48 hours, sizing baseline estimates, and inventory reconciliation against CMDB records.
   - **Limitation:** Does not capture continuous time-series utilization metrics or network dependency flows.

2. **Continuous Telemetry Collectors (AWS Transform Agentless OVA):**
   - **How it works:** An Open Virtual Appliance (OVA) virtual machine deployed directly inside the private VMware cluster. It queries the vCenter API using a read-only service account every 15–60 minutes.
   - **Best for:** Capturing 24/7 time-series performance metrics: 95th and 99th percentile CPU utilization, active memory consumption, disk IOPS, and network throughput.
   - **Advantage:** Completely agentless — requires zero software installed inside guest operating systems, satisfying strict financial and healthcare compliance boundaries.

## Architecture · Agentless discovery pipeline

The diagram below illustrates the secure telemetry flow from private on-premises hypervisors to the AWS assessment analytics engine:

<pre><code>[ VMware vCenter Cluster ]
       │
       ▼ (Read-only API queries: vCPU, RAM, IOPS, Network)
[ AWS Transform Collector OVA Appliance ]
       │
       ▼ (Encrypted HTTPS TLS 1.3 / Port 443 outbound only)
[ AWS Transform Workspace / Migration Hub ]
       │
       ▼ (Normalization, 95th-percentile curve fitting, Graviton mapping)
[ Directional Business Case (DBC) &amp; Sizing Engine ]</code></pre>

## Analytics · The right-sizing algorithm

Once telemetry is ingested into AWS Transform, right-sizing algorithms evaluate server performance across three primary dimensions:

### 1. Compute Right-Sizing (95th Percentile Rule)
Rather than sizing for absolute maximum spikes (which may represent a one-off backup or patch cycle), compute is sized against the **95th percentile CPU and memory demand** plus a 20–30% operational headroom buffer:

$$\text{Target EC2 Cores} = \lceil (\text{Observed vCPUs} \times \text{P95 CPU Utilization} \times 1.25) \rceil$$

A VM provisioned with 8 vCPUs whose 95th percentile CPU never exceeds 18% can safely migrate to a 2-vCPU instance (`c6g.large` or `m6g.large`), reducing compute costs by up to 70% immediately.

### 2. Storage Right-Sizing (Provisioned vs. Consumed)
On-premise VMDK disks are frequently formatted with thick provisioning. A 1 TB disk allocation may contain only 85 GB of active data:
- **Capacity Adjustment:** Target EBS volumes (typically `gp3`) are sized based on **consumed disk space** plus a 25% growth buffer, rather than provisioned allocations.
- **Performance Decoupling:** AWS `gp3` volumes provide a baseline of 3,000 IOPS and 125 MB/s throughput regardless of volume size, allowing low-capacity high-IOPS workloads to operate cost-effectively without provisioning expensive `io2` storage.

### 3. Architecture Modernization (x86 to AWS Graviton)
Workloads running Linux distributions (Ubuntu, RHEL, Amazon Linux) are mapped directly to **AWS Graviton3 (ARM64)** instance families (`c7g`, `m7g`, `r7g`). Graviton processors provide up to **40% better price-performance** over equivalent x86-based instances, compounding the savings surfaced through right-sizing.

## Security · Handling air-gapped and restricted environments

In zero-trust or air-gapped datacenters where outbound HTTPS traffic to AWS public endpoints is strictly blocked:
- The AWS Transform collector can operate in **offline collection mode**.
- Telemetry is gathered and stored locally on the appliance.
- At the end of the collection window, the administrator exports an encrypted, obfuscated archive (`.tar.gz`).
- The archive is reviewed by corporate security and manually uploaded to the AWS Transform console via an administrator workstation, ensuring full compliance without compromising discovery fidelity.
