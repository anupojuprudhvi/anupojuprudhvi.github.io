---
title: Incident Review: A Service Blocked by a Kernel Semaphore Limit
date: 2026-10-01
track: linux-for-devops
order: 22
module: 22
summary: An application service refused to start on RHEL 8 because the kernel's semaphore limit was lower than it needed, and its start-up script wasn't allowed to raise the limit itself. Why that write failed, and why the right fix belongs in the operating system's configuration, not in the service.
level: Production Incident Review
readingTime: 9 min read
stack: [RHEL 8, systemd, sysctl, System V IPC]
tags: [linux, sysctl, kernel, semaphores, systemd, incident-review, production]
---

**About this review.** This is a real incident from a production platform running on RHEL 8 servers in AWS, written up from the engineering team's notes. Every server name, path, account, and product name is replaced with a generic one; the error, the values, and the fix are otherwise as recorded.

| | |
| --- | --- |
| **Environment** | Pre-production (QA), RHEL 8 |
| **When** | 2025 |
| **Detected by** | The service failing to start |
| **Impact** | The application service couldn't start on the affected servers |
| **Root cause** | The kernel's semaphore limit (`SEMMSL`) was 1024; the application needs at least 2048 |
| **Fix** | Raised the limit persistently at the operating-system level with `sysctl`. No application change was needed |

## Context · What a semaphore limit is

A **semaphore** is a counter the kernel keeps so that processes can coordinate, for example to take turns using shared memory. This application uses System V semaphores, the older interface that comes with fixed, system-wide limits. On Linux, those limits are four numbers in one setting:

```text
sysctl kernel.sem
# kernel.sem = 1024   32000   32   256
#              SEMMSL SEMMNS  SEMOPM SEMMNI
```

| Field | Meaning |
| --- | --- |
| `SEMMSL` | Maximum semaphores in one set |
| `SEMMNS` | Maximum semaphores on the whole system |
| `SEMOPM` | Maximum operations in a single call |
| `SEMMNI` | Maximum number of semaphore sets |

The application requires `SEMMSL` of at least **2048**. The servers had **1024**.

## Symptom · The service won't start

The service, run by systemd with an `ExecStartPre=` start-up script, failed every time it started. The investigation used the same steps as [systemd: Services, Timers & Logs](07-systemd-and-services.html):

```text
systemctl cat app-sync.service            # the unit, including its ExecStartPre script
journalctl -u app-sync.service -n 50 --no-pager
su - appsvc -c "/opt/app/sbin/app-sync"   # run the binary by hand, as the service user
```

## Root cause · A start-up script that changed the kernel

The unit's start-up script tried to fix the limit itself, by writing the new value straight into the kernel:

```text
/proc/sys/kernel/sem
```

That write failed with **Permission denied**. The team's notes attribute this to RHEL 8's security controls, which restrict services from changing kernel settings at runtime (systemd service hardening or SELinux). So the limit stayed at 1024, and the application refused to start.

The deeper problem is the design, not the denied write. A kernel setting that the application needs is a property of the server, and it should be in place before any service starts. A service that edits the kernel on every start is fragile (it fails exactly as it did here) and it needs far more privilege than an application should have.

## Fix · Set it once, at the operating-system level

The limit was raised persistently with `sysctl`, keeping the other three values unchanged:

```text
kernel.sem = 2048 32000 32 256
```

In practice that means a file under `/etc/sysctl.d/`, applied at boot and loaded immediately with `sysctl --system`, as in [Performance & Kernel Tuning](19-performance-and-tuning.html). With the limit in place before the service starts, its start-up script has nothing to change. The notes record that no application code changes were needed.

**How to check a server yourself:**

```text
sysctl kernel.sem          # the current limits
ipcs -ls                   # the same limits, labelled
ipcs -s                    # semaphore sets that exist now, and their owners
```

## Prevention · Lessons

- **Put kernel requirements in provisioning,** next to the rest of the server's configuration: a `sysctl.d` file in the image or managed by configuration management, with a comment saying which application needs it and why.
- **Treat "a service writes to `/proc/sys`" as a warning sign.** It means the service needs root-level power to start, and it hides a server requirement inside application scripts.
- **Read the vendor's system requirements as a checklist** when building a new environment, including kernel limits, not only CPU, memory, and disk.

## Practise it · Where this track teaches the skills

- [systemd: Services, Timers & Logs](07-systemd-and-services.html): `systemctl cat`, `ExecStartPre=`, and reading a service's logs.
- [Performance & Kernel Tuning](19-performance-and-tuning.html): `sysctl`, `/etc/sysctl.d/`, and making settings permanent.
- [Security Hardening, AppArmor & TLS](17-security-and-hardening.html): why a confined service gets "Permission denied" even as root.

## Check yourself · Pop quiz

Five questions: three on the ideas in this review, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: In `kernel.sem = 1024 32000 32 256`, which number is `SEMMSL`?
* 1024, the maximum number of semaphores in one set
- 32000, the system-wide total
- 32, the operations per call
- 256, the number of sets
= The four values are SEMMSL, SEMMNS, SEMOPM, and SEMMNI, in that order. This application needed the first one raised to 2048.
Q: Why is a service writing to `/proc/sys` at start-up a fragile design?
- `/proc/sys` is read-only on every system
* It needs root-level power, and security controls can block it, so the service fails to start
- Values written there are ignored
- It only works on Ubuntu
= Kernel settings belong to the server, not to one service. Hardened systems restrict such writes, and a service shouldn't need that much privilege to start.
Q: How do you make a kernel setting survive a reboot?
- `echo` it into `/proc/sys` once
* Put it in a file under `/etc/sysctl.d/` and load it with `sysctl --system`
- Add it to the service's `ExecStartPre`
- Write it in `~/.bashrc`
= `/proc/sys` holds only the running value. Files in `/etc/sysctl.d/` are applied at every boot, before services start.
S: A vendor's application needs a larger `kernel.sem` on every new server. Where should that requirement live?
- In a wiki page for engineers to apply by hand
- In the application's start-up script
* In the server image or configuration management, as a `sysctl.d` file with a comment
- Nowhere; set it when the application fails
= Provisioning it with the server makes every new server correct before the application starts, and the comment records why it exists.
S: A service's start-up script fails with "Permission denied" writing a kernel setting, even though the service runs as root. What's a likely explanation on RHEL 8?
- The disk is full
- The root password expired
* Security controls such as systemd hardening or SELinux are confining the service
- The kernel setting doesn't exist
= Root inside a confined service isn't all-powerful. Hardening options and SELinux policies can block writes to kernel settings, which is why the requirement belongs outside the service.
```
