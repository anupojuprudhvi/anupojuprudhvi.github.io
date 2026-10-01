---
title: Packages, Repositories & Where Software Lives
date: 2026-10-01
track: linux-for-devops
order: 5
module: 5
summary: How Linux installs software. What a package is, apt and dnf side by side, adding a signed third-party repository, finding which package owns a file, holding versions, and upgrading safely. Then fix a server where every apt command fails.
level: Foundations · Hands-on lab
readingTime: 12 min read
stack: [apt, dpkg, dnf, Ubuntu 24.04, Terraform]
tags: [linux, apt, dnf, packages, repositories, upgrades, basics]
---

**In this module, you'll learn to:**

- Install, inspect, and remove software with apt, and translate those commands to dnf
- Add a signed third-party repository, and pin or hold a version
- Work out where a program came from when two copies of it exist

**Before you start:** finish [Shell Survival](01-shell-survival.html). Open a shell on your lab VM with `multipass shell lab`.

## Principle · Why software comes in packages

You could download a program and copy it into place. Then you'd also have to track its dependencies, check it wasn't tampered with, update it when a security fix comes out, and remember every file it put on the disk so you could remove it later. A **package manager** does all of that.

A **package** is an archive of files, plus metadata: its name, its version, what other packages it depends on, and scripts to run on install and removal. Packages come from **repositories**, servers that publish them along with a signed index. Ubuntu and Debian use `.deb` packages, managed with `apt` and `dpkg`. Red Hat, Rocky Linux, and Amazon Linux use `.rpm` packages, managed with `dnf`.

```flow
title: What happens during sudo apt install nginx
Sources | /etc/apt/sources.list.d/ lists each repository and the key that signs it
-> apt update downloads every repository's index and checks its signature
Local index | which versions of which packages exist, and what each depends on
-> apt install nginx works out the dependencies, then downloads the .deb files
dpkg | unpacks the files and runs the package's install scripts
-> records every file it installed
* dpkg database | so you can list, check, upgrade, and cleanly remove it later
```

## Everyday · apt commands

```text
sudo apt update              # refresh the package index. Installs nothing.
apt list --upgradable        # what has a newer version available?
sudo apt upgrade             # install those newer versions
sudo apt install -y tree     # install a package and its dependencies
apt show tree                # description, version, and dependencies
apt search "json processor"  # search names and descriptions
sudo apt remove tree         # remove the program, keep its config files
sudo apt purge tree          # remove it and its config files
sudo apt autoremove          # remove dependencies nothing needs any more
```

`apt update` and `apt upgrade` are different commands. `update` only refreshes the list of what's available; `upgrade` actually installs newer versions. Running `upgrade` without a recent `update` installs nothing new.

## Investigate · Which package, which file, which version

These questions come up constantly when you're working out what's on a server you've inherited:

```text
dpkg -S /usr/bin/ssh          # which package installed this file?
dpkg -L openssh-client        # which files did this package install?
apt list --installed | wc -l  # how many packages are installed?
apt policy openssh-server     # installed version, newest available, and
                              #   which repository each version comes from
less /var/log/apt/history.log # what was installed or upgraded, and when
```

If you also work on Red Hat family systems, most of this translates directly:

| Task | Ubuntu, Debian (apt, dpkg) | RHEL, Rocky, Amazon Linux (dnf, rpm) |
| --- | --- | --- |
| Refresh the index | `apt update` | `dnf makecache` (dnf refreshes on its own) |
| Install | `apt install nginx` | `dnf install nginx` |
| Upgrade everything | `apt upgrade` | `dnf upgrade` |
| Which package owns a file? | `dpkg -S /path` | `rpm -qf /path` |
| Files in a package | `dpkg -L pkg` | `rpm -ql pkg` |
| Repository definitions | `/etc/apt/sources.list.d/` | `/etc/yum.repos.d/` |
| History | `/var/log/apt/history.log` | `dnf history` |

## Lab · Add a signed third-party repository

Ubuntu's own repositories don't carry every tool, or always the newest version. Vendors publish their own repositories. Add HashiCorp's and install Terraform, the tool behind the [Terraform for Enterprise Production](../terraform/index.html) track on this site:

```text
# 1. Download the vendor's signing key and store it as a keyring file
wget -O - https://apt.releases.hashicorp.com/gpg \
  | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg

# 2. Add the repository, trusting ONLY that key for it
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" \
  | sudo tee /etc/apt/sources.list.d/hashicorp.list

# 3. Refresh the index and install
sudo apt update
sudo apt install -y terraform

terraform version
apt policy terraform          # shows the version came from HashiCorp's repo
```

`signed-by` ties the repository to one key. Without it, a key added for one vendor could be used to sign packages that claim to come from another repository.

**Hold a version** when an upgrade must wait, for example until a team has tested the new release:

```text
sudo apt-mark hold terraform     # apt upgrade will skip it
apt-mark showhold
sudo apt-mark unhold terraform
```

## Locations · Where software lives, and which copy runs

| Location | Who puts software there |
| --- | --- |
| `/usr/bin`, `/usr/sbin` | The package manager. Don't add files here by hand. |
| `/usr/local/bin` | You or a script, by hand, outside the package manager |
| `/opt/<name>` | Vendors' self-contained bundles, all in one directory |
| `/snap/bin` | Snap packages, Ubuntu's other packaging format |

