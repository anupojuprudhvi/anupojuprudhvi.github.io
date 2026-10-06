---
title: The Mobilize Phase · Wave Planning & Lighthouse Pilot
date: 2026-09-17
updated: 2026-10-06
track: migration-journey
order: 5
module: 5
summary: From plan to practice. Working as one team with the client's engineers, grouping servers into migration waves, and moving one real application first, the pilot, to prove the cutover and rollback before the rest follow.
level: Migration Engineering
readingTime: 7 min read
stack: [AWS MGN, AWS DMS, Wave Planning, Lighthouse Pilot, CCoE]
tags: [mobilize, wave-planning, migration-factory, pilot, operational-readiness]
---

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
