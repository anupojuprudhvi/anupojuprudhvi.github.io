---
title: The Mobilize Phase · Wave Planning & Lighthouse Pilot
date: 2026-09-17
updated: 2026-10-06
track: migration-journey
order: 5
module: 5
summary: From plan to practice. Working as one team with the client's engineers, grouping servers into migration waves, and moving one real application first, the pilot, to prove the cutover and rollback before the rest follow.
level: Migration Engineering
readingTime: 8 min read
stack: [AWS MGN, AWS DMS, Wave Planning, Lighthouse Pilot, CCoE]
tags: [mobilize, wave-planning, migration-factory, pilot, operational-readiness]
motif: migration
---

**In this module, you'll learn to:**

- Organize the partner's and the client's engineers as one team with clear ownership
- Group servers into waves by dependencies, criticality, change windows, and tooling
- Run a pilot cutover with a tested rollback, and use what it measures

**Before you start:** read [Financial Engineering](03-financial-engineering-tco-and-licensing.html) and [Target State Blueprint](04-target-architecture-and-landing-zone.html). Mobilize starts once that business case is approved, and builds that landing zone.

## Principle · From "why" to "how"

Once leadership approves the business case, the Assess phase is done and **Mobilize** begins.

Assess answered *"why should we migrate, and what will it cost?"* Mobilize answers *"how do we build the platform, prove the cutover works, and get our teams ready to run it?"* It has three workstreams:

1. **Build the landing zone:** the accounts, guardrails, and hybrid connectivity designed in Assess (Module 04).
2. **Plan the waves:** group servers into small, ordered batches.
3. **Run the pilot:** move one real application end to end, to prove the process before anything else moves.

## Teamwork · One team, not two

A migration can't be done *to* an organization by outside consultants. It works when the partner's people and the client's people work as one team, often called a cloud center of excellence (CCoE):

- **Program leads, one from each side:** pace, scope, and MAP reporting.
- **Architects, one from each side:** the landing zone, networking, and security.
- **Migration engineers:** replication tooling (MGN and DMS), automation, and infrastructure as code.
- **Application owners and testers:** cutover testing, data checks, and final sign-off.

Agree early **who does what**. For example, migration engineers run the replication, security engineers approve IAM roles and SCPs, and application owners decide whether a cutover is accepted. A weekly planning meeting keeps the landing zone, replication, and connectivity work moving together.

## Planning · Grouping servers into waves

Moving everything in one "big bang" weekend is far too risky. Instead, servers move in **waves**, small batches (often a few dozen servers), grouped by four things:

1. **What talks to what.** Servers that constantly call each other, such as an application and its database, move in the **same wave**. Split them, and every call crosses the link between the datacenter and AWS, which slows the application down. Network flow data from discovery shows these links.
2. **How critical it is.** Development and test environments go first, to practise with no business risk. Internal tools come next. Customer-facing systems move later, once the process is well proven.
3. **When change is allowed.** Avoid month-end close, peak trading seasons, and other freeze periods.
4. **Which tool moves it.** Group servers that move the same way: whole servers with **AWS Application Migration Service (MGN)**, databases with **AWS Database Migration Service (DMS)** or native replication.

## The pilot · Wave 0

The most important milestone in Mobilize is the **pilot**, sometimes called the lighthouse or Wave 0. Pick an application that is:

- **low risk,** so a delay doesn't hurt customers or revenue;
- **typical of the estate,** for example a three-tier application with a web front end, an application tier, and a relational database;
- **owned by someone keen to help,** who will test it properly and give honest feedback.

### A full dress rehearsal

```flow
title: A pilot cutover, step by step
Before the window | MGN replicates the servers continuously; DMS or native replication keeps the database in sync
-> maintenance window starts
Stop the traffic | drain users and pause background jobs
-> then
Final sync | the last changes are copied across
-> then
Launch in AWS | instances start in the target VPC, with post-launch scripts
-> then
Switch DNS | internal DNS records point to the new servers
-> then
* Test | smoke tests and test transactions
paths
path: Success
Go live | send real traffic to AWS and close the window
path: Problem
Roll back | point DNS back to the original servers
end
```

<div class="callout"><b>Plan the rollback before the cutover.</b> Pointing DNS back is quick, but any data written in AWS after the switch would be lost, unless reverse replication from AWS back to the original database was set up in advance. Decide how you'll roll back, and test it, before the window starts.</div>

### What the pilot measures

- **How long the cutover really takes,** to know whether real waves will fit their maintenance windows. A database switch may take minutes rather than the hours planned, or the other way round.
- **Performance:** how the application responds in AWS compared with the datacenter.
- **Rollback time:** how long it really takes to go back if something goes wrong.

## Outcome · Ready for the waves

Mobilize ends with:

1. **A production-ready landing zone,** with guardrails, central logging, and working hybrid connectivity.
2. **The full wave plan** for every remaining application.
3. **A proven runbook,** corrected after the pilot, that every later wave follows.
4. **The MAP Mobilize reporting** that AWS or your partner requires.

With the platform built, the runbook proven, and the internal teams trained, the remaining waves can move steadily and repeatably.

## Recap · Key terms

- **Mobilize:** the phase after the business case is approved: build the landing zone, plan the waves, and run the pilot.
- **CCoE:** a cloud center of excellence, the partner's and client's people working as one team.
- **Migration wave:** a small, ordered batch of servers grouped by what talks to what, criticality, change windows, and tooling.
- **MGN and DMS:** AWS Application Migration Service moves whole servers; AWS Database Migration Service moves databases.
- **Pilot (lighthouse, Wave 0):** the first real application moved end to end, to prove the cutover and the rollback.
- **Reverse replication:** replication from AWS back to the original database, so a rollback doesn't lose data written after the switch.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: Why do an application and its database move in the same wave?
* Split across waves, every call between them crosses the link to the datacenter, and the application slows down
- MGN can't move them separately
- Licensing requires it
- DNS can only be switched once
= Network flow data from discovery shows which servers talk to each other constantly.
Q: Which application makes a good pilot?
- The most critical customer-facing system, to prove the most
* A low-risk, typical three-tier application whose owner is keen to help
- The smallest server in the estate
- A system in a change freeze
= The pilot should be safe to delay, representative of the estate, and properly tested by its owner.
Q: Which tool moves whole servers?
* AWS Application Migration Service (MGN)
- AWS Database Migration Service (DMS)
- AWS Schema Conversion Tool
- RVTools
= MGN replicates servers continuously until the cutover. Databases usually move with DMS or native replication.
S: In the pilot, users wrote orders in AWS for an hour before a problem showed up, and you point DNS back. What happens to those orders?
- They replicate back automatically
* They're lost, unless reverse replication to the original database was set up before the cutover
- MGN keeps a copy
- The DNS change copies them
= Pointing DNS back is quick, but the data written in AWS stays there. Plan and test the rollback before the window starts.
S: The pilot's database switch took 20 minutes instead of the three hours planned. What's the right use of that?
- Ignore it; pilots aren't representative
* Correct the runbook, and plan later waves' maintenance windows from the measured time
- Give every later wave a 20-minute window, whatever its size
- Skip testing in later waves
= Measuring how long the cutover really takes is one of the pilot's main jobs. The corrected runbook is what every later wave follows.
```
