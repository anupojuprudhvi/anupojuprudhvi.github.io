---
title: Reading Kubernetes YAML and Working with kubectl
date: 2026-10-01
track: kubernetes-operations
order: 3
module: 3
summary: Every Kubernetes object is written the same way. Learn the four fields every manifest has, just enough YAML to read and write them, how labels and selectors connect objects, namespaces, the difference between imperative commands and kubectl apply, and the kubectl commands you'll use every day.
level: Basics · Hands-on
readingTime: 12 min read
stack: [Kubernetes, kubectl, YAML, kind]
tags: [kubernetes, yaml, kubectl, labels, namespaces, basics, beginner]
---

**In this module, you'll learn to:**

- Read any manifest using the four fields every object has
- Write valid YAML, and connect objects with labels and selectors
- Use namespaces, and work declaratively with `kubectl apply`

**Before you start:** have the kind cluster from [Your First Cluster](02-your-first-cluster.html) running. Every example here works on it.

## Principle · Every object has the same shape

Every Kubernetes object, whether it runs your app, routes traffic, or grants a permission, is described with the same four top-level fields. Once you can read one, you can read them all.

```yaml
apiVersion: apps/v1          # 1. which API group and version defines this kind
kind: Deployment             # 2. what type of object it is
metadata:                    # 3. identity: name, namespace, labels
  name: hello
  namespace: default
  labels:
    app: hello
spec:                        # 4. the desired state: what you want to exist
  replicas: 2
  selector:
    matchLabels:
      app: hello
  template:
    metadata:
      labels:
        app: hello
    spec:
      containers:
        - name: web
          image: nginx:1.27
          ports:
            - containerPort: 80
```

| Field | What it means | You'll see values like |
| --- | --- | --- |
| `apiVersion` | Which version of the API this object follows | `v1`, `apps/v1`, `networking.k8s.io/v1` |
| `kind` | The type of object | `Pod`, `Deployment`, `Service`, `ConfigMap` |
| `metadata` | Its name, namespace, labels, and annotations | `name: hello` |
| `spec` | What you *want*. You write this | replicas, image, ports |
| `status` | What *is*. The cluster writes this, never you | ready replicas, pod IP, conditions |

That last row is the reconciliation loop again: you write `spec`, controllers work until `status` matches it. Run `kubectl get deployment hello -o yaml` and you'll see both.

## YAML · Just enough to read and write manifests

YAML is a way of writing structured data using indentation instead of brackets. Five rules cover nearly every manifest:

- **Indentation is structure.** Use spaces, never tabs. Two spaces per level is the convention. A line indented under another belongs to it.
- **`key: value` makes a map** (a set of named fields). Note the space after the colon.
- **A dash `-` starts a list item.** `containers:` is a list, so each container begins with `- name:`.
- **`---` separates documents**, so one file can hold a Deployment and its Service.
- **`#` starts a comment.** Quote values that look like numbers or booleans but must be strings, such as `"true"` or `"8080"` in an annotation.

```yaml
# A map with a nested map and a list
metadata:
  name: hello          # key: value
  labels:              # a nested map
    app: hello
    tier: web
spec:
  containers:          # a list...
    - name: web        # ...whose first item is a map
      image: nginx:1.27
    - name: sidecar    # second item
      image: busybox:1.36
```

The most common beginner error is indentation that's one space off, which either fails with a parse error or, worse, silently attaches a field to the wrong parent. `kubectl apply --dry-run=server -f file.yaml` checks a file against the cluster without changing anything.

## Labels · How objects find each other

Kubernetes objects don't reference each other by ID. They use **labels** (key/value tags in `metadata.labels`) and **selectors** (queries that match labels). In the Deployment above, `selector.matchLabels: app: hello` means "the pods I own are the ones labelled `app: hello`", and the pod template gives every new pod that label.

A Service finds its pods the same way. That's the glue between almost every object in this track:

```flow
title: Labels and selectors connect objects
Deployment hello | selector: app=hello; creates pods with that label
-> creates
* Pods | labels: app=hello, tier=web
-> found by label, not by name or IP
Service hello | selector: app=hello; sends traffic to every matching ready pod
```

```text
# See labels on pods
kubectl get pods --show-labels

# Select pods by label
kubectl get pods -l app=hello
kubectl get pods -l 'tier in (web, api)'

# Add a label to a running pod
kubectl label pod <pod-name> owner=me
```

If a selector and a label don't match, nothing errors. The Service just has no pods behind it, which is the first thing [Services & Cluster Networking](06-services-and-cluster-networking.html) teaches you to check.

## Namespaces · Sections of a cluster

A **namespace** groups related objects. Names only have to be unique inside a namespace, so two teams can both have a Deployment called `api`. Every command runs against one namespace, `default` unless you say otherwise.

```text
# List namespaces; kube-system holds Kubernetes' own components
kubectl get namespaces

# Create one and work in it
kubectl create namespace shop
kubectl get pods -n shop

# Every namespace at once
kubectl get pods -A

# Make "shop" the default for your current context
kubectl config set-context --current --namespace=shop
```

Namespaces are also where permissions and quotas attach, covered in [Namespaces, RBAC & Service Accounts](08-namespaces-rbac-and-cluster-access.html).

## Two styles · Imperative commands and declarative files

In the last module you used **imperative** commands: `kubectl create deployment`, `kubectl scale`. They're quick for experiments, but nothing records what you did, so nobody can review it or recreate it.

Real work uses the **declarative** style: write the desired state in a file, keep the file in Git, and run `kubectl apply`. Apply is safe to repeat. It creates what's missing, changes what's different, and leaves the rest alone.

