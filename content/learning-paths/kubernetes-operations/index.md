---
title: Kubernetes from Zero to Production on Amazon EKS
date: 2026-09-18
updated: 2026-10-01
track: kubernetes-operations
summary: A path from never having used Kubernetes to running Amazon EKS in production. Start with the basics on a free local cluster, learn the core concepts, move to EKS and build the platform, then work through the real challenges of operating it.
level: Beginner to Advanced
duration: 20 Modules · 220 min read
stack: [Kubernetes, kind, kubectl, Helm, Amazon EKS, AWS Load Balancer Controller, Argo CD, Karpenter]
---

## Overview · Learn the basics, then the concepts, then how to run it

Most EKS guides start with a cluster already running and jump straight to production tricks. This track starts at the very beginning, and assumes no Kubernetes experience at all. It explains why Kubernetes exists and gets you running it on your own laptop for free. Then it teaches the core concepts one at a time, moves to Amazon EKS to build a real platform, and finishes with the challenges that only show up once you're operating it. Each module builds on the ones before it, with diagrams wherever it helps to see how requests, permissions, and deploys move through the system.

Every module is built to be worked through, not just read. Each one opens with what you'll learn, includes hands-on **Try it** commands, recaps the key terms, and ends with a five-question **pop quiz**: three questions on the ideas and two real-world scenarios, shuffled into a new order every time. Score 4 out of 5 to pass.

<div class="callout"><b>Where to start.</b><ul><li><b>New to Kubernetes, or to containers?</b> Start at <a href="01-why-kubernetes.html">Module 01</a> and read in order. Parts 1 and 2 run on a free cluster on your laptop.</li><li><b>Know Kubernetes, new to Amazon EKS?</b> Skim Part 2, then start at <a href="10-kubernetes-on-eks.html">Module 10</a>.</li><li><b>Already run EKS?</b> Go straight to Part 4, <a href="15-container-delivery-to-eks.html">Operating in production</a>, or to whichever challenge you're facing.</li></ul></div>

```flow
title: The route through this track
Part 1 · Basics | why Kubernetes exists, a free local cluster, YAML and kubectl
-> you can run an app on a cluster and read its manifests
Part 2 · Core concepts | how a cluster works, workloads, networking, storage, access, packaging
-> you can read and reason about any cluster
Part 3 · Kubernetes on Amazon EKS | what AWS runs, separate environments, add-ons, workload identity, ingress
-> you have an EKS platform ready for applications
Part 4 · Operating in production | delivery, GitOps, scaling, monitoring, incidents, upgrades
-> you can deploy to it safely and keep it healthy
* Production-ready EKS | every step drawn from a real multi-environment deployment
```

Parts 1 and 2 need nothing but a laptop. Parts 3 and 4 draw on running Amazon EKS across four separate environments (Development, QA, Staging, Production) for a single platform, with every name and account removed. Where a module links to a case study, that's the real engagement the pattern came from.

## Part 1 · Basics

No experience needed. Get Kubernetes running on your own laptop for free, and learn to read and write the files that describe everything in a cluster.

<ul class="lp-syllabus">
  <li>
    <a class="lp-module-card" href="01-why-kubernetes.html">
      <span class="lp-module-num">01</span>
      <div class="lp-module-body">
        <h3>Why Kubernetes Exists, Starting from a Single Container</h3>
        <p>Containers in five minutes, the problems that appear with hundreds of them, what Kubernetes does about it, and when you don&#39;t need it.</p>
      </div>
      <span class="lp-module-action">Start here →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="02-your-first-cluster.html">
      <span class="lp-module-num">02</span>
      <div class="lp-module-body">
        <h3>Your First Cluster: A Free Local Lab with kind</h3>
        <p>Install the tools, create a three-node cluster on your laptop, run an app, and watch Kubernetes replace a pod you delete.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="03-kubernetes-yaml-and-kubectl.html">
      <span class="lp-module-num">03</span>
      <div class="lp-module-body">
        <h3>Reading Kubernetes YAML and Working with kubectl</h3>
        <p>The four fields every object has, just enough YAML, labels and selectors, namespaces, kubectl apply, and the everyday commands.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
</ul>

## Part 2 · Core concepts

How Kubernetes works, on any cluster. Everything later relies on these, so read them in order.

