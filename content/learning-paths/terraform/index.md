---
title: Terraform for Enterprise Production
date: 2026-09-17
updated: 2026-10-01
track: terraform
summary: A playbook for building, scaling, and governing Terraform in enterprise AWS. Part 1 covers the production techniques; Part 2 turns them into one delivery process that takes a module from design to production.
level: Intermediate to Advanced
duration: 11 Modules · 102 min read
stack: [Terraform 1.10+, AWS, HCL, terraform test, Checkov, TFLint, ADRs]
---

## Overview · Beyond the basics

Most tutorials teach you how to write an `aws_instance` block. In real enterprise production, compute is the easy part. 

The difficult challenges are:
- How do you structure repositories so 20+ engineers can contribute without creating state lock contention?
- How do you partition state so a bug in application compute cannot destroy database or networking infrastructure?
- How do you refactor resources across module boundaries with zero downtime?
- How do you enforce security and prevent hardcoded secrets from leaking into Git or plaintext state?
- How does a team deliver every module the same way, from design through testing and review to production?

This learning path is a distillation of lessons learned building and governing multi-account AWS platforms across telecom, tolling, and healthcare.

The track has two parts. **Part 1** teaches the production techniques one at a time. **Part 2** puts them together as one delivery process: how a team designs, builds, tests, records, reviews, and promotes every module the same way. It follows a real codebase standard for an AWS Glue and S3 data platform, with every name removed. The new modules end with a five-question **pop quiz**; score 4 out of 5 to pass.

<div class="callout"><b>Which path do I take?</b><ul><li><b>Building or changing one module</b> in a codebase that already exists? Start at <a href="07-base-composition-and-environment-modules.html">Module 07</a> and follow Part 2 in order. Your environments and their state layers stay as they are.</li><li><b>Starting a platform from scratch?</b> Begin with <a href="01-enterprise-module-design.html">Module 01</a> and <a href="02-state-isolation-and-locking.html">Module 02</a> to split state into layers and bootstrap the backend. Then build each layer&#39;s code through the Part 2 process.</li><li><b>Already running Terraform in production?</b> Go straight to <a href="11-module-promotion-gate.html">Module 11</a> for the whole process on one page, then back to whichever step you&#39;re missing.</li></ul></div>

```flow
title: The delivery process Part 2 builds, one module at a time
Design | base or composition, and which layer of state (Modules 01, 07)
-> following
Conventions | names, tags, provider versions (Module 08)
-> then
Build and test | bottom-up, with terraform test beside each module (Module 09)
-> decisions recorded as they're made
Record | ADRs and CHANGELOG entries (Module 10)
-> then
* Gate | scanned alone, findings justified, approved by a second person (Module 11)
-> merged
* Promote | wired in, scanned again, applied to dev, then the same shape to every environment (Modules 07, 11)
```

## Part 1 · Production techniques

The patterns every enterprise Terraform codebase needs, each on its own: structure, state, validation, secrets, refactoring, and CI/CD.

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

## Part 2 · How a module is delivered: design to production

One process for a team codebase, in the order the work happens. Each module is one step, and the last puts every step on one page.

<ul class="lp-syllabus">
  <li>
    <a class="lp-module-card" href="07-base-composition-and-environment-modules.html">
      <span class="lp-module-num">07</span>
      <div class="lp-module-body">
        <h3>Base, Composition &amp; Environment: A Three-Layer Module Standard</h3>
        <p>Base modules build one component, compositions join them with IAM and networking, and every environment keeps the same shape.</p>
      </div>
      <span class="lp-module-action">Start Part 2 →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="08-naming-tagging-and-provider-versions.html">
      <span class="lp-module-num">08</span>
      <div class="lp-module-body">
        <h3>Naming, Tagging &amp; Provider Versions Across a Module Tree</h3>
        <p>One naming pattern, tags split between provider default_tags and module inputs, and provider versions that agree all the way down.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="09-change-workflow-and-module-testing.html">
      <span class="lp-module-num">09</span>
      <div class="lp-module-body">
        <h3>The Change Workflow &amp; Module Testing</h3>
        <p>Apply only the saved plan you reviewed, change code bottom-up, and test modules with terraform test and Terratest.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="10-adrs-and-changelogs.html">
      <span class="lp-module-num">10</span>
      <div class="lp-module-body">
        <h3>ADRs &amp; Changelogs: Recording Why the Infrastructure Looks This Way</h3>
        <p>Decision records with real rejected options, the changes that must leave one behind, and a changelog per environment.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="11-module-promotion-gate.html">
      <span class="lp-module-num">11</span>
      <div class="lp-module-body">
        <h3>The Module Promotion Gate: Scan Before You Wire</h3>
        <p>Scan each module alone, justify every finding, get a second approval, then scan again once wired in. Plus the whole process end to end.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
</ul>
