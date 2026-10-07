---
title: Performance & Kernel Tuning
date: 2026-10-01
track: linux-for-devops
order: 19
module: 19
summary: Tuning starts with measuring, not with a list of settings copied from the internet. Load-test a web server, change one thing at a time, and learn the kernel settings that genuinely matter for busy servers, container hosts, and Kubernetes nodes. Then find why connections drop at random under load.
level: Linux for DevOps · Hands-on lab
readingTime: 14 min read
stack: [sysctl, ab, nginx, conntrack, iostat, perf]
tags: [linux, performance, sysctl, tuning, conntrack, load-testing, kubernetes]
motif: monitor
---

**In this module, you'll learn to:**

- Run a load test, read its results, and compare a change against a baseline
- Read and persist kernel settings with `sysctl`, and know which ones matter and why
- Recognise cloud-specific limits (CPU steal, volume IOPS) and a full connection-tracking table

**Before you start:** finish [A Troubleshooting Method](13-troubleshooting-method.html) and [Networking Basics](11-networking-basics.html). Open a shell on your lab VM with `multipass shell lab`, and install the tools:

```text
sudo apt install -y nginx apache2-utils conntrack
```

## Principle · Measure, change one thing, measure again

Most "performance tuning" found online is a list of settings someone else used on different hardware for a different workload. Applied blindly, they're as likely to hurt as help. The method is always the same:

```flow
title: The tuning loop
Baseline | measure under a realistic load: throughput, latency percentiles, errors
-> find the bottleneck with the USE method (Module 13)
Hypothesis | one specific change that should relieve that bottleneck
-> change exactly one thing
Measure again | the same test, the same load
-> better? keep it and write down why; worse or no change? revert it
* Documented setting | in config management, with the reason and the measurement
```

## Lab · Load-test nginx

`ab` (ApacheBench) sends a fixed number of requests with a fixed number running at once:

```text
# Baseline: 20,000 requests, 100 at a time, a new connection for each request
ab -n 20000 -c 100 http://127.0.0.1/ | grep -E "Requests per second|Failed|50%|99%"
```

While it runs, watch the server from a second terminal with `mpstat 1` and `ss -s`. You'll see thousands of connections in `TIME_WAIT`, because each request opened and closed its own TCP connection.

Now change exactly one thing: reuse connections with HTTP keep-alive (`-k`), as browsers and well-configured clients do:

```text
ab -k -n 20000 -c 100 http://127.0.0.1/ | grep -E "Requests per second|Failed|50%|99%"
```

Compare requests per second and the 99th percentile latency with the baseline. Connection reuse is often the biggest single improvement available, and it needed no kernel setting at all. Always look at percentiles, not only averages: the 99th percentile is what your slowest users feel.

## sysctl · Kernel settings that matter

Kernel settings live under `/proc/sys`, and `sysctl` reads and writes them:

```text
sysctl net.core.somaxconn                         # read one
sudo sysctl -w vm.swappiness=10                   # change it now (lost at reboot)
echo "vm.swappiness=10" | sudo tee /etc/sysctl.d/60-swappiness.conf
sudo sysctl --system                              # load every file under /etc/sysctl.d/
```

A short list worth knowing, and when each one matters:

| Setting | What it controls | When it matters |
| --- | --- | --- |
| `net.core.somaxconn` | The longest queue of connections waiting to be accepted | Very bursty traffic; the app must also ask for a long queue |
| `net.ipv4.ip_local_port_range` | The range of local ports for outgoing connections | Proxies and clients making huge numbers of outgoing connections |
| `net.ipv4.tcp_tw_reuse` | Reusing `TIME_WAIT` ports for new outgoing connections | The same as above, alongside connection reuse |
| `net.netfilter.nf_conntrack_max` | How many connections the firewall can track at once | Busy servers with firewall rules, container hosts, Kubernetes nodes |
| `fs.file-max` | The system-wide limit on open files | Rarely; the per-service `LimitNOFILE` is usually the real limit |
| `vm.swappiness` | How readily the kernel swaps | Latency-sensitive servers that have swap |
| `net.ipv4.ip_forward` | Routing packets between interfaces | Must be 1 on container hosts and Kubernetes nodes (Module 16) |
| `net.bridge.bridge-nf-call-iptables` | Firewall rules seeing bridged container traffic | Kubernetes nodes; needs the `br_netfilter` module loaded |

## Cloud · Limits you can't see from inside

Cloud servers have limits that look like Linux problems but aren't:

- **CPU steal:** `st` in `vmstat` or `mpstat`. Burstable instance types (for example AWS T-family instances) slow down sharply once their CPU credits run out.
- **Volume performance:** cloud disks have IOPS and throughput limits set by their type and size. An AWS gp3 volume, for example, gives 3,000 IOPS and 125 MiB/s by default unless you provision more. In `iostat`, hitting the limit looks like a busy disk with rising `await` at a suspiciously round number of operations per second.
- **Network allowances:** instances have bandwidth and packets-per-second limits that grow with instance size.

The fix for these is in the cloud console or the instance type, not in `sysctl`.

