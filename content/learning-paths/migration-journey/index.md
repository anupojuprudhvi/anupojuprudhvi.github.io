---
title: Enterprise Cloud Migration · Assess, Mobilize & Modernize
date: 2026-09-17
updated: 2026-10-06
track: migration-journey
summary: A practical guide to large cloud migrations on AWS. Choosing a rapid or deep assessment, sizing from real usage, building the cost case, designing the landing zone, planning waves, and deciding what to modernize along the way.
level: Intermediate to Executive
duration: 6 Modules · 41 min read
stack: [AWS MAP, RVTools, TCO Modeling, Landing Zone, AWS MGN, Amazon EKS]
---

## Overview · What a large migration really involves

A large cloud migration is rarely just an infrastructure project. It's a financial decision, an operating-model change, and an architecture project at the same time. Before a single production server moves, leadership wants to know what it will cost, the security team wants to know it will be safe, and the people who run the systems want to know what changes for them.

The **AWS Migration Acceleration Program (MAP)** splits this into three phases:

1. **Assess:** find out what you have, how ready the organization is, and what it will cost on AWS. The result is a business case leadership can approve.
2. **Mobilize:** build the AWS foundation (the landing zone), plan the migration waves, and prove the process by moving one real application first.
3. **Migrate and modernize:** move the rest, wave by wave, and modernize the parts where it pays off.

## Deliverables · What each phase produces

### Assess
- **Readiness assessment:** how ready the organization is, across the six perspectives of the AWS Cloud Adoption Framework (CAF): business, people, governance, platform, security, and operations.
- **Cost model:** a 3-year comparison of today's costs with AWS On-Demand and Savings Plans, including Windows Server and SQL Server licensing choices.
- **Target architecture:** the multi-account landing zone, network design, hybrid connectivity, security guardrails, and a migration strategy for each workload.
- **Business case:** the cost model turned into cash flow and payback, and the basis for MAP funding.

### Mobilize
- **A working landing zone,** built as code, with single sign-on, guardrails, and central logging.
- **A wave plan:** applications grouped into waves by what talks to what, how critical each one is, and when it's allowed to change.
- **Tested runbooks:** step-by-step cutover and rollback procedures, proven on the pilot.
- **A pilot report:** what really happened when the first application moved: replication speed, downtime, and performance.
- **Team readiness:** who owns what after the move, and the training the internal teams need.

### Migrate and modernize
- **A repeatable migration process,** using AWS Application Migration Service (MGN) for servers and AWS Database Migration Service (DMS) for databases.
- **Modernized targets** where they pay off: containers on Amazon EKS, managed databases on Amazon Aurora, and managed messaging.
- **Sign-off and close-out:** each wave accepted by its application owners, and the old hardware retired.

## Curriculum · The 6 modules

<ul class="lp-syllabus">
  <li>
    <a class="lp-module-card" href="01-assessment-paths-rapid-vs-deep.html">
      <span class="lp-module-num">01</span>
      <div class="lp-module-body">
        <h3>Assessment: Rapid vs. Deep</h3>
        <p>When a fast, tool-driven assessment is enough, and when you also need a deeper study of the organization.</p>
      </div>
      <span class="lp-module-action">Start module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="02-discovery-telemetry-and-inventory.html">
      <span class="lp-module-num">02</span>
      <div class="lp-module-body">
        <h3>Discovery: Inventory, Usage Data &amp; Right-Sizing</h3>
        <p>Collecting what you have and how much of it is really used, so the AWS estimate isn't built on oversized VMs.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="03-financial-engineering-tco-and-licensing.html">
      <span class="lp-module-num">03</span>
      <div class="lp-module-body">
        <h3>The Cost Case: 3-Year TCO &amp; Licensing</h3>
        <p>On-Demand vs. Savings Plans, Windows and SQL Server licensing, MAP funding, and the business case leadership signs.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="04-target-architecture-and-landing-zone.html">
      <span class="lp-module-num">04</span>
      <div class="lp-module-body">
        <h3>Target Architecture: Landing Zone &amp; the 7Rs</h3>
        <p>The multi-account foundation, single sign-on, hub networking, and a migration strategy for every workload.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="05-mobilize-wave-planning-and-pilot.html">
      <span class="lp-module-num">05</span>
      <div class="lp-module-body">
        <h3>Mobilize: Wave Planning &amp; the Pilot</h3>
        <p>Working with the client's teams, grouping servers into waves, and moving one real application first to prove the process.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="06-migrate-and-modernize-strategies.html">
      <span class="lp-module-num">06</span>
      <div class="lp-module-body">
        <h3>Migrate &amp; Modernize: Move First, or Modernize on the Way?</h3>
        <p>When to lift and shift now and improve later, when to modernize during the move, and what the common targets look like.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
</ul>
