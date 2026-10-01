---
title: Memory, the Page Cache & the OOM Killer
date: 2026-10-01
track: linux-for-devops
order: 9
module: 9
summary: Why "free memory" is nearly always low on a healthy server, which number actually matters, how swap and memory limits work, and what the kernel does when memory runs out. Then find the out-of-memory kill behind a job that dies without leaving a single error in its own log.
level: How Linux works · Core concept
readingTime: 13 min read
stack: [free, vmstat, /proc/meminfo, OOM killer, cgroups, systemd-run]
tags: [linux, memory, page-cache, swap, oom, cgroups, troubleshooting]
---

**In this module, you'll learn to:**

- Read `free` correctly, and explain the page cache and why it isn't "used" memory
- Find the processes using the most memory, and understand swap and memory limits
- Recognise an out-of-memory kill and find the evidence the process itself never logs

**Before you start:** finish [Processes, Signals & File Descriptors](08-processes-and-signals.html). Open a shell on your lab VM with `multipass shell lab`.

## Principle · Unused memory is wasted memory

Reading from disk is thousands of times slower than reading from memory. So Linux keeps recently read files in otherwise idle memory, in the **page cache**. The next read comes from memory instead of disk. When a program needs that memory, the kernel simply drops some cached pages and hands it over.

That's why a healthy server that has been up for a while shows very little "free" memory. It isn't a leak. The kernel is putting idle memory to work.

```text
free -h
#                total        used        free      shared  buff/cache   available
# Mem:           1.9Gi       310Mi       1.1Gi       1.2Mi       600Mi       1.6Gi
```

| Column | Meaning |
| --- | --- |
| `used` | Memory programs are actually holding |
| `free` | Memory doing nothing at all, usually small on a busy server |
| `buff/cache` | The page cache and buffers, which the kernel gives back when needed |
| `available` | **The number that matters:** roughly how much a new program could use without swapping |

Alert on `available` running low, never on `free`.

## Lab · Watch the page cache work

```text
dd if=/dev/urandom of=~/big.bin bs=1M count=500   # a 500 MB file

sync; echo 3 | sudo tee /proc/sys/vm/drop_caches  # empty the cache (for learning only)
free -h                                           # note buff/cache

time cat ~/big.bin > /dev/null                    # first read: from disk
free -h                                           # buff/cache grew by about 500 MB

time cat ~/big.bin > /dev/null                    # second read: from memory, much faster
rm ~/big.bin
```

`buff/cache` grew, `available` barely moved, and the second read was far faster. Never drop caches on a production server to "free memory": it only makes the next reads slow.

## Measure · Who is using the memory

```text
ps aux --sort=-rss | head -6     # the biggest processes by resident memory
cat /proc/meminfo | head -20     # the kernel's full breakdown
vmstat 1 5                       # memory, swap in/out (si/so), and CPU, every second
```

`ps` shows two sizes for each process. **VSZ** (virtual size) is everything the process has mapped, much of which may never be used. **RSS** (resident set size) is what's actually in memory right now. RSS is the one to compare. Shared libraries are counted in every process that uses them, so adding up RSS across processes overstates the total.

## Swap · A safety net, not extra memory

**Swap** is disk space the kernel uses to hold memory pages nobody has touched recently. It lets a server survive a short spike, but a server that's actively swapping (non-zero `si` and `so` columns in `vmstat`, all the time) is short of memory and will be very slow.

```text
swapon --show        # nothing on most cloud images: no swap by default
```

Many cloud images ship with no swap at all, and Kubernetes nodes traditionally run without it. Then nothing slows down gradually: when memory runs out, the next step is the OOM killer.

## Limits · cgroups and the OOM killer

When the system, or a group of processes, runs out of memory and nothing more can be reclaimed, the kernel's **OOM killer** (out of memory) picks a process and kills it with SIGKILL. It favours the process using the most memory, adjusted by its `oom_score_adj` setting. The victim gets no warning and no chance to log anything.

```text
cat /proc/$$/oom_score          # how likely your shell is to be chosen
cat /proc/$$/oom_score_adj      # the adjustment, from -1000 (never) to 1000
```

Limits can also apply to a group of processes. systemd puts every service in its own **control group (cgroup)**, and `MemoryMax=` in a unit caps that service's memory. Hitting the cap triggers an OOM kill inside the group only, which protects the rest of the server. Container memory limits work exactly the same way. Kubernetes reports the result as `OOMKilled` with exit code 137 (128 + 9, for SIGKILL), which the Kubernetes track's [Scaling module](../kubernetes-operations/17-scaling-requests-and-cost.html) builds on.

```flow
title: What happens when a service hits its memory limit
Service process | keeps allocating memory
-> its cgroup reaches MemoryMax
Kernel | tries to reclaim cache inside the cgroup, and fails
-> the OOM killer sends SIGKILL to the biggest process in the group
* Process gone | no error in the app's own log, because it never got the chance
-> the kernel logs the kill; systemd marks the unit failed with result oom-kill
Evidence | sudo dmesg -T, journalctl -k, systemctl status
```

