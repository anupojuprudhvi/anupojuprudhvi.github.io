---
title: Incident Review: Two Faults Behind One Failed Daemon
date: 2026-10-01
track: linux-for-devops
order: 24
module: 24
summary: A back-end daemon wouldn't start, and there were two unrelated reasons at once. Its connection pooler was still pointing at another environment's database, and a change to run it as a non-root user left it unable to create shared memory. Why fixing only one of them would have looked like the fix didn't work.
level: Production Incident Review
readingTime: 9 min read
stack: [RHEL 8, systemd, PgBouncer, PostgreSQL, System V shared memory]
tags: [linux, systemd, shared-memory, pgbouncer, incident-review, production]
---

**About this review.** This is a real incident from a production platform running on RHEL 8 servers in AWS, written up from the engineering team's notes. Every server name, path, account, and product name is replaced with a generic one; the causes, commands, and fix are otherwise as recorded.

| | |
| --- | --- |
| **Environment** | Pre-production (QA), RHEL 8 |
| **When** | 2025 |
| **Detected by** | The daemon failing to start |
| **Impact** | A back-end daemon the application depends on couldn't start |
| **Root cause** | Two independent faults: the connection pooler pointed at the wrong environment's database, and the daemon had been switched to a non-root user that couldn't create the shared memory it needs |
| **Fix** | Pointed the pooler's database mappings at the correct database, and returned the daemon to its original run-as-root design |

## Context · A daemon with a hard dependency

The daemon (`appd.service`) is started by systemd. Its unit declares a hard dependency on the local connection pooler, **PgBouncer**, which sits between applications on the server and the managed PostgreSQL databases:

```text
[Unit]
Description=Application back-end daemon
After=pgbouncer.service
Requires=pgbouncer.service

[Service]
Type=simple
ExecStartPre=/bin/bash /opt/app/systemd_scripts/appd_prestart.sh
ExecStart=/opt/app/appd/appd --monitor -l3

[Install]
WantedBy=multi-user.target
```

`Requires=` means the daemon is only useful when the pooler, and the databases behind it, are working. Its `ExecStartPre=` script runs set-up steps before the daemon itself starts.

## Symptom · The start-up step fails

The service failed in its `ExecStartPre=` step. The investigation followed the standard sequence from [systemd: Services, Timers & Logs](07-systemd-and-services.html):

```text
systemctl daemon-reload
systemctl status appd
systemctl cat appd.service                 # the unit, plus any drop-ins changing it
journalctl -u appd.service -n 50 --no-pager
tail -40 /opt/app/log/appd.log
```

## Root cause 1 · The pooler pointed at another environment

The daemon depends on its databases through the pooler, so the team tested every database through the pooler, the same way the daemon reaches them:

```text
for db in db_one db_two db_three; do
  echo "Testing $db..."
  psql -h localhost -p 6432 -U postgres -d "$db" -c "SELECT 1;" \
    && echo "$db OK" || echo "$db FAILED"
done

# Which backend does each pooler database name map to?
psql -h 127.0.0.1 -p 6432 -U postgres pgbouncer -c "show databases;"
```

`show databases` lists each name the pooler accepts and the real database host it forwards to. On this QA server, the mappings still pointed at the **Stage** environment's database cluster, so back-end database connections failed.

## Root cause 2 · Non-root, and no shared memory

Separately, the daemon had been changed to run as the non-root application account instead of root. Running services without root is normally good practice. But this daemon creates **shared memory segments** when it starts, and as the non-root user that failed with **errno 13, Permission denied**, which failed the `ExecStartPre=` step.

Shared memory here means System V IPC: memory segments the kernel keeps for processes to share, each with an owner and permissions, much like files. `ipcs -m` lists the segments that exist, with their owners and permissions, which is the place to start when a process can't create or attach to one.

## Fix · Both, then verify through the same path

1. **Pooler:** the database mappings in the pooler's configuration were changed to point at the QA database endpoint, and connectivity was tested again through port 6432.
2. **Daemon:** the run-as-user change was reverted, so the daemon runs as root as originally designed:

```text
systemctl daemon-reload
systemctl restart appd
systemctl status appd
```

With both fixed, database connectivity and the daemon's start-up were restored.

## Why two faults are harder than one

With two independent causes, fixing either one alone doesn't make the symptom go away. The natural conclusion, "that wasn't it", is wrong, and the correct fix gets reverted. Two habits avoid that:

- **Verify each layer separately** after each change: database connectivity through the pooler, then the daemon's own start-up, rather than only "does the service start?".
- **Keep notes of what each change proved,** so a change that fixed one layer isn't undone because the overall symptom remained.

## Prevention · Lessons

- **Check environment wiring after building an environment.** A copied configuration that still points at another environment is a classic, and `show databases` against the pooler catches it in seconds.
- **Change a service's run-as user deliberately, and test it.** Moving a daemon off root is worth doing, but it needs a test in a lower environment, and a check of everything the daemon creates at start-up: files, sockets, and shared memory.
- **Read `systemctl cat` before trusting a unit file.** A drop-in can change the user, the start-up steps, or the environment without touching the main file.

## Practise it · Where this track teaches the skills

- [systemd: Services, Timers & Logs](07-systemd-and-services.html): `Requires=`, `ExecStartPre=`, drop-ins, and `systemctl cat`.
- [Processes, Signals & File Descriptors](08-processes-and-signals.html): what a process owns and which user it runs as.
- [A Troubleshooting Method](13-troubleshooting-method.html): one hypothesis and one change at a time, with notes.
- [Capstone](20-capstone-incident.html): the same situation, several faults at once, in a lab.

## Check yourself · Pop quiz

Five questions: three on the ideas in this review, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: What does `Requires=pgbouncer.service` in a unit mean?
- The daemon installs PgBouncer
* The daemon depends on PgBouncer: if PgBouncer stops or fails to start, systemd stops this unit too
- PgBouncer runs inside the daemon
- Nothing; it's only documentation
= `Requires=` is a hard dependency. Combined with `After=`, the daemon starts after the pooler, and only while it's working.
Q: What does `show databases` against a PgBouncer admin console tell you?
- Every table in every database
* Each database name the pooler accepts, and the real host and database it forwards to
- Which users are signed in
- The PostgreSQL version
= It's the quickest way to confirm the pooler forwards to the right environment, which was the first of the two faults here.
Q: Errno 13 when a process tries to create or attach to a shared memory segment means what?
- The memory is full
* Permission denied: the process's user isn't allowed that access
- The segment doesn't exist
- The kernel doesn't support shared memory
= Errno 13 is EACCES, permission denied. Shared memory segments have owners and permissions like files, and `ipcs -m` shows them.
S: You fix one cause of an outage, but the service still fails. What's a sound next step?
- Revert your fix, since it didn't help
* Keep the fix if you verified it worked at its own layer, and look for a second, independent cause
- Restart the server
- Escalate immediately without notes
= Several faults at once are common. Verify each layer separately, so a correct fix isn't reverted just because the overall symptom remains.
S: A team wants to move a root-run daemon to a non-root account. What should they check first?
- Nothing; non-root is always safe
* Everything the daemon creates or opens at start-up, such as files, sockets, and shared memory, tested in a lower environment
- Only that the account has a password
- Only the daemon's CPU usage
= Reducing privilege is good practice, but resources the daemon creates at start-up may need root or specific permissions. Testing first avoids a start-up failure like this one.
```
