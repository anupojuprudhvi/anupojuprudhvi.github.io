---
title: Automation: Safe Bash, cloud-init & Ansible
date: 2026-10-01
track: linux-for-devops
order: 18
module: 18
summary: Anything you do on a server twice should be written down as code. Write Bash scripts that fail safely and can run again without harm, configure servers at first boot with cloud-init, and describe a server's desired state with Ansible. Then fix a script that works by hand but fails every night in cron.
level: Linux for DevOps · Hands-on lab
readingTime: 15 min read
stack: [Bash, ShellCheck, cron, cloud-init, Ansible]
tags: [linux, bash, scripting, automation, ansible, cloud-init, cron]
---

**In this module, you'll learn to:**

- Write Bash scripts that stop on errors, clean up after themselves, and can safely run twice
- Explain what cloud-init does at first boot, and where it fits next to images and Ansible
- Write and run an idempotent Ansible playbook, and diagnose jobs that only fail when scheduled

**Before you start:** finish [Shell Survival](01-shell-survival.html) and [systemd: Services, Timers & Logs](07-systemd-and-services.html). Open a shell on your lab VM with `multipass shell lab`.

## Principle · From commands to code

Typing the same commands on every server doesn't scale, and it drifts: one server gets a slightly different setting, and nobody remembers why. Automation turns those commands into code you can review, test, and run again. Three tools cover most of it, each at a different stage of a server's life:

```flow
title: Where each automation tool fits
Image | Packer or a cloud image: the base OS, baked in advance
-> a new server boots from the image
cloud-init | runs once at first boot: users, keys, packages, a bootstrap command
-> the server joins the fleet
* Configuration management | Ansible keeps every server in the desired state, run after run
-> small fixes and checks between runs
Scripts | Bash for glue: one-off tasks, health checks, and small jobs
```

## Bash · Scripts that fail safely

[Shell Survival](01-shell-survival.html) showed a script that printed "Backup complete" after failing. A safe script starts like this:

```bash
#!/usr/bin/env bash
set -euo pipefail                     # stop on errors, unset variables, failed pipes

readonly BACKUP_DIR="/var/backups/app"
tmp="$(mktemp -d)"                    # a private temporary directory
trap 'rm -rf "$tmp"' EXIT             # always removed, even if the script fails

log() { echo "$(date -Is) $*" >&2; }  # messages go to stderr, with a timestamp

main() {
  [[ -d "$BACKUP_DIR" ]] || { log "missing $BACKUP_DIR"; exit 1; }
  log "archiving to $tmp"
  tar -czf "$tmp/app.tgz" -C "$BACKUP_DIR" .
  mv "$tmp/app.tgz" "/srv/backups/app-$(date +%F).tgz"
  log "done"
}

main "$@"
```

The rules that matter most:

- **`set -euo pipefail`** at the top of every script.
- **Quote every variable:** `"$file"`, not `$file`. Without quotes, a name with a space becomes two arguments, and an empty variable can turn `rm -rf "$dir/"` into something very different.
- **`trap ... EXIT`** for clean-up, so temporary files and locks don't outlive a failure.
- **Check with ShellCheck:** `sudo apt install -y shellcheck`, then `shellcheck script.sh` catches most quoting mistakes and common bugs before they run.

## Idempotent · Safe to run twice

A script is **idempotent** if running it a second time changes nothing and breaks nothing. That's what lets you rerun automation after a failure, or on a schedule, without fear:

| Not idempotent | Idempotent |
| --- | --- |
| `echo "vm.swappiness=10" >> /etc/sysctl.conf` (adds a duplicate every run) | `echo "vm.swappiness=10" > /etc/sysctl.d/60-swappiness.conf` |
| `mkdir /srv/app` (fails if it exists) | `mkdir -p /srv/app` |
| `useradd app` (fails the second time) | `id app &>/dev/null \|\| useradd --system app` |
| `sed -i 's/8080/9090/' app.conf` (assumes the old value is there) | Write the whole file from a template |

## cloud-init · Configure at first boot

Cloud images run **cloud-init** on first boot. It reads **user data**, supplied when the server is created, and applies it: users, SSH keys, packages, files, and commands. You've already used it: the `keys.yaml` in [Users, sudo & SSH](04-users-sudo-and-ssh.html) was cloud-init user data. A fuller example:

```yaml
#cloud-config
package_update: true
packages: [nginx, prometheus-node-exporter]
write_files:
  - path: /var/www/html/index.html
    content: "Built by cloud-init\n"
runcmd:
  - systemctl enable --now nginx
```

```text
# On your laptop: a new VM from that file
multipass launch 24.04 --name web --cloud-init web.yaml

# On the VM: did it work, and what did it do?
cloud-init status --long
sudo less /var/log/cloud-init-output.log
```

Keep user data small: enough to make the server reachable and hand over to configuration management. Big bootstrap scripts are hard to test and only run once.

## Ansible · Describe the state, not the steps

**Ansible** connects to servers over SSH and applies a **playbook**: a list of tasks that each describe a desired state ("nginx is installed", "this file has this content", "the service is running"). Each task checks the current state first and changes only what's different, so playbooks are idempotent by design.

On the lab VM, install Ansible and write a playbook that configures the VM itself:

```text
sudo apt install -y ansible
mkdir -p ~/ansible && cd ~/ansible
```

```yaml
# site.yml
- hosts: all
  become: true
  tasks:
    - name: Install nginx
      ansible.builtin.apt:
        name: nginx
        state: present
        update_cache: true

    - name: Home page
      ansible.builtin.copy:
        dest: /var/www/html/index.html
        content: "Managed by Ansible\n"

    - name: nginx is running and starts at boot
      ansible.builtin.service:
        name: nginx
        state: started
        enabled: true
```

