---
title: Terraform for Enterprise Production
date: 2026-09-17
updated: 2026-10-06
track: terraform
summary: A playbook for building, scaling, and governing Terraform in enterprise AWS. Part 1 covers the production techniques; Part 2 turns them into one delivery process that takes a module from design to production.
level: Intermediate to Advanced
duration: 11 Modules · 102 min read
stack: [Terraform 1.11+, AWS, HCL, terraform test, Checkov, TFLint, ADRs]
---

## Overview · Beyond the basics

Most tutorials teach you how to write an `aws_instance` block. In real production, that's the easy part. The hard questions are:
- How do you lay out a repository so 20 engineers can work in it without blocking each other?
- How do you split state so a mistake in compute can't touch the database or the network?
- How do you restructure code without destroying and re-creating resources?
- How do you keep secrets out of Git and out of state?
- How does a team deliver every module the same way, from design to production?

This track comes from building and running multi-account AWS platforms in telecom, tolling, and healthcare.

The track has two parts. **Part 1** teaches the production techniques one at a time. **Part 2** puts them together as one delivery process: how a team designs, builds, tests, records, reviews, and promotes every module the same way. It follows a real codebase standard for an AWS Glue and S3 data platform, with every name removed. Every module ends with a short recap of the key terms and a five-question **pop quiz**; score 4 out of 5 to pass.

<div class="callout"><b>Which path do I take?</b><ul><li><b>Building or changing one module</b> in a codebase that already exists? Start at <a href="07-base-composition-and-environment-modules.html">Module 07</a> and follow Part 2 in order. Your environments and their state layers stay as they are.</li><li><b>Starting a platform from scratch?</b> Begin with <a href="01-enterprise-module-design.html">Module 01</a> and <a href="02-state-isolation-and-locking.html">Module 02</a> to split state into layers and bootstrap the backend. Then build each layer&#39;s code through the Part 2 process.</li><li><b>Already running Terraform in production?</b> Go straight to <a href="11-module-promotion-gate.html">Module 11</a> for the whole process on one page, then back to whichever step you&#39;re missing.</li></ul></div>


## Part 1 · Production techniques

The patterns every enterprise Terraform codebase needs, each on its own: structure, state, validation, secrets, refactoring, and CI/CD.

<ul class="lp-syllabus">
  <li>
    <a class="lp-module-card" href="01-enterprise-module-design.html">
      <span class="lp-module-num">01</span>
      <div class="lp-module-body">
        <h3>Enterprise Repository &amp; Module Layout</h3>
        <p>Reusable child modules kept apart from the root deployments that use them, state split into layers, and exact version pins.</p>
      </div>
      <span class="lp-module-action">Start module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="02-state-isolation-and-locking.html">
      <span class="lp-module-num">02</span>
      <div class="lp-module-body">
        <h3>State Isolation, Remote Locking &amp; Blast Radius Control</h3>
        <p>A secure S3 backend with native locking, state split into layers, and SSM parameters instead of remote_state.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="03-variables-validation-and-types.html">
      <span class="lp-module-num">03</span>
      <div class="lp-module-body">
        <h3>Modern HCL — Types, Validations &amp; Preconditions</h3>
        <p>Modules that reject bad inputs at plan time, preconditions and postconditions, and why for_each beats count.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="04-secrets-and-sensitive-values.html">
      <span class="lp-module-num">04</span>
      <div class="lp-module-body">
        <h3>Zero-Plaintext Secret Architecture</h3>
        <p>Why sensitive = true doesn't protect state, letting AWS manage database passwords, and OIDC roles instead of access keys.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="05-refactoring-with-moved-blocks.html">
      <span class="lp-module-num">05</span>
      <div class="lp-module-body">
        <h3>Zero-Downtime Refactoring with Moved &amp; Import Blocks</h3>
        <p>Rename, restructure, adopt, and let go of resources with moved, import, and removed blocks, without re-creating anything.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="06-ci-cd-security-linting-testing.html">
      <span class="lp-module-num">06</span>
      <div class="lp-module-body">
        <h3>CI/CD Guardrails — TFLint, Checkov &amp; Plan Automation</h3>
        <p>Fast lint checks, Checkov security scanning, a plan posted on every pull request, and a nightly drift check.</p>
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
