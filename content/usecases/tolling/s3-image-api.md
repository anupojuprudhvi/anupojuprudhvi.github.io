---
title: A private image API without a proxy application to operate
nav: Upload and retrieve images
label: Image handling
project: tolling
projectName: U.S. Tolling Infrastructure
engagement: usecases/tolling/index.html
layer: Applications
order: 30
stack: [API Gateway, Amazon S3, IAM, VPC endpoints, Terraform]
tags: [storage, security, api, cost]
summary: A private REST API integrating directly with S3 for uploads and reads — no Lambda proxy or load balancer in the transfer path.
problem: |
  Internal tolling services needed an HTTP interface to upload and retrieve
  images in S3. That interface had to fit a shared-account network design,
  handle binary image data, and resolve through a consistent private domain
  across the environments that needed access.
solution: |
  I used a private API Gateway REST API with direct AWS service integrations
  for S3 GET and PUT operations. Requests arrive through approved VPC
  endpoints; API Gateway assumes an IAM role to access S3. The image-transfer
  path needs neither a Lambda proxy nor an application load balancer.
flow:
  - Internal service
  - Private DNS + VPC endpoint
  - Private REST API
  - IAM service role
  - Amazon S3
flowLabel: Private image request path
enables: |
  A reusable private interface for image uploads and reads, with storage access
  handled by API Gateway and IAM. Removing the proxy runtime reduces the
  application code that needs deployment and maintenance.
---

### Architecture decisions

- **Map HTTP operations directly to storage:** path parameters identify the bucket and object key, including nested object paths.
- **Handle images as binary data:** media-type configuration and response handling preserve the image payload through the gateway.
- **Coordinate cross-account access:** private DNS, API resource policies, domain invocation permissions, and VPC endpoint domain associations work together to make the private domain reachable.
- **Make failures diagnosable:** access logs and explicit integration responses distinguish successful uploads from access and backend errors.
