---
title: SRE post-mortem: resolving 60-second API timeouts and onboarding discovery failures
nav: SRE RCA: API timeout & service discovery
label: Incident response
heading: Debugging cross-VPC microservice timeouts and missing address mappings
project: telecom
layer: Operations
order: 100
stack: [REST APIs, PgBouncer, PostgreSQL, SIP Discovery, Microservices]
tags: [incident-response, rca, api, timeout, pgbouncer, service-discovery, telecom]
summary: Resolving 60-second execution expired API failures and misleading "Organization not found" mobile onboarding bugs by correcting connection pool database routing and missing SIP address discovery mappings.
problem: |
  Following migration to the new cloud staging environments, two critical service defects blocked platform acceptance testing: first, core administrative API calls consistently hung for exactly 60 seconds before aborting with `500 execution expired`. Second, mobile enterprise subscribers attempting self-onboarding via QR codes were rejected with an ambiguous "Organization not found" error, despite valid account credentials and an existing organization record in the database.
solution: |
  I performed deep-dive root-cause analysis tracing application logs, network sockets, and SQL query patterns. For the API timeouts, I discovered that the API gateway was querying legacy pre-cloud host addresses in the database configuration tables because the connection pool lacked proper database routing and the backend API route was unexposed. For the onboarding defect, audit traces revealed user authentication was actually succeeding, but backend SIP/ELK service discovery was failing with an internal lookup error because default range fallback mappings were missing from the service discovery table. I corrected the database routing, exposed the API endpoint, and seeded the missing discovery mappings.
flowLabel: Service discovery failure and diagnostic path
flow:
  - step: Mobile QR code / API request
    note: Mobile subscriber or admin client initiates authentication against the onboarding API endpoint.
  - step: Authentication success & discovery failure
    note: Organization and credentials authenticate successfully; the service proceeds to look up voice switch addresses in the database.
  - step: Configuration gap discovery
    note: Missing default device fallback mapping in the address assignments table causes the service to return an unmapped internal error code.
  - step: Error misinterpretation & UI failure
    note: Mobile application client maps the internal discovery lookup code to a misleading "Organization not found" user alert.
enables: |
  Enterprise mobile subscribers complete self-onboarding without false authentication rejections, and administrative API calls execute with sub-second response times.
outcomes:
  - value: < 200ms
    label: Administrative API response time, reduced from 60-second timeout stalls
  - value: 100%
    label: Mobile subscriber self-onboarding completion rate across QA and staging
  - value: 2
    label: Latent configuration and routing gaps isolated and remediated across API and database tiers
---

## Architecture · The decisions that mattered

The core architectural takeaway from these incidents was the necessity of end-to-end trace correlation across decoupled microservice layers. When an application reports a generic error ("Organization not found") or hangs until a hard network timeout, treating the symptom at the user interface hides the true failure domain. Tracing the request lifecycle revealed that both issues were caused by database routing and missing service discovery metadata.

### Implementation notes

- **Root cause analysis of 60-second API timeouts:**
  - *Symptom:* Calls to administrative API endpoints failed with `execution expired: The document "execution expired" does not have a valid root`.
  - *Investigation:* Network traces showed TCP SYN packets sent toward internal legacy IP addresses that no longer existed in the cloud VPC.
  - *Discovery:* The API service loaded system endpoint mappings from the database configuration tables upon startup. Because the post-migration seed script had not updated the locator hosts to the new private endpoints, the service attempted to reach decommissioned on-premises servers, stalling until the 60-second HTTP client timeout expired.
  - *Fix:* Executed automated database locator updates, setting host mappings to the active private cloud IPs, and added the missing database routing in the connection pool.
- **Root cause analysis of self-onboarding failure:**
  - *Symptom:* Mobile app onboarding failed with "Organization not found" when scanning QR codes or clicking dynamic link tokens.
  - *Investigation:* Backend service logs confirmed that the user's organization was successfully resolved and user authentication was completed without error.
  - *Discovery:* Following authentication, the service performs a discovery lookup to locate the subscriber's assigned SIP voice switch and logging cluster. It queries the address assignment table for default device ranges. While custom enterprise ranges existed, the default fallback mapping was absent, causing the service to return:
    ```text
    errcode: 25001; desc: sip elk lookup-service address not found
    ```
    The mobile client frontend had a crude catch-all exception handler that erroneously displayed `Organization not found` for any non-zero onboarding error code.
  - *Fix:* Seeded the required default fallback address records in the database, allowing the client to complete the service discovery handshake.

### Security controls

- **Tokenized authentication validation:** Onboarding requests validate cryptographically signed dynamic link tokens, verifying user identity, organization ID, and device capability attributes before executing database lookups.
- **Strict database query parameterization:** Dynamic address lookup queries use parameterized SQL inside the API service, preventing SQL injection vulnerabilities.
- **Sanitized log handling:** Authentication failure logs redact user passwords and dynamic token hashes, preventing credential leakage in operational log aggregators.

## Delivery · How the change is rolled out

The remediation was packaged into the automated deployment pipeline:
1. Database locator update scripts were added to the node onboarding engine to ensure host tables reflect active cloud IPs automatically upon instance boot.
2. The database bootstrapping script was updated to verify and seed default voice switch address assignments during initial environment provisioning.
3. Automated smoke test suites executed health verification scripts with test capability payloads, validating that all responses return valid session responses before handing environments over to QA.

## Trade-offs · What this does not solve

Seeding default fallback address records allows users to onboard successfully, but if an organization requires strict tenant isolation across distinct regional voice switches, fallback to default addresses could route voice traffic through suboptimal geographic network paths. Enterprise-level onboarding automation should enforce explicit tenant-specific switch assignments during organization provisioning rather than relying on global defaults.
