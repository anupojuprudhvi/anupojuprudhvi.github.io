---
title: Security Hardening, AppArmor & TLS
date: 2026-10-01
track: linux-for-devops
order: 17
module: 17
summary: Make a fresh server harder to break into and easier to investigate. Reduce what's exposed, set up a default-deny firewall, audit sensitive files, read AppArmor and SELinux denials instead of switching them off, and check TLS certificates and time sync. Then fix a server where every HTTPS call suddenly fails.
level: Linux for DevOps · Hands-on lab
readingTime: 15 min read
stack: [ufw, auditd, AppArmor, SELinux, openssl, timedatectl, Lynis]
tags: [linux, security, hardening, apparmor, selinux, tls, auditd]
---

**In this module, you'll learn to:**

- Harden a fresh server against a short, practical checklist
- Record who changes sensitive files with auditd, and read AppArmor and SELinux denials
- Inspect TLS certificates with `openssl`, and recognise problems caused by a wrong clock

**Before you start:** finish [Users, sudo & SSH](04-users-sudo-and-ssh.html) and [DNS, Firewalls & Packet Capture](12-dns-firewalls-and-packets.html). Open a shell on your lab VM with `multipass shell lab`.

## Principle · Smaller, patched, and watched

Hardening isn't one setting. It's a habit built on four ideas:

- **Least privilege:** every user and service gets only the access it needs ([Users, sudo & SSH](04-users-sudo-and-ssh.html), [systemd](07-systemd-and-services.html)).
- **Smaller attack surface:** if a service isn't needed, it isn't running, and if a port doesn't need to be open, it isn't.
- **Patched:** security updates go on quickly and automatically ([Packages](05-packages-and-repositories.html)).
- **Watched:** changes to sensitive files are recorded, and logs leave the server ([Logs & Monitoring](15-logs-and-monitoring.html)).

Published baselines, such as the **CIS Benchmarks**, turn these ideas into hundreds of specific checks. You rarely apply all of them by hand; automation and audit tools do that. But you should understand the important ones.

## Checklist · Harden a fresh server

Work through this on the lab VM. Every step is safe for your SSH session.

```text
# 1. What's exposed? Every listening port should have a reason.
sudo ss -tlnp

# 2. Default-deny firewall. Allow SSH FIRST, or you lock yourself out.
sudo ufw allow OpenSSH
sudo ufw default deny incoming
sudo ufw enable
sudo ufw status verbose

# 3. Security updates install automatically?
systemctl is-enabled unattended-upgrades
cat /etc/apt/apt.conf.d/20auto-upgrades

# 4. SSH: keys only, no root sign-in (see Module 04)
sudo sshd -T | grep -Ei '^(passwordauthentication|permitrootlogin)'

# 5. Who can become root?
getent group sudo
sudo ls /etc/sudoers.d/

# 6. Programs that run with their owner's privileges (setuid): know every one
sudo find / -xdev -perm -4000 -type f 2>/dev/null

# 7. An automated audit for everything else, with suggestions
sudo apt install -y lynis
sudo lynis audit system --quick | tail -30
```

Lynis prints a hardening index and a list of suggestions. Treat it as a to-do list to think about, not a score to maximise: some suggestions won't apply to your server.

## Audit · Who changed that file?

**auditd** records security-relevant events from the kernel: who changed a file, who ran a command as root, who changed a user account. Unlike application logs, a user can't simply skip it.

```text
sudo apt install -y auditd
sudo auditctl -w /etc/passwd -p wa -k identity       # watch writes and attribute changes
sudo auditctl -w /etc/sudoers.d/ -p wa -k sudoers

sudo useradd audit-test                              # a change to /etc/passwd
sudo ausearch -k identity -i | tail -20              # who, when, which command
sudo userdel audit-test
```

`auditctl` rules last until reboot. Permanent rules go in a file under `/etc/audit/rules.d/`.

## MAC · Read denials, don't disable the system

On top of normal permissions, **mandatory access control** confines programs to what their policy allows, even when they run as root. Ubuntu uses **AppArmor**, and RHEL family systems use **SELinux**. When one blocks something, the program sees "Permission denied" even though the file permissions look fine, which is the case [Files, Inodes & Permissions](03-files-and-permissions.html) warned about.

```text
# AppArmor (Ubuntu)
sudo aa-status                                   # which profiles are loaded, enforcing or complaining
sudo journalctl -k | grep 'apparmor="DENIED"'    # what was blocked, for which program

# SELinux (RHEL, Rocky, Amazon Linux)
getenforce                                       # Enforcing, Permissive, or Disabled
sudo ausearch -m avc -ts recent                  # recent denials
sudo restorecon -Rv /srv/www                     # fix wrong file labels, the most common cause
```

A denial message names the program, the action, and the file. The usual fix is small: a file in an unusual location needs the right label (`restorecon`, `semanage fcontext`), or the profile needs one extra rule. Setting SELinux to `Permissive` while you investigate is fine. Turning it off for good removes a layer of protection, and it's rarely needed.

## TLS · Certificates and the clock

Most "HTTPS is broken" incidents are an expired certificate, a missing intermediate certificate, the wrong name on the certificate, or a server whose clock is wrong. `openssl` checks each of these:

