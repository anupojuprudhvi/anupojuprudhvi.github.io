---
title: Users, sudo & SSH
date: 2026-10-01
track: linux-for-devops
order: 4
module: 4
summary: Who you are on a Linux system and what you're allowed to do. Users and groups, narrow sudo rules, key-based SSH through a jump host, and changing the SSH server's settings without locking yourself out. Then fix a key login that the server keeps refusing.
level: Foundations · Hands-on lab
readingTime: 14 min read
stack: [Ubuntu 24.04, OpenSSH, sudo, Multipass]
tags: [linux, ssh, sudo, users, groups, bastion, security, basics]
---

**In this module, you'll learn to:**

- Create users and groups, and read the files that define them
- Grant narrow, auditable sudo rights instead of full root
- Sign in with SSH keys through a jump host, and harden the SSH server safely

**Before you start:** finish [Files, Inodes & Permissions](03-files-and-permissions.html). This lab uses two extra VMs, so you'll need about 2 GB more free memory.

## Identity · Users and groups

Every process on Linux runs as a **user**, identified by a number called a **UID**. Users belong to **groups** (GIDs), and permissions are checked against both. Three files hold the details:

```text
# /etc/passwd: one line per user (readable by everyone; no passwords in it)
# name:x:UID:GID:comment:home directory:login shell
grep ubuntu /etc/passwd

# /etc/shadow: the password hashes, readable only by root
sudo grep ubuntu /etc/shadow

# /etc/group: groups and their members
grep sudo /etc/group

id                 # your UID, primary group, and every group you're in
```

UIDs below 1000 are **system users**, created for services such as `www-data` for a web server. They usually have `/usr/sbin/nologin` as their shell, so nobody can sign in as them. Running each service as its own unprivileged user limits the damage if that service is broken into.

```text
sudo useradd -m -s /bin/bash carol   # -m creates a home directory
sudo passwd carol                     # set a password
sudo usermod -aG devteam carol        # ADD carol to a group (note the -a)
sudo userdel -r carol                 # delete carol and her home directory
```

`usermod -G` without `-a` *replaces* all of a user's extra groups with the ones you list. On a server, that can silently remove someone's admin rights.

## Privilege · sudo, and how narrow it can be

`sudo` lets an allowed user run a command as root, and records who ran what. On Ubuntu, members of the `sudo` group can run anything. That's convenient on your laptop, but too broad for a deploy pipeline or an on-call rota. The rules live in `/etc/sudoers` and in files under `/etc/sudoers.d/`.

**Always edit them with `visudo`.** It checks the syntax before saving. A typo saved straight into `/etc/sudoers` can stop sudo working for everyone, and then you'd need root to fix it.

```text
# Let the user "deploy" restart one service, and nothing else
sudo useradd -m -s /bin/bash deploy
sudo visudo -f /etc/sudoers.d/deploy
```

Add this line in the editor, then save:

```text
deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart ssh
```

```text
sudo -l -U deploy                            # what may deploy run?
sudo -u deploy sudo systemctl restart ssh    # allowed, with no password
sudo journalctl _COMM=sudo -n 5              # the audit trail: who ran what
```

## Keys · How SSH proves who you are

Passwords can be guessed, phished, and reused. **SSH keys** work as a pair. The **private key** stays on your laptop and never leaves it. The **public key** is copied to every server you're allowed to sign in to, into `~/.ssh/authorized_keys` for that user.

```flow
title: Signing in with an SSH key
group: Your laptop
You | run ssh ubuntu@server
-> the client offers your public key
end
group: Server
sshd | finds that public key in ~/.ssh/authorized_keys for ubuntu
-> sends a challenge only the matching private key can sign
end
Your laptop | signs it with the private key, which never leaves the laptop
-> the server checks the signature with the public key
* Signed in | no password crossed the network
```

```text
# On your laptop (Windows 10/11, macOS, and Linux all include ssh)
ssh-keygen -t ed25519 -C "you@laptop"
# Press Enter for the default location, and set a passphrase.

# Show the PUBLIC key; this is the part you share
cat ~/.ssh/id_ed25519.pub
```

## Lab · Key-only SSH through a jump host

Real servers usually aren't reachable from the internet directly. You sign in to a **bastion** (or jump host) first, and hop from there to the server. Build that with two VMs. Save this as `keys.yaml` on your laptop, pasting in your own public key:

```yaml
#cloud-config
ssh_authorized_keys:
  - ssh-ed25519 AAAA...your public key... you@laptop
```

```text
multipass launch 24.04 --name bastion --cloud-init keys.yaml
multipass launch 24.04 --name app --cloud-init keys.yaml
multipass list          # note both IP addresses
```

Add this to `~/.ssh/config` on your laptop, using the IP addresses from `multipass list`:

```text
Host bastion
    HostName 192.168.x.10
    User ubuntu

Host app
    HostName 192.168.x.11
    User ubuntu
    ProxyJump bastion
```

```text
ssh app                     # connects to bastion, then hops to app
scp notes.txt app:/tmp/     # file copies use the same route
```

`ProxyJump` keeps your private key on your laptop. The bastion only relays the encrypted connection, so a compromised bastion can't steal your key. In production, the app server's firewall or cloud security group would also accept SSH only from the bastion.

## Harden · Change sshd without locking yourself out

On Ubuntu, the SSH server reads `/etc/ssh/sshd_config`, which starts by including every file in `/etc/ssh/sshd_config.d/`. For each setting, **the first value sshd reads wins**, and the included files are read in name order. So put your changes in an early-numbered file:

