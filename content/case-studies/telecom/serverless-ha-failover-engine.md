---
title: Sub-minute automated VIP failover via a serverless recovery engine
nav: Sub-minute automated failover
label: High availability
heading: Replacing hardware STONITH scripts with a serverless Lambda orchestrator and DynamoDB locking
project: telecom
layer: Resilience
order: 20
stack: [AWS Lambda, Amazon DynamoDB, Amazon CloudWatch, AWS Systems Manager, Amazon EC2]
tags: [high-availability, failover, lambda, dynamodb, split-brain, stonith, ssm]
summary: Replacing fragile on-premise hardware STONITH scripts with an automated Python Lambda engine and DynamoDB distributed locking to recover virtual IP and services in under 60 seconds with zero split-brain risk.
problem: |
  High availability in the legacy on-premises datacenter relied on a short IPMI STONITH ("Shoot The Other Node In The Head") script and manual sysadmin triage. Transient network partitions frequently caused both cluster nodes to believe the partner had died, resulting in split-brain events where both hosts attempted to claim the Virtual IP and write data concurrently. When hard failures occurred, manual investigation and service recovery typically took 45+ minutes, violating telecom availability agreements and dropping customer calls.
solution: |
  I designed an automated serverless high-availability engine: a modular Python AWS Lambda function triggered by CloudWatch alarms on node heartbeat failures. The engine eliminates split-brain risk using an Amazon DynamoDB lock table with atomic conditional writes and 120-second expiring leases. When an unhealthy primary is detected, Lambda acquires the lock, detaches the Virtual IP secondary ENI, attaches it to the warm standby instance, invokes AWS Systems Manager (SSM) to bring up the interface and restart local daemons, fences the degraded node via the EC2 API, and performs final ownership validation before clearing alarms.
flowLabel: Automated 8-step serverless failover sequence
flow:
  - step: Alarm trigger & distributed lock
    note: CloudWatch detects node heartbeat failure; Lambda attempts an atomic conditional write in DynamoDB (attribute_not_exists or expired TTL) to prevent concurrent executions.
  - step: Virtual IP interface migration
    note: Detaches the secondary Virtual IP network interface from the degraded primary instance and re-attaches it to the warm standby host.
  - step: SSM network binding & daemon recovery
    note: Executes SSM Run Command on standby node to run ifup on the secondary interface, rebind local routing, and restart connection pools and telephony services.
  - step: Service verification & node fencing
    note: Validates loopback application sockets, calls ec2.stop_instances to hard-fence the dead primary, verifies VIP ownership, and resets CloudWatch alarm triggers.
enables: |
  The telecom platform recovers from hardware failures, operating system lockups, and process degradation automatically in under 45 seconds without manual intervention and without risking database split-brain.
outcomes:
  - value: < 45s
    label: Verified automated failover recovery time, beating the 60-second operational SLA
  - value: 0
    label: Split-brain incidents across all failure injection and chaos engineering drills
  - value: 100%
    label: Automated fencing coverage replacing fragile IPMI hardware power cycling
---

## Architecture · The decisions that mattered

The core architectural decision was to move the failover orchestrator outside the failure domain of the nodes it manages. In-cluster clustering frameworks (such as Pacemaker or Corosync) depend on cluster quorum and network heartbeats between participating hosts. In cloud environments, network blips between Availability Zones can partition in-cluster software, triggering false-positive STONITH power cuts.

### Implementation notes

- **External serverless locking:** Rather than running an in-VPC consensus cluster that could itself be degraded by network partitions, the failover engine uses a dedicated Amazon DynamoDB table. Lambda uses atomic conditional expressions (`attribute_not_exists(LockKey) OR ExpiresAt < :now`) with a 120-second lease time, guaranteeing that exactly one orchestrator invocation can hold the failover token.
- **8-step deterministic execution pipeline:** The Python Lambda script implements strict sequential steps with discrete error handling:
  1. Detaches the Virtual IP secondary ENI from the primary instance and attaches it to the standby.
  2. Dispatches SSM Run Command to run `ifup` and re-route the virtual interface on the standby host.
  3. Restarts local connection pools, call routing daemons, and background workers.
  4. Probes local ports to verify service readiness before accepting traffic.
  5. Invokes `ec2.stop_instances` on the degraded primary to prevent rogue writes.
  6. Configures the degraded node to recover in warm standby mode once rebooted.
  7. Toggles CloudWatch alarm actions to suppress alarm loops during transitions.
  8. Confirms that the target instance holds the active network interface before completing.
- **SSM priority tuning under chaos conditions:** High-load chaos testing uncovered an edge case where heavy disk I/O during instance boot delayed the systems manager agent daemon by up to 25 seconds. The solution elevated the process scheduling priority of the agent (`nice -n -10`) and implemented exponential backoff polling in Lambda, ensuring completion within 38 to 45 seconds.

### Security controls

- **Granular IAM execution role:** The Lambda execution role restricts permissions to the specific persistent instances, the designated VIP network interface ARN, and the specific DynamoDB lock table.
- **Strict command execution logging:** Every systems manager document invocation is logged with stdout/stderr capture to CloudWatch Logs, providing an auditable trace of all commands executed on persistent nodes during failover.
- **Strongly consistent reads:** DynamoDB lock lookups enforce `ConsistentRead = True` to prevent stale read windows from enabling split-brain execution.

## Delivery · How the change is rolled out

The failover engine was validated through automated chaos testing in staging before production cutover. Failure modes were induced intentionally: abruptly killing database daemons, unbinding network interfaces, triggering CPU saturation, and executing hard power stops via AWS CLI. CloudWatch alarm transitions were monitored to verify that the Lambda function executed within the 60-second window, successfully transferred the VIP, and fenced the failed host without human intervention.

## Trade-offs · What this does not solve

The failover engine orchestrates recovery between stateful database and application nodes within an active region. It does not replace cross-region disaster recovery, which is governed by Aurora Global Database storage replication and Transit Gateway peering. Additionally, during the 40-second cutover window, in-flight TCP connections to the failing instance drop and rely on client application retry logic to reconnect to the newly promoted VIP.
