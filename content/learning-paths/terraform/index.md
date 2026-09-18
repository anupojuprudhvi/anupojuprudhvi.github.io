---
title: Terraform for Enterprise Production
track: terraform
summary: A playbook for building, scaling, and governing Terraform in enterprise AWS — modular design, remote state isolation, and security guardrails.
level: Intermediate to Advanced
duration: 6 Modules · 45 min read
stack: [Terraform 1.5+, AWS, HCL, Checkov, TFLint, S3 & DynamoDB]
---

## Overview · Beyond the basics

Most tutorials teach you how to write an `aws_instance` block. In real enterprise production, compute is the easy part. 

The difficult challenges are:
- How do you structure repositories so 20+ engineers can contribute without creating state lock contention?
- How do you partition state so a bug in application compute cannot destroy database or networking infrastructure?
- How do you refactor resources across module boundaries with zero downtime?
- How do you enforce security and prevent hardcoded secrets from leaking into Git or plaintext state?

This learning path is a distillation of lessons learned building and governing multi-account AWS platforms across telecom, tolling, and healthcare.

## Curriculum · The 6 production modules

<ul class="lp-syllabus">
  <li>
    <a class="lp-module-card" href="01-enterprise-module-design.html">
      <span class="lp-module-num">01</span>
      <div class="lp-module-body">
        <h3>Enterprise Repository &amp; Module Layout</h3>
        <p>Distinguishing reusable child modules from root deployment environments and establishing strict version pinning.</p>
      </div>
      <span class="lp-module-action">Start module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="02-state-isolation-and-locking.html">
      <span class="lp-module-num">02</span>
      <div class="lp-module-body">
        <h3>State Isolation, Remote Locking &amp; Blast Radius Control</h3>
        <p>Hardening S3 &amp; DynamoDB backends, state layering strategies, and replacing remote_state traps with decoupled SSM contracts.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="03-variables-validation-and-types.html">
      <span class="lp-module-num">03</span>
      <div class="lp-module-body">
        <h3>Modern HCL — Types, Validations &amp; Preconditions</h3>
        <p>Building self-defending modules with rich object validation, lifecycle preconditions, and avoiding count index-shift catastrophes.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="04-secrets-and-sensitive-values.html">
      <span class="lp-module-num">04</span>
      <div class="lp-module-body">
        <h3>Zero-Plaintext Secret Architecture</h3>
        <p>Addressing state plaintext realities, generating dynamic database credentials, and replacing static access keys with OIDC roles.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="05-refactoring-with-moved-blocks.html">
      <span class="lp-module-num">05</span>
      <div class="lp-module-body">
        <h3>Zero-Downtime Refactoring with Moved &amp; Import Blocks</h3>
        <p>Safely restructuring state in code using declarative moved, import, and removed blocks with zero resource recreation.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="06-ci-cd-security-linting-testing.html">
      <span class="lp-module-num">06</span>
      <div class="lp-module-body">
        <h3>CI/CD Guardrails — TFLint, Checkov &amp; Plan Automation</h3>
        <p>Building a three-tier automated verification pipeline with static security scanning, PR plan comments, and scheduled drift detection.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
</ul>
