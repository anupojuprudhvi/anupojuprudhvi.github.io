---
title: Kubernetes on Amazon EKS: Foundations to Production
date: 2026-09-18
updated: 2026-09-29
track: kubernetes-operations
summary: A structured path from how Kubernetes works to running Amazon EKS in production. Learn the foundations first, then build the platform, then ship and run it, with traffic-flow diagrams throughout.
level: Foundations to Advanced
duration: 14 Modules · 120 min read
stack: [Kubernetes, Amazon EKS, kubectl, AWS Load Balancer Controller, Argo CD, Karpenter, Amazon ECR]
---

## Overview · Learn how it works, then how to run it

Most EKS guides start with a cluster already running and jump straight to production tricks. This track starts one step earlier. It explains how Kubernetes actually works, then uses that to build an EKS platform, then shows how to ship to it and keep it healthy. Each module builds on the ones before it, and each has diagrams that show how requests, permissions, and deploys flow through the system.

<div class="callout"><b>Who this is for, and what it assumes.</b> This track is for engineers who already know <b>containers</b> (what an image is, writing a Dockerfile, pushing to a registry, <code>docker run</code>) and basic <b>AWS</b> (VPCs and subnets, IAM roles). You don't need any Kubernetes experience; Part 1 starts from zero. If containers are new to you, <a href="https://docs.docker.com/get-started/">Docker's getting-started guide</a> is the best first step. If you already run Kubernetes, skim Part 1 and start at Part 2.</div>

```flow
title: The route through this track
Part 1 · Foundations | how Kubernetes works: control plane, pods, Services, access
-> you can read and reason about any cluster
Part 2 · Build the platform | separate environments, add-ons, workload identity, ingress
-> you have an EKS platform ready for applications
Part 3 · Ship & run in production | delivery, GitOps, scaling, monitoring, incidents, upgrades
-> you can deploy to it safely and keep it healthy
* Production-ready EKS | every step drawn from a real multi-environment deployment
```

Parts 2 and 3 draw on running Amazon EKS across four separate environments (Development, QA, Staging, Production) for a single platform, with every name and account removed. Where a module links to a case study, that's the real engagement the pattern came from.

## Part 1 · Foundations

How Kubernetes and EKS work. Read these in order: everything later relies on them.

<ul class="lp-syllabus">
  <li>
    <a class="lp-module-card" href="how-kubernetes-and-eks-work.html">
      <span class="lp-module-num">01</span>
      <div class="lp-module-body">
        <h3>How Kubernetes and Amazon EKS Actually Work</h3>
        <p>Desired state and controllers, the control plane and nodes, what happens on kubectl apply, and what AWS runs for you.</p>
      </div>
      <span class="lp-module-action">Start here →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="pods-deployments-and-rollouts.html">
      <span class="lp-module-num">02</span>
      <div class="lp-module-body">
        <h3>Pods, Deployments &amp; Rollouts</h3>
        <p>How your app actually runs: Deployments, ReplicaSets, probes, configuration, and a rolling update step by step.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="services-and-cluster-networking.html">
      <span class="lp-module-num">03</span>
      <div class="lp-module-body">
        <h3>Services &amp; Cluster Networking</h3>
        <p>How traffic finds your pods: Services, cluster DNS, VPC IPs for pods, and the path from the internet to a pod.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="namespaces-rbac-and-cluster-access.html">
      <span class="lp-module-num">04</span>
      <div class="lp-module-body">
        <h3>Namespaces, RBAC &amp; Cluster Access</h3>
        <p>Who can do what: the checks every request passes, Roles and bindings, IAM-to-Kubernetes mapping, and service accounts.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
</ul>

## Part 2 · Build the platform

Turning an empty EKS cluster into a platform that's safe to deploy to. Read these in order if you're setting one up.

<ul class="lp-syllabus">
  <li>
    <a class="lp-module-card" href="multi-environment-clusters-and-access-entries.html">
      <span class="lp-module-num">05</span>
      <div class="lp-module-body">
        <h3>Multi-Environment Clusters &amp; EKS Access Entries</h3>
        <p>Separate clusters per environment, and giving people and pipelines access with access entries instead of a shared superuser.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="platform-add-ons.html">
      <span class="lp-module-num">06</span>
      <div class="lp-module-body">
        <h3>The Platform Add-on Layer</h3>
        <p>The add-ons every new cluster needs (load balancing, DNS, metrics, autoscaling, logs, storage), each with its own IAM role.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="workload-identity-and-secrets.html">
      <span class="lp-module-num">07</span>
      <div class="lp-module-body">
        <h3>Workload Identity &amp; Secrets</h3>
        <p>Giving each workload its own AWS permissions with EKS Pod Identity or IRSA, and getting secrets into pods without putting them in Git.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="ingress-architecture-and-cost.html">
      <span class="lp-module-num">08</span>
      <div class="lp-module-body">
        <h3>Ingress Architecture &amp; Its Cost Mechanics</h3>
        <p>When to share one ALB across services, when a separate controller helps, and moving from the retired ingress-nginx to Gateway API.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
</ul>

## Part 3 · Ship & run in production

Getting code onto the platform and keeping it healthy: delivery, capacity, monitoring, incidents, and upgrades. Read in order, or go straight to what you need.

<ul class="lp-syllabus">
  <li>
    <a class="lp-module-card" href="container-delivery-to-eks.html">
      <span class="lp-module-num">09</span>
      <div class="lp-module-body">
        <h3>Container Delivery: Build, Tag, Push, Promote</h3>
        <p>Build an image once and promote that exact image by digest, plus the registry login detail that only breaks in CI.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="gitops-with-argo-cd.html">
      <span class="lp-module-num">10</span>
      <div class="lp-module-body">
        <h3>GitOps with Argo CD</h3>
        <p>Letting Argo CD keep each cluster matching Git, so a deploy is a reviewed pull request and a rollback is a revert.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="scaling-requests-and-cost.html">
      <span class="lp-module-num">11</span>
      <div class="lp-module-body">
        <h3>Scaling Without Surprises: Requests, Autoscaling &amp; Cost</h3>
        <p>Why resource requests drive scheduling, autoscaling, and the bill, and how pod and node autoscaling fit together.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="observability-and-alerting.html">
      <span class="lp-module-num">12</span>
      <div class="lp-module-body">
        <h3>Observability: Knowing Something&#39;s Wrong First</h3>
        <p>What to collect from a cluster, the few signals worth alerting on, and alerts that wake people for real problems only.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="incident-triage.html">
      <span class="lp-module-num">13</span>
      <div class="lp-module-body">
        <h3>Day-2 Operations &amp; Incident Triage</h3>
        <p>Checking a rollout actually worked, and a repeatable sequence for triaging a stuck or failing deployment.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="cluster-upgrades.html">
      <span class="lp-module-num">14</span>
      <div class="lp-module-body">
        <h3>Cluster Upgrades Without Drama</h3>
        <p>Checking for removed APIs first, then upgrading the control plane, add-ons, and nodes in an order that keeps workloads running.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
</ul>
