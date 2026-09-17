# Telecom content review

The telecom project keeps its own landing page and content directory. Its public
collection now contains four main engineering stories and one shorter incident.
The overview supplies engagement context without repeating every implementation.

## Consolidation map

| Previous standalone entry | Current home |
| --- | --- |
| Zero-downtime database modernization and failover | Telecom project overview |
| PgBouncer connection pooling and CPU stabilization | Database migration case study |
| Secondary ENI telecom licensing | Failover case study |
| Multi-region active/standby transit network | Overview architecture and delivery notes |
| Media storage NFS to Multi-AZ EFS | Overview storage migration notes |
| API timeout and service discovery RCA | Repeatable platform delivery case study |

The KMS migration and CDR incident remain separate. The retained case-study URLs
are unchanged. Removed entries are deleted from generated navigation, search,
and sitemap output. Existing external links to removed URLs will no longer resolve;
no legacy redirect pages are introduced. Earlier drafts remain in Git history.

## Evidence required before restoring stronger claims

- **Database inventory:** drafts disagree on the source version and the number
  of logical databases. Confirm the source inventory, supported migration path,
  replication prerequisites, and final engine version from deployment records.
- **Cutover:** establish the write-pause interval and reconciliation results.
  A controlled cutover must not be advertised as uninterrupted service or proven
  zero data loss without those records.
- **Performance:** retain the workload, baseline, measurement window, and result
  for query latency, connection volume, and CPU. Removed percentages are not
  independently supported by measurements in this repository.
- **Recovery:** test partial failures, expired leases, delayed commands, and
  failed fencing. The inherited diagram promotes before stopping the old host;
  it is labeled as a documented sequence needing safety validation, not a
  verified safe runbook. A DynamoDB lease alone does not prove single-writer
  ownership. Measure detection and application recovery separately.
- **Licensed identity:** an existing ENI retains its identity when moved within
  its Availability Zone. Do not describe arbitrary MAC assignment, reboot-driven
  MAC changes, or cross-AZ interface movement. Regional recovery needs a separate
  vendor-approved licensing plan.
- **Cryptography:** reconcile conflicting claims about deterministic encryption,
  CBC mode, unique IVs, and database-side functions. Confirm the actual ciphertext
  format, key access boundary, rotation, and memory handling before publishing
  implementation assurances. KMS provider migration alone proves no compliance
  outcome and does not establish that database processes never see keys.
- **Automation:** retain repeat-run and partial-failure results before promising
  universal idempotence, fixed provisioning time, or a 100% success rate.
- **Storage:** separate storage-class unit prices from measured total spend,
  including transfer, retrieval, throughput, and lifecycle effects.
- **CDR incident:** distinguish server host-key verification from client-key
  authentication. Confirm the affected environment, backlog interval, event
  reconciliation, and replay results before asserting no missing or duplicate
  billing records.

Public narratives use generalized infrastructure descriptions and omit private
network ranges, operational identifiers, and unsupported numerical claims.
These notes identify evidence gaps; they do not independently verify delivery
outcomes described by the repository owner.
