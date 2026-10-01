---
title: Containers from Scratch: Namespaces, cgroups & Overlay Filesystems
date: 2026-10-01
track: linux-for-devops
order: 16
module: 16
summary: A container isn't a small virtual machine. It's an ordinary Linux process with a restricted view of the system. Build one by hand with namespaces, a cgroup, and an overlay filesystem, then find the same pieces inside a real Docker container, and fix containers that suddenly can't reach the internet.
level: Linux for DevOps · Hands-on lab
readingTime: 16 min read
stack: [namespaces, unshare, cgroups v2, overlayfs, capabilities, seccomp, Docker]
tags: [linux, containers, namespaces, cgroups, overlayfs, docker, devops]
---

**In this module, you'll learn to:**

- Explain the Linux features a container is made of: namespaces, cgroups, an overlay filesystem, capabilities, and seccomp
- Build a working container by hand with `unshare`, `chroot`, and a cgroup
- Find those same pieces in a running Docker container, and diagnose container networking from the host

**Before you start:** finish Part 2, especially [Processes](08-processes-and-signals.html), [Memory](09-memory-and-the-oom-killer.html), and [Networking Basics](11-networking-basics.html). Open a shell on your lab VM with `multipass shell lab`.

## Principle · A container is a process with blinkers on

On the host, a container's main process is just another process: you can see it in `ps`, with a normal PID. What makes it a container is how the kernel restricts it:

| Linux feature | What it gives the container |
| --- | --- |
| **Namespaces** | Its own view of process IDs, network interfaces, mounts, hostname, and users. It can't see the rest of the host |
| **cgroups** | Limits on how much CPU, memory, and I/O it can use |
| **Overlay filesystem** | A root filesystem built from read-only image layers, plus a thin writable layer on top |
| **Capabilities** | Root inside the container gets only a few of root's powers |
| **seccomp** | A filter that blocks dozens of risky system calls outright |

There's no separate kernel, as there would be in a VM. Every container shares the host's kernel, which is why containers start in milliseconds and why a kernel vulnerability matters to all of them.

```flow
title: What docker run sets up, using plain Linux features
Image | read-only layers pulled from a registry
-> overlayfs stacks the layers and adds a writable layer on top
Root filesystem | what the container sees as /
-> namespaces give it its own PIDs, network, mounts, and hostname
Isolated view | it sees only its own processes and interfaces
-> a cgroup applies the --memory and --cpus limits
Limits | the kernel enforces them; going over memory means an OOM kill
-> capabilities are dropped and a seccomp filter is applied
* Container process | an ordinary process on the host, with a restricted view
```

## Namespaces · Build the isolation by hand

First, a tiny root filesystem. `busybox` is a single static program that acts as `sh`, `ls`, `ps`, and hundreds of other commands:

```text
sudo apt install -y busybox-static
mkdir -p ~/ctr/rootfs/{bin,proc,sys,tmp}
cp /bin/busybox ~/ctr/rootfs/bin/
sudo chroot ~/ctr/rootfs /bin/busybox --install -s /bin
ls ~/ctr/rootfs/bin | head
```

Now start a shell in new namespaces, with that directory as its root:

```text
sudo unshare --uts --pid --mount --net --ipc --fork \
  chroot ~/ctr/rootfs /bin/sh
```

Inside it:

```text
mount -t proc proc /proc
hostname container-1
hostname           # container-1, while the host keeps its own name
ps                 # PID 1 is this shell; the host's processes are invisible
ip link            # only a loopback interface: a network of its own, empty
exit
```

| Flag | Namespace | What it isolated |
| --- | --- | --- |
| `--uts` | UTS | The hostname |
| `--pid` | PID | Process IDs: the shell became PID 1 |
| `--mount` | Mount | Mounts: the `/proc` you mounted is invisible to the host |
| `--net` | Network | Interfaces, routes, ports, and firewall rules |
| `--ipc` | IPC | Shared memory and message queues |

