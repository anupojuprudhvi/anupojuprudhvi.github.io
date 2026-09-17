---
title: Diagnosing a silent call-record ingestion failure
nav: Incident: silent CDR ingestion failure
label: Incident write-up
project: telecom
layer: Operations
order: 50
stack: [Kafka, PostgreSQL, Linux, SSH ETL, CloudWatch]
tags: [incident-response, cdr, ingestion, observability, recovery]
summary: Tracing missing call records through consumer output and SSH transfer, then replacing process-only checks with data-flow monitoring.
scaffold: false
problem: Billing records stopped arriving even though the consumer processes appeared healthy.
solution: Trace records across each pipeline boundary, repair parsing and transfer failures, and validate recovery through downstream data checks.
---

## Problem · Running processes masked missing business data

Call Detail Records (CDRs) stopped reaching the reporting database while voice and messaging services remained active. Process-health checks did not identify the interruption, so investigation had to follow the records themselves.

## Solution · Trace one record through the pipeline

I investigated the path from queue messages to consumer output, file transfer, and database ingestion. The investigation identified two failures: consumer parsing produced empty batch files, and an SSH host-key mismatch blocked scheduled transfers after node replacement.

## Architecture · Health must be checked across the boundaries

The legacy path crossed a message queue, local batch files, an SSH-based transfer, and database inserts. A running consumer or a newly created file did not demonstrate successful delivery to the final table.

### Implementation notes

- **Consumer output:** Parsing errors led to empty files. Inspecting file size and record content exposed a problem that file-presence checks missed.
- **Transfer identity:** A changed server host key caused SSH verification to reject transfers. Host identity must be verified before updating trust; replacing client authentication keys is a separate operation.
- **Recovery:** The described recovery used queue replay and downstream row-count checks. Replay also needs reconciliation for duplicates and rejected records before concluding that every missing record has been recovered.

## Security · Repair trust without bypassing verification

The transfer used a dedicated service identity over SSH. Host-key reconciliation must preserve verification rather than disable it to make the job run. Diagnostic samples and quarantined records also need restricted access and retention controls because call records can contain sensitive information.

## Delivery · Restore flow, then observe the destination

The recovery combined a consumer correction, transfer-configuration reconciliation, and replay from the incident window. Batch-file checks and ingestion monitoring were added so that future failures could be detected beyond the process state.

## Trade-offs · Recovery still depended on a legacy batch path

Disk buffering and host-to-host transfer remained operational dependencies. Replayability also depended on retained source events; successful process restarts alone could not prove billing completeness.

## Outcome · A better definition of service health

The incident led to restored ingestion and monitoring based on data movement. The available narrative does not provide a reconciled record ledger, so this write-up does not claim that zero records were lost or duplicated.

## Next steps · Track freshness and reconciliation

Add destination freshness, queue lag, transfer failures, and rejected-record counts to the acceptance criteria. Preserve a reconciliation report for the affected interval and exercise replay with duplicate detection.
