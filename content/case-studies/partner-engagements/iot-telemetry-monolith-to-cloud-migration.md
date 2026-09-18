---
title: Connected IoT and telemetry platform · Monolith to AWS cloud migration and service mapping
nav: Connected IoT cloud migration
label: Target architecture
heading: Translating monolithic telemetry backends into managed AWS cloud architectures
project: partner-engagements
layer: Architecture & Services
order: 30
stack: [AWS IoT Core, Amazon EKS, Amazon Kinesis, Aurora PostgreSQL, DynamoDB, AWS MAP]
tags: [iot, telemetry, monolith-to-microservices, architecture, eks, kinesis, map]
summary: Modernizing a connected device platform from on-premise monolithic servers to high-throughput AWS managed services, establishing service translation matrices, ballpark estimates, and MAP Mobilize roadmaps.
problem: |
  A connected smart consumer IoT platform transmitting continuous streams of biometric
  and environmental telemetry from millions of deployed hardware units was constrained
  by an aging on-premises monolithic backend. Monolithic MQTT connection brokers,
  self-managed database clusters, and co-located background worker daemons created
  critical scaling bottlenecks and single points of failure during usage spikes.
  Transitioning to AWS under the Migration Acceleration Program (MAP) required a complete
  Well-Architected target blueprint, mapping legacy server daemons to managed cloud services,
  and establishing defensible infrastructure cost estimates.
solution: |
  Designed the target cloud architecture and authored the comprehensive Service Mapping
  Matrix translating monolithic components to scalable AWS managed equivalents:
  migrating self-hosted MQTT to AWS IoT Core, background processing to Amazon EKS on
  AWS Graviton, telemetry streaming to Amazon Kinesis, and operational persistence to
  Amazon Aurora and Amazon DynamoDB. Formulated the 3-year capacity cost models,
  authored the MAP Assessment Final Report, and established the technical governance
  and cadence framework for the Mobilize phase.
flowLabel: Monolith-to-cloud service translation pipeline
flow:
  - step: Monolith discovery & profiling
    note: Technical discovery of legacy IoT daemon processes, message queue brokers, database schemas, and device keep-alive traffic patterns.
  - step: Service mapping matrix
    note: Translating on-premise software stacks to cloud-native managed primitives: MQTT to IoT Core, daemons to EKS, streams to Kinesis.
  - step: Well-Architected target design
    note: Structuring a decoupled multi-AZ cloud architecture separating device connection management, stream ingestion, and state persistence.
  - step: Sizing & ballpark financial models
    note: Projecting 3-year infrastructure spend across varying device adoption curves using Reserved Instances and Savings Plans.
enables: |
  Provides elastic telemetry ingestion capable of absorbing millions of concurrent
  device connections without physical server headroom limits, while isolating high-frequency
  sensor time-series from transactional customer account records.
outcomes:
  - value: Millions
    label: Real-time telemetry events ingested per hour without broker bottlenecks
  - value: Multi-AZ
    label: High-availability architecture replacing monolithic single points of failure
  - value: 100%
    label: Monolithic background daemons mapped to managed AWS services
---

## Assessment · Deconstructing the on-premises IoT monolith

Connected IoT backends encounter severe operational stress: devices maintain persistent socket connections, emit continuous telemetry packets (vital signs, heart rates, environmental temperature, sensor battery states), and require immediate delivery of urgent alert notifications. 

The existing on-premises platform handled these responsibilities through a monolithic application stack where connection management, stream ingestion, business rules, and customer-facing APIs competed for compute and thread pools on the same bare-metal host clusters. 

Under the AWS Migration Acceleration Program (MAP) Assess phase, the objective was to break this monolithic dependency chain and design an elastic, highly available target architecture on AWS.

### Implementation notes

- **On-Premise to AWS Service Mapping Matrix:** Evaluated every functional tier of the legacy architecture and established direct cloud-native mappings:
  - *Legacy MQTT Broker Servers* ➔ **AWS IoT Core** (managed TLS termination, device shadow state, automated horizontal scaling).
  - *Monolithic Ingestion & Worker Daemons* ➔ **Amazon EKS on AWS Graviton3** (containerized microservices, horizontal pod autoscaling, ARM64 cost efficiency).
  - *Raw Telemetry Buffer* ➔ **Amazon Kinesis Data Streams** (sharded, real-time event streaming buffer absorbing traffic surges).
  - *Self-Hosted Relational Database* ➔ **Amazon Aurora PostgreSQL Multi-AZ** (managed backups, storage auto-scaling, read replica offloading).
  - *Device Metric Time-Series* ➔ **Amazon DynamoDB** (single-digit millisecond latency at scale for device state snapshots).
- **Multi-region disaster recovery roadmap:** Engineered a primary deployment in `us-east-1` paired with a pilot light recovery posture in `us-west-2`, leveraging Aurora global replication and Route 53 latency-based routing.
- **Ballpark infrastructure estimation:** Built multi-scenario financial projections accounting for anticipated hardware device manufacturing growth over 12, 24, and 36 months, establishing exact compute, data ingress/egress, and storage budget guardrails.

## Architecture · Decoupled telemetry ingestion and processing

```text
[ Connected IoT Hardware Units ]
             │ (Mutual TLS / MQTT)
             ▼
      [ AWS IoT Core ]
             │ (IoT Rule Action)
             ▼
[ Amazon Kinesis Data Streams ]
             │
     ┌───────┴────────────────────────┐
     ▼                                ▼
[ EKS Microservices ]         [ S3 Data Lake ]
(Stream Processing / Alerts)  (Raw Telemetry Parquet)
     │                                │
     ▼                                ▼
[ Aurora / DynamoDB ]         [ Amazon Athena / QuickSight ]
(Operational State)           (Long-Term Fleet Analytics)
```

By decoupling the ingestion gateway (AWS IoT Core) from stream processing (Kinesis) and persistent state (Aurora/DynamoDB), the target architecture was designed so that a spike in connected device events would not degrade web portal response times or cause dropped telemetry packets.

## Outcome · The MAP Assessment final report and mobilize roadmap

The engagement concluded with the delivery of the **Target AWS Architecture Blueprint**, the **Service Mapping Matrix**, and the executive **MAP Assessment Final Report**. These architectural deliverables established clear workload migration sequences, verified security and HIPAA/SOC2 compliance baselines, and established technical governance for the subsequent MAP Mobilize and Migration waves.
