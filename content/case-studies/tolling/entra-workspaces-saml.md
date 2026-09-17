---
title: Corporate SSO for Amazon WorkSpaces without losing the domain boundary
nav: Federate WorkSpaces with Entra
label: Identity integration
heading: How a corporate identity becomes a usable WorkSpaces session
project: tolling
layer: Shared Services
order: 70
stack: [Microsoft Entra ID, SAML 2.0, AWS IAM, Amazon WorkSpaces, AD Connector, Terraform]
tags: [identity, sso, saml, workspaces, entra, active-directory, terraform]
summary: Separating Entra authentication from Active Directory machine operations so Personal and Pool WorkSpaces can use corporate sign-in without weakening the domain boundary.
problem: |
  Employees needed to open Amazon WorkSpaces with the same corporate identity they
  already use for other applications. A separate WorkSpaces login would create a
  second identity lifecycle, while an undocumented SAML setup would turn small
  differences in NameID, role claims, or directory usernames into failures that
  looked like generic sign-in problems.

  The harder requirement was the boundary behind the login screen. Entra ID should
  authenticate the person, AWS should validate the federation trust and authorize
  desktop streaming, and Active Directory should continue to own domain membership,
  user lookup, Windows policy, and machine identity. The credentials used for those
  directory operations are not the user's SAML credentials.
solution: |
  The solution separates the integration into two connected planes. In the user
  plane, Entra ID authenticates the employee and emits a SAML assertion. AWS IAM
  trusts the Entra SAML provider through a dedicated federation role, and that role
  grants only `workspaces:Stream` for the target directory. WorkSpaces uses the
  assertion's `NameID` to find the matching Active Directory user, then starts an
  assigned Personal desktop or allocates an eligible Pools session.

  In the machine plane, the WorkSpaces VPC reaches the corporate DNS and domain
  controllers through the approved network path. AD Connector uses a separately
  managed service account, protected by Secrets Manager and KMS, for directory
  operations and computer-object/domain-join work. The joined desktop receives the
  configured OU and GPO behavior, with optional access to corporate file services
  such as FSx.

  Terraform manages the repeatable AWS boundary: the directory, connector,
  federation role, scoped streaming policy, secret integration, and conditional SAML
  resources. Entra metadata and claims, Active Directory user attributes, and
  Personal/Pool provisioning remain explicit operational inputs rather than hidden
  assumptions in the infrastructure code.
outcomes:
  - value: Two
    label: Independent planes: user authentication and machine/domain integration
  - value: One
    label: Corporate identity contract from Entra NameID to the AD user UPN
  - value: Zero
    label: Assumption that SAML alone provisions users, desktops, or domain joins
flowLabel: Request path, corporate login to desktop session
flow:
  - step: WorkSpaces client
    note: The employee starts a Personal desktop or requests a Pools session. The client sends the user to the configured federation endpoint rather than asking for a separate WorkSpaces password.
  - step: Microsoft Entra ID
    note: Entra applies its assignment, MFA, and conditional-access controls, then emits a SAML assertion. The NameID must be the user's Active Directory UPN, and the role claim must contain the expected AWS role/provider pair.
  - step: AWS IAM federation role
    note: AWS validates the SAML provider and assumes the dedicated federation role. Its permissions are limited to `workspaces:Stream` for the intended WorkSpaces directory, not general console administration.
  - step: Amazon WorkSpaces directory
    note: WorkSpaces uses the federated identity to locate the corresponding AD user. A Personal WorkSpace must already be assigned; a Pool user must already be eligible for session allocation.
  - step: AD Connector and domain
    note: Separately from the login assertion, AD Connector uses the protected service account for directory operations and machine enrollment. The VPC must provide DNS and routed access to the domain controllers.
  - step: Joined desktop session
    note: The desktop starts with the domain membership, OU/GPO behavior, Kerberos context, and optional corporate file access that the machine plane provides. SAML authenticates the person; it does not perform this join.
enables: |
  Corporate users can open assigned Personal WorkSpaces or eligible Pool sessions
  with the identity controls they already use, while machine enrollment, Active
  Directory policy, and provisioning remain explicit, testable responsibilities.