Container runtimes also use **user** namespaces (root inside maps to an ordinary user outside) and **cgroup** namespaces. `lsns` lists every namespace on the host.

## cgroups · Add a memory limit

cgroups (version 2 on current distributions) are managed through files under `/sys/fs/cgroup`. Create one, limit it to 50 MB, and start the container inside it:

```text
sudo mkdir /sys/fs/cgroup/demo
echo 50M | sudo tee /sys/fs/cgroup/demo/memory.max
echo 0   | sudo tee /sys/fs/cgroup/demo/memory.swap.max

# The inner shell moves itself into the cgroup, then becomes the container
sudo sh -c 'echo $$ > /sys/fs/cgroup/demo/cgroup.procs &&
  exec unshare --uts --pid --mount --net --ipc --fork chroot '"$HOME"'/ctr/rootfs /bin/sh'
```

Inside the container, try to hold 100 MB in a shell variable:

```text
x=$(head -c 100000000 /dev/zero | tr '\0' a); echo "survived"
```

You never see "survived": the kernel's OOM killer ends it at the 50 MB limit, exactly as in [Memory, the Page Cache & the OOM Killer](09-memory-and-the-oom-killer.html). Back on the host:

```text
grep oom_kill /sys/fs/cgroup/demo/memory.events    # the kill, counted
sudo rmdir /sys/fs/cgroup/demo                     # remove the empty cgroup
```

## Overlay · Image layers and copy-on-write

Container images are read-only layers. **overlayfs** stacks them and puts a writable layer on top. Changing a file copies it up into the writable layer, so the image itself never changes, and a hundred containers can share one copy of it.

```text
mkdir -p ~/ovl/{lower,upper,work,merged}
echo "from the image" > ~/ovl/lower/a.txt
sudo mount -t overlay overlay \
  -o lowerdir=$HOME/ovl/lower,upperdir=$HOME/ovl/upper,workdir=$HOME/ovl/work \
  $HOME/ovl/merged

cat ~/ovl/merged/a.txt                        # from the image
echo "changed in the container" | sudo tee ~/ovl/merged/a.txt
cat ~/ovl/lower/a.txt                         # unchanged: still "from the image"
cat ~/ovl/upper/a.txt                         # the copied-up, changed version
sudo umount ~/ovl/merged
```

Deleting the writable layer resets the container to the image. That's why anything written inside a container is lost when it's removed, unless it's on a mounted volume.

## Compare · Find the same pieces in Docker

```text
sudo apt install -y docker.io
sudo docker run -d --name web --memory 64m nginx:alpine

PID=$(sudo docker inspect -f '{{.State.Pid}}' web)
ps -o pid,user,cmd -p "$PID"         # nginx, as an ordinary host process
sudo lsns -p "$PID"                  # the namespaces it lives in
cat /proc/"$PID"/cgroup              # its cgroup...
cat /sys/fs/cgroup/system.slice/docker-$(sudo docker inspect -f '{{.Id}}' web).scope/memory.max
                                     # ...and the 64 MB limit: 67108864 bytes
findmnt -t overlay | head -3         # the overlay root filesystems
grep Cap /proc/"$PID"/status         # its reduced set of capabilities
sudo docker rm -f web
```

`--privileged` turns off nearly all of these protections, giving the container every capability and the host's devices. Treat it as "root on the host", and avoid it outside special cases. Kubernetes runs containers with exactly these features, and the [Kubernetes track](../kubernetes-operations/01-why-kubernetes.html) builds on everything in this module.

## Break it, fix it · Containers lost the internet

A security hardening script ran on the Docker host this morning. The host itself is fine, but container builds now fail with "bad address" when they download packages. Reproduce it:

```text
sudo docker run --rm alpine ping -c 2 1.1.1.1      # works, before the change
sudo sysctl -w net.ipv4.ip_forward=0                # what the script changed
sudo docker run --rm alpine wget -qO- -T 5 http://example.com
```