## Break it, fix it · The report that never finishes

A nightly report job runs as a service with a memory limit. Its log says it started, then nothing: no error, no "finished". Run it the way the scheduler does:

```text
sudo tee /usr/local/bin/reportgen.py <<'EOF'
import time
print("report generation started", flush=True)
rows = []
for i in range(80):
    rows.append(b"x" * 10 * 1024 * 1024)   # 10 MB more each step
    time.sleep(0.1)
print("report finished", flush=True)
EOF

sudo systemd-run --unit=reportgen -p MemoryMax=150M -p MemorySwapMax=0 \
  /usr/bin/python3 /usr/local/bin/reportgen.py
sleep 10
journalctl -u reportgen --output=cat | grep -v "^Started\|^reportgen"
```

The last line shows only what the program itself printed. Your job: prove what happened to it, and make the job finish. Try it before opening a hint.

### Hint 1 · Where to look

- A process that dies without logging anything was probably killed from outside, with a signal it couldn't catch. Look at what systemd recorded about the unit, and at the kernel's log.

### Hint 2 · Which tool

- `systemctl status reportgen` shows how the unit ended. `sudo dmesg -T | grep -i -A3 "out of memory"` or `journalctl -k | grep -i oom` shows what the kernel did.

### Hint 3 · The cause and the fix

- **Cause:** the job holds every row in memory, about 800 MB in total, but its cgroup is capped at 150 MB. At the cap, the kernel's OOM killer sent it SIGKILL. systemd records "Failed with result 'oom-kill'", and the kernel logs "Memory cgroup out of memory: Killed process ... (python3)".
- **Fix:** for the lab, clear the failed unit and run it with a limit that fits: `sudo systemctl reset-failed reportgen`, then the same `systemd-run` command with `MemoryMax=1200M`. It now prints "report finished".
- **Prevent it:** set limits from measured peak usage plus headroom, not guesses. The better fix is in the code: process rows in batches instead of holding them all. And alert on OOM kills, because the application never will.

### Implementation notes

- **Exit code 137 means SIGKILL,** and on a server with memory pressure it's almost always the OOM killer. In containers it's the first thing to check.
- **Protect what must survive.** `OOMScoreAdjust=-500` in a unit makes the kernel prefer other victims. Use it for critical agents, never for everything.
- **Memory that grows and never falls is a leak.** Graph each service's RSS over days; a sawtooth is normal, a steady climb isn't.
- **Don't add swap to hide a leak.** It turns a fast, obvious OOM kill into a slow, confusing outage.

## Recap · Key terms

- **Page cache:** recently used file data kept in memory, given back when programs need it.
- **`available`:** the memory a new workload could use without swapping. The number to watch.
- **RSS and VSZ:** memory actually in RAM, and everything a process has mapped.
- **Swap:** disk space for memory pages nobody is using; constant swapping means a memory shortage.
- **cgroup:** a group of processes the kernel limits as one, used for every service and container.
- **OOM killer:** the kernel mechanism that kills a process with SIGKILL when memory runs out.
- **Exit code 137:** a process killed by SIGKILL, usually by the OOM killer.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: A server shows 150 MB `free` and 3 GB `buff/cache` out of 4 GB total. Is it short of memory?
- Yes, only 150 MB is left
* Probably not; the cache is given back when programs need it, so check `available`
- Yes, the cache is a memory leak
- Only if swap is turned off
= Idle memory is used for the page cache. `available` counts the cache that can be reclaimed, and that's the number that tells you whether memory is short.
Q: Which value in `ps` best shows how much memory a process is really using right now?
- VSZ
* RSS
- %CPU
- The PID
= RSS is what's resident in RAM. VSZ includes everything mapped, much of which may never be touched.
Q: What happens when a service reaches its systemd `MemoryMax` limit and nothing can be reclaimed?
- The service is paused until memory frees up
- The whole server reboots
* The OOM killer kills a process inside that service's cgroup
- systemd raises the limit automatically
= The limit applies to the service's cgroup. The kernel kills inside the group, which protects the rest of the server, and systemd records the result as oom-kill.
S: A container restarts every few hours with exit code 137, and its logs show no errors. What's the most likely cause?
- A bug that calls exit(137)
* It's hitting its memory limit and being killed by the OOM killer
- The disk is full
- A health check timed out
= 137 is 128 + 9: the process received SIGKILL. With no error in the app's logs, a memory limit and the OOM killer are the first suspects.
S: A colleague suggests dropping the page cache every hour with a cron job, "to keep memory free". What do you say?
- Good idea, it prevents OOM kills
* Don't: the cache is reclaimed automatically, and dropping it only makes disk reads slower
- Only do it on servers with swap
- Do it every minute instead
= The kernel frees cache whenever a program needs memory. Dropping it on a schedule throws away useful data and slows everything that reads from disk.
```
