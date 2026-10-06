---
title: systemd: Services, Timers & Logs
date: 2026-10-01
track: linux-for-devops
order: 7
module: 7
summary: Almost everything long-running on a modern Linux server is a systemd service. Turn a small Python app into a hardened service, change it safely with drop-in overrides, replace a cron job with a timer, and read its logs with journalctl. Then fix a service that keeps restarting and failing.
level: How Linux works · Hands-on lab
readingTime: 15 min read
stack: [systemd, systemctl, journalctl, Python, Ubuntu 24.04]
tags: [linux, systemd, services, timers, journalctl, troubleshooting]
---

**In this module, you'll learn to:**

- Start, stop, enable, and inspect services with `systemctl`, and read their logs with `journalctl`
- Write a unit file with a restart policy and basic hardening, and change it with drop-in overrides
- Schedule work with a systemd timer, and diagnose a service that won't stay up

**Before you start:** read [The Boot Process](06-boot-process.html). Open a shell on your lab VM with `multipass shell lab`.

## Principle · systemd keeps services running

systemd is PID 1, the first process the kernel starts. Besides booting the system, it supervises everything long-running: web servers, databases, agents, your own apps. You describe each one in a **unit file**, and systemd starts it in the right order, restarts it when it crashes, captures its output, and limits what it can touch.

```flow
title: What systemd does for one service
Unit file | /etc/systemd/system/hello.service: what to run, as whom, with which limits
-> systemctl daemon-reload makes systemd read it
* systemd | starts the process as the right user, in its own control group
-> captures everything the process prints
journald | stores the output; read it with journalctl -u hello
-> the process crashes
Restart policy | Restart=on-failure starts it again, up to a limit
```

## Everyday · systemctl and journalctl

```text
systemctl status ssh            # running? since when? main PID, last log lines
sudo systemctl restart ssh      # stop, then start
sudo systemctl reload ssh       # re-read config without stopping (if supported)
sudo systemctl enable ssh       # start at boot
sudo systemctl disable ssh      # don't start at boot
systemctl is-enabled ssh
systemctl list-units --type=service --state=running
systemctl --failed              # anything that failed: check this on any sick server

systemctl cat ssh               # the unit file, plus any overrides
journalctl -u ssh               # this service's logs
journalctl -u ssh -f            # follow live, like tail -f
journalctl -u ssh --since "1 hour ago"
journalctl -p err -b            # errors from every service since boot
```

`enable` and `start` are separate. `start` runs a service now, and `enable` makes it start at every boot. `sudo systemctl enable --now name` does both, and forgetting `enable` is the classic reason a service is missing after a reboot.

Unit files shipped by packages live in `/usr/lib/systemd/system/`. Your own units and changes go in `/etc/systemd/system/`, which takes priority. Never edit the packaged files: the next package update overwrites them.

## Lab · Turn a script into a service

Create a small web app and a dedicated system user to run it:

```text
sudo useradd --system --no-create-home --shell /usr/sbin/nologin hello
sudo mkdir -p /opt/hello

sudo tee /opt/hello/app.py <<'EOF'
import http.server, os
port = int(os.environ.get("PORT", "8080"))
class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"hello from systemd\n")
print(f"listening on {port}", flush=True)
http.server.HTTPServer(("0.0.0.0", port), Handler).serve_forever()
EOF
```

Now the unit file:

```text
sudo tee /etc/systemd/system/hello.service <<'EOF'
[Unit]
Description=Hello demo web app
After=network-online.target
Wants=network-online.target

[Service]
User=hello
Environment=PORT=8080
ExecStart=/usr/bin/python3 /opt/hello/app.py
Restart=on-failure
RestartSec=2
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now hello
systemctl status hello
curl localhost:8080
journalctl -u hello -n 5
```

Each line earns its place:

| Setting | What it does |
| --- | --- |
| `After=` and `Wants=network-online.target` | Start once the network is up, not just "configured" |
| `User=hello` | Run as an unprivileged user, never as root |
| `Environment=` | Configuration passed in, not baked into the code |
| `Restart=on-failure`, `RestartSec=2` | Restart after a crash, two seconds later |
| `NoNewPrivileges=yes` | The process can never gain more privileges, for example through setuid programs |
| `ProtectSystem=strict`, `ProtectHome=yes` | The whole filesystem is read-only to it, and home directories are hidden |
| `PrivateTmp=yes` | Its own private `/tmp`, invisible to other services |
| `WantedBy=multi-user.target` | What `enable` hooks it into, so it starts at boot |

Test the restart policy by killing the process the way a crash would:

```text
sudo systemctl kill -s KILL hello
sleep 3
systemctl status hello       # a new main PID, and "activating" or "running" again
```

## Change · Drop-in overrides

To change a unit, whether it's yours or one from a package, don't edit the original file. Add a **drop-in**: a small file that overrides individual settings and survives package updates.

```text
sudo systemctl edit hello
```

This opens an editor on `/etc/systemd/system/hello.service.d/override.conf`. Add these lines, then save:

```text
[Service]
Environment=PORT=9090
```

```text
sudo systemctl restart hello     # `systemctl edit` already reloaded systemd
curl localhost:9090
systemctl cat hello              # the original file, then the override
```

`systemctl cat` is how you find out why a service doesn't behave the way its main file says. Someone may have added a drop-in.

## Schedule · Timers instead of cron

`cron` still works, but systemd **timers** log every run to the journal, can catch up on runs missed while the server was off, and show when they'll fire next. A timer starts a service of the same name:

