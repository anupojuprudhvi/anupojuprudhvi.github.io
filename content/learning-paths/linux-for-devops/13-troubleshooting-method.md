---
title: A Troubleshooting Method: From Symptom to Root Cause
date: 2026-10-01
track: linux-for-devops
order: 13
module: 13
summary: Guessing works until it doesn't. Learn a repeatable way to go from "the server is slow" to a root cause: define the symptom, ask what changed, check every resource with the USE method, and run a 60-second checklist that finds most problems. Then diagnose a high load average on a server whose CPUs are idle.
level: Troubleshooting · Method
readingTime: 14 min read
stack: [USE method, uptime, vmstat, mpstat, pidstat, iostat, sar, sysstat]
tags: [linux, troubleshooting, performance, use-method, vmstat, iostat, incident]
---

**In this module, you'll learn to:**

- Work an incident in a fixed order: symptom, change, scope, evidence, hypothesis, fix
- Check CPU, memory, disk, and network for utilization, saturation, and errors
- Run a 60-second checklist and read what each command is telling you

**Before you start:** finish Part 2, especially [Processes, Signals & File Descriptors](08-processes-and-signals.html) and [Memory, the Page Cache & the OOM Killer](09-memory-and-the-oom-killer.html). Open a shell on your lab VM with `multipass shell lab`, and install the tools:

```text
sudo apt install -y sysstat stress-ng
```

## Principle · Method beats memory

New engineers often troubleshoot by recognition: "last time it was the disk, so check the disk". That works for problems you've seen before and fails on everything else. Experienced engineers follow a method, so they make progress even on problems they've never met, and they can hand the investigation to someone else halfway through.

```flow
title: From a vague report to a root cause
Symptom | pin it down: what exactly fails, for whom, since when, measured how?
-> what changed? deploys, config, packages, traffic, the cloud provider
Scope | one server or all of them? one endpoint or every request?
-> gather evidence: the 60-second checklist, logs, metrics
Hypothesis | one specific, testable explanation
-> test it, changing one thing at a time
* Mitigate, then fix | restore service first; find and remove the cause after
-> write down the timeline while it's fresh
Postmortem | what happened, why, and what stops it happening again
```

Three habits matter most:

- **Define the symptom with a number.** "Slow" isn't a symptom; "the checkout page takes 8 seconds instead of 300 ms since 14:05" is.
- **Ask what changed.** Most incidents follow a change. Check `less /var/log/apt/history.log`, `journalctl --since "2 hours ago"`, `last` for recent sign-ins, and your deploy history.
- **Write as you go.** Note each command, what it showed, and the time. It stops you repeating checks, and it becomes the incident timeline.

## USE · Check every resource the same way

