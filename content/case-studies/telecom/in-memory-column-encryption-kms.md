---
title: In-memory column encryption and seamless AWS KMS modernization
nav: In-memory encryption with AWS KMS
label: Security & compliance
heading: Protecting 13 PII fields with shared-memory key caching and zero app rewrite
project: telecom
layer: Security
order: 40
stack: [AWS KMS, Linux Shared Memory, C Language, PostgreSQL, systemd, OpenSSL]
tags: [security, compliance, gdpr, soc2, encryption, kms, c-language]
summary: Protecting 13 sensitive PII fields with an in-memory Linux daemon and shared-memory key caching, replacing legacy on-premise key vaults with AWS KMS Decrypt with zero application rewrite.
problem: |
  European telecommunications data protection mandates (GDPR) and SOC2 Type II compliance required that thirteen sensitive subscriber fields (calling and called phone numbers, SMS bodies, MMS file locations, employee IDs, and email addresses) be encrypted end-to-end before reaching persistent storage. Storage-level encryption (AWS KMS on EBS or RDS) was legally insufficient because any database administrator account could inspect plaintext values. Furthermore, the legacy on-premises platform relied on a custom in-memory C daemon coupled to a legacy proprietary key vault; completely refactoring the encryption architecture across hundreds of application services would have delayed cloud migration by months.
solution: |
  I preserved the application-to-database crypto architecture while modernizing the key unwrapping provider to AWS KMS. A local Linux systemd daemon manages 256-bit symmetric Data Encryption Keys (DEKs) in protected shared memory (`/dev/shm`), allowing high-throughput microservices to encrypt and decrypt fields with sub-microsecond in-memory performance. In the C crypto service, the unwrapping logic was adapted to replace legacy provider unwrap calls with native AWS KMS `Decrypt` APIs. Data is stored in Aurora as AES-256-CBC deterministic ciphertext (`{key_index}${base64}`), and custom PostgreSQL functions enable transparent account matching in SQL queries.
flowLabel: In-memory key unwrap and encryption flow
flow:
  - step: Secure boot & KMS key unwrapping
    note: The in-memory daemon initializes, reads encrypted key envelopes from the database, and calls AWS KMS Decrypt to unwrap Data Encryption Keys into memory.
  - step: Shared memory DEK publication
    note: Plaintext DEKs are published to a restricted Linux shared memory segment (/dev/shm) with atomic version swapping, allowing lockless reads by local microservices.
  - step: Application-layer column encryption
    note: Applications encrypt the 13 PII fields using AES-256-CBC with unique 128-bit Initialization Vectors, formatting output as {key_index}${base64_ciphertext}.
  - step: SQL query & database persistence
    note: Encrypted ciphertext is written to Aurora; custom PostgreSQL match functions perform query evaluations directly on encrypted columns.
enables: |
  The telecom platform achieves 100% regulatory compliance for customer data protection and passes external SOC2 audits without adding network latency to real-time call and message processing.
outcomes:
  - value: 13
    label: Sensitive subscriber PII fields protected end-to-end with AES-256-CBC encryption
  - value: 0
    label: Application-layer rewrites required to transition key unwrapping to AWS KMS
  - value: 30+
    label: Consecutive days of continuous, uninterrupted daemon uptime validated in staging
---

## Architecture · The decisions that mattered

The critical design decision was to keep cryptographic key material in volatile shared memory while delegating envelope protection to AWS KMS. Calling a cloud KMS API over the network for every single phone number or SMS query in a telecommunications system would introduce unacceptable latency and incur millions of API requests per day. Publishing unwrapped Data Encryption Keys into local Linux shared memory (`/dev/shm`) achieves both strict compliance and wire-speed performance.

### Implementation notes

- **Surgical C code adaptation:** The unwrap provider swap was achieved by isolating the key-unwrapping routine without altering the operational footprint or database schemas:
  ```c
  if (data[i+4]) { // label present => provider unwrap
      if (kms_decrypt(target, data[i+2], data[i+4])) { /* AWS KMS success path */ }
  } else {
      // existing local-decrypt path (unchanged)
  }
  ```
  The database schema for key index tracking and application rekey utilities remained completely unchanged.
- **Shared memory architecture & atomic version swap:** The encryption daemon runs as a hardened systemd service on persistent nodes. It maps a dedicated POSIX shared memory block accessible only by the application service group. During rekeying operations, the service populates a new memory segment and performs an atomic pointer swap, ensuring application workers never observe partial or torn keys.
- **In-database match functions:** Performing SQL lookups on encrypted columns without exposing plaintext keys to the database engine required custom PostgreSQL functions. Compatibility functions were deployed into the application database, enabling services to match hashed account numbers and phone numbers transparently without returning decrypted values to disk.
- **Auditable verification pipeline:** To satisfy regulatory auditors, automated verification scripts executed end-to-end checks against production benchmark records and performed regular expression scans across raw database backups to confirm zero plaintext leaks.

### Security controls

- **Database isolation from encryption keys:** The database engine stores and retrieves ciphertext strings exclusively; it never possesses access to the KMS Customer Managed Key or plaintext DEKs.
- **POSIX permission boundaries on `/dev/shm`:** The shared memory file descriptor is created with strict `0600` permissions owned by the application service user and locked into RAM using `mlock()`, preventing keys from being swapped to disk.
- **KMS Customer Managed Key policy:** The AWS KMS key policy restricts decryption privileges strictly to the IAM role assumed by persistent database EC2 instances.

## Delivery · How the change is rolled out

The migration from the legacy key provider to AWS KMS was delivered in two phases. Phase one deployed the updated daemon with AWS KMS decryption capabilities alongside the existing database codings table. Re-encryption utilities generated new key sets wrapped under AWS KMS Customer Managed Keys. Phase two ran the automated verification suite against staging database snapshots, scanning tables and dump files with regular expressions matching telephone numbers and email formats to ensure 100% ciphertext compliance before production sign-off.

## Trade-offs · What this does not solve

Deterministic column encryption allows equality lookups (`WHERE phone = :encrypted_val`) but does not support range queries (`<` or `>`) or full-text wildcards on encrypted fields. Searching within message bodies requires client-side decryption or indexing via dedicated search clusters (such as OpenSearch) where access control is governed at the cluster level.
