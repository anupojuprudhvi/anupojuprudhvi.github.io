---
title: Incident Review: "trust" Authentication Failed, Through a Unix Socket
date: 2026-10-01
track: linux-for-devops
order: 25
module: 25
summary: After a database moved behind a connection pooler, a batch job's maintenance steps started failing with "trust" authentication failed. The job ran psql with no host and no user, so psql quietly chose a Unix socket and the job's Linux account name. How two silent defaults turned into an outage, and two tested ways to fix it.
level: Production Incident Review
readingTime: 10 min read
stack: [RHEL 8, PostgreSQL, PgBouncer, psql, Unix sockets, systemd]
tags: [linux, unix-sockets, postgresql, pgbouncer, systemd, incident-review, production]
---

**About this review.** This is a real incident from a production platform running on RHEL 8 servers in AWS, written up from the engineering team's notes. Every server name, path, account, product name, and credential is replaced with a generic one or removed; the errors, commands, and fixes are otherwise as recorded.

| | |
| --- | --- |
| **Environment** | Pre-production (SIT), RHEL 8 |
| **When** | 2025 |
| **Detected by** | Alarms from the batch job's maintenance ("sweep") phase |
| **Impact** | Database maintenance steps (data inserts and purges of old data) failed or stopped intermittently, leaving job cycles incomplete |
| **Root cause** | The job called `psql` with no `-h` and no `-U`, so it connected over a Unix socket as its own Linux account, which the pooler doesn't allow |
| **Fix** | Two approaches, both tested and working: connection settings supplied by systemd, or explicit users added to the `psql` calls |

## Context · A database that moved

The batch job (`etl.service`) runs under systemd as the service account `appsvc`. Each cycle ends with a maintenance phase that runs SQL by shelling out to the `psql` command.

Its database used to live on the same server. It had moved to **Amazon RDS**, reached through a local **PgBouncer** connection pooler on port 6432. The pooler's authentication was configured like this (credentials removed):

```text
listen_port     = 6432
unix_socket_dir = /var/run/postgresql
auth_type       = trust
auth_file       = /opt/app/config/pg_auth
```

With `auth_type = trust`, PgBouncer doesn't check a password, but the **user name must still be listed in `auth_file`**. That file listed only the database user `postgres`.

## Symptom · A precise error, easy to misread

```text
psql: connection to server on socket "/run/postgresql/.s.PGSQL.6432" failed:
ERROR: "trust" authentication failed
```

The team first checked the job's database configuration files. Both had the correct host, port, user, and password, which made the error look impossible.

## Investigation · Reproduce it as the service account

The breakthrough was running `psql` exactly the way the job does, as the same Linux account, with the same (missing) options:

```text
# As the job runs it: no host, no user. Fails.
sudo -u appsvc psql -d appdb -p 6432 -c "select 1;"

# With an explicit TCP host and database user. Works.
sudo -u appsvc psql -h 127.0.0.1 -U postgres -d appdb -p 6432 -c "select 1;"

# Which user and server does each one really reach?
sudo -u appsvc psql -h 127.0.0.1 -U postgres -d appdb -p 6432 \
  -c "select current_user, inet_server_addr();"
```

Then they read how the maintenance code actually calls `psql`:

```text
grep -n "psql" /path/to/vendor/sweep.rb
grep -n -E "Open3|system\(|%x\[" /path/to/vendor/sweep.rb
```

Every call was built as a raw shell command along the lines of `psql -d <database> -p <port> ...`, with no host and no user. That code path never read the configuration files, which is why their correct values didn't help.

## Root cause · Two silent defaults

When `psql` isn't told otherwise, it fills in two things for you:

| Option left out | What `psql` does instead | Result here |
| --- | --- | --- |
| `-h` (host) | Connects through a **Unix socket** in `/run/postgresql`, not TCP | It reached PgBouncer's socket for port 6432 |
| `-U` (user) | Uses the **current Linux user name** as the database user | It asked for database user `appsvc` |

PgBouncer received a connection for user `appsvc`, found no such user in its `auth_file`, and rejected it: `"trust" authentication failed`.

When the database was local, these defaults had happened to work. The move didn't break the job; as the team's notes put it, it **exposed a design flaw that had always been there**.