```text
# The certificate a server presents: who it's for, who issued it, valid from and to
echo | openssl s_client -connect example.com:443 -servername example.com 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates

# Will it still be valid in 30 days? (exit code 0 = yes)
echo | openssl s_client -connect example.com:443 -servername example.com 2>/dev/null \
  | openssl x509 -noout -checkend $((30*24*3600))

# Is this server's clock right, and is it synchronised?
timedatectl
```

Certificate validity is checked against the *local* clock. A server whose clock has drifted months ahead sees every certificate on the internet as expired, and one that's behind sees new certificates as "not yet valid". Time sync (here `systemd-timesyncd`, or `chrony`) isn't optional.

## Break it, fix it · Every HTTPS call fails

After maintenance work on this server, every HTTPS request it makes fails, and `apt update` complains too. From your laptop, the same sites work perfectly. Reproduce it:

```text
sudo timedatectl set-ntp false
sudo date -s "2031-01-01 09:00"
curl -sS https://example.com -o /dev/null
sudo apt update 2>&1 | tail -3
```

Your job: find out why trusted certificates are being rejected, and fix it so it can't drift again. Try it before opening a hint.

### Hint 1 · Where to look

- Read the exact error from `curl`. The same certificates are accepted on your laptop, so ask what's different about how *this* server judges them.

### Hint 2 · Which tool

- Compare the certificate's dates (`openssl s_client ... | openssl x509 -noout -dates`) with this server's idea of the date: `date` and `timedatectl`. Look at the "synchronized" and "NTP service" lines.

### Hint 3 · The cause and the fix

- **Cause:** the server's clock is set years ahead, and time sync is turned off. Every certificate's "valid until" date is in the past by this server's clock, so `curl` reports "certificate has expired", and apt rejects the repositories' signed files for the same reason.
- **Fix:** turn time sync back on: `sudo timedatectl set-ntp true` and `sudo systemctl restart systemd-timesyncd`. Within a few seconds `timedatectl` shows "System clock synchronized: yes", and `curl` works again.
- **Prevent it:** never set the clock by hand on a server. Monitor clock offset and sync status, and alert on certificates that expire within 30 days, so a real expiry is renewed long before it causes an outage.

### Implementation notes

- **Allow SSH before enabling a firewall,** every time, and keep your current session open while you test a new connection.
- **Defaults beat heroics.** Automatic security updates, keys-only SSH, and a default-deny firewall stop more real attacks than any exotic setting.
- **Automate certificate renewal** (for example with ACME and Let's Encrypt, or a managed certificate service) instead of tracking expiry dates in a spreadsheet.
- **Harden with automation, then audit.** A baseline applied by Ansible or a golden image is consistent; one applied by hand drifts.

## Recap · Key terms

- **Attack surface:** everything an attacker could interact with: open ports, services, accounts.
- **Default-deny firewall:** block all incoming traffic except what you explicitly allow.
- **auditd:** the kernel audit system, which records who changed sensitive files.
- **AppArmor and SELinux:** mandatory access control that confines programs, even ones running as root.
- **Denial:** a log entry showing what AppArmor or SELinux blocked, for which program.
- **Certificate chain and expiry:** who vouches for a certificate, and the dates it's valid between.
- **Time sync:** keeping the clock right with NTP, which certificate checks depend on.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: You're about to enable ufw on a remote server you reach over SSH. What must come first?
- `sudo ufw default allow incoming`
* `sudo ufw allow OpenSSH`
- A reboot
- Disabling AppArmor
= With a default-deny policy, SSH is blocked too unless it's allowed first. Enabling the firewall without that rule cuts off the session you're using.
Q: A web server running as root gets "Permission denied" reading a file that's `644`. Ubuntu, AppArmor enforcing. Where do you look?
- `/etc/passwd`
* The kernel log, for an `apparmor="DENIED"` entry naming the program and file
- The file's inode number
- The firewall rules
= AppArmor confines programs regardless of normal permissions, and even root. The denial entry tells you exactly what was blocked, so you can fix the profile or the file's location.
Q: Why does a server's clock matter for HTTPS?
- TLS encrypts with the current time
* Certificate validity is checked against the local clock, so a wrong clock makes valid certificates look expired or not yet valid
- The clock sets the TCP port
- It doesn't; only the certificate matters
= Every certificate has a "not before" and "not after" date. A server with a drifted clock judges them wrongly, and every TLS connection it makes fails.
S: An auditor asks who modified `/etc/sudoers.d/` last week. What gives you a reliable answer?
- The bash history of each admin
* auditd records, from a watch rule on that directory, searched with `ausearch`
- The file's modification time
- `last`, which lists sign-ins
= Bash history can be edited or skipped, and a modification time doesn't say who. An audit rule records the user, time, and command for every change.
S: A colleague's fix for an SELinux denial is `setenforce 0` in a boot script. What's a better approach?
* Read the denial with `ausearch -m avc`, then fix the cause, often a wrong file label with `restorecon`
- Uninstall SELinux
- Run the service as a different user
- Ignore it; permissive is the default anyway
= Most denials have a small, specific fix. Turning SELinux off for good removes the protection for every service on the server, to fix one.
```