<ul class="lp-syllabus">
  <li>
    <a class="lp-module-card" href="04-how-a-cluster-works.html">
      <span class="lp-module-num">04</span>
      <div class="lp-module-body">
        <h3>How a Kubernetes Cluster Actually Works</h3>
        <p>Desired state and controllers, the control plane and nodes, and what happens step by step when you run kubectl apply.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="05-pods-deployments-and-rollouts.html">
      <span class="lp-module-num">05</span>
      <div class="lp-module-body">
        <h3>Pods, Deployments &amp; Rollouts</h3>
        <p>How your app actually runs: Deployments, ReplicaSets, probes, configuration, and a rolling update step by step.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="06-services-and-cluster-networking.html">
      <span class="lp-module-num">06</span>
      <div class="lp-module-body">
        <h3>Services &amp; Cluster Networking</h3>
        <p>How traffic finds your pods: Services, cluster DNS, the Service types, Ingress, and network policies.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="07-storage-and-workload-types.html">
      <span class="lp-module-num">07</span>
      <div class="lp-module-body">
        <h3>Storage &amp; Other Workload Types</h3>
        <p>Volumes, PersistentVolumeClaims and StorageClasses, StatefulSets for apps that need a stable identity, and DaemonSets, Jobs, and CronJobs.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="08-namespaces-rbac-and-cluster-access.html">
      <span class="lp-module-num">08</span>
      <div class="lp-module-body">
        <h3>Namespaces, RBAC &amp; Service Accounts</h3>
        <p>Who can do what: the checks every request passes, Roles and bindings, the built-in roles, and identities for pods.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="09-helm-and-kustomize.html">
      <span class="lp-module-num">09</span>
      <div class="lp-module-body">
        <h3>Packaging Apps with Helm and Kustomize</h3>
        <p>One app across several environments with Kustomize overlays, and installing, upgrading, and rolling back packaged software with Helm.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
</ul>

## Part 3 · Kubernetes on Amazon EKS

Moving to EKS, then turning an empty cluster into a platform that's safe to deploy to. Read these in order if you're setting one up.

<ul class="lp-syllabus">
  <li>
    <a class="lp-module-card" href="10-kubernetes-on-eks.html">
      <span class="lp-module-num">10</span>
      <div class="lp-module-body">
        <h3>Kubernetes on Amazon EKS: What AWS Runs, and What Changes</h3>
        <p>What AWS runs for you, VPC IP addresses for pods, signing in with IAM, the path from an ALB to a pod, and a lab cluster you create and delete.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="11-multi-environment-clusters-and-access-entries.html">
      <span class="lp-module-num">11</span>
      <div class="lp-module-body">
        <h3>Multi-Environment Clusters &amp; EKS Access Entries</h3>
        <p>Separate clusters per environment, and giving people and pipelines access with access entries instead of a shared superuser.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="12-platform-add-ons.html">
      <span class="lp-module-num">12</span>
      <div class="lp-module-body">
        <h3>The Platform Add-on Layer</h3>
        <p>The add-ons every new cluster needs (load balancing, DNS, metrics, autoscaling, logs, storage), each with its own IAM role.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="13-workload-identity-and-secrets.html">
      <span class="lp-module-num">13</span>
      <div class="lp-module-body">
        <h3>Workload Identity &amp; Secrets</h3>
        <p>Giving each workload its own AWS permissions with EKS Pod Identity or IRSA, and getting secrets into pods without putting them in Git.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="14-ingress-architecture-and-cost.html">
      <span class="lp-module-num">14</span>
      <div class="lp-module-body">
        <h3>Ingress Architecture &amp; Its Cost Mechanics</h3>
        <p>When to share one ALB across services, when a separate controller helps, and moving from the retired ingress-nginx to Gateway API.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
</ul>

## Part 4 · Operating in production

The challenges that only show up once real users depend on the platform: delivery, capacity, monitoring, incidents, and upgrades. Read in order, or go straight to what you need.

<ul class="lp-syllabus">
  <li>
    <a class="lp-module-card" href="15-container-delivery-to-eks.html">
      <span class="lp-module-num">15</span>
      <div class="lp-module-body">
        <h3>Container Delivery: Build, Tag, Push, Promote</h3>
        <p>Build an image once and promote that exact image by digest, plus the registry login detail that only breaks in CI.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="16-gitops-with-argo-cd.html">
      <span class="lp-module-num">16</span>
      <div class="lp-module-body">
        <h3>GitOps with Argo CD</h3>
        <p>Letting Argo CD keep each cluster matching Git, so a deploy is a reviewed pull request and a rollback is a revert.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="17-scaling-requests-and-cost.html">
      <span class="lp-module-num">17</span>
      <div class="lp-module-body">
        <h3>Scaling Without Surprises: Requests, Autoscaling &amp; Cost</h3>
        <p>Why resource requests drive scheduling, autoscaling, and the bill, and how pod and node autoscaling fit together.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="18-observability-and-alerting.html">
      <span class="lp-module-num">18</span>
      <div class="lp-module-body">
        <h3>Observability: Knowing Something&#39;s Wrong First</h3>
        <p>What to collect from a cluster, the few signals worth alerting on, and alerts that wake people for real problems only.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="19-incident-triage.html">
      <span class="lp-module-num">19</span>
      <div class="lp-module-body">
        <h3>Day-2 Operations &amp; Incident Triage</h3>
        <p>Checking a rollout actually worked, and a repeatable sequence for triaging a stuck or failing deployment.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="20-cluster-upgrades.html">
      <span class="lp-module-num">20</span>
      <div class="lp-module-body">
        <h3>Cluster Upgrades Without Drama</h3>
        <p>Checking for removed APIs first, then upgrading the control plane, add-ons, and nodes in an order that keeps workloads running.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
