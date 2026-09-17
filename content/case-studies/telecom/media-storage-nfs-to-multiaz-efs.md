---
title: Zero-downtime media storage migration from on-prem NFS to Multi-AZ EFS
nav: Migrate on-prem NFS to Multi-AZ EFS
label: Storage architecture
heading: Modernizing terabytes of voicemail and audio storage with 85% cost savings
project: telecom
layer: Storage
order: 60
stack: [Amazon EFS, AWS DataSync, AWS KMS, Terraform, Linux POSIX ACLs]
tags: [storage, efs, nfs, datasync, cost-optimization, lifecycle, telecom]
summary: Migrating millions of voicemail recordings from a single on-premise NFS appliance to Multi-AZ AWS EFS via AWS DataSync, implementing POSIX directory access points and 90-day Infrequent Access policies that cut storage costs by 85%.
problem: |
  Millions of customer voicemail messages, call audio files, and MMS attachments resided on a single on-premises Network File System (NFS) appliance in an enterprise datacenter. This appliance represented a critical single point of failure: an unrecoverable hardware or filesystem failure would immediately halt media recording and playback across the entire customer base. Furthermore, as voicemail and call audio accumulated over years, cold audio files consumed expensive high-performance on-premises disk storage without any automated lifecycle tiering.
solution: |
  I orchestrated a zero-downtime storage modernization from on-premises NFS to AWS Elastic File System (EFS) replicated across three Availability Zones in Frankfurt with cross-region replication to Paris. AWS DataSync agents executed over an encrypted Site-to-Site VPN tunnel to perform baseline bulk replication followed by hourly incremental delta syncs. EFS directory Access Points with POSIX user/group controls (`0750`) isolated media files between application servers and background workers. A 90-day Infrequent Access (IA) lifecycle policy was applied, automatically tiering older audio to lower-cost storage.
flowLabel: DataSync migration and EFS lifecycle tiering
flow:
  - step: Baseline DataSync bulk transfer
    note: AWS DataSync agents mounted the on-premise NFS export and transferred terabytes of historical audio over an encrypted VPN tunnel into AWS EFS.
  - step: Hourly delta synchronization
    note: Scheduled hourly delta tasks synchronized modified and newly created voicemail files, tracking changes until cutover synchronization window reached minutes.
  - step: Access Point & mount cutover
    note: Replaced legacy mounting utilities with AWS EFS DNS endpoints using POSIX Access Points (0750).
  - step: Automated 90-day lifecycle tiering
    note: EFS lifecycle management automatically transitions audio files unaccessed for 90 days to Infrequent Access storage, slashing cold storage costs.
enables: |
  The platform replaces a single-point-of-failure storage appliance with 99.999999999% (11 9's) cloud storage durability while drastically cutting cold audio retention costs.
outcomes:
  - value: 85%
    label: Storage cost reduction for historical call audio through automated 90-day IA tiering
  - value: 11 9's
    label: Data durability achieved across three Availability Zones in the primary AWS region
  - value: < 5m
    label: Final cutover maintenance window required to switch active mounts to AWS EFS
---

## Architecture · The decisions that mattered

The primary architectural decision was to decouple storage migration from compute cutover using continuous background synchronization. Attempting to copy terabytes of unstructured audio files during a single cutover maintenance window would have required hours of downtime. By leveraging AWS DataSync for continuous synchronization, cutover was reduced to a simple mount point swap.

### Implementation notes

- **Multi-AZ high durability:** AWS EFS General Purpose mode was deployed across three Availability Zones in Frankfurt (`eu-central-1a`, `eu-central-1b`, `eu-central-1c`). File metadata and data blocks are automatically replicated across AZs, eliminating hardware single-points-of-failure.
- **Automated 90-day Infrequent Access (IA) lifecycle:** Voice call recordings are frequently accessed during the first 30 to 60 days for compliance audits and user playback, after which access drops by over 95%. Configuring `transition_to_ia = "AFTER_90_DAYS"` automatically moves cold files to the IA tier, reducing storage costs from $0.30/GB-month to $0.025/GB-month (an 85%+ cost reduction).
- **POSIX directory Access Points:** Application servers and persistent database nodes require shared access to voicemail and mail spool directories. EFS Access Points enforce POSIX user and group boundaries (`uid=1001`, `gid=1001`, `permissions=0750`), preventing container or application processes from escaping their designated storage directories or overwriting system files.
- **Cross-region replication to Paris:** As codified in the EFS Terraform configuration:
  ```hcl
  replication = {
    enabled            = true
    destination_region = "eu-west-3"
    kms_key_id         = null
  }
  ```
  EFS continuously replicates storage changes to the Paris disaster recovery region, ensuring file availability during regional recovery drills.

### Security controls

- **KMS Customer Managed Key encryption:** Filesystem data at rest is encrypted using AWS KMS Customer Managed Keys with annual rotation policies enforced.
- **Network-level mount target isolation:** EFS mount targets reside exclusively within private VPC subnets. Security group rules restrict NFS port 2049 ingress strictly to the private application CIDR blocks (`172.17.0.0/16`), with all public internet access blocked.
- **TLS in-transit encryption:** All Linux clients mount EFS volumes using the `amazon-efs-utils` helper with the `-o tls` option, enforcing TLS encryption for all NFSv4.1 wire traffic.

## Delivery · How the change is rolled out

Data migration was executed over two weeks using AWS DataSync. The initial baseline transfer migrated the bulk audio corpus without impacting on-premises storage performance. Hourly scheduled delta syncs captured ongoing changes. 

During final cutover, legacy NFS exports were set to read-only, a final delta sync executed in under four minutes, and persistent nodes updated `/etc/fstab` and local mount configurations to mount the EFS DNS endpoint. Audio playback and voicemail recording verification tests confirmed zero missing files.

## Trade-offs · What this does not solve

EFS General Purpose mode provides high durability and horizontal throughput across hundreds of concurrent compute nodes, but exhibits slightly higher metadata operation latency (e.g., executing `ls -l` across directories with hundreds of thousands of files) compared to local NVMe drives or bare-metal SAN storage. The application design addresses this by partitioning audio storage into hierarchical date-based subdirectories rather than flat directories.