Your job: find out why containers can't get out when the host can, and fix it so it stays fixed. Try it before opening a hint.

### Hint 1 · Where to look

- First split the problem: is it name lookup, or all traffic? Then remember that a container's traffic leaves through the host. The host has to pass packets from the container's network on to its own, which is a setting, not a firewall rule.

### Hint 2 · Which tool

- Compare `sudo docker run --rm alpine ping -c 2 1.1.1.1` with `ping -c 2 1.1.1.1` on the host. Then `sysctl net.ipv4.ip_forward`, and `grep -r ip_forward /etc/sysctl.conf /etc/sysctl.d/` to see where it's set permanently.

### Hint 3 · The cause and the fix

- **Cause:** containers sit on a private bridge network, and the host routes their packets out. `net.ipv4.ip_forward=0` tells the kernel not to forward packets between interfaces, so everything from containers stops at the host. DNS fails first, which is why the error says "bad address", but a ping to an IP address fails too.
- **Fix:** `sudo sysctl -w net.ipv4.ip_forward=1`. To keep it after a reboot, find and fix the line the script wrote under `/etc/sysctl.d/` or in `/etc/sysctl.conf`.
- **Prevent it:** hardening baselines often disable forwarding, which is right for most servers but breaks container hosts and Kubernetes nodes. Keep a separate baseline for them, and test container networking after any hardening run.

### Implementation notes

- **Containers share the host kernel.** Patch the host promptly; a kernel vulnerability affects every container on it.
- **Run as a non-root user inside the image,** and use user namespaces or rootless mode where you can. Root in a container is still root on many host resources.
- **Set memory limits on every container,** so one leak is an OOM kill of one container, not of the host.
- **`nsenter -t <PID> -n ip addr`** runs a host tool inside a container's network namespace, which is the quickest way to debug a container that has no tools installed.

## Recap · Key terms

- **Namespace:** a kernel feature that gives a process its own view of one resource, such as PIDs or networks.
- **cgroup:** a group of processes the kernel limits and measures together.
- **overlayfs:** stacks read-only layers with a writable layer on top, copying files up on change.
- **Capabilities:** root's powers split into pieces, so a container gets only the few it needs.
- **seccomp:** a filter that blocks risky system calls.
- **`--privileged`:** turns off the container's protections; effectively root on the host.
- **`ip_forward`:** the setting that lets the host route packets for containers.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: What gives a container its own list of process IDs, with its main process as PID 1?
* A PID namespace
- A cgroup
- overlayfs
- seccomp
= Namespaces control what a process can see. The PID namespace gives it its own numbering, so its first process is PID 1 inside, while it has an ordinary PID on the host.
Q: Which Linux feature enforces `docker run --memory 64m`?
- A mount namespace
* A cgroup memory limit
- A capability
- The overlay filesystem
= Docker writes the limit to the container's cgroup (`memory.max`). Going over it triggers an OOM kill inside that cgroup.
Q: Why does a file you changed inside a container disappear when the container is removed?
- Containers encrypt their files
* Changes go to the container's writable overlay layer, which is deleted with the container
- Docker restores the image every hour
- The file was in a different namespace
= The image layers stay read-only. Changes are copied up into a per-container layer, so anything that must survive belongs on a volume.
S: A container has no shell or networking tools, and you need to check its IP address and routes. What do you do?
- Install tools in the running container
- Run it with `--privileged`
* Use `sudo nsenter -t <PID> -n ip addr` from the host, with the container's PID
- Rebuild the image with debugging tools
= `nsenter` runs the host's own `ip` command inside the container's network namespace, without changing the container at all.
S: A team asks for `--privileged` because their container "needs to change a network setting". What do you suggest?
- Approve it; it's only one container
* Grant only the specific capability it needs, such as `--cap-add NET_ADMIN`, instead of `--privileged`
- Run the whole host without seccomp
- Move the container to its own VM
= `--privileged` removes nearly every protection. Adding the one capability the task needs keeps the rest in place.
```
