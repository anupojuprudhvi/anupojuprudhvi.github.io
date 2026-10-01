---
title: Incident Review: PostgreSQL Locked Out of Its Own Config File
date: 2026-10-01
track: linux-for-devops
order: 23
module: 23
summary: A PostgreSQL instance stopped at start-up with "could not load pg_hba.conf - Permission denied". The cause was one flag in a start-up script, cp -p, faithfully copying the wrong owner from a template on every start. Why fixing only the live file would have brought the outage back.
level: Production Incident Review
readingTime: 8 min read
stack: [RHEL 8, PostgreSQL 17, systemd, cp, chown, install]
tags: [linux, permissions, postgresql, systemd, incident-review, production]
---

**About this review.** This is a real incident from a production platform running on RHEL 8 servers in AWS, written up from the engineering team's notes. Every server name, path, account, and product name is replaced with a generic one; the log lines, commands, and fix are otherwise as recorded.

| | |
| --- | --- |
| **Environment** | Pre-production, RHEL 8, PostgreSQL 17 |
| **When** | 2025 |
| **Detected by** | The database service failing to start |
| **Impact** | One PostgreSQL instance could not start |
| **Root cause** | `pg_hba.conf` was owned by the application account instead of `postgres`, because a start-up script copied it from a template with `cp -p` |
| **Fix** | Corrected ownership and permissions on **both** the template and the live file, then restarted |

## Context · A config file copied at every start

The server ran a dedicated PostgreSQL instance (`pgsql-app.service`) on port 5434. Before PostgreSQL started, a start-up script refreshed its client authentication file, `pg_hba.conf`, by copying a template into the data directory with `cp -p`.

`pg_hba.conf` decides who may connect to the database, and how. PostgreSQL runs as the `postgres` user and must be able to read it; PostgreSQL also expects its data directory and files to be owned by `postgres`.

## Symptom · The database starts, then shuts down

The service failed. Its log showed PostgreSQL getting as far as opening its listening sockets, then stopping:

```text
LOG:  listening on IPv4 address "0.0.0.0", port 5434
LOG:  listening on IPv6 address "::", port 5434
LOG:  could not open file "/var/lib/pgsql/17/app/pg_hba.conf": Permission denied
FATAL:  could not load /var/lib/pgsql/17/app/pg_hba.conf
LOG:  database system is shut down
```

## Investigation · Check the owner, not just the permissions

```text
ls -ltr /opt/app/log/pg_log/                     # find the latest PostgreSQL log
tail -n 80 /opt/app/log/pg_log/postgresql-Fri.log
ls -ld /var/lib/pgsql/17/app                     # the data directory
ls -l  /var/lib/pgsql/17/app/pg_hba.conf         # the file itself
```

The file was owned by the application's account and group (`appsvc:appgroup`), not by `postgres:postgres`. PostgreSQL, running as `postgres`, couldn't read it.

## Root cause · `cp -p` copied the wrong owner, every time

`cp -p` means "preserve": the copy keeps the source file's **owner, group, mode, and timestamps**, when run as root. That's useful for backups, and wrong here. The template the script copied from was itself owned by the application account, so every start-up wrote a `pg_hba.conf` with the wrong owner into the data directory.

This is why the fix had to cover two files. Correcting only the live `pg_hba.conf` would have worked until the next restart, when the start-up script would copy the template's wrong owner back in.

## Fix · Correct the source, then the copy

```text
# 1. Fix the template at the source
ls -l /opt/app/templates/pg_hba.conf
chown postgres:postgres /opt/app/templates/pg_hba.conf
chmod 600 /opt/app/templates/pg_hba.conf

# 2. Fix the live file
chown postgres:postgres /var/lib/pgsql/17/app/pg_hba.conf
chmod 600 /var/lib/pgsql/17/app/pg_hba.conf

# 3. Restart and verify
systemctl restart pgsql-app
systemctl status pgsql-app
ss -ltnp | grep -E '5432|5434'
psql -h 127.0.0.1 -p 5434 -U postgres -d appdb -c "select now();"
```

The database came up and was reachable again on port 5434 through the connection pooler. The notes record one leftover: the instance's post-start checks still logged `"trust" authentication failed` for their own internal `psql` calls. That is a separate authentication issue, of the kind [Incident Review 25](25-incident-trust-authentication-failed.html) explains, and it didn't stop the database from serving.

## Prevention · Lessons

- **Copy configuration with explicit ownership.** `install -o postgres -g postgres -m 600 template.conf /path/pg_hba.conf` copies and sets the owner and mode in one step, whatever the template's own ownership is.
- **Fix the source of a generated file, not just the output.** If a file is rewritten at every start, the fix belongs in the template or the script that writes it.
- **Use `cp -p` deliberately.** It's right for backups, where you want an exact copy, and wrong when the destination needs its own owner.
- **Read the first error, not the last.** The final line said only that the database shut down; the line above it named the file and the reason.

## Practise it · Where this track teaches the skills

- [Files, Inodes & Permissions](03-files-and-permissions.html): owners, groups, modes, and `namei -l` for "Permission denied".
- [systemd: Services, Timers & Logs](07-systemd-and-services.html): start-up scripts in `ExecStartPre=`, and reading a service's logs.
- [Automation: Safe Bash, cloud-init & Ansible](18-automation-and-scripting.html): scripts that set state explicitly, instead of copying whatever is there.

## Check yourself · Pop quiz

Five questions: three on the ideas in this review, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: What does `cp -p` preserve when run as root?
- Only the file's contents
* The source file's owner, group, mode, and timestamps
- Only the timestamps
- Nothing; `-p` means "prompt"
= `-p` keeps the original's metadata. Copying a template owned by the wrong account therefore produces a copy owned by the wrong account.
Q: Why did the fix also change the template's owner, not just the live `pg_hba.conf`?
- The template was corrupted
* The start-up script copies the template at every start, so a wrong template would bring the fault back on the next restart
- PostgreSQL reads the template directly
- It's required by RHEL 8
= When a file is regenerated, the source decides the result. Fixing only the output lasts until the next regeneration.
Q: Which command copies a file and sets its owner, group, and mode in one step?
- `cp -p`
- `mv`
* `install -o postgres -g postgres -m 600 source dest`
- `ln -s`
= `install` sets ownership and mode explicitly on the destination, regardless of the source file's own metadata.
S: PostgreSQL logs "could not open file pg_hba.conf: Permission denied", and the file's mode is `600`. What do you check next?
- The disk space
* The file's owner: with mode `600`, only the owner can read it, and that must be `postgres`
- The listening port
- The firewall
= `600` gives read and write to the owner only. If the owner is any account other than `postgres`, PostgreSQL can't read the file.
S: A service's log ends with "database system is shut down". Where is the real cause most likely to be?
- In the very last line
* A few lines above, in the first FATAL or ERROR message
- In the kernel log only
- In the client's error message
= The last line usually reports the consequence. The first error before it, here the `pg_hba.conf` permission failure, names the cause.
```
