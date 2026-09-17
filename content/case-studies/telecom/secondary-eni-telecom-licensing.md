---
title: Preserving hardware-locked telecom licenses in ephemeral cloud infrastructure
nav: Preserve node-locked licenses via ENI
label: Network architecture
heading: Decoupling licensed identity from virtual machines using secondary ENIs
project: telecom
layer: Foundation
order: 30
stack: [AWS Elastic Network Interface, Amazon EC2, AWS Systems Manager, Terraform, Linux Policy Routing]
tags: [networking, eni, licensing, mac-pinning, telecom, ec2, terraform]
summary: Preserving node-locked PBX telephony licenses across cloud failovers and node rebuilds by pinning MAC addresses to persistent secondary ENIs with dynamic index attachment.
problem: |
  Proprietary telecom telephony software, voice switches, and PBX daemons enforced node-locked licenses cryptographically tied to the server's physical MAC address and static private IP address. In standard AWS environments, when an EC2 instance is replaced, rebooted across hosts, or autoscaled, AWS provisions a new virtual network adapter with a randomized MAC address. This randomized hardware change immediately invalidated the vendor software license on instance launch, halting call processing and requiring manual vendor re-licensing tickets that took hours to resolve.
solution: |
  I designed a decoupled dual-network interface architecture implemented in Terraform and automated via shell tooling. The primary interface (`eth0`) remains ephemeral for management, SSH, and CloudWatch metrics, while the licensed telecom identity is housed on an independent, persistent Elastic Network Interface (`eth1`). The secondary ENI carries the registered vendor MAC address and static IP. When an instance fails or is replaced, automation scripts detach the secondary ENI and reattach it to the replacement node, preserving the exact hardware identity without triggering license invalidation.
flowLabel: Secondary ENI attachment and license preservation flow
flow:
  - step: Standalone ENI provisioning
    note: Terraform provisions persistent secondary ENIs with explicit static private IPs and vendor-registered MAC addresses, decoupled from EC2 instance lifecycles.
  - step: Ephemeral instance spin-up
    note: Replacement or standby EC2 node launches with standard primary network interface (eth0) for base OS provisioning and SSM connectivity.
  - step: Dynamic device index attachment
    note: An automated network attachment script queries EC2 metadata, determines the next available device index (CURRENT_MAX_INDEX + 1), and attaches the secondary ENI.
  - step: Linux policy routing & license binding
    note: SSM executes network initialization on the host (ifup eth1), binds telecom voice daemons to eth1, and validates license authorization in the vendor configuration.
enables: |
  The telecommunications platform can freely replace, patch, and fail over compute instances in the cloud without voiding vendor licenses or incurring expensive re-licensing fees.
outcomes:
  - value: 100%
    label: License compliance preserved across all cloud failovers and node replacements
  - value: 0
    label: Vendor re-licensing fees or support tickets incurred during cloud operations
  - value: < 8s
    label: Automated secondary ENI attachment and interface configuration time
---

## Architecture · The decisions that mattered

The critical design decision was to decouple licensed hardware identity from the compute virtualization lifecycle. Virtual machines in the cloud should be treated as disposable resources, but commercial telecom software often presumes bare-metal permanence. By isolating the identity layer onto a distinct network construct, the platform treats the server as an ephemeral execution engine while keeping the network identity durable.

### Implementation notes

- **Dual-interface network separation:** EC2 compute nodes split networking into two discrete interfaces:
  - `eth0` (DeviceIndex 0): Ephemeral, subnet-assigned DHCP interface used for operating system administration, Systems Manager Agent communication, package updates, and internal monitoring.
  - `eth1` (DeviceIndex 1 or 2): Managed as an independent `aws_network_interface` Terraform resource. It retains a static private IP and fixed MAC address registered in the vendor's licensing portal.
- **Dynamic index calculation tool:** Attaching secondary interfaces via automation can fail if hardcoded device indexes collide with existing attachments. The project implemented a dynamic attachment script that queries the instance metadata:
  ```bash
  CURRENT_MAX_INDEX=$(aws ec2 describe-instances \
      --instance-ids "$INSTANCE_ID" --region "$REGION" \
      --query "Reservations[0].Instances[0].NetworkInterfaces[*].Attachment.DeviceIndex" \
      --output text | sort -nr | head -n1)
  DEVICE_INDEX=$((CURRENT_MAX_INDEX + 1))
  ```
  The script calculates the next valid index, attaches the ENI, and logs execution to a local audit log.
- **Policy routing configuration:** When multiple interfaces attach to a single Linux instance, default gateway conflicts can cause asymmetric routing or packet drops. The post-configuration automation creates explicit route tables and ip-rules (`/etc/sysconfig/network-scripts/route-eth1`), directing inbound and outbound telecom traffic strictly through the licensed interface.

### Security controls

- **Dedicated security groups per interface:** Management traffic on `eth0` is restricted to administrative bastion jump hosts and Systems Manager endpoints, while `eth1` only permits SIP, RTP, and database ports from approved application subnets.
- **IAM least privilege for ENI attachments:** Automation execution roles are scoped strictly to the `ec2:AttachNetworkInterface`, `ec2:DetachNetworkInterface`, and `ec2:DescribeNetworkInterfaces` actions on specific interface ARNs.
- **Source/destination check enforcement:** Secondary interfaces retain strict source/dest checking enabled, preventing unauthorized packet forwarding across VPC subnets.

## Delivery · How the change is rolled out

The dual-ENI approach was codified into the compute and network Terraform modules. During environment rollouts, secondary ENIs are provisioned before compute instances. User-data scripts invoke the attachment utility during first boot to attach the interface.

Validation is automated via the post-configuration suite, which reads the vendor license file, verifies that the MAC address on `eth1` matches the license signature, and verifies that voice daemons start cleanly.

## Trade-offs · What this does not solve

Secondary ENIs are constrained to the specific Availability Zone in which their parent subnet was created; an ENI cannot be moved across AZ boundaries. Consequently, warm standby instances must reside in the same Availability Zone as the primary to preserve MAC address continuity, or cross-AZ DR must rely on secondary standby ENIs pre-registered in the disaster recovery zone.
