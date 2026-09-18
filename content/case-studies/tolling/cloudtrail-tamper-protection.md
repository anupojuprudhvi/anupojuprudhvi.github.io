---
title: Make organization CloudTrail evidence difficult to alter
nav: Protect CloudTrail evidence
label: Security architecture
heading: How centralized audit logs remain trustworthy after an account compromise
project: tolling
layer: Foundation
order: 60
stack: [AWS CloudTrail, AWS Organizations, Amazon S3, AWS KMS, S3 Object Lock, Amazon SNS]
tags: [security, cloudtrail, audit, compliance, s3, multi-account, governance]
summary: Centralizing CloudTrail events in a separately governed archive account, with encryption, a restrictive bucket policy, retention controls, and change alerting.
problem: |
  Account-local audit logs are a weak source of evidence if an operator or
  workload identity in that account is compromised. A malicious change could
  stop logging, alter the destination, or delete recent objects before an
  investigation begins. The useful control is therefore not merely enabling a
  trail; it is separating trail administration, log storage, encryption, and
  detection responsibilities.
solution: |
  An organization trail records management events across member accounts and
  delivers them to a dedicated archive account. The destination S3 bucket blocks
  public access, requires the CloudTrail service condition in its bucket policy,
  uses a KMS key for encryption, and applies retention protection appropriate to
  the evidence policy. A security account monitors CloudTrail and CloudTrail
  configuration events, including attempts to stop logging, change the trail, or
  modify the archive boundary.
flowLabel: Audit event and protection path
flow:
  - step: Organization account activity
    note: Management events from the organization are collected by the organization trail rather than relying on each workload account to configure its own destination.
  - step: CloudTrail delivery
    note: CloudTrail validates and delivers the event files to the centrally governed archive bucket.
  - step: KMS encryption and retention
    note: The archive uses a controlled KMS key and retention controls so ordinary account administrators cannot quietly rewrite or remove evidence.
  - step: Security monitoring
    note: Configuration changes and suspicious trail activity are routed to the security monitoring path for investigation.
enables: |
  An investigation can use a central audit source that is outside the normal
  workload-account administration boundary, while authorized retention changes
  remain deliberate, logged, and reviewable.
outcomes:
  - value: One
    label: Organization-wide trail and separately governed archive destination
  - value: Two
    label: Independent controls for evidence protection and change detection
  - value: Zero
    label: Public access paths intentionally permitted for the audit bucket
---

## Architecture · The decisions that mattered

The design separates collection from custody. The management account or delegated
security owner controls the organization trail, while the archive account owns the
bucket and key used to retain the evidence. This does not make deletion
mathematically impossible, but it removes the ordinary workload-account path and
creates an auditable administrative boundary for exceptional retention operations.

### Implementation notes

- **Restrict the bucket policy:** Allow CloudTrail delivery only through the
  expected service conditions and organization context. Deny public access and
  require encrypted delivery.
- **Protect the key:** KMS key policy ownership is separate from workload roles;
  key use and administrative actions are logged and reviewed.
- **Watch the controls themselves:** Alerts cover `StopLogging`, trail deletion or
  modification, destination changes, bucket-policy changes, KMS-key changes, and
  unusual access to the archive.

## Security · Tamper resistance has limits

S3 Object Lock or an equivalent retention control can protect objects from ordinary
deletion or overwrite during the retention period, but it does not remove the need
to protect the root and organization administration paths. Break-glass access is
kept separate, strongly authenticated, time-bound where possible, and reviewed
after use. The architecture documents these limits instead of promising absolute
immutability.

## Delivery · How the change is rolled out

Create and validate the archive bucket and KMS policy first, then enable the
organization trail and confirm delivery from representative member accounts. Test
the alert path with controlled configuration changes, verify that unauthorized
principals cannot write or delete archive objects, and record the retention and
break-glass procedure. Rollout is complete only when both event delivery and
detection of control-plane changes are evidenced.

## Trade-offs · What this does not solve

- CloudTrail is not a packet capture or an application audit log; important data
  events and application events require separate decisions.
- Retention protection can complicate legal deletion, cost management, and
  incident cleanup, so the policy needs an accountable owner.
- Alerts are not prevention. The security team still needs triage, escalation,
  and recovery procedures.

## Outcome · What changed

Audit evidence is collected centrally, encrypted, stored outside ordinary workload
administration, and paired with detection for changes to the logging controls. The
published outcome is a stronger evidence boundary and a testable response path;
it does not claim a measured reduction in compromise or investigation time.

## Next · Improvements worth funding

Run a controlled tamper-resistance exercise covering trail changes, bucket-policy
changes, key administration, and break-glass access. Capture alert latency,
investigator visibility, and the exact permissions needed to recover the logging
plane before setting service-level targets.