```text
ansible-playbook -i localhost, -c local site.yml    # first run: changed=2 or 3
ansible-playbook -i localhost, -c local site.yml    # second run: changed=0
curl localhost
```

The second run reporting `changed=0` is idempotency in action. In real use, the inventory (`-i`) lists your servers, and Ansible reaches them over SSH, through a bastion with the `ProxyJump` setup from [Users, sudo & SSH](04-users-sudo-and-ssh.html).

## Break it, fix it · Works by hand, fails in cron

A teammate's nightly report script works perfectly when they run it. Scheduled in cron, it has never produced a single report. Set it up exactly as they did:

```text
mkdir -p ~/bin ~/reports
cat > ~/bin/stamp <<'EOF'
#!/bin/bash
date +%F-%T
EOF
cat > ~/bin/nightly-report.sh <<'EOF'
#!/bin/bash
set -euo pipefail
stamp > "$REPORT_DIR/last-run.txt"
EOF
chmod +x ~/bin/stamp ~/bin/nightly-report.sh

echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc
echo 'export REPORT_DIR="$HOME/reports"' >> ~/.bashrc
source ~/.bashrc

nightly-report.sh && cat ~/reports/last-run.txt          # works by hand

# Schedule it every minute, for the lab
( crontab -l 2>/dev/null; echo "* * * * * $HOME/bin/nightly-report.sh" ) | crontab -
```

Wait two minutes, then check `~/reports/last-run.txt`. It never changes. Your job: find out why, and make the scheduled run work. Try it before opening a hint.

### Hint 1 · Where to look

- cron runs the script, but not from your interactive shell. Think about what your shell has set up that a scheduled job wouldn't have. Then find a way to see the script's error message, because cron is currently throwing it away.

### Hint 2 · Which tool

- `grep CRON /var/log/syslog` or `journalctl -t CRON -n 5` shows that cron ran it. To see the error, change the crontab line (`crontab -e`) to end with `>> /tmp/nightly.log 2>&1`, wait a minute, and read `/tmp/nightly.log`.

### Hint 3 · The cause and the fix

- **Cause:** cron starts jobs with a minimal environment: `PATH` is just `/usr/bin:/bin`, and `~/.bashrc` is never read. So `REPORT_DIR` is unset, and `set -u` stops the script with "REPORT_DIR: unbound variable". Had it got further, `stamp` would fail with "command not found". cron tried to email the output, and with no mail system installed, it was discarded.
- **Fix:** make the script self-contained. Set what it needs at the top (`REPORT_DIR="${REPORT_DIR:-$HOME/reports}"`), and call programs by full path (`"$HOME/bin/stamp"`). Or set the variables in the crontab itself, above the job line. Remove the lab job afterwards with `crontab -r`.
- **Prevent it:** never rely on your interactive shell's setup in scheduled jobs. Always send scheduled output somewhere you'll see it. Better still, use a systemd timer: its `Environment=` lines are explicit, and every run's output lands in the journal.

### Implementation notes

- **Keep secrets out of scripts and playbooks.** Read them from a secret store, or use Ansible Vault, never plain text in Git.
- **Check before you change,** and print what you're about to do. `ansible-playbook --check --diff` shows the changes a playbook would make, without making them.
- **Lock long-running jobs** so two copies can't overlap: `flock -n /run/lock/report.lock script.sh` skips the run if the last one is still going.
- **Prefer a module to a shell command in Ansible.** `ansible.builtin.shell` runs every time and always reports a change, losing idempotency unless you add conditions.

## Recap · Key terms

- **`set -euo pipefail`:** stop on errors, unset variables, and failed pipelines.
- **`trap ... EXIT`:** clean-up that runs however the script ends.
- **Idempotent:** running it again changes nothing and breaks nothing.
- **cloud-init and user data:** first-boot configuration, and the instructions it applies.
- **Ansible playbook:** a list of tasks, each describing a desired state.
- **Inventory:** the list of servers Ansible manages.
- **cron's environment:** a minimal PATH and no shell startup files, unlike your terminal.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: What does "idempotent" mean for a script or playbook?
- It runs faster each time
* Running it again leaves the system the same, and doesn't fail or duplicate changes
- It can only run once
- It runs on many servers at once
= An idempotent task checks the current state and changes only what's different. That makes reruns after a failure safe, and lets automation run on a schedule.
Q: Why should variables in Bash be quoted, as in `"$file"`?
- Quotes make scripts run faster
* Without quotes, spaces and empty values change how the command is split, sometimes dangerously
- Bash requires quotes around every word
- Quotes keep the variable secret
= An unquoted name with a space becomes two arguments, and an empty variable vanishes from the command. `rm -rf $dir/` with an empty `dir` is the classic disaster.
Q: When does cloud-init normally apply its user data?
* Once, at a server's first boot
- Every time Ansible runs
- Every hour
- Whenever a package is installed
= cloud-init configures a new server at first boot: users, keys, packages, and a bootstrap command. Ongoing changes are configuration management's job.
S: A playbook task uses `ansible.builtin.shell: echo "LOG=1" >> /etc/app.conf`. The file has grown a new line on every run. What's the better approach?
- Run the playbook less often
* Use a module that manages the line or the whole file, such as `lineinfile` or `copy`
- Add `become: true`
- Delete the file before each run
= `shell` runs blindly every time. `lineinfile` or a template checks the current state first, so the line exists exactly once however often it runs.
S: A script works in your terminal but fails under cron with "command not found". What's the most likely cause?
- cron doesn't support Bash
* cron's `PATH` is minimal and doesn't include directories your shell adds, such as `~/bin`
- The script needs `sudo`
- The server's clock is wrong
= cron doesn't read your shell's startup files. Use full paths, or set `PATH` explicitly in the script or crontab.
```
