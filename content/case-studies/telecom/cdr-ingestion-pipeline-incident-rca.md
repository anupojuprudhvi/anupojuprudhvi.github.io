---
title: SRE post-mortem: diagnosing a silent call detail record ingestion failure
nav: SRE RCA: CDR ingestion failure
label: Incident response
heading: Tracing a multi-stage data loss incident from message queues to database ETL
project: telecom
layer: Operations
order: 90
stack: [Apache Kafka, PostgreSQL, Python, Bash, SSH ETL, Linux Systemd]
tags: [incident-response, rca, post-mortem, cdr, etl, kafka, postgresql]
summary: Diagnosing a silent telecommunications call detail record ingestion failure across application message consumers, zero-byte batch files, and persistent database ETL scripts.
problem: |
  Following a cloud maintenance upgrade, business billing dashboards reported that Call Detail Records (CDRs) had completely ceased populating the reporting database. Application voice and SMS traffic was active, and message queue consumers on application servers reported running systemd states. However, all billing database tables contained zero rows for multiple hours. Because background services were superficially reporting "active" status, standard process health checks did not trigger alerts, masking a silent data ingestion failure.
solution: |
  I led the incident response and root-cause analysis across the distributed data pipeline. By tracing data lineage from the message queue through local disk buffers to the database ETL layer, I discovered a compounding two-point failure: the consumer daemon was throwing unhandled payload parsing exceptions that caused it to emit 0-byte batch files, while on the persistent database node, host key mismatches caused scheduled SSH ETL sync scripts to fail silently. I engineered a multi-layered fix that patched payload parsing, restored SSH key exchange pairs, and implemented end-to-end data-flow monitoring.
flowLabel: Call record data flow and failure points
flow:
  - step: Telephony applications to message queue
    note: Voice switches, SIP servers, and messaging daemons publish raw call event records into Kafka topics.
  - step: Application consumer processing (Failure Point 1)
    note: Consumer daemon threw unhandled JSON parsing errors on new fields, writing 0-byte batch files and dropping call session identifiers.
  - step: Persistent node SSH ETL pull (Failure Point 2)
    note: Scheduled cron ETL scripts pulling batch files from application nodes to the DB node failed due to SSH host key verification errors following instance replacement.
  - step: Database ingestion
    note: ETL script parses files and executes batch SQL inserts into billing tables; failed sync left all billing tables empty.
enables: |
  The data engineering and SRE teams gain an observable, fault-tolerant call billing pipeline with end-to-end payload validation, automated error alerting, and resilient ETL ingestion.
outcomes:
  - value: 2
    label: Independent failure modes isolated and resolved across consumer and ETL layers
  - value: 0
    label: Billing records lost after reprocessing undigested Kafka message offsets
  - value: 100%
    label: Ingestion pipeline recovery with automated batch file size threshold alerts
---

## Architecture · The decisions that mattered

The critical technical insight was to treat the incident as a broken contract across distributed system boundaries. In a multi-tier telecommunications architecture, data moves across multiple protocols: message queues, local disk file serialization, SSH transport between instances, and finally relational SQL inserts. A failure at any translation boundary can look like an empty database, even when individual daemons report healthy process states.

### Implementation notes

- **Root cause 1: 0-byte batch files from the ingest consumer:**
  - Inspection of consumer service logs revealed that an upstream schema update had added an unexpected payload field in raw voice session messages.
  - The consumer daemon failed to deserialize the updated structure, caught the exception internally, and flushed empty 0-byte batch files while appending error traces to local error logs.
  - Because the file creation timestamp updated hourly, simple file-presence monitors believed the service was operating normally.
- **Root cause 2: SSH ETL authentication failures:**
  - Even when valid batch files existed, the secondary persistent database node was failing to pull records over SSH.
  - During instance replacement in staging, the application node had received a new host key. The persistent node's automated ETL script encountered a strict host key mismatch and exited non-zero.
  - The script lacked notification alerting on non-zero exit codes, allowing the failure to persist silently.
- **Remediation & pipeline hardening:**
  - Patched the consumer parsing routine to safely handle unknown or missing JSON fields without dropping the call session context.
  - Regenerated and distributed authorized SSH keys between application and persistent database hosts via the configuration automation.
  - Reprocessed message consumer offsets from the start of the incident window, successfully reconstituting and loading all uncollected call records into the reporting database.

### Security controls

- **Dedicated SSH service keys:** Inter-node ETL file transfer utilizes a restricted ETL service user with SSH key authentication forced to a single specific command (`command="rsync ..."`), preventing interactive shell access.
- **Encrypted transit:** All ETL data transfers between application instances and database persistent nodes occur over private VPC subnets with encrypted SSH protocol v2 transport.
- **Audit trail retention:** Error logs and corrupt record batches are redirected to a dedicated quarantine directory with 30-day retention for compliance forensic reviews.

## Delivery · How the change is rolled out

The fix was rolled out through a structured operational recovery:
1. Deployed the patched consumer binary to application nodes.
2. Executed SSH key reconciliation via Systems Manager across all environment nodes.
3. Reset consumer group offsets to the timestamp of the initial incident to replay missing events.
4. Monitored row count increases across billing tables until ingestion lag reached zero.
5. Deployed a CloudWatch metric filter monitoring batch file sizes, triggering high-priority PagerDuty alerts if 0-byte batch files are generated consecutively.

## Trade-offs · What this does not solve

Relying on disk-buffered batch files and SSH-based ETL is an artifact of legacy telecommunications billing architectures. While the pipeline was stabilized and made resilient, a modern cloud-native design would stream message records directly into an analytics cluster or database via managed connectors, eliminating the need for intermediate flat files on local EC2 storage.
