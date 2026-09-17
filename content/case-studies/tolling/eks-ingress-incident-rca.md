---
title: Turn an EKS ingress incident into a diagnosable traffic path
nav: Trace an EKS ingress incident
label: Incident response
heading: How the ingress path was narrowed from edge request to pod
project: tolling
layer: Applications
order: 40
stack: [Amazon EKS, AWS Load Balancer Controller, Application Load Balancer, Route 53, CloudWatch]
tags: [eks, kubernetes, ingress, incident-response, observability, networking]
summary: A structured RCA pattern for an EKS ingress failure that separates DNS, load-balancer, target-registration, network-policy, and application causes instead of treating every 5xx as an application defect.
problem: |
  An ingress incident can look like a single outage to a user while several
  different boundaries sit between the request and a pod. DNS may resolve the
  wrong endpoint, the load balancer may have unhealthy targets, a security group
  or network policy may block the target path, or the application may return an
  error after the request arrives. Without a fixed evidence order, responders
  change multiple layers at once and lose the original signal.
solution: |
  The RCA uses the request path as its diagnostic spine. Start with the hostname
  and listener, confirm the Application Load Balancer target group and health
  state, correlate the AWS Load Balancer Controller events with the Kubernetes
  Ingress and Service, then test the node, pod, and application path from inside
  the cluster. CloudWatch and Kubernetes logs preserve the evidence while a
  reversible routing or deployment change is evaluated separately from the
  investigation.
flowLabel: Request path and evidence checkpoints
flow:
  - step: Route 53 name
    note: Confirm the queried name, record, alias target, and TTL are the endpoint intended for the environment.
  - step: Application Load Balancer listener
    note: Verify listener rules, certificate behavior, response codes, and the target group selected for the host and path.
  - step: Target registration and health
    note: Compare registered targets with the Kubernetes Service endpoints and inspect health-check reason codes.
  - step: Cluster network path
    note: Check security groups, subnet routes, network policy, and load-balancer-controller events for the selected targets.
  - step: Pod and application
    note: Reproduce from an in-cluster client and correlate container logs, readiness state, and application response behavior.
enables: |
  Responders can identify the failing boundary before changing the system, keep
  an auditable timeline of evidence, and convert the final correction into a
  health check, alert, runbook step, or deployment guard.
outcomes:
  - value: Five
    label: Evidence checkpoints from DNS through application response
  - value: One
    label: Repeatable incident timeline shared by platform and application teams
  - value: No invented
    label: Availability or incident-count claim without source evidence
closingText: I'm happy to talk through this incident diagnostic tree in depth — the evidence sequence, controller failure modes, or how we turned the post-mortem into automated alert guards.
---

## Architecture · The decisions that mattered

The design treats ingress as a chain of contracts rather than one Kubernetes
object. Route 53 must identify the right edge, the load balancer must select the
right listener and target group, the controller must reconcile the intended
objects, targets must pass health checks, and the pod must be ready to serve the
request. Each checkpoint produces evidence that narrows the RCA.

### Implementation notes

- **Start outside the cluster:** Capture the exact hostname, path, status code,
  response headers, and timestamp before investigating pods.
- **Compare desired and observed state:** Inspect the Ingress, Service,
  EndpointSlices, controller events, target registrations, and target health as a
  single chain.
- **Separate mitigation from cause:** A rollback, target drain, or temporary
  route change may restore service, but it is recorded separately from the
  evidence that identifies the fault.

## Security · Preserve evidence while restoring service

Incident access is scoped to the affected cluster and AWS resources. Logs and
events are read before changes where possible, sensitive headers and payloads are
redacted from incident notes, and emergency changes retain an owner, timestamp,
reason, and rollback condition. Network controls are investigated as boundaries,
not disabled as a first response.

## Delivery · How the change is rolled out

The runbook is tested in a non-production environment with intentionally unhealthy
targets, a mismatched Service selector, and a blocked network path. Each exercise
must show that responders can distinguish the resulting symptoms and restore the
known-good configuration. Production adoption should add the checkpoints to the
on-call workflow and alert links without changing application behavior merely to
make the dashboard look healthy.

## Trade-offs · What this does not solve

- A structured RCA reduces investigation ambiguity but cannot prevent every bad
  deployment or cloud-provider failure.
- Health checks prove a particular probe path, not every user journey.
- Centralized logs improve correlation but require retention, access control, and
  cost management.

## Outcome · What changed

Ingress troubleshooting now has a stable order of operations and a vocabulary
shared by DNS, platform, networking, and application responders. The documented
outcome is diagnostic repeatability; no uptime, recovery-time, or incident-volume
claim is made without measurements from the incident system.

## Next · Improvements worth funding

Instrument a synthetic request that records the same correlation identifier at the
edge, load balancer, controller, and application layers. Use a tabletop exercise
to measure investigation time and the number of handoffs before publishing those
metrics.