For CPU-heavy problems, `sudo perf top` shows which functions use the CPU right now, and a **flame graph** built from `perf record -g` shows where time goes across a whole program. Both are worth learning when you need to explain why a process is busy, not just that it is.

## Break it, fix it · Random drops under load

A busy server drops some connections when traffic peaks. Clients see occasional timeouts; nginx's logs show nothing wrong, and CPU and memory are fine. Reproduce it with a stateful firewall rule, as most servers have, and the connection-tracking setting the server shipped with:

```text
sudo nft add table inet lab
sudo nft add chain inet lab input '{ type filter hook input priority 0; policy accept; }'
sudo nft add rule inet lab input ct state established,related accept
sudo sysctl -w net.netfilter.nf_conntrack_max=256

ab -n 5000 -c 50 -s 5 http://127.0.0.1/ 2>&1 | tail -3
```

The test stalls and aborts with a timeout. Your job: find out where the connections are going, and fix it. Try it before opening a hint.

### Hint 1 · Where to look

- nginx never saw the dropped connections, so they were lost before reaching it, inside the kernel. The kernel complains when it has to throw packets away; check where it writes those complaints.

### Hint 2 · Which tool

- `sudo dmesg -T | tail` shows the kernel's message. Then compare `cat /proc/sys/net/netfilter/nf_conntrack_count` with `sysctl net.netfilter.nf_conntrack_max`, and check the `drop` and `insert_failed` counters in `sudo conntrack -S`.

### Hint 3 · The cause and the fix

- **Cause:** with a stateful firewall rule, the kernel tracks every connection in the **conntrack table**, including closed connections for a while afterwards. With `nf_conntrack_max` at 256, the table fills within seconds under load, and the kernel drops new connections with "nf_conntrack: table full, dropping packet". The client's SYN is never answered, so it times out.
- **Fix:** raise the limit, `sudo sysctl -w net.netfilter.nf_conntrack_max=262144`, and make it permanent in `/etc/sysctl.d/60-conntrack.conf`. Rerun `ab`: it completes. Clean up with `sudo nft delete table inet lab`.
- **Prevent it:** monitor `nf_conntrack_count` against `nf_conntrack_max` on busy servers, container hosts, and Kubernetes nodes, and alert at around 80%. Connection reuse (keep-alive) also reduces the number of entries.

### Implementation notes

- **Write down why every setting exists.** A tuned value with no comment becomes a mystery nobody dares change.
- **Test under realistic load, from realistic places.** A load test from the same machine skips the network entirely, which is fine for a lab and misleading for a capacity plan.
- **Look at the 99th percentile,** not just the average. An average can look healthy while one request in a hundred takes seconds.
- **Bigger isn't always better.** Huge buffers and queues can hide overload and add latency, instead of failing fast and letting a load balancer send traffic elsewhere.

## Recap · Key terms

- **Baseline:** a measurement before any change, to compare against.
- **Percentile latency:** the time within which 50%, 99%, or 99.9% of requests finish.
- **Keep-alive:** reusing one TCP connection for many requests.
- **sysctl:** reads and sets kernel settings; files in `/etc/sysctl.d/` make them permanent.
- **conntrack table:** the kernel's record of tracked connections, used by stateful firewall rules and NAT.
- **CPU steal and IOPS limits:** cloud limits that look like Linux problems.
- **Flame graph:** a picture of where a program spends its CPU time.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: What's the right first step before tuning a kernel setting?
- Apply a list of recommended settings from a blog
* Measure a baseline under realistic load and find the actual bottleneck
- Reboot the server
- Raise every limit to its maximum
= Without a baseline, you can't tell whether a change helped, and without finding the bottleneck, you're likely tuning the wrong thing.
Q: How do you make a `sysctl` change survive a reboot?
- Run `sysctl -w` twice
* Put it in a file under `/etc/sysctl.d/`, then load it with `sysctl --system`
- Add it to `~/.bashrc`
- Write it to `/proc/sys` directly
= `sysctl -w` changes the running kernel only. Files in `/etc/sysctl.d/` are applied at every boot.
Q: Why report the 99th percentile latency as well as the average?
- The average is always wrong
* The average can look fine while the slowest 1% of requests are very slow
- Percentiles are faster to calculate
- Load balancers only use percentiles
= Averages hide outliers. The 99th percentile shows what your slowest users experience, which is often what they complain about.
S: An AWS instance's disk shows exactly 3,000 operations per second during peaks, with `await` climbing, no matter what the application does. What's the likely cause?
- A bug in the filesystem
* The volume is hitting its provisioned IOPS limit
- The page cache is too small
- The CPU is being throttled
= A suspiciously round, flat ceiling is the volume's limit. A gp3 volume defaults to 3,000 IOPS; provisioning more, or a different volume type, raises it.
S: A Kubernetes node intermittently drops new connections at peak traffic, and `dmesg` shows "table full, dropping packet". What do you change?
- `vm.swappiness`
- `fs.file-max`
* `net.netfilter.nf_conntrack_max`, and monitor the count against it
- `net.ipv4.ip_forward`
= That message comes from connection tracking. Nodes track every connection for Services and NAT, so the table limit needs to fit the peak, with monitoring to catch growth.
```
