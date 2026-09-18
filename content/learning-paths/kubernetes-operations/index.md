---
title: Kubernetes Ingress & Operations on Amazon EKS
track: kubernetes-operations
summary: A hands-on playbook for running EKS in production — dual ingress cost mechanics, IAM/RBAC across clusters, and day-2 incident triage.
level: Intermediate to Advanced
duration: 4 Modules · 30 min read
stack: [Amazon EKS, Kubernetes, AWS Load Balancer Controller, Nginx Ingress, AWS ECR]
---

## Overview · Running EKS is mostly a routing and access-control problem

Provisioning an EKS cluster is the easy part. The decisions that actually shape a production platform are how traffic gets routed into it, who can reach which environment, how a container actually gets from a developer's commit into a running pod, and what you do at 2 a.m. when a rollout is stuck.

This track draws on running Amazon EKS across four separate environments (Dev, QA, Staging, Production) for a single platform — the ingress design, environment isolation, and container-delivery mechanics below reflect that real deployment, paired with a general operational discipline for triaging a stuck rollout that applies to any EKS cluster. It covers:

- Why running two different ingress controllers side-by-side is a cost decision, not just a technical preference.
- How to isolate IAM access per environment without hand-editing cluster permissions per engineer.
- The one authentication detail that breaks container delivery specifically in headless CI/CD, and nowhere else.
- A repeatable way to triage a stuck or failing deployment instead of guessing.

## Curriculum · The 4 operations modules

<ul class="lp-syllabus">
  <li>
    <a class="lp-module-card" href="01-dual-ingress-architecture.html">
      <span class="lp-module-num">01</span>
      <div class="lp-module-body">
        <h3>Dual Ingress Architecture &amp; Its Cost Mechanics</h3>
        <p>When to route through a shared AWS ALB versus an internal Nginx Ingress controller, and why grouping services onto one load balancer is a real line-item saving.</p>
      </div>
      <span class="lp-module-action">Start module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="02-multi-environment-clusters-and-rbac.html">
      <span class="lp-module-num">02</span>
      <div class="lp-module-body">
        <h3>Multi-Environment Clusters &amp; IAM/RBAC</h3>
        <p>Isolating Dev, QA, Staging, and Production as separate clusters and mapping IAM identities to Kubernetes RBAC without a shared superuser credential.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="03-container-delivery-to-eks.html">
      <span class="lp-module-num">03</span>
      <div class="lp-module-body">
        <h3>Container Delivery: Build, Tag, Push, Promote</h3>
        <p>A registry-to-cluster promotion workflow, and the headless-authentication gotcha that only shows up once a human isn't the one running the command.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="04-day-2-operations-and-incident-triage.html">
      <span class="lp-module-num">04</span>
      <div class="lp-module-body">
        <h3>Day-2 Operations &amp; Incident Triage</h3>
        <p>Context switching across clusters safely, verifying a rollout actually succeeded, and a systematic sequence for triaging a stuck deployment.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
</ul>
