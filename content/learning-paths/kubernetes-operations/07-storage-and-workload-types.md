---
title: Storage & Other Workload Types: Data That Outlives a Pod
date: 2026-10-01
track: kubernetes-operations
order: 7
module: 7
summary: A pod's files disappear with the pod. How volumes, PersistentVolumeClaims, and StorageClasses give an app storage that survives restarts, how StatefulSets run apps that need a stable identity, and when to use a DaemonSet, Job, or CronJob instead of a Deployment.
level: Core concepts · Storage & workloads
readingTime: 10 min read
stack: [Kubernetes, PersistentVolumes, StorageClass, StatefulSet, DaemonSet, Job, CronJob]
tags: [kubernetes, storage, persistent-volumes, statefulset, jobs, fundamentals]
---

**Before you start:** this builds on [Pods, Deployments & Rollouts](05-pods-deployments-and-rollouts.html), especially the idea that pods are disposable, and on [Services & Cluster Networking](06-services-and-cluster-networking.html) for headless Services.

## Principle · A container's files die with the pod

Everything a container writes to its own filesystem is lost when the container restarts or the pod is replaced. For most web services that's exactly right: they keep their data in a database, not on local disk, and that's what makes them easy to replace, move, and scale.

Some workloads do need data to survive: a database you run yourself, a message broker, an app that stores uploaded files. Kubernetes handles that by keeping the **storage separate from the pod**, so a new pod can pick up the same disk the old one used.

## Volumes · From scratch space to persistent disks

A **volume** is a directory that's mounted into a container. The volume type decides where the data actually lives and how long it lasts:

| Volume type | Where the data lives | Lasts as long as |
| --- | --- | --- |
| `emptyDir` | The node's disk (or memory) | The pod. Good for scratch space and sharing files between containers in one pod |
| `configMap` / `secret` | A ConfigMap or Secret in the cluster | The ConfigMap or Secret. Used to mount config files |
| `persistentVolumeClaim` | A real disk, such as an EBS volume on AWS | Until you delete the claim, through any number of pods |

## Persistent storage · Three objects, one disk

Persistent storage is split into three objects, so that the people writing apps don't need to know how disks are created:

- **StorageClass:** *how* disks are made. Set up once per cluster by the platform team: which driver, which disk type, which zone rules.
- **PersistentVolumeClaim (PVC):** *a request* for storage, written by the app team: "10 GiB, readable and writable by one node".
- **PersistentVolume (PV):** *the actual disk*, created automatically by the StorageClass's driver to satisfy the claim.

```flow
title: How a pod gets a persistent disk
Pod orders-db | mounts the volume from claim "orders-data"
-> the pod refers to the claim by name
* PersistentVolumeClaim orders-data | asks for 10Gi, ReadWriteOnce, class gp3
-> the StorageClass's driver sees an unbound claim
StorageClass gp3 | provisioner: ebs.csi.aws.com on EKS, a local folder on kind
-> creates the disk and a PersistentVolume that records it
PersistentVolume | a real 10Gi disk, now bound to the claim
loop: delete the pod and a new one mounts the same claim, with the same data
```

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: orders-data
spec:
  accessModes: [ReadWriteOnce]   # one node at a time can mount it read-write
  storageClassName: standard     # kind's built-in class; gp3 or similar on EKS
  resources:
    requests:
      storage: 10Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: writer