```text
# On app: forbid passwords and direct root sign-in
sudo tee /etc/ssh/sshd_config.d/10-hardening.conf <<'EOF'
PasswordAuthentication no
PermitRootLogin no
EOF
```

Now follow the safe sequence. Skipping it is how people lock themselves out of servers they can't reach any other way:

1. **Keep your current session open.** It stays connected even if the new configuration is broken.
2. **Check the syntax:** `sudo sshd -t` prints nothing when the configuration is valid.
3. **Check the result:** `sudo sshd -T | grep -Ei 'passwordauth|permitroot'` shows the values sshd will actually use.
4. **Apply it:** `sudo systemctl restart ssh`.
5. **Test from a second terminal:** run `ssh app` again. Close the first session only once this works.

## Break it, fix it · The key the server keeps refusing

A new teammate, `dev`, needs to sign in to `app`. Someone set up their account, then "made their home directory shareable" so the team could drop files in it. Now `dev` can't sign in. Set it up on `app`, reusing your own key for the test:

```text
# On app
sudo useradd -m -s /bin/bash dev
sudo mkdir -p /home/dev/.ssh
sudo cp ~/.ssh/authorized_keys /home/dev/.ssh/
sudo chown -R dev:dev /home/dev/.ssh
sudo chmod 700 /home/dev/.ssh
sudo chmod 600 /home/dev/.ssh/authorized_keys
sudo chmod 775 /home/dev          # "made it shareable"
```

```text
# On your laptop
ssh dev@app
# dev@app: Permission denied (publickey).
```

Your job: find out why the server refuses a key that is definitely in `authorized_keys`, and fix it. Try it before opening a hint.

### Hint 1 · Where to look

- The client only ever says "Permission denied", on purpose, so attackers learn nothing. The real reason is written down on the server.

### Hint 2 · Which tool

- On `app`, run `sudo journalctl -u ssh -n 20` right after a failed attempt, and look for a line that names a directory. On the client, `ssh -v dev@app` shows the key being offered and turned down.

### Hint 3 · The cause and the fix

- **Cause:** sshd's `StrictModes` check refuses keys when the user's home directory, `~/.ssh`, or `authorized_keys` can be written by anyone other than the owner. With `/home/dev` group-writable, another user could swap in their own key, so sshd ignores the file. The log says "bad ownership or modes for directory /home/dev".
- **Fix:** `sudo chmod 755 /home/dev`, or `750` to keep it private. Then retry `ssh dev@app`.
- **Prevent it:** home directory not writable by group or others, `~/.ssh` at `700`, `authorized_keys` at `600`, all owned by the user. Share files through a group folder like the one in the last module, never through someone's home directory.

### Implementation notes

- **One person, one account.** Shared accounts make the sudo log useless, because you can't tell who did what.
- **Remove access when people leave.** Delete their public key from every `authorized_keys`, or better, manage keys centrally with automation or a cloud service such as AWS Systems Manager Session Manager, so there's one place to revoke access.
- **Protect private keys with a passphrase** and let `ssh-agent` remember it for the session, so you only type it once.
- **Never copy a private key onto a server.** If a server needs to reach another system, give it its own key or identity.

## Recap · Key terms

- **UID and GID:** the numbers that identify a user and a group. UIDs below 1000 are system users.
- **sudo and sudoers:** run one command as root, under rules edited with `visudo`.
- **Private and public key:** the secret half stays with you; the public half goes in `authorized_keys`.
- **Bastion and ProxyJump:** a single entry point, and the SSH option that hops through it.
- **sshd:** the SSH server. `sshd -t` checks its configuration, and `sshd -T` prints the values it will use.
- **StrictModes:** sshd's refusal to trust key files that other users could change.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: Where does your public key go so you can sign in to a server as `ubuntu`?
- `/etc/ssh/sshd_config` on the server
* `~/.ssh/authorized_keys` in the `ubuntu` user's home directory on the server
- `~/.ssh/known_hosts` on your laptop
- `/etc/passwd` on the server
= sshd checks the target user's `authorized_keys`. `known_hosts` on your laptop records the servers *you* trust, which is the other direction.
Q: Why edit sudo rules with `visudo` instead of a normal editor?
- It's the only editor that can open the file
* It checks the syntax before saving, so a typo can't break sudo for everyone
- It makes the rules apply without a restart
- It encrypts the file
= A broken sudoers file can stop sudo working entirely, and then you need root to repair it. `visudo` refuses to save an invalid file.
Q: What does `sudo usermod -G docker alice` do if alice is already in the `sudo` group?
- Adds `docker` to alice's groups
* Replaces alice's extra groups with just `docker`, removing `sudo`
- Fails, because alice already has groups
- Makes `docker` her primary group
= Without `-a` (append), `-G` sets the complete list of extra groups. `usermod -aG docker alice` is what was meant.
S: You've edited the SSH server's configuration on a remote server you can only reach over SSH. What do you do before restarting it?
- Close your session so the change applies cleanly
* Keep the session open, run `sudo sshd -t`, restart, and test with a new connection
- Reboot the server
- Restart it straight away; sshd checks its own config
= An open session survives a broken configuration. `sshd -t` catches syntax errors, and a second connection proves you can still get in before you close the first.
S: A new user's key login fails with "Permission denied (publickey)", and the key is definitely in their `authorized_keys`. Where do you find the real reason?
- In the client's output without any options
* In the SSH server's log, for example `sudo journalctl -u ssh`
- In `/etc/passwd`
- In the user's `known_hosts` file
= The client is deliberately vague. The server logs the reason, such as "bad ownership or modes", which points straight at the fix.
```
