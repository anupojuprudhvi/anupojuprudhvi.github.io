---
title: Observability: Knowing Something's Wrong Before Users Do
date: 2026-09-28
updated: 2026-10-01
track: kubernetes-operations
order: 18
module: 18
summary: What to collect from an EKS cluster (logs, metrics, and cluster state), which few signals deserve an alert, and how to set alerts that wake people for real problems only.
level: Production · Monitoring
readingTime: 10 min read
stack: [Amazon EKS, CloudWatch Container Insights, Fluent Bit, Prometheus, Amazon Managed Service for Prometheus, Grafana]
tags: [observability, monitoring, logging, alerting, eks]
redirectFrom: [observability-and-alerting, 08-observability]
related: [tolling/eks-ingress-incident-rca]
motif: monitor
---

**In this module, you'll learn to:**

- Separate what deserves an alert from what belongs on a dashboard
- Collect logs, metrics, and cluster state from an EKS cluster
- Write alerts that wake people for real, user-facing problems only

**Before you start:** this module is about finding out that something is broken. [Incident Triage](19-incident-triage.html) covers what to do next.

## Principle · Alert on what users feel, investigate with everything else

A cluster can produce thousands of metrics. Paging someone for each one leads to alert fatigue, and then the alert that matters gets ignored. A simpler rule works better: **alert on symptoms users would notice** (errors, slowness, unavailability), and keep the detailed metrics for working out *why*.

For most services, four signals cover the symptoms:

- **Errors:** the share of requests that fail.
- **Latency:** how long requests take, looking at the slow end (p95 or p99), not the average.
- **Traffic:** how many requests are coming in, so a sudden drop to zero doesn't look like "no errors".
- **Saturation:** how close the service is to its limits, such as CPU throttling, memory near the limit, or a queue backing up.

## What to collect

- **Logs.** Containers write to stdout and stderr; a log agent on each node ships them somewhere searchable. Fluent Bit sending to CloudWatch Logs is the common AWS default. Log in a structured format (JSON) with a request ID, so one request can be followed across services.
- **Metrics.** CloudWatch Container Insights (installed through the `amazon-cloudwatch-observability` add-on) gives node, pod, and container metrics with little setup. Prometheus, self-run or through Amazon Managed Service for Prometheus with Grafana, gives more control and is the usual choice when apps expose their own metrics.
- **Cluster state.** `kube-state-metrics` turns Kubernetes objects into metrics: pods stuck in `Pending`, containers restarting, deployments with fewer ready replicas than desired. Many real incidents show up here first.

```text
# Is anything restarting or stuck right now?
kubectl get pods -A --field-selector=status.phase!=Running
kubectl get pods -A --sort-by='.status.containerStatuses[0].restartCount'

# Recent warnings across the whole cluster
kubectl get events -A --field-selector=type=Warning --sort-by='.lastTimestamp'
```

## Alerts that are worth waking up for

A short list, each tied to something a user would feel or will soon feel:

- **Error rate above a threshold for several minutes**, per service, not per pod.
- **Slow requests (p99 latency) above the target for several minutes.**
- **A deployment with fewer ready replicas than desired for more than a few minutes.** This catches failed rollouts and crash loops.
- **Pods stuck in `Pending`**, which usually means the cluster is out of capacity or a node autoscaler is stuck.
- **Nodes `NotReady`**, and disks or subnets close to full (running out of pod IPs is a classic EKS surprise).

Everything else goes on a dashboard or into a daily report rather than a pager.

### Implementation notes

- **Always require "for N minutes".** A single bad minute is noise. An alert that fires on one sample will train people to ignore it.
- **Every alert needs an owner and a first step.** If nobody knows what to do when it fires, it isn't ready to page anyone. Link it to the triage checklist in [Incident Triage](19-incident-triage.html).
- **Watch the cost of logs.** Log volume grows quietly. Set retention periods, drop noisy debug logs in production, and check the logging bill now and then.
- **Test alerts on purpose.** Break something in a non-production cluster and confirm the alert fires, reaches the right person, and makes sense to them.

## Recap · Key terms

- **The four signals:** errors, latency, traffic, and saturation.
- **p99 latency:** the time within which 99% of requests finish.
- **Fluent Bit:** a log agent that runs on every node as a DaemonSet.
- **kube-state-metrics:** turns Kubernetes object state into metrics, such as Pending or restarting pods.
- **Alert fatigue:** people ignoring alerts because too many of them are noise.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
S: Which of these should page someone at night?
- CPU on one node above 80% for one minute
* A service's error rate above its threshold for 5 minutes
- A pod that restarted once
- A new deployment starting
= Page on symptoms users feel, sustained for several minutes. Single-sample, per-pod, or internal signals belong on dashboards.
Q: Why look at p99 latency rather than the average?
- Averages are harder to compute
* Averages hide the slow requests that some users actually get
- p99 is always lower
- Kubernetes only reports p99
= A healthy-looking average can hide a long tail of slow requests. p95 and p99 show what the slowest users experience.
S: Your dashboards show a 0% error rate and normal latency, but customers report the site is down. Which signal would have caught it?
* Traffic: requests have dropped to zero, so there are no errors to count
- CPU saturation on the nodes
- The p99 latency
- The number of pod restarts
= If requests stop arriving, perhaps because DNS or the load balancer broke upstream, the error rate is zero and everything looks healthy. Alert on traffic dropping as well as on errors.
Q: Which source tells you that a deployment has fewer ready replicas than it should?
- Container logs
- Node CPU metrics
* kube-state-metrics, which reports cluster state
- The load balancer's access logs
= kube-state-metrics turns object state (desired versus ready replicas, Pending pods, restarts) into metrics you can alert on.
Q: What should every paging alert come with?
- A screenshot
- A CPU graph
* An owner and a first step, such as a link to a runbook
- At least three recipients
= If nobody knows what to do when it fires, it isn't ready to page anyone. Link each alert to a runbook or the triage checklist.
```