spec:
  containers:
    - name: app
      image: busybox:1.36
      command: ["sh", "-c", "date >> /data/log.txt; sleep 3600"]
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: orders-data
```

The **access mode** matters more than it looks. `ReadWriteOnce` means one node at a time, which is what block disks such as Amazon EBS support. `ReadWriteMany` lets pods on many nodes share the volume, which needs a network file system such as Amazon EFS. On AWS, an EBS volume also lives in a single Availability Zone, which is why [The Platform Add-on Layer](12-platform-add-ons.html) sets its StorageClass to wait until the pod is scheduled before creating the disk.

## StatefulSet · For apps that need a stable identity

A Deployment treats its pods as identical and interchangeable: random names, any pod can be replaced by any other, and they all share one PVC if they mount one. Clustered software such as databases and brokers can't work like that. Each member needs its **own disk** and a **name that stays the same** when it restarts, so the others can find it.

A **StatefulSet** provides both:

- Pods are named in order, `orders-db-0`, `orders-db-1`, `orders-db-2`, and keep those names when they're replaced.
- Each pod gets its own PVC from a `volumeClaimTemplates` section, and gets the *same* PVC back after a restart.
- Pods start one at a time, in order, and stop in reverse order.
- With a headless Service, each pod gets its own DNS name, such as `orders-db-0.orders-db`.

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: orders-db
spec:
  serviceName: orders-db         # a headless Service (clusterIP: None) with this name
  replicas: 3
  selector:
    matchLabels: { app: orders-db }
  template:
    metadata:
      labels: { app: orders-db }
    spec:
      containers:
        - name: db
          image: <database-image>
          volumeMounts:
            - name: data
              mountPath: /var/lib/data
  volumeClaimTemplates:          # one PVC per pod: data-orders-db-0, -1, -2
    - metadata:
        name: data
      spec:
        accessModes: [ReadWriteOnce]
        resources:
          requests:
            storage: 20Gi
```

Running a production database on Kubernetes is possible, but it makes backups, upgrades, and failover your job. On AWS, most teams use a managed service such as Amazon RDS or Aurora for the database, and keep the cluster for stateless apps. Learn StatefulSets anyway: plenty of add-ons and tools you'll install use them.

## Other workload types · Picking the right controller

| Controller | Runs | Use it for |
| --- | --- | --- |
| Deployment | N identical, interchangeable pods, forever | Web apps and APIs. The default choice |
| StatefulSet | N pods with stable names and their own disks | Databases, brokers, clustered software |
| DaemonSet | Exactly one pod on every node (or every matching node) | Node agents: log shippers, monitoring agents, network plugins |
| Job | Pods that run until a task succeeds, then stop | Database migrations, one-off batch work |
| CronJob | A Job, on a schedule | Nightly reports, clean-ups, periodic syncs |

```yaml
# A CronJob that runs a report every night at 02:00, in the control plane's
# time zone (usually UTC) unless you set spec.timeZone
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-report
spec:
  schedule: "0 2 * * *"
  concurrencyPolicy: Forbid      # don't start a new run while one is still going
  jobTemplate:
    spec:
      backoffLimit: 2            # retry a failed run twice, then give up
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: report
              image: busybox:1.36
              command: ["sh", "-c", "echo building report; sleep 5"]
```

## Try it · Prove the data survives

On the kind cluster from [Your First Cluster](02-your-first-cluster.html), which comes with a `standard` StorageClass:

```text
# Save the PVC and Pod from above as storage.yaml, then:
kubectl apply -f storage.yaml
kubectl get pvc,pv

# Read the file, delete the pod, recreate it, and read it again:
# the first line is still there, and a second one has been added
kubectl exec writer -- cat /data/log.txt
kubectl delete pod writer --now
kubectl apply -f storage.yaml
kubectl exec writer -- cat /data/log.txt

# Run a Job once and read its output
kubectl create job hello-job --image=busybox:1.36 -- echo "job done"
kubectl get jobs
kubectl logs job/hello-job

# Clean up; deleting the claim deletes the disk with this StorageClass
kubectl delete -f storage.yaml
kubectl delete job hello-job
```

### Implementation notes

- **Check the reclaim policy before deleting a claim.** With `Delete` (the usual default) the disk goes when the claim goes. Use a StorageClass with `Retain` for data you can't afford to lose by mistake, and back it up separately.
- **Deleting a StatefulSet keeps its PVCs by default.** That protects the data, but abandoned volumes keep costing money until someone removes them.
- **A pod stuck in `Pending` with a PVC** often means the claim can't be satisfied: no default StorageClass, a zone mismatch, or an access mode the driver doesn't support. `kubectl describe pvc` shows why.
- **Jobs need `restartPolicy: OnFailure` or `Never`.** A Job's whole point is to finish; the `Always` policy that Deployments use isn't allowed.