The **USE method**, from performance engineer [Brendan Gregg](https://www.brendangregg.com/usemethod.html), gives you a checklist that doesn't depend on guessing. For every resource, ask three questions:

- **Utilization:** how busy is it, as a percentage of its capacity?
- **Saturation:** is work queueing because it's too busy?
- **Errors:** is it failing?

| Resource | Utilization | Saturation | Errors |
| --- | --- | --- | --- |
| CPU | `vmstat 1`: us + sy; `mpstat -P ALL 1` per CPU | `vmstat` r column above the CPU count; load average | Rare; `dmesg` |
| Memory | `free -m`: used versus available | Swapping (`vmstat` si and so); OOM kills | `dmesg` |
| Disk | `iostat -xz 1`: %util | `iostat` await rising; processes in D state (`vmstat` b column) | `dmesg` I/O errors; filesystem turned read-only |
| Network | `sar -n DEV 1` against the link's speed | Drops; TCP retransmits (`sar -n ETCP 1`); full conntrack table | `ip -s link` errors |

Saturation is the one people miss. A disk at 60% utilization can still be the bottleneck if requests are queueing behind each other.

## Checklist · The first 60 seconds

Netflix's performance team published [a checklist of ten commands](https://netflixtechblog.com/linux-performance-analysis-in-60-000-milliseconds-accc10403c55) to run in the first minute on any slow Linux server. It covers the USE questions for every resource:

| Command | Look for |
| --- | --- |
| `uptime` | Load averages over 1, 5, and 15 minutes: rising, falling, or steady? |
| `sudo dmesg -T \| tail` | OOM kills, disk errors, dropped packets: the kernel's complaints |
| `vmstat 1` | `r` above the CPU count (CPU saturation), `b` (D state), `si`/`so` (swapping), `wa` (waiting on I/O), `st` (steal) |
| `mpstat -P ALL 1` | One CPU at 100% while the others idle: a single-threaded bottleneck |
| `pidstat 1` | Which processes are using the CPU |
| `iostat -xz 1` | `%util` near 100 and `await` in tens of milliseconds: a saturated disk |
| `free -m` | `available` memory |
| `sar -n DEV 1` | Network throughput compared with the interface's limit |
| `sar -n TCP,ETCP 1` | New connections per second, and retransmits (a sign of network trouble) |
| `top` | A final overview, to check what the other commands suggested |

Press Ctrl+C to stop each one after a few seconds. You won't use every column every time, but running the whole list stops you fixing the first thing you notice and missing the real cause.

**Try it · A CPU-bound server.** Load both CPUs, then run the checklist and see how it shows up:

```text
stress-ng --cpu 2 --timeout 60s &
uptime                # the 1-minute load climbs towards 2
vmstat 1 5            # r is about 2, us is near 100, id near 0
mpstat -P ALL 1 3     # both CPUs busy
pidstat 1 3           # stress-ng is the process using it
```

## Break it, fix it · High load, idle CPUs

Users say the server is sluggish. The load average is high, but when you look at `top`, the CPUs are mostly idle. Start the background job that's behind it, the way the scheduler starts it every night:

```text
sudo systemd-run --unit=nightly-export \
  stress-ng --hdd 4 --hdd-opts dsync --timeout 600s
```

Now forget what you just ran. Your job: find what's slowing the server down, using the checklist rather than memory, and stop it. Try it before opening a hint.

### Hint 1 · Where to look

- The load average counts more than processes using the CPU. Work through the checklist and look for the resource that's saturated, not the one that's busy.

### Hint 2 · Which tool

- In `vmstat 1`, watch the `b` and `wa` columns. In `iostat -xz 1`, watch `%util` and `await`. `ps -eo pid,stat,cmd | awk '$2 ~ /D/'` lists processes in D state, and `pidstat -d 1` shows which processes are doing the disk I/O.

### Hint 3 · The cause and the fix

- **Cause:** the `nightly-export` job makes many small synchronous disk writes. Its workers spend most of their time in D state, waiting on the disk, and D-state processes count towards the load average. The disk is saturated (`%util` near 100, rising `await`), while the CPUs have little to do: `wa` is high and `us` is low.
- **Fix:** `systemctl status nightly-export` identifies the job; stop it now with `sudo systemctl stop nightly-export`. For good: run it when the server is quiet, give it a lower I/O priority (`IOWeight=` in its unit, or `ionice -c3`), or move it to its own disk.
- **Prevent it:** alert on disk saturation (`await` and `%util`), not only on CPU. A load-average alert on its own can't tell you which resource is the problem.

### Implementation notes

- **Load average is a count, not a percentage.** Compare it with the number of CPUs (`nproc`), and remember it includes processes waiting on disk.
- **`st` (steal) above a few percent on a cloud VM** means the hypervisor is giving your CPU time to someone else. On burstable instance types it often means CPU credits have run out.
- **Restart last.** A restart can fix the symptom and destroy the evidence. Capture the checklist output, and logs, before restarting anything.
- **Keep the timeline as you go.** A list of "14:05 alert, 14:07 vmstat shows b=6, 14:09 found nightly-export" turns into the postmortem with no extra work.

## Recap · Key terms

- **Symptom:** a precise, measured description of what's wrong, for whom, and since when.
- **USE method:** for every resource, check utilization, saturation, and errors.
- **Saturation:** work queueing because a resource is fully busy.
- **Load average:** the average number of processes running, waiting for CPU, or in D state.
- **iowait (`wa`):** CPU time spent idle while waiting for I/O.
- **Steal (`st`):** CPU time a virtual machine wanted but the hypervisor gave to another.
- **Mitigate versus fix:** restore service now, remove the cause after.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: What are the three questions the USE method asks about every resource?
- Users, services, and events
* Utilization, saturation, and errors
- Uptime, swap, and exit codes
- Usage, speed, and expiry
= For CPU, memory, disk, and network, ask how busy it is, whether work is queueing, and whether it's failing. Saturation is the one most often missed.
Q: In `vmstat 1` output on a 4-CPU server, the `r` column stays around 12. What does that mean?
- The server has 12 users signed in
* About 12 processes want CPU at once, so the CPUs are saturated
- 12 processes are waiting on disk
- Memory is being swapped 12 times a second
= `r` counts processes running or waiting to run. Consistently more than the CPU count means work is queueing for CPU.
Q: Why ask "what changed?" early in an incident?
- Because every incident is caused by a deploy
* Most incidents follow a change, so it's often the fastest route to the cause
- To find someone to blame
- Because logs are deleted after an hour
= Deploys, config edits, package upgrades, and traffic shifts cause most incidents. Checking them first often turns a long investigation into a short one.
S: A cloud VM is slow. `top` shows the CPUs 40% idle, but `vmstat` reports `st` at 35%. What's happening?
- The disk is saturated
- The application has a memory leak
* The hypervisor is withholding CPU time, often because a burstable instance has run out of credits
- The network is dropping packets
= Steal time is CPU the VM wanted but didn't get. On burstable instances it usually means CPU credits are exhausted; a different instance type or size fixes it.
S: During an incident, a colleague wants to restart the database straight away "to see if that helps". What do you suggest first?
- Restart the whole server instead
* Capture the checklist output and recent logs, then decide; a restart can destroy the evidence
- Delete the database's log files to free space
- Wait an hour to see whether it fixes itself
= Restarting may restore service, which is sometimes the right call, but it wipes the state that explains the problem. A minute of evidence-gathering first is usually worth it.
```