## Fix · Two tested approaches

**Approach 1 · Supply the connection settings from systemd.** `psql` reads standard environment variables when options are missing. Setting them on the service, in a drop-in, makes every `psql` call the job spawns use TCP and the right user, without touching the vendor's code:

```text
sudo systemctl edit etl
#   [Service]
#   Environment="PGHOST=127.0.0.1"
#   Environment="PGPORT=6432"
#   Environment="PGDATABASE=appdb"
#   Environment="PGUSER=postgres"
#   (plus the password; see the note below)
sudo systemctl daemon-reload
sudo systemctl restart etl
systemctl show etl -p Environment
```

**Approach 2 · Patch the calls.** After backing up the vendor's file, every `psql` call in it, including two built with `Open3.popen3`, was changed to pass `-U` with the configured database user explicitly.

Both were tested and worked. The notes recommend approach 1 as the cleaner, permanent fix: it changes no vendor code, survives package upgrades, and covers every current and future `psql` call the job makes.

**A note on the password.** Values in a unit's `Environment=` lines can be read by any user on the server with `systemctl show`, and systemd's documentation advises against putting secrets there. Safer places for a database password are a `~/.pgpass` file owned by the service account with mode `600`, which `psql` reads automatically, or an `EnvironmentFile=` readable only by root.

## Prevention · Lessons

- **Never rely on client defaults in automation.** Pass host, port, user, and database explicitly, or set them once for the whole service.
- **Reproduce as the service account,** with the exact command the application builds. The same `psql` worked or failed depending only on its options and user.
- **A migration is a test of hidden assumptions.** After moving a dependency, check how each consumer connects, not only that the new endpoint answers.
- **Keep credentials out of commands and unit files.** Command lines and `Environment=` values are visible to other users; use protected files instead.

## Practise it · Where this track teaches the skills

- [Users, sudo & SSH](04-users-sudo-and-ssh.html): `sudo -u` to run a command as another account.
- [systemd: Services, Timers & Logs](07-systemd-and-services.html): drop-ins and `Environment=` for a service.
- [Networking Basics](11-networking-basics.html): TCP connections versus local sockets, and who can reach what.
- [Automation: Safe Bash, cloud-init & Ansible](18-automation-and-scripting.html): why scheduled and service jobs don't share your terminal's environment.

## Check yourself · Pop quiz

Five questions: three on the ideas in this review, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: When `psql` is run without `-U`, which database user does it use?
- Always `postgres`
* The current Linux user's name, unless `PGUSER` is set
- No user at all
- The user in the server's configuration file
= `psql` defaults the database user to the operating-system user running it. In this incident that was the job's service account, which the pooler didn't allow.
Q: When `psql` is run without `-h`, how does it connect?
- Over TCP to 127.0.0.1
* Through a Unix socket in the local socket directory
- It asks DNS for a host called "postgres"
- It refuses to connect
= Without a host, `psql` uses a local Unix socket, such as `/run/postgresql/.s.PGSQL.6432`. Setting `-h` or `PGHOST` makes it use TCP.
Q: With PgBouncer's `auth_type = trust`, what still has to be true for a user to connect?
- The user must supply a password
* The user name must be listed in PgBouncer's `auth_file`
- The user must be root
- Nothing; trust accepts everyone
= `trust` skips the password check, but the user still has to exist in `auth_file`. An unlisted user gets `"trust" authentication failed`.
S: A database password is set in a systemd unit as `Environment="PGPASSWORD=..."`. What's the risk?
- The service won't start
* Any user on the server can read it with `systemctl show`
- systemd encrypts it, so there's no risk
- `psql` ignores it
= `Environment=` values aren't secret. A `~/.pgpass` file with mode `600`, or a root-only `EnvironmentFile=`, keeps the password away from other users.
S: A service fails to reach its database, but `psql` from your own shell works. What's the most useful next test?
- Restart the database
* Run the same `psql` command as the service's account, with the exact options the service uses
- Increase the connection limit
- Reinstall the PostgreSQL client
= Your shell has a different user, environment, and maybe options. Reproducing with `sudo -u` and the service's exact command shows the difference directly.
```
