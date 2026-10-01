---
title: Packaging Apps with Helm and Kustomize
date: 2026-10-01
track: kubernetes-operations
order: 9
module: 9
summary: Real apps need the same manifests in several environments, with small differences, and most cluster software ships as a package. How Kustomize layers environment changes over a shared base, how Helm installs and upgrades packaged charts, and when to use each.
level: Core concepts · Packaging
readingTime: 9 min read
stack: [Helm, Kustomize, kubectl, kind]
tags: [kubernetes, helm, kustomize, packaging, fundamentals]
---

**Before you start:** this builds on the declarative `kubectl apply` workflow from [Reading Kubernetes YAML](03-kubernetes-yaml-and-kubectl.html). Have the kind cluster running, and install Helm (`brew install helm`, `winget install Helm.Helm`, or the script on helm.sh).

## Principle · One app, many environments, no copy-paste

So far each app has been a few YAML files. Two problems show up quickly in real work:

- **Environments differ a little.** Dev runs one replica, Production runs four; the image tag, namespace, and resource sizes change. Copying the whole folder per environment works until someone fixes a bug in one copy and forgets the others.
- **Other people's software comes as a bundle.** An ingress controller or a monitoring stack is dozens of objects with hundreds of settings. You want to install a version, change a few settings, and upgrade it later, without editing their YAML.

Kustomize solves the first problem. Helm solves both, in a different way. You'll meet each of them throughout the rest of this track.

## Kustomize · A shared base, plus small patches per environment

Kustomize is built into `kubectl`. You keep one **base** with the full manifests, and an **overlay** per environment that lists only what's different. There's no templating language: every file stays valid Kubernetes YAML.

```text
hello/
├── base/
│   ├── deployment.yaml        # the Deployment from module 03
│   ├── service.yaml
│   └── kustomization.yaml
└── overlays/
    ├── dev/
    │   └── kustomization.yaml
    └── prod/
        └── kustomization.yaml
```

```yaml
# base/kustomization.yaml: which files make up the app
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
```

```yaml
# overlays/prod/kustomization.yaml: only what's different in Production
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
namespace: shop-prod
images:
  - name: nginx
    newTag: "1.27.2"           # pin an exact version in Production
patches:
  - target:
      kind: Deployment
      name: hello
    patch: |-
      - op: replace
        path: /spec/replicas
        value: 4
```

```yaml
# overlays/dev/kustomization.yaml: the base as it is, in its own namespace
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
namespace: shop-dev
```

```text
# Print the final YAML for an environment, without applying it
kubectl kustomize overlays/prod

# Apply an environment (-k instead of -f)
kubectl create namespace shop-prod
kubectl apply -k overlays/prod
```

```flow
title: Kustomize builds each environment from one base
* base | the full Deployment and Service, shared by every environment
-> each overlay adds only its differences
paths
path: Dev
overlays/dev | namespace shop-dev, the base's 2 replicas
path: Prod
overlays/prod | namespace shop-prod, 4 replicas, pinned image tag
end
-> kubectl apply -k
Cluster | gets plain, complete YAML for that environment
```

## Helm · A package manager for Kubernetes

Helm works like a package manager (`apt`, `brew`, `npm`) for Kubernetes. A **chart** is a package: a folder of templated manifests plus a `values.yaml` file of settings with sensible defaults. Installing a chart creates a **release**, which Helm tracks so you can upgrade it, roll it back, or uninstall it as one unit.

```yaml
# Inside a chart: templates/deployment.yaml (an excerpt)
spec:
  replicas: {{ .Values.replicaCount }}
  template:
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
```

```yaml
# my-values.yaml: your settings, overriding the chart's defaults
replicaCount: 2
```

```flow
title: From a chart to running objects
Chart podinfo | templates, plus default values.yaml
-> combined with your values file
* helm install / helm upgrade | renders the templates into plain YAML
-> sends it to the API server, and records the release
Release my-podinfo | revision 1, 2, 3... each one can be rolled back to
```

```text
# Add a chart repository and look at what it offers
helm repo add podinfo https://stefanprodan.github.io/podinfo
helm repo update
helm search repo podinfo --versions | head

# See every setting the chart supports
helm show values podinfo/podinfo

# Install a specific version, with your values
helm install my-podinfo podinfo/podinfo --version <chart-version> -f my-values.yaml

# Change a setting, see the release history, roll back, and uninstall
helm upgrade my-podinfo podinfo/podinfo --version <chart-version> --set replicaCount=3
helm history my-podinfo
helm rollback my-podinfo 1
helm uninstall my-podinfo

# Render the YAML without installing, to review what a chart will create
helm template my-podinfo podinfo/podinfo -f my-values.yaml
```

## Choosing · Helm, Kustomize, or both

| | Kustomize | Helm |
| --- | --- | --- |
| How it works | Patches plain YAML | Fills in templates from values |
| Installed with | Built into kubectl | A separate CLI |
| Best for | Your own apps across environments | Installing and upgrading third-party software |
| Tracks releases and rollbacks | No; Git history does that | Yes, per release |
| Learning curve | Low: it's still just YAML | Higher: Go templating for chart authors |

A common split, and the one used later in this track: **Helm for third-party add-ons** (load balancer controller, ExternalDNS, metrics) in [The Platform Add-on Layer](12-platform-add-ons.html), and **Kustomize overlays (or Helm values files) for your own apps**, applied by Argo CD in [GitOps with Argo CD](16-gitops-with-argo-cd.html). Argo CD understands both natively.

## Try it · One app, two environments

```text
# Build the hello/ folder above, reusing deployment.yaml and service.yaml
# from module 03, then compare the two environments
kubectl kustomize hello/overlays/dev
kubectl kustomize hello/overlays/prod

# Apply both side by side on kind
kubectl create namespace shop-dev
kubectl create namespace shop-prod
kubectl apply -k hello/overlays/dev
kubectl apply -k hello/overlays/prod
kubectl get deployments -A -l app=hello

# Clean up
kubectl delete -k hello/overlays/dev
kubectl delete -k hello/overlays/prod
```

### Implementation notes

- **Always pin chart versions.** `helm install` without `--version` installs whatever is newest today, so two environments installed a week apart can differ. The same lesson appears in [The Platform Add-on Layer](12-platform-add-ons.html).
- **Keep your values files in Git.** `--set` on the command line is fine in a lab, but the settings then exist only in Helm's release history.
- **Review what a chart creates before installing it.** `helm template` shows every object, including cluster-wide roles and permissions some charts ask for.
- **Don't mix tools on the same objects.** If Helm installed something, change it with Helm. Editing a Helm-managed object with `kubectl` is undone at the next upgrade.