When you type a command, the shell runs the **first** match it finds in the directories listed in `$PATH`, and on Ubuntu `/usr/local/bin` comes before `/usr/bin`. So a copy someone installed by hand silently wins over the packaged one, however often apt upgrades the packaged copy.

```text
echo $PATH                 # the directories, in search order
type -a terraform          # EVERY copy on the PATH, the one that runs first
```

## Upgrades · Keeping servers patched

Ubuntu servers install security updates automatically with **unattended-upgrades**, which is on by default. Some updates, such as a new kernel, only take effect after a reboot. When one is waiting, the file `/var/run/reboot-required` exists, and `/var/run/reboot-required.pkgs` lists which packages need it.

```text
cat /var/run/reboot-required 2>/dev/null || echo "no reboot needed"
less /var/log/unattended-upgrades/unattended-upgrades.log
```

In production, reboot a few servers at a time, after checking that the rest can carry the load.

## Break it, fix it · Every apt command fails

A teammate followed the newer install instructions on a vendor's website for a tool that was already installed. Since then, every apt command on the server fails, including the automatic security updates. Reproduce it after the lab above:

```text
echo "deb [signed-by=/etc/apt/keyrings/hashicorp.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" \
  | sudo tee /etc/apt/sources.list.d/hashicorp-new.list

sudo apt update
sudo apt install -y tree
```

Your job: get apt working again without losing the HashiCorp repository. Try it before opening a hint.

### Hint 1 · Where to look

- Read the error carefully: it names a repository URL and two different values for the same option. Ask where apt reads repository definitions from, and whether this repository is defined more than once.

### Hint 2 · Which tool

- `grep -r "hashicorp" /etc/apt/sources.list.d/` lists every file that mentions the repository. Compare the `signed-by` path in each one, and check which key file actually exists with `ls /usr/share/keyrings /etc/apt/keyrings`.

### Hint 3 · The cause and the fix

- **Cause:** the same repository is now defined in two files, each trusting a different key file. apt won't guess which one is right, so it stops reading all of its sources, and every apt command fails with "Conflicting values set for option Signed-By".
- **Fix:** remove the duplicate whose key doesn't exist: `sudo rm /etc/apt/sources.list.d/hashicorp-new.list`, then `sudo apt update`.
- **Prevent it:** check `grep -r <vendor> /etc/apt/sources.list.d/` before adding a repository, and keep one file per repository. Better still, manage repositories with automation, so every server gets exactly one definition.

### Implementation notes

- **Avoid piping install scripts from the internet straight into a shell.** `curl https://... | sudo bash` runs whatever the server sends you, as root. Prefer a signed repository, or download the script, read it, then run it.
- **Pin versions in automation.** `apt install terraform=1.9.8-1` installs the same version every time; plain `apt install terraform` installs whatever is newest that day. `apt list -a terraform` shows the exact version strings available.
- **Containers and VM images freeze packages.** An image built months ago has months-old packages. Rebuild images regularly instead of patching running containers.
- **`apt` is for people, `apt-get` for scripts.** `apt`'s output can change between releases; `apt-get` keeps a stable interface for automation.

## Recap · Key terms

- **Package:** an archive of files, plus metadata, dependencies, and install scripts.
- **Repository:** a server that publishes packages with a signed index.
- **`apt update` and `apt upgrade`:** refresh the index, and install newer versions.
- **`signed-by`:** ties a repository to the one key allowed to sign it.
- **Hold:** stops a package from being upgraded until you release it.
- **`$PATH`:** the directories the shell searches for programs, in order. The first match runs.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: What does `sudo apt update` do?
* Downloads the latest package index from each repository; it installs nothing
- Upgrades every installed package to its newest version
- Updates apt itself to the newest version
- Reboots into a newer kernel
= `update` only refreshes what apt knows is available. `apt upgrade` is the command that installs newer versions.
Q: How do you find out which package installed `/usr/bin/ssh`?
- `apt show /usr/bin/ssh`
* `dpkg -S /usr/bin/ssh`
- `which ssh`
- `ls -l /usr/bin/ssh`
= `dpkg -S` searches the record of installed files and names the package that owns a path. On Red Hat family systems the equivalent is `rpm -qf`.
Q: Why does each repository entry name a key with `signed-by`?
- To make downloads faster
- So apt can work without internet access
* So only that vendor's key can vouch for packages from that repository
- To encrypt the packages
= The signature proves the index came from the publisher and wasn't changed on the way. `signed-by` stops a key added for one vendor from vouching for another repository.
S: apt says Terraform was upgraded, but `terraform version` still shows the old version. What do you check first?
- Reinstall Terraform with `apt install --reinstall`
* `type -a terraform`, to see whether another copy earlier in `PATH` is the one running
- Reboot the server
- Clear apt's cache with `apt clean`
= An older copy installed by hand in `/usr/local/bin` comes before `/usr/bin` in `PATH`, so it runs instead of the packaged one. `type -a` lists every copy in search order.
S: A database client must stay on its current version until the application team has tested the new one, but the server should keep getting other updates. What do you do?
- Turn off unattended-upgrades
- Remove the repository
* `sudo apt-mark hold` the client package, and unhold it after testing
- Never run `apt upgrade` again
= A hold skips just that package during upgrades, so security fixes for everything else keep arriving.
```
