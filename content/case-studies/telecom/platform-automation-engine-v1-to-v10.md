---
title: Making telecom node provisioning repeatable
nav: Repeatable platform delivery
label: Platform engineering
project: telecom
layer: Platform
order: 40
stack: [Bash, AWS Systems Manager, systemd, Linux, Postfix]
tags: [automation, provisioning, configuration, service-discovery, deployment]
summary: Turning manual host configuration and recurring migration defects into a provisioning workflow with explicit config, service reconciliation, and smoke tests.
scaffold: false
problem: Manual configuration across application and persistent service nodes produced drift and repeated environment acceptance failures.
solution: Automate host setup and incorporate the routing and service-discovery checks learned from migration troubleshooting.
---

## Problem · Infrastructure could be ready while the application was not

A provisioned instance still needed storage mounts, database settings, service registration, web configuration, and mail routing. Manual commands across environments left subtle differences that were difficult to distinguish from application defects.

Two acceptance failures made this concrete: administrative API calls timed out against obsolete endpoints, and mobile onboarding reported an organization error after authentication had actually succeeded.

## Solution · Make application readiness part of provisioning

A centralized configuration workflow read environment-specific inputs and applied the required host settings. It covered shared storage, database pool configuration, service setup, web and mail settings, and registry reconciliation. As defects were diagnosed, their validation checks were incorporated directly into automated provisioning and environment handoff.

## Architecture · Separate shared steps from node responsibilities

Application nodes and persistent service nodes had different configuration needs. The workflow selected steps for the node role while using a shared approach to input validation, backups, permissions, and logging. Systems Manager or instance bootstrapping provided the execution path.

### Implementation notes

- **Safe changes and reruns:** Configuration edits were backed up and handled through focused operations. Rerun safety must be checked per operation, particularly registrations, appended files, database seed records, and actions that restart services; a shell flag does not establish idempotency.
- **Endpoint reconciliation:** API calls stalled because service configuration still referred to legacy hosts, alongside missing pool routing. Locator updates and pool configuration were brought into the deployment workflow rather than left as manual post-cutover corrections.
- **Discovery validation:** Mobile onboarding authenticated successfully but then failed to find the required service mapping. Missing fallback records led to a misleading organization error. Provisioning checks were extended to include service discovery, rather than treating successful authentication as proof that onboarding was complete.
- **Readiness checks:** Storage access, pool mappings, service endpoints, and registration state were checked before handing an environment over. These checks connected host configuration to actual application behavior.

## Security · Keep configuration automation accountable

Credential inputs were kept outside the scripts and protected through restricted access. Configuration files needed appropriate ownership and permissions, and logs needed to avoid exposing secrets. Reconciliation of service mappings must also respect tenant and regional boundaries; a fallback that makes one test pass is not automatically the correct mapping for every subscriber.

## Delivery · Feed diagnosed defects back into the workflow

The automation was packaged for host provisioning and run through Systems Manager or bootstrapping. The API and onboarding fixes were incorporated into endpoint updates, seed-data checks, and smoke tests so the same omissions could be detected before acceptance testing.

## Trade-offs · A provisioning script is not continuous drift management

This workflow reduced repeated manual setup, but did not continuously enforce state after an operator changed a host. Safe reruns, explicit error handling, and post-run validation remained necessary. Backup files also need a tested restore procedure to be useful for rollback.

## Outcome · Troubleshooting became a repeatable delivery control

The contribution was a common provisioning path and better readiness checks across environments. Script-version counts are development history rather than an outcome. A provisioning-time reduction or first-pass success rate should be published only with the node scope, number of runs, and timing boundaries recorded.

## Next steps · Test reruns and interrupted provisioning

Build a role-by-environment test matrix covering a clean node, an already configured node, an interrupted run, and a dependency outage. Include rollback, secret-redaction checks, and tenant-specific service discovery before using successful completion as a release gate.
