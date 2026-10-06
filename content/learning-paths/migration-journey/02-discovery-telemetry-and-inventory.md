---
title: Discovery Telemetry · RVTools, AWS Transform & Sizing
date: 2026-09-17
updated: 2026-10-06
track: migration-journey
order: 2
module: 2
summary: Collecting what you have and how much of it is really used. RVTools for a quick inventory, an agentless collector for usage over time, and right-sizing compute, storage, and processor type so the AWS estimate isn't built on oversized VMs.
level: Technical Discovery
readingTime: 8 min read
stack: [RVTools, VMware vCenter, AWS Transform, Right-Sizing]
tags: [discovery, telemetry, vmware, right-sizing, inventory]
---

**In this module, you'll learn to:**

- Combine a point-in-time inventory (RVTools) with usage collected over weeks
- Right-size compute from the 95th percentile, and storage from the data actually used
- Judge when AWS Graviton is worth testing

**Before you start:** read [Assessment Frameworks](01-assessment-paths-rapid-vs-deep.html). The type of assessment decides how long you collect usage data.

## Principle · Don't copy VM sizes one-to-one

The most expensive mistake in a migration estimate is copying sizes straight across: a VM with 16 vCPUs and 64 GB of memory becomes an `m5.4xlarge` with the same, without asking how much of it is ever used.

On-premises servers are usually oversized. Hardware was bought with years of headroom, because ordering more took months. It's common to find VMware estates where most VMs use only a small share of their CPU and memory most of the time.

Copy those sizes to AWS, and the cloud bill looks far higher than it needs to, which can sink the business case. Good discovery captures **how much is really used**, over time, and sizes from that.

## Tooling · Two kinds of data

Discovery normally combines two sources:

1. **A point-in-time inventory: RVTools.**
   - **What it is:** a free, read-only tool that connects to vCenter and exports a spreadsheet of every VM: vCPUs, memory, disks, operating system, and power state.
   - **Good for:** a first inventory within a day or two, early sizing estimates, and checking against the CMDB.
   - **Limit:** it's a snapshot of what's *allocated*. It doesn't show usage over time, or which servers talk to each other.

2. **Usage over time: an agentless collector.**
   - **What it is:** a small virtual appliance (an OVA) deployed inside the VMware environment. It reads performance data from vCenter with a read-only account, and sends it to AWS over outbound HTTPS. AWS Transform and the AWS Application Discovery Service both offer collectors like this.
   - **Good for:** usage curves over weeks: peak and 95th-percentile CPU, memory, disk activity, and network traffic.
   - **Why agentless helps:** nothing is installed inside the servers themselves, which is often what gets security and compliance teams to say yes.

<div class="callout"><b>Locked-down networks.</b> If the datacenter can't send data out to AWS, check what your chosen collector supports. Some can export collected data as a file, for the security team to review and upload by hand.</div>

## Right-sizing · Compute, storage, and processor

Once usage data has been collected for long enough, each server is sized in three ways.

### 1. Compute: size for the 95th percentile, not the peak

Sizing for the single highest spike usually means sizing for a nightly backup or a patch run. Instead, size for the **95th percentile** of CPU and memory use, plus some headroom:

```text
target vCPUs = current vCPUs × 95th-percentile CPU use × 1.25 (headroom), rounded up
```

**Example:** a VM with 8 vCPUs whose 95th-percentile CPU use is 18%: 8 × 0.18 × 1.25 = 1.8, so 2 vCPUs. Moving from 8 vCPUs to 2 cuts the compute for that server by about three quarters. Check memory the same way before choosing an instance type.

### 2. Storage: size for what's used, not what's allocated

On-premises disks are often allocated far bigger than the data on them. A 1 TB disk may hold 85 GB.

- **Size the EBS volume (usually `gp3`) for the data actually used,** plus room to grow.
- **Performance doesn't depend on size with `gp3`.** Every `gp3` volume gets a baseline of 3,000 IOPS and 125 MB/s, so a small volume can still be fast, without paying for expensive `io2` storage.

### 3. Processor: consider AWS Graviton

Linux workloads whose software runs on ARM64 can often move to **AWS Graviton** instances (such as `m7g` or `c7g`). AWS quotes up to 40% better price-performance than comparable x86 instances. It isn't automatic: check that every package and agent has an ARM64 build, and test before you commit. Windows workloads stay on x86.

## Recap · Key terms

- **RVTools:** a free, read-only export from vCenter of what each VM is *allocated*. No usage over time, no dependencies.
- **Agentless collector:** an appliance inside VMware that reads performance data from vCenter, so nothing is installed on the servers.
- **95th-percentile sizing:** current vCPUs × 95th-percentile CPU use × 1.25 headroom, rounded up.
- **`gp3`:** every volume gets a baseline of 3,000 IOPS and 125 MB/s, whatever its size.
- **AWS Graviton:** ARM64 instances. AWS quotes up to 40% better price-performance; every package needs an ARM64 build, and Windows stays on x86.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: What can't RVTools tell you?
- How many vCPUs each VM has
- Each VM's operating system
* How much of its CPU each VM actually uses over time
- Each VM's power state
= RVTools is a snapshot of what's allocated. Usage over time needs a collector running for weeks.
Q: Why size compute from the 95th percentile instead of the peak?
* The single highest spike is often a backup or patch run, not normal load
- AWS bills by the 95th percentile
- Collectors don't record peaks
- MAP requires it
= Sizing for the one biggest spike means paying all month for a nightly job. The 95th percentile plus headroom covers real load.
Q: A `gp3` volume is sized at 100 GB. What baseline performance does it get?
- Very little, because it's small
* 3,000 IOPS and 125 MB/s, like any `gp3` volume
- 10,000 IOPS
- Only what `io2` would give
= With `gp3`, performance doesn't depend on size, so you can size for the data actually used.
S: A VM has 16 vCPUs, and its 95th-percentile CPU use is 10%. Using the module's formula, how many vCPUs should its target have?
- 16
- 4
* 2
- 1
= 16 × 0.10 × 1.25 = 2. Check memory the same way before choosing an instance type.
S: The security team won't allow anything to be installed inside production servers. How do you still collect usage over time?
- Use RVTools alone
* Deploy an agentless collector that reads performance data from vCenter with a read-only account
- Install agents on test servers and extrapolate
- Size from the allocated resources
= The agentless collector runs as a separate appliance, which is often what gets security teams to agree.
```
