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

## Big picture · Follow the traffic through the whole platform

Before the detail, here's the whole system end to end, as three flows. Press **Play traffic flow** on any of them to follow it hop by hop. Every box names the module that explains it, so you can use these as a map: if something breaks at one hop, that's the module to open.

### Flow 1 · A user's request, from the browser to your code

```flow
title: Flow 1 · A request from the internet to a pod, and out to AWS
group: Internet
User | opens https://api.example.com/orders in a browser or app
end
-> Route 53 resolves the name; ExternalDNS keeps the record in sync (Module [06](platform-add-ons.html))
group: Your VPC
Application Load Balancer | TLS ends here; shared across APIs by an ingress group (Module [08](ingress-architecture-and-cost.html))
-> Ingress rule /orders matches; target type ip sends it straight to a pod IP (Module [03](services-and-cluster-networking.html))
group: EKS cluster
Service orders-api | lists only the ready pods; the ALB targets come from it (Module [03](services-and-cluster-networking.html))
-> readiness probe passed, so this pod is in rotation (Module [02](pods-deployments-and-rollouts.html))
* orders-api pod | your container, with its own VPC IP from the VPC CNI (Modules [01](how-kubernetes-and-eks-work.html), [03](services-and-cluster-networking.html))
-> calls another service by its DNS name, orders to payments (Module [03](services-and-cluster-networking.html))
payments-api pod | reached through its ClusterIP Service and kube-proxy rules
-> needs AWS: credentials come from EKS Pod Identity (Module [07](workload-identity-and-secrets.html))
end
end
Amazon S3, SQS, Secrets Manager | IAM allows only what this workload's role permits (Module [07](workload-identity-and-secrets.html))
```

### Flow 2 · A code change, from a commit to running in Production

```flow
title: Flow 2 · Shipping a change safely through every environment
Developer | merges a pull request to the application repo
-> CI builds and tests the image once (Module [09](container-delivery-to-eks.html))
Amazon ECR | image stored once, identified by its digest (Module [09](container-delivery-to-eks.html))
-> a pull request to the manifests repo changes the digest for one environment (Module [10](gitops-with-argo-cd.html))
Manifests repo | reviewed and merged; for Production this is the approval step (Module [10](gitops-with-argo-cd.html))
-> Argo CD inside the cluster notices the change (Module [10](gitops-with-argo-cd.html))
group: EKS cluster (one per environment, Module 05)
Argo CD | applies the change, allowed by its RBAC permissions (Modules [04](namespaces-rbac-and-cluster-access.html), [05](multi-environment-clusters-and-access-entries.html))
-> API server stores the new Deployment; the scheduler places the new pods (Module [01](how-kubernetes-and-eks-work.html))
Rolling update | new pods start, pass readiness, then old ones are removed (Module [02](pods-deployments-and-rollouts.html))
-> if new pods need room, Karpenter adds a node (Module [11](scaling-requests-and-cost.html))
* New version live | same image digest that was tested in QA
end
loop: to roll back, revert the commit in Git; Argo CD syncs the cluster back (Module [10](gitops-with-argo-cd.html))
```

### Flow 3 · Keeping it running, from a warning sign to a fix

```flow
title: Flow 3 · From an early warning to a resolved incident
group: EKS cluster
Pods and nodes | emit logs, metrics, and events all the time
-> Fluent Bit and a metrics agent ship them out of the cluster (Modules [06](platform-add-ons.html), [12](observability-and-alerting.html))
end
Logs and metrics | CloudWatch or Managed Prometheus, with Grafana dashboards (Module [12](observability-and-alerting.html))
-> an alert rule on a user-facing symptom fires: errors, latency, or missing pods (Module [12](observability-and-alerting.html))
On-call engineer | follows the runbook linked from the alert
-> checks context, events, and pod status, one layer at a time (Module [13](incident-triage.html))
paths
path: Capacity
Pods Pending or CPU-bound | tune requests and autoscaling (Module [11](scaling-requests-and-cost.html))
path: Bad release
Rollout failing | roll back through Git or kubectl (Modules [10](gitops-with-argo-cd.html), [13](incident-triage.html))
path: Platform
Old version or add-on | upgrade one minor version at a time (Module [14](cluster-upgrades.html))
end
-> fixed, and the cause written down
* Service healthy | the alert clears and the next on-call person has the notes
```

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