```text
sudo tee /etc/systemd/system/disk-report.service <<'EOF'
[Unit]
Description=Log disk usage

[Service]
Type=oneshot
ExecStart=/usr/bin/df -h /
EOF

sudo tee /etc/systemd/system/disk-report.timer <<'EOF'
[Unit]
Description=Log disk usage every 15 minutes

[Timer]
OnCalendar=*:0/15
Persistent=true

[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now disk-report.timer
systemctl list-timers disk-report.timer      # when it fires next
sudo systemctl start disk-report.service     # run it once now
journalctl -u disk-report -n 5
```

`OnCalendar=*:0/15` means "every hour, at minute 0 and every 15 minutes after". `Persistent=true` runs a missed job as soon as the server is back up.

## Break it, fix it · The service that won't stay up

A teammate tightened security on the `hello` service last night. This morning it's down, and the monitoring shows it restarted several times before giving up. Reproduce the change:

```text
sudo mkdir -p /etc/systemd/system/hello.service.d
sudo tee /etc/systemd/system/hello.service.d/10-security.conf <<'EOF'
[Service]
User=helo
EOF
sudo systemctl daemon-reload
sudo systemctl restart hello
```

Your job: find out why the service won't start, fix it, and get it running again. Try it before opening a hint.

### Hint 1 · Where to look

- Start with `systemctl status hello` and read the exit status it reports. systemd uses special exit codes, above 200, for failures that happen before your program even runs. Then check *every* file that makes up the unit, not just the main one.

### Hint 2 · Which tool

- `journalctl -u hello -n 20` shows why each start failed. `systemctl cat hello` prints the main unit file and every drop-in, so you can see which file set what.

### Hint 3 · The cause and the fix

- **Cause:** the new drop-in sets `User=helo`, a typo for `hello`. systemd can't find that user, so the process never starts: the status shows `status=217/USER`. `Restart=on-failure` retries every two seconds until systemd's start limit is hit ("Start request repeated too quickly"), then stops trying.
- **Fix:** correct the drop-in to `User=hello`, or remove the file. Then `sudo systemctl daemon-reload`, `sudo systemctl reset-failed hello` to clear the start limit, and `sudo systemctl restart hello`. Remove the leftover port override too if you want it back on 8080.
- **Prevent it:** after changing a unit, run `systemd-analyze verify /etc/systemd/system/hello.service` to catch syntax errors, then check `systemctl status` straight away. A failure like this one shows up within seconds, long before monitoring notices.

### Implementation notes

- **Exit codes 200 and above come from systemd itself,** not your app. 203/EXEC means the program in `ExecStart` wasn't found or isn't executable, 217/USER a missing user, 226/NAMESPACE a protection setting that refers to a missing path.
- **Use absolute paths in `ExecStart=`.** systemd doesn't use your shell's `PATH`. It looks for a bare program name only in a fixed list of system directories, so `python3` may run a different copy than the one you tested, and a relative file such as `app.py` is looked for in `/`, not where you saved it.
- **Services don't read `/etc/security/limits.conf`.** Resource limits for a service go in its unit, such as `LimitNOFILE=`, which the next module needs.
- **Prefer the journal over log files the app writes itself.** Anything a service prints goes to the journal with a timestamp and the unit name, ready to ship off the server.

## Recap · Key terms

- **Unit:** anything systemd manages: a service, timer, mount, or target.
- **Unit file:** the configuration for a unit. Yours go in `/etc/systemd/system/`.
- **`daemon-reload`:** makes systemd re-read unit files after you change them.
- **Drop-in override:** a small file in `name.service.d/` that changes individual settings.
- **Restart policy:** when systemd restarts a crashed service, and how often before it gives up.
- **Timer:** a unit that starts a service on a schedule, replacing cron.
- **journald and journalctl:** where service output is stored, and the tool that reads it.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: What's the difference between `systemctl start` and `systemctl enable`?
* `start` runs the service now; `enable` makes it start at every boot
- They do the same thing
- `enable` runs it now; `start` makes it start at boot
- `start` is for services; `enable` is for timers
= They're independent. `enable --now` does both, and missing `enable` is why services vanish after a reboot.
Q: You want to change one setting of a unit that came from a package. What's the right way?
- Edit the file in `/usr/lib/systemd/system/` directly
* Add a drop-in with `sudo systemctl edit name`
- Copy the binary somewhere else
- Edit the journal configuration
= A drop-in in `/etc/systemd/system/name.service.d/` overrides just that setting and survives package updates, which would overwrite an edited original.
Q: After editing a unit file, what must happen before systemd uses the new version?
- A reboot
* `sudo systemctl daemon-reload`, then a restart of the service
- Nothing; systemd watches the files
- `journalctl --rotate`
= systemd keeps unit files in memory. `daemon-reload` makes it read them again, and a restart applies the change to the running service. `systemctl edit` runs the reload for you.
S: A service shows `status=203/EXEC` and never starts. What do you check?
- The service's network settings
- The journal's disk space
* That the `ExecStart` program exists, is executable, and is given as an absolute path
- That the timer is enabled
= 203/EXEC means systemd couldn't run the program at all. The usual causes are a wrong path, a missing execute bit, or a relative path.
S: A service works when you start it by hand, but after last night's reboot it isn't running and `systemctl --failed` is empty. What's most likely?
- It crashed and hit its restart limit
* It was started but never enabled, so it didn't start at boot
- The journal was full
- systemd skipped it because the boot was slow
= A failed unit would appear in `systemctl --failed`. A service that was never enabled simply isn't started at boot, and `systemctl is-enabled` confirms it.
```
