---
title: Automating telecom failover while preserving licensed identity
nav: Failover and licensing continuity
label: High availability
project: telecom
layer: Resilience
order: 20
stack: [AWS Lambda, DynamoDB, CloudWatch, Systems Manager, EC2, Elastic Network Interfaces]
tags: [failover, licensing, eni, recovery, orchestration]
summary: Bringing recovery orchestration, service validation, and hardware-bound licensing into one failover workflow, with an explicit same-AZ boundary.
scaffold: false
scripts: [failover-diagram.js]
closingText: Want to drill into the failure modes? I'm happy to walk through the recovery runbook, DynamoDB lease coordination limits, or how we validated automated failover times.
problem: Manual recovery and licenses tied to network identity made instance replacement a service-level problem rather than a simple infrastructure action.
solution: Coordinate recovery through an external orchestrator and retain licensed identity on a persistent secondary network interface.
---

## Problem · A replacement host was not enough to restore service

Legacy recovery depended on hardware-oriented fencing and operator intervention. The telecom software also used a node-locked license tied to a MAC address and private IP. A newly provisioned host could therefore be healthy while its call-processing software remained unable to start with the expected licensed identity.

## Solution · Treat recovery and licensing as the same workflow

A serverless Lambda recovery workflow was engineered to trigger from CloudWatch alarms. DynamoDB conditional writes coordinated orchestration attempts, while Systems Manager handled host-side network and service operations. A persistent secondary Elastic Network Interface (ENI) carried the identity registered with the software vendor.

The ENI approach preserved identity when that interface moved to a replacement host; it did not require assigning a custom MAC address or imply that ordinary instance reboots change interface identity.

## Architecture · Separate orchestration from the hosts being recovered

The orchestrator ran outside the two service nodes. Its responsibilities included acquiring a lease, moving the designated interface, requesting service changes, checking readiness and ownership, and handling the degraded host. These are distinct controls: a coordination lock does not itself fence a node or prove that only one node can accept writes.

<div class="hubwrap">
            <div class="diagram-top">
              <h3 style="font-size: 15.5px">
                Walk through an automated failover
              </h3>
              <button id="failoverPlayBtn">▶ Play failover sequence</button>
            </div>
            <div
              class="diagram-scroll"
              role="region"
              aria-label="Architecture diagram"
              tabindex="0"
            >
              <svg
                role="img"
                aria-label="Architecture flow diagram; the following walkthrough explains the sequence"
                class="hub-svg"
                viewBox="0 0 720 190"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path class="hub-line" id="fl-0" d="M100,95 L215,95" />
                <path class="hub-line" id="fl-1" d="M255,95 L370,95" />
                <path class="hub-line" id="fl-2" d="M410,95 L525,95" />
                <path class="hub-line" id="fl-3" d="M565,95 L680,95" />
                <circle
                  class="hub-pulse"
                  id="failoverPulse"
                  r="6"
                  cx="100"
                  cy="95"
                />

                <g class="hub-node" id="fn-0">
                  <rect x="20" y="65" width="160" height="60" rx="10" />
                  <text x="100" y="90" text-anchor="middle" font-weight="600">
                    Alarm fires
                  </text>
                  <text x="100" y="106" text-anchor="middle" opacity=".7">
                    Heartbeat lost
                  </text>
                </g>
                <g class="hub-node center" id="fn-1">
                  <rect x="175" y="65" width="160" height="60" rx="10" />
                  <text x="255" y="86" text-anchor="middle" font-weight="600">
                    Acquire lock
                  </text>
                  <text x="255" y="102" text-anchor="middle" opacity=".75">
                    DynamoDB lease
                  </text>
                </g>
                <g class="hub-node" id="fn-2">
                  <rect x="330" y="65" width="160" height="60" rx="10" />
                  <text x="410" y="86" text-anchor="middle" font-weight="600">
                    Move VIP interface
                  </text>
                  <text x="410" y="102" text-anchor="middle" opacity=".7">
                    License-pinned ENI
                  </text>
                </g>
                <g class="hub-node" id="fn-3">
                  <rect x="485" y="65" width="160" height="60" rx="10" />
                  <text x="565" y="86" text-anchor="middle" font-weight="600">
                    Promote &amp; validate
                  </text>
                  <text x="565" y="102" text-anchor="middle" opacity=".7">
                    Health checks pass
                  </text>
                </g>
                <g class="hub-node danger" id="fn-4">
                  <rect x="640" y="65" width="60" height="60" rx="10" />
                  <text
                    x="670"
                    y="86"
                    text-anchor="middle"
                    font-weight="600"
                    font-size="10"
                  >
                    Fence
                  </text>
                  <text
                    x="670"
                    y="100"
                    text-anchor="middle"
                    opacity=".7"
                    font-size="9.5"
                  >
                    old node
                  </text>
                </g>
              </svg>
            </div>
            <div class="hub-caption" id="failoverCaption" aria-live="polite">
              Click <b>Play failover sequence</b> to step through the documented recovery components.
            </div>
          </div>

The walkthrough illustrates the documented components. A safe recovery procedure must establish what prevents the previous owner from serving traffic or writing during promotion, including when an API call fails or a lease expires. The diagram is not proof of those guarantees.

### Implementation notes

- **Persistent licensed interface:** Terraform managed the secondary ENI independently from the instance. Its existing MAC address and private IP were registered for the vendor license. The management interface remained separate from the service identity.
- **Attachment and routing:** Automation selected an available attachment index, configured host-side networking, and checked service binding. Multiple interfaces required explicit routing so replies used the intended path.
- **Recovery checks:** Systems Manager commands brought up host dependencies and restarted relevant services. Readiness probes and final interface-ownership checks supplied evidence that infrastructure changes had reached the application layer.
- **Lease handling:** Conditional acquisition limited competing orchestration attempts. Lease expiry, delayed commands, retries, and ownership-checked release are failure cases that need explicit validation; a time-to-live field alone is not a recovery safety argument.

## Security · Constrain the recovery mechanism

Recovery permissions should be scoped to the managed instances, interface, command documents, and lock resources where the AWS actions support resource-level restrictions. Command execution and orchestration logs provide an audit trail. The licensed interface still needs the appropriate service security groups and host permissions.

## Delivery · Exercise more than a clean instance stop

The source implementation describes staging exercises covering service failures, interface disruption, resource pressure, and stopped instances. Those exercises tested interface transfer and service recovery. Recorded timing should identify the failure mode, detection delay, start/end events, and retry behavior before being used as an availability commitment.

## Trade-offs · Same-AZ recovery is not regional disaster recovery

An ENI can attach only to an instance in the same Availability Zone. This workflow therefore cannot carry the same interface across an AZ or regional failure. Recovery elsewhere requires a separate network identity and a vendor-approved licensing approach. See the [AWS interface attachment constraints](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/network-interface-attachments.html).

Existing connections may drop during recovery and need client retry behavior. This design coordinates host-level recovery; it does not replace Aurora recovery or a complete regional failover plan.

## Outcome · Recovery included the application's licensed identity

The work combined host recovery with interface movement and application checks, addressing a dependency that a generic instance replacement would miss. The portfolio does not claim zero split-brain risk or a universal sub-minute recovery time; those depend on failure conditions and retained test evidence.

## Next steps · Document failure boundaries and recovery evidence

Capture lease-expiry tests, partially completed interface moves, unavailable Systems Manager agents, and failed fencing calls. Verify the promotion/fencing sequence and record the recovery timeline for each scenario, including the point at which clients can successfully use the service.