</ul>

## Big picture · The whole platform, as three flows

This is the map, and it makes the most sense once you've finished Part 2. Here's the whole system end to end, as three flows. Press **Play traffic flow** on any of them to follow it hop by hop. Every box names the module that explains it, so if something breaks at one hop, that's the module to open.

### Flow 1 · A user's request, from the browser to your code

```flow
title: Flow 1 · A request from the internet to a pod, and out to AWS
group: Internet
User | opens https://api.example.com/orders in a browser or app
end
-> Route 53 resolves the name; ExternalDNS keeps the record in sync (Module [12](12-platform-add-ons.html))
group: Your VPC
Application Load Balancer | TLS ends here; shared across APIs by an ingress group (Module [14](14-ingress-architecture-and-cost.html))
-> Ingress rule /orders matches; target type ip sends it straight to a pod IP (Modules [06](06-services-and-cluster-networking.html), [10](10-kubernetes-on-eks.html))
group: EKS cluster
Service orders-api | lists only the ready pods; the ALB targets come from it (Module [06](06-services-and-cluster-networking.html))
-> readiness probe passed, so this pod is in rotation (Module [05](05-pods-deployments-and-rollouts.html))
* orders-api pod | your container, with its own VPC IP from the VPC CNI (Modules [04](04-how-a-cluster-works.html), [10](10-kubernetes-on-eks.html))
-> calls another service by its DNS name, orders to payments (Module [06](06-services-and-cluster-networking.html))
payments-api pod | reached through its ClusterIP Service and kube-proxy rules
-> needs AWS: credentials come from EKS Pod Identity (Module [13](13-workload-identity-and-secrets.html))
end
end
Amazon S3, SQS, Secrets Manager | IAM allows only what this workload's role permits (Module [13](13-workload-identity-and-secrets.html))
```

### Flow 2 · A code change, from a commit to running in Production

```flow
title: Flow 2 · Shipping a change safely through every environment
Developer | merges a pull request to the application repo
-> CI builds and tests the image once (Module [15](15-container-delivery-to-eks.html))
Amazon ECR | image stored once, identified by its digest (Module [15](15-container-delivery-to-eks.html))
-> a pull request to the manifests repo changes the digest for one environment (Module [16](16-gitops-with-argo-cd.html))
Manifests repo | reviewed and merged; for Production this is the approval step (Module [16](16-gitops-with-argo-cd.html))
-> Argo CD inside the cluster notices the change (Module [16](16-gitops-with-argo-cd.html))
group: EKS cluster (one per environment, Module 11)
Argo CD | applies the change, allowed by its RBAC permissions (Modules [08](08-namespaces-rbac-and-cluster-access.html), [11](11-multi-environment-clusters-and-access-entries.html))
-> API server stores the new Deployment; the scheduler places the new pods (Module [04](04-how-a-cluster-works.html))
Rolling update | new pods start, pass readiness, then old ones are removed (Module [05](05-pods-deployments-and-rollouts.html))
-> if new pods need room, Karpenter adds a node (Module [17](17-scaling-requests-and-cost.html))
* New version live | same image digest that was tested in QA
end
loop: to roll back, revert the commit in Git; Argo CD syncs the cluster back (Module [16](16-gitops-with-argo-cd.html))
```

### Flow 3 · Keeping it running, from a warning sign to a fix

```flow
title: Flow 3 · From an early warning to a resolved incident
group: EKS cluster
Pods and nodes | emit logs, metrics, and events all the time
-> Fluent Bit and a metrics agent ship them out of the cluster (Modules [12](12-platform-add-ons.html), [18](18-observability-and-alerting.html))
end
Logs and metrics | CloudWatch or Managed Prometheus, with Grafana dashboards (Module [18](18-observability-and-alerting.html))
-> an alert rule on a user-facing symptom fires: errors, latency, or missing pods (Module [18](18-observability-and-alerting.html))
On-call engineer | follows the runbook linked from the alert
-> checks context, events, and pod status, one layer at a time (Module [19](19-incident-triage.html))
paths
path: Capacity
Pods Pending or CPU-bound | tune requests and autoscaling (Module [17](17-scaling-requests-and-cost.html))
path: Bad release
Rollout failing | roll back through Git or kubectl (Modules [16](16-gitops-with-argo-cd.html), [19](19-incident-triage.html))
path: Platform
Old version or add-on | upgrade one minor version at a time (Module [20](20-cluster-upgrades.html))
end
-> fixed, and the cause written down
* Service healthy | the alert clears and the next on-call person has the notes
```
