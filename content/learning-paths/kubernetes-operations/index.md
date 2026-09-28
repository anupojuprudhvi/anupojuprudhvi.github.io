---
title: Kubernetes on Amazon EKS: Foundations & Operations
date: 2026-09-18
track: kubernetes-operations
summary: A hands-on playbook for running EKS in production — dual ingress cost mechanics, IAM/RBAC across clusters, and day-2 incident triage.
level: Intermediate to Advanced
duration: 10 Modules · 85 min read
stack: [Amazon EKS, Kubernetes, AWS Load Balancer Controller, Nginx Ingress, AWS ECR]
---

## Overview · Running EKS is mostly a routing and access-control problem

Provisioning an EKS cluster is the easy part. The decisions that actually shape a production platform are how traffic gets routed into it, who can reach which environment, how a container actually gets from a developer's commit into a running pod, and what you do at 2 a.m. when a rollout is stuck.

This track draws on running Amazon EKS across four separate environments (Dev, QA, Staging, Production) for a single platform — the ingress design, environment isolation, and container-delivery mechanics below reflect that real deployment, paired with a general operational discipline for triaging a stuck rollout that applies to any EKS cluster. It covers:

- Why running two different ingress controllers side-by-side is a cost decision, not just a technical preference.
- How to isolate IAM access per environment without hand-editing cluster permissions per engineer.
- The one authentication detail that breaks container delivery specifically in headless CI/CD, and nowhere else.
- A repeatable way to triage a stuck or failing deployment instead of guessing.
- How resource requests drive scheduling, autoscaling, and cost.
- How to upgrade a cluster one version at a time without breaking deploys.
- How pods get their own AWS permissions, and how secrets reach them safely.
- What to monitor, and which alerts are worth waking someone for.
- Running deploys through Git with Argo CD.
- The add-ons every new cluster needs before any app arrives.

The track is in two parts: **learn the foundations** (modules 1–6), then **run it in production** (modules 7–10). Modules 1–3 and 5 draw on that deployment, with every name and account removed; the rest are general EKS practice.

## Part 1 · Learn the foundations

How traffic gets in, who can get in, how code gets there, and the building blocks every cluster needs. Read these in order if you are setting up a platform.

<ul class="lp-syllabus">
  <li>
    <a class="lp-module-card" href="01-dual-ingress-architecture.html">
      <span class="lp-module-num">01</span>
      <div class="lp-module-body">
        <h3>Dual Ingress Architecture &amp; Its Cost Mechanics</h3>
        <p>When to share one ALB across services, when a separate controller helps, and moving from the retired ingress-nginx to Gateway API.</p>
      </div>
      <span class="lp-module-action">Start module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="02-multi-environment-clusters-and-rbac.html">
      <span class="lp-module-num">02</span>
      <div class="lp-module-body">
        <h3>Multi-Environment Clusters &amp; IAM/RBAC</h3>
        <p>Separate clusters per environment, and giving people and pipelines access with EKS access entries instead of a shared superuser.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="03-container-delivery-to-eks.html">
      <span class="lp-module-num">03</span>
      <div class="lp-module-body">
        <h3>Container Delivery: Build, Tag, Push, Promote</h3>
        <p>Build an image once and promote that exact image by digest, plus the registry login detail that only breaks in CI.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="07-workload-identity-and-secrets.html">
      <span class="lp-module-num">04</span>
      <div class="lp-module-body">
        <h3>Workload Identity &amp; Secrets</h3>
        <p>Giving each workload its own AWS permissions with EKS Pod Identity or IRSA, and getting secrets into pods without putting them in Git.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="10-platform-add-ons.html">
      <span class="lp-module-num">05</span>
      <div class="lp-module-body">
        <h3>The Platform Add-on Layer</h3>
        <p>The add-ons every new cluster needs (load balancing, DNS, metrics, autoscaling, logs, storage), each with its own IAM role.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="09-gitops-with-argo-cd.html">
      <span class="lp-module-num">06</span>
      <div class="lp-module-body">
        <h3>GitOps with Argo CD</h3>
        <p>Letting Argo CD keep each cluster matching Git, so a deploy is a reviewed pull request and a rollback is a revert.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
</ul>

## Part 2 · Run it in production

Keeping a running platform healthy: capacity and cost, knowing when something is wrong, fixing it, and upgrading without drama. Dip into these as you need them.

<ul class="lp-syllabus">
  <li>
    <a class="lp-module-card" href="05-scaling-requests-and-cost.html">
      <span class="lp-module-num">07</span>
      <div class="lp-module-body">
        <h3>Scaling Without Surprises: Requests, Autoscaling &amp; Cost</h3>
        <p>Why resource requests drive scheduling, autoscaling, and the bill, and how pod and node autoscaling fit together.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="08-observability.html">
      <span class="lp-module-num">08</span>
      <div class="lp-module-body">
        <h3>Observability: Knowing Something&#39;s Wrong First</h3>
        <p>What to collect from a cluster, the few signals worth alerting on, and alerts that wake people for real problems only.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="04-day-2-operations-and-incident-triage.html">
      <span class="lp-module-num">09</span>
      <div class="lp-module-body">
        <h3>Day-2 Operations &amp; Incident Triage</h3>
        <p>Context switching across clusters safely, verifying a rollout actually succeeded, and a systematic sequence for triaging a stuck deployment.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="06-cluster-upgrades.html">
      <span class="lp-module-num">10</span>
      <div class="lp-module-body">
        <h3>Cluster Upgrades Without Drama</h3>
        <p>Checking for removed APIs first, then upgrading the control plane, add-ons, and nodes in an order that keeps workloads running.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
</ul>