---

## Why this way · SAML is the front door, not the whole building

The tempting design is to describe this as “Entra logs users into WorkSpaces.” That
description is incomplete enough to cause operational failures. A SAML assertion can
be valid while the desktop still cannot be found, allocated, or started.

**Authentication and machine identity are different jobs.** Entra proves who the
person is and whether they may use the enterprise application. AD Connector and the
domain service account establish the identity of the Windows machine. One must not be
substituted for the other: an Entra assertion is not an AD bind credential, and an AD
service account is not a user-facing SAML identity.

**The federation role is deliberately narrow.** Its trust policy accepts the Entra
SAML provider for `sts:AssumeRoleWithSAML` and session tagging. Its permissions policy
grants `workspaces:Stream` against the intended directory rather than broad AWS
permissions. A user can therefore open a desktop without receiving an unrelated AWS
console role.

**Provisioning is intentionally outside the login transaction.** Personal
WorkSpaces require an assigned desktop. Pools require an available and eligible
session. Creating an Entra assignment or enabling SAML does not create the AD user,
provision a Personal WorkSpace, prepare a Pool, or join a machine to the domain.

## What makes it hold up

**The identity contract is exact.** The Entra `NameID` must match the Active Directory
user's UPN exactly. The legacy `sAMAccountName` is not the SAML mapping key and does
not need to be changed to fix a UPN mismatch. The role claim must also preserve the
AWS-expected role ARN and SAML provider ARN format, including their ordering.

**The network path is part of authentication.** A user may complete Entra sign-in
successfully and still fail at the WorkSpaces layer if the VPC cannot resolve the
domain or reach its controllers. DNS forwarding, Transit Gateway or equivalent
routing, security rules, and the required directory protocols must work before a
SAML-only diagnosis is meaningful.

**Secrets are separated from federation.** The AD service account is stored in
Secrets Manager and protected with KMS. It supports connector and domain-join
operations; it is not embedded in the SAML assertion, Terraform output, or client
workflow. This keeps machine enrollment credentials out of the user authentication
path and makes their rotation an independent operational task.

**The failure stages remain distinguishable.** A federation failure points toward
Entra assignment, claims, provider metadata, role trust, or AWS authorization. A
successful SAML exchange followed by `ERROR_TYPE_ALLOCATE_RESOURCE` points later in
the path: AD UPN mapping, Personal assignment, Pool eligibility/capacity, directory
health, or desktop allocation. Treating every failure as “SAML is broken” hides the
actual boundary that rejected the request.

**The model works for both delivery modes.** Personal WorkSpaces make the assignment
check explicit: the user must have a desktop associated with the directory. Pools
make allocation explicit: the user must be eligible and the pool must have a usable
session. The same identity contract supports both without implying that login itself
creates capacity.

## Implementation notes

- **Entra owns the user lifecycle:** users, groups, enterprise-application assignment, MFA, and conditional access remain in Entra rather than being duplicated in Terraform.
- **The role claim is an interface contract:** emit the AWS role ARN and SAML provider ARN in the exact comma-separated form AWS consumes, with no accidental whitespace or reversed ordering.
- **NameID is the first mapping check:** compare the assertion value with the complete AD UPN, including the domain suffix. Do not begin by changing `sAMAccountName`.
- **AD credentials are independent:** the connector service account remains required for directory operations and computer-object/domain-join work. Keep it in Secrets Manager with KMS protection and never publish its value.
- **Network reachability comes first:** verify VPC DNS forwarding, TGW or equivalent routes, security controls, and AD Connector health before changing SAML claims.
- **Metadata rotation is planned:** Entra federation metadata and signing-certificate changes are reviewed and applied as intentional AWS SAML provider changes.
- **SAML enablement is conditional:** the base WorkSpaces directory can be created before federation inputs are available; missing metadata should not produce a partially configured trust relationship.
- **Troubleshooting follows the path:** check AD Connector and domain join, then Entra assignment and claims, AWS provider/trust and `workspaces:Stream`, and finally AD UPN mapping plus Personal assignment or Pool eligibility.