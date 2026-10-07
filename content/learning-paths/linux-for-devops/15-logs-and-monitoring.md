---
title: Logs, Log Rotation & Monitoring
date: 2026-10-01
track: linux-for-devops
order: 15
module: 15
summary: Logs tell you what happened; metrics tell you something is about to. Query the journal well, keep logs from filling the disk with journald limits and logrotate, ship them off the server, and expose system metrics with node_exporter. Then fix a log that never rotates.
level: Troubleshooting · Hands-on lab
readingTime: 14 min read
stack: [journald, journalctl, logrotate, rsyslog, Prometheus node_exporter]
tags: [linux, logs, logrotate, journald, monitoring, prometheus, alerting]
motif: monitor
---

**In this module, you'll learn to:**

- Search the journal by service, priority, time, and process, and keep its size under control
- Configure and test logrotate, and choose between `copytruncate` and signalling the app
- Expose system metrics with node_exporter, and decide what's worth an alert

**Before you start:** finish [systemd: Services, Timers & Logs](07-systemd-and-services.html) and [A Troubleshooting Method](13-troubleshooting-method.html). Open a shell on your lab VM with `multipass shell lab`.

## Logs · Two systems, side by side

On a modern Ubuntu server, logs arrive in two places:

- **journald** collects everything systemd services print, plus kernel messages, in a structured binary journal under `/var/log/journal/`. You read it with `journalctl`.
- **Text files** in `/var/log/`, written by applications themselves (`/var/log/nginx/access.log`) or by **rsyslog**, which copies journal messages into classic files such as `/var/log/syslog` and `/var/log/auth.log` on systems that run it.

```text
journalctl -u ssh --since "today"                # one service, since midnight
journalctl -p warning -b                         # warnings and worse, this boot
journalctl -k --since "10 min ago"               # kernel messages only
journalctl _PID=1234                             # one process
journalctl -u ssh -o json-pretty -n 1            # every field of one entry
journalctl --disk-usage                          # how much space the journal uses
```

The priority levels, from most to least severe, are `emerg`, `alert`, `crit`, `err`, `warning`, `notice`, `info`, and `debug`. `-p warning` shows `warning` and everything more severe.

By default the journal keeps itself to 10% of the filesystem, up to 4 GB. To set your own cap, add a drop-in:

```text
sudo mkdir -p /etc/systemd/journald.conf.d
printf '[Journal]\nSystemMaxUse=500M\n' | sudo tee /etc/systemd/journald.conf.d/size.conf
sudo systemctl restart systemd-journald
sudo journalctl --vacuum-size=500M        # shrink it now, not only from now on
```

## Rotate · logrotate keeps files from growing forever

Applications that write their own files don't clean up after themselves. **logrotate** runs daily (on Ubuntu, from `logrotate.timer`), and for each configured file it renames the current log, starts a new one, compresses old ones, and deletes the oldest. Each application gets a config file in `/etc/logrotate.d/`:

```text
/var/log/myapp/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
```

Line by line: rotate once a day (`weekly` and `size 100M` are alternatives), keep 14 old files, gzip them, but leave the newest old file uncompressed for easy reading. Don't complain if the file is missing, skip empty logs, and empty the log in place after copying it. logrotate only accepts comments on lines of their own, never after a directive.

The last line is the important decision. After a rotation, the application still has the *old* file open, as [Storage, Filesystems & LVM](10-storage-and-filesystems.html) showed with deleted files. There are two ways to deal with that:

| Approach | How it works | Trade-off |
| --- | --- | --- |
| `copytruncate` | Copies the log to `app.log.1`, then empties the original. The app keeps writing to the same file | Works with any app; lines written during the copy can be lost |
| `create` plus `postrotate` | Renames the log, creates a new empty one, then signals the app to reopen it (for example `kill -USR1` for nginx) | No lost lines; the app must support reopening its log |

```text
systemctl list-timers logrotate.timer        # when it runs next
sudo logrotate -d /etc/logrotate.d/myapp     # dry run: shows what it WOULD do
sudo logrotate -f /etc/logrotate.d/myapp     # force a rotation now
cat /var/lib/logrotate/status                # when each file was last rotated
```

## Ship · Get logs off the server

Logs that live only on the server disappear with it: after an autoscaling group replaces an instance, after a disk failure, or when an attacker cleans up after themselves. And searching ten servers one by one doesn't scale. So production systems run an agent, such as Fluent Bit, Vector, the OpenTelemetry Collector, or the Amazon CloudWatch agent, that reads the journal and log files and sends them to a central store you can search and alert on.

## Metrics · Numbers over time

Logs answer *what happened*. **Metrics** are numbers sampled over time, such as CPU use, memory available, or disk free, and they show trends: the disk that will be full by Thursday. **Prometheus node_exporter** exposes hundreds of system metrics over HTTP for a monitoring server to collect:

```text
sudo apt install -y prometheus-node-exporter
curl -s localhost:9100/metrics | grep -E "^node_load1 |^node_memory_MemAvailable_bytes"
curl -s localhost:9100/metrics | grep 'node_filesystem_avail_bytes{.*mountpoint="/"'
```

