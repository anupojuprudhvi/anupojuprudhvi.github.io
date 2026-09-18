---
title: Decoupled real-time analytics for clinical telemetry
nav: Real-time clinical analytics
summary: Streaming physiological telemetry into a real-time OLAP store so care teams can query months of patient vitals without touching the operational database.
project: healthcare
layer: Data engineering
order: 20
stack: [Apache NiFi, Apache Pinot, Tableau Server, mTLS]
tags: [data-engineering, real-time-analytics, olap, streaming]
problem: |
  Care coordinators needed to query months of patient vital-sign history — blood pressure, pulse,
  glucose, oxygen saturation — for trend review and triage, but the only place that history lived
  was the same operational database handling live, high-frequency device writes. Every heavy
  reporting query competed directly with real-time telemetry ingestion for the same resources.
solution: |
  A dedicated streaming pipeline that moves vitals out of the write path entirely: a flow-management
  layer ingests, validates, and enriches telemetry in flight, a distributed real-time OLAP datastore
  indexes it for low-latency aggregation, and clinical dashboards query that store instead of the
  operational database, so reporting load never reaches the system of record.
heroTitle: Taking clinical reporting off the operational database, permanently
intro: A relational database that's absorbing continuous, high-frequency device writes is a poor place to also run multi-month trend queries across thousands of patients. This case study covers the decoupled analytics pipeline built to separate those two workloads completely, and a production incident in the dashboard layer it exposed.
role: Data engineering & real-time analytics architecture
scope: Streaming ingestion pipeline + distributed OLAP layer + BI dashboards
closingText: I'm happy to go deeper on the ingestion/enrichment layer, the choice of a real-time OLAP store over a data warehouse, or the dashboard incident below.
outcomes:
  - value: <500ms
    label: 90-day multi-vital trend query latency, down from roughly 18 seconds when it ran against the operational database
  - value: 0
    label: Reporting queries that touch the operational database once the pipeline is in place
  - value: mTLS
    label: Authentication between every stage of the ingestion pipeline
scaffold: false
---

## Problem · Reporting and ingestion were fighting over the same database

The operational database's job was to be the durable, transactionally-consistent source of truth for live application state — a device reading arrives, gets written, and the application acts on it immediately. That's a fundamentally different access pattern from a care coordinator asking "show me this patient's blood pressure trend over the last 90 days," which touches a large historical range in a single read.

Running both patterns against the same database meant they competed directly: a burst of heavy trend queries could visibly slow down live telemetry writes, and there was no way to scale the two independently, because they weren't separated at all.

## Architecture · Ingest once, index for queries, never touch OLTP again

```text
[ Device telemetry / integration tier ]
             │
             ▼
[ Flow-management layer ]
  • Schema validation & enrichment
  • Backpressure handling
  • Mutual-TLS between every hop
             │
             ▼
[ Distributed real-time OLAP store ]
  • Column-oriented, real-time segments
  • Built for high-concurrency aggregation
             │
             ▼
[ Clinical BI dashboards ]
  • Physician & care-coordinator views
  • Never queries the operational database
```

### Implementation notes

- **The flow-management layer is the only thing that talks to both sides.** Device-facing ingestion and the OLAP store are decoupled by this layer, so either side can change independently — a new device family or a new dashboard doesn't require touching the other.
- **The OLAP store was chosen specifically for the access pattern, not for general-purpose analytics.** A distributed, real-time, column-oriented store is a deliberate choice for high-concurrency, low-latency aggregation over a data warehouse built for large batch queries — the requirement was interactive dashboard response times across thousands of concurrently-active patients, not nightly reporting.
- **Every hop between pipeline stages authenticates with mutual TLS**, so a compromised or misconfigured client can't inject or read telemetry mid-pipeline even from inside the private network.

### Result

Care coordinators querying a 90-day, multi-vital patient history went from a query that could take roughly 18 seconds — competing with live writes on the operational database — to consistently under 500 milliseconds, run entirely against the decoupled store instead.

## Production incident · Dashboard-server deadlocks under heavy reporting load

Once the pipeline was in place, the remaining single point of failure was the BI layer itself: under heavy concurrent reporting load, dashboard sessions periodically disconnected and the server's own management UI stopped responding — a deadlock in the BI server's own process, not the pipeline feeding it.

### Triage sequence

- Connected to the environment through the mutual-TLS access path and opened the BI server's own service-management console.
- Checked process status across the server's application, query, and data-engine processes individually rather than assuming a single crashed process.
- Where a deadlock was confirmed, issued a clean service-level restart from the management console's own CLI rather than restarting the underlying host, which would have taken longer and dropped active sessions across the board.
- Verified the backend repository connection and available memory after restart before reopening dashboards to users.

### Operational follow-up

Unsaved dashboard drafts during an unexpected crash needed to be recovered from local autosave rather than the server session, which became a documented step in the runbook so a future on-call engineer isn't discovering that mid-incident.