```text
# Let kubectl write the YAML for you, as a starting point
kubectl create deployment hello --image=nginx:1.27 \
  --dry-run=client -o yaml > hello.yaml

# Create or update everything in the file
kubectl apply -f hello.yaml

# Edit the file (say, replicas: 3), then preview the change before applying it
kubectl diff -f hello.yaml
kubectl apply -f hello.yaml

# Delete everything the file describes
kubectl delete -f hello.yaml
```

```flow
title: The declarative workflow you'll use from here on
Edit a YAML file | change the desired state, such as replicas or the image tag
-> kubectl diff shows exactly what will change
Review | in a pull request, in a real team
-> kubectl apply -f
* Cluster | controllers make the actual state match the file
loop: the file in Git is the record of what should be running
```

Later in the track, [Helm & Kustomize](09-helm-and-kustomize.html) handle the same files across several environments, and [GitOps with Argo CD](16-gitops-with-argo-cd.html) runs `apply` for you whenever Git changes.

## Cheat sheet · The kubectl commands you'll use every day

| Command | What it does |
| --- | --- |
| `kubectl get <kind>` | List objects. Add `-o wide` for more columns, `-o yaml` for everything, `-w` to watch |
| `kubectl describe <kind> <name>` | Human-readable detail, including recent **events**. The first place to look when something's wrong |
| `kubectl logs <pod>` | A container's output. `-f` follows it, `--previous` shows the last crashed run |
| `kubectl exec -it <pod> -- sh` | A shell inside a running container |
| `kubectl apply -f <file>` | Create or update from a file |
| `kubectl delete -f <file>` | Delete what a file describes |
| `kubectl get events --sort-by=.lastTimestamp` | What the cluster has been doing recently, newest at the bottom |
| `kubectl explain <kind>.<field>` | Built-in documentation for any field, such as `kubectl explain deployment.spec.replicas` |
| `kubectl port-forward <svc-or-pod> 8080:80` | Reach something in the cluster from your laptop |
| `kubectl config get-contexts` | Which clusters you can talk to, and which one is current |

## Try it · Deploy an app and its Service from one file

Save this as `hello.yaml`, a Deployment and a Service in one file:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello
  labels:
    app: hello
spec:
  replicas: 2
  selector:
    matchLabels:
      app: hello
  template:
    metadata:
      labels:
        app: hello
    spec:
      containers:
        - name: web
          image: nginx:1.27
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: hello
  labels:
    app: hello
spec:
  selector:
    app: hello
  ports:
    - port: 80
      targetPort: 80
```

```text
kubectl apply -f hello.yaml
kubectl get deployment,service,pods -l app=hello

# The pod IPs behind the Service
kubectl get endpointslices -l kubernetes.io/service-name=hello

# Break the link on purpose: in hello.yaml, change the Service's selector
# to app: hellooo, apply again, and re-run the endpointslices command.
# The Service now has no pods behind it. Change it back and apply again.

# Clean up
kubectl delete -f hello.yaml
```

### Implementation notes

- **Start from generated YAML.** `--dry-run=client -o yaml` and the examples in the Kubernetes docs are better starting points than writing manifests from memory.
- **Don't copy `status` or generated fields back into your files.** `kubectl get -o yaml` output includes `status`, `uid`, `resourceVersion`, and timestamps. Strip them before saving a manifest.
- **Use the same label keys everywhere.** The common convention is `app.kubernetes.io/name` and `app.kubernetes.io/instance`; short labels like `app` work fine as long as everyone agrees on them.
- **`kubectl edit` changes the live object only.** It's handy in a lab, but the change isn't in any file, so the next `apply` from Git quietly undoes it.

## Recap · Key terms

- **Manifest:** a YAML file describing one or more objects you want to exist.
- **spec and status:** what you want (you write it) and what is (the cluster writes it).
- **Label:** a key/value tag on an object, such as `app: hello`.
- **Selector:** a query that matches labels; how Deployments and Services find their pods.
- **Namespace:** a named section of a cluster; names only need to be unique inside one.
- **Declarative:** describing the desired state in files and applying them, rather than issuing one-off commands.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: Which field of an object is written by the cluster, never by you?
- `spec`
- `metadata`
* `status`
- `apiVersion`
= You write `spec`, the desired state. Controllers write `status`, the actual state, and keep working until the two match.
S: Your Service's selector says `app: web`, but your Deployment's pods are labelled `app: hello`. You apply both. What happens?
- kubectl rejects the Service with a validation error
- The Service renames the pods' labels to match
* Both are created, but the Service has no pods behind it, so requests fail
- The Service sends traffic to every pod in the namespace instead
= Objects find each other through labels and selectors. A mismatch isn't an error; the Service simply matches nothing, which is why "no endpoints" is the first thing to check.
Q: In a manifest, what does a line starting with `- ` mean?
- A comment
* An item in a list
- A field that's been removed
- The start of a new document
= A dash starts a list item, such as each container under `containers:`. Comments start with `#`, and `---` separates documents in one file.
Q: Why prefer `kubectl apply -f` with files in Git over commands like `kubectl create` and `kubectl scale`?
- `apply` is faster
- Imperative commands don't work on real clusters
* The files are a reviewable, repeatable record of what should be running
- `apply` skips the API server's checks
= Imperative commands leave no record. Files in Git can be reviewed, diffed, and re-applied safely, which is the foundation for everything from Helm to GitOps.
S: You run `kubectl get pods` and see nothing, but you know your app is running. What's the most likely reason?
- The pods are still being scheduled
* The pods are in a different namespace from your current one
- kubectl only shows pods you created yourself
- The pods have no labels
= Commands run against one namespace, `default` unless you say otherwise. Try `kubectl get pods -A`, or add `-n <namespace>`.
```
