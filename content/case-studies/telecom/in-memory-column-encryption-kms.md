---
title: Moving legacy telecom key management to AWS KMS
nav: Key-management migration
label: Security modernization
project: telecom
layer: Security
order: 30
stack: [AWS KMS, C, Linux shared memory, systemd, PostgreSQL]
tags: [security, encryption, kms, legacy-modernization, key-management]
summary: Adapting an existing local encryption service to AWS KMS while preserving its application integration and making the key-handling boundaries explicit.
scaffold: false
problem: The platform's field-encryption service depended on a legacy key provider, coupling database modernization to a separate security integration.
solution: Change the key-unwrapping provider while preserving the caller contract, and validate compatibility with existing encrypted data.
---

## Problem · Replacing the key provider without replacing every caller

The platform already encrypted sensitive subscriber data through a local C-based service. That service depended on an on-premises key provider. Moving the database and applications into AWS also required a workable key-management integration, but changing every application's encryption interface would have widened the migration considerably.

## Solution · Isolate the provider change

The key-unwrapping integration was adapted to AWS KMS while retaining the existing local service and application-facing contract. This was a targeted change to the provider integration, not a claim that no code changed or that the existing cryptographic design had been independently certified.

## Architecture · Distinguish the wrapping key from the data key

The design uses a local service to make data-encryption keys available to authorized application processes. KMS protects the wrapped key material and authorizes unwrapping. The plaintext data key returned to the host must then be protected by that host and its processes; it is distinct from the KMS key itself. This is the boundary described by [AWS envelope encryption](https://docs.aws.amazon.com/kms/latest/developerguide/kms-cryptography.html).

Keeping a local integration avoids a KMS request for each field operation, but extends the responsibility for plaintext key lifetime and access to the application environment.

### Implementation notes

- **Provider integration:** The key-unwrapping routine was adapted to call KMS. Existing key identifiers and caller interfaces were retained as part of compatibility work.
- **Local key access:** The service used Linux shared memory for local access. File permissions and service identity are part of this boundary; shared memory is not, by itself, a guarantee that keys cannot be exposed.
- **Compatibility checks:** Validation covered the service's ability to obtain usable key material and work with the existing data path. The exact ciphertext format, IV generation, integrity protection, and query-matching behavior require a separate implementation review.

## Security · Key lifecycle remains part of the application design

Permissions to unwrap keys should be limited to the required workload roles, with access logging and a documented response to loss of KMS access. Host access, process privileges, memory dumps, swap behavior, and key cleanup affect the plaintext-key boundary.

Database encryption at rest and application field encryption address different access paths. Neither this provider migration nor a plaintext-pattern scan establishes regulatory compliance or an audit outcome.

## Delivery · Validate old and new data paths before cutover

The migration used staging validation around the updated daemon and wrapped key material. Checks included reading existing data and exercising the new provider path. Scanning database exports can help detect obvious plaintext exposure, but it does not prove cryptographic correctness, authorization boundaries, or complete protection of sensitive fields.

## Trade-offs · Compatibility preserves both behavior and constraints

Retaining the local crypto interface reduced the scope of caller changes. It also retained responsibility for key caching, rotation, historical-data access, and the application's encrypted-query design. This case study deliberately does not present an unverified cipher mode or equality-search construction as a recommended design.

## Outcome · A narrower migration boundary

The key provider was modernized through a focused integration change while preserving the application's local service contract. The meaningful outcome is that separation of responsibilities; no latency benchmark, blanket compliance claim, or assertion that the database can never access plaintext keys is made here.

## Next steps · Complete the cryptographic design review

Document the actual cipher and integrity mechanism, IV construction, query path, key owners, cache lifetime, and rotation/revocation behavior. Validate restart and provider-outage behavior, then retain the test evidence before publishing stronger security or performance claims.