A Prometheus server scrapes this endpoint every few seconds and stores the history. Alert rules are written in its query language, PromQL. Two examples of rules worth having:

```text
# The root filesystem will be full within 4 hours, at the current rate
predict_linear(node_filesystem_avail_bytes{mountpoint="/"}[6h], 4 * 3600) < 0

# Less than 10% of memory available, for 10 minutes
node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes < 0.10
```

The first is far more useful than "disk over 90%": it warns early on a fast-filling disk and stays quiet on one that's been at 91% for a year. Alert on what users feel (errors, latency) and on what is about to become an outage. Everything else goes on a dashboard, not to someone's phone. The Kubernetes track's [Observability module](../kubernetes-operations/18-observability-and-alerting.html) applies the same ideas to a cluster.

## Break it, fix it · The log that never rotates

`/var/log/myapp/app.log` has grown to hundreds of megabytes. There's a logrotate config for it, and logrotate runs every day, but the file never rotates. Set it up:

```text
sudo mkdir -p /var/log/myapp
sudo dd if=/dev/zero of=/var/log/myapp/app.log bs=1M count=200

sudo tee /etc/logrotate.d/myapp <<'EOF'
/var/log/my-app/*.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
}
EOF

sudo logrotate -f /etc/logrotate.d/myapp
ls -lh /var/log/myapp            # still one 200 MB file
```

Your job: find out why logrotate does nothing, and make it rotate. Try it before opening a hint.

### Hint 1 · Where to look

- logrotate didn't report an error, so something told it to stay quiet. Ask it to explain exactly what it considered, and compare that with where the log really is.

### Hint 2 · Which tool

- `sudo logrotate -d /etc/logrotate.d/myapp` is a dry run with an explanation of every decision. Read the line about the log path, then compare it with `ls /var/log/`.

### Hint 3 · The cause and the fix

- **Cause:** the config's path is `/var/log/my-app/*.log`, with a hyphen, but the directory is `/var/log/myapp`. logrotate finds no matching files, and `missingok` tells it to skip them silently, so nothing ever rotates and nothing complains.
- **Fix:** correct the path to `/var/log/myapp/*.log`, then `sudo logrotate -f /etc/logrotate.d/myapp`. The directory now holds `app.log.1.gz` and a new `app.log`. For a real app, add `copytruncate`, or a `postrotate` signal, so it writes to the new file.
- **Prevent it:** after writing a logrotate config, always run `logrotate -d` and read the output. `missingok` is useful, but it hides typos. Alert on disk space trends, so a log that stops rotating is caught long before the disk fills.

### Implementation notes

- **Log to stdout in services and containers.** systemd and container runtimes capture it, timestamp it, and rotate it for you, and your app never has to manage files.
- **Structured logs save hours.** One JSON object per line, with fields like `level`, `request_id`, and `duration_ms`, can be filtered and counted directly in the central store.
- **Never log secrets.** Tokens, passwords, and personal data in logs end up in every system the logs are shipped to.
- **Every alert needs an action.** If nobody would do anything when it fires, make it a dashboard panel instead.

## Recap · Key terms

- **journald and journalctl:** the systemd journal, and the tool that searches it.
- **Priority:** a message's severity, from `emerg` down to `debug`.
- **logrotate:** renames, compresses, and deletes old log files on a schedule.
- **`copytruncate` versus `postrotate`:** empty the file in place, or signal the app to reopen a new one.
- **Log shipping:** an agent sends logs to a central store, so they outlive the server.
- **Metric:** a number sampled over time; node_exporter exposes the system's metrics.
- **PromQL:** Prometheus's query language, used for dashboards and alert rules.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: What does `journalctl -p err -b` show?
- Every message from the previous boot
* Messages of priority `err` or more severe, since the current boot
- Only kernel errors
- Errors from the `err` service
= `-p err` filters by priority, including anything more severe than `err`, and `-b` limits it to the current boot.
Q: Why does an application keep writing to an old log file after logrotate renames it?
- logrotate locks the new file
* The application still has the old file open, and renaming doesn't change that
- The new file has the wrong permissions
- The journal intercepts the writes
= An open file is tied to its inode, not its name. The app needs to reopen the log (signalled by `postrotate`), or logrotate must use `copytruncate`.
Q: Which disk alert is most useful?
- Disk usage above 50%
- Disk usage above 90%
* The disk is predicted to be full within a few hours at the current rate of growth
- Any change in disk usage
= A trend-based alert warns early on a fast-filling disk and stays quiet on a disk that's been steady at a high level for months.
S: A server was replaced by its autoscaling group overnight, and you need its application logs from before the replacement. Where should they be?
- In `/var/log` on the new server
- In the journal on the new server
* In the central log store the logging agent shipped them to
- They can't exist anywhere
= Local logs disappear with the instance. Shipping logs to a central store is what keeps them available after servers are replaced.
S: You wrote a new logrotate config. How do you check it will work, without waiting until tomorrow?
- Reboot the server
* Run `sudo logrotate -d` on the config and read what it would do
- Delete the log file and see whether it comes back
- Check `systemctl status` for the app
= The dry run explains every decision, including files it can't find, and changes nothing. `-f` then forces a real rotation if you want to see it happen.
```
