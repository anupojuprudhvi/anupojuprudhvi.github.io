---
title: Incident Review: SSH Worked by Hand but Failed for the Service
date: 2026-10-01
track: linux-for-devops
order: 21
module: 21
summary: A batch ETL job stopped fetching files over SSH after a move to RHEL 8, while SSH from a terminal on the same server worked fine. Four separate faults were stacked on top of each other inside the job's SSH library. How they were peeled back one at a time, without weakening the SSH server.
level: Production Incident Review
readingTime: 12 min read
stack: [RHEL 8, OpenSSH, Ruby Net::SSH, systemd, ssh-keygen]
tags: [linux, ssh, incident-review, rhel8, crypto-policy, systemd, production]
---

**About this review.** This is a real incident from a production platform running on RHEL 8 servers in AWS, written up from the engineering team's notes. Every server name, path, account, and product name is replaced with a generic one; the errors, commands, and sequence of findings are otherwise as recorded.

| | |
| --- | --- |
| **Environment** | Pre-production (SIT), RHEL 8.8, Ruby 2.6.5 with the Net::SSH 2.9.4 library |
| **When** | 2025 |
| **Detected by** | ETL cycle failure alarms |
| **Impact** | The ETL job couldn't fetch data files from the application server, so ingestion into the database stopped and downstream reporting was blocked. No data was corrupted; an ingestion backlog built up |
| **Root cause** | Four stacked faults in the job's SSH client library, not the network or the SSH server |
| **Fix** | Client-side changes only: a corrected library patch, a modern key-exchange list, a key converted to PEM format, and an explicit remote user |

## Context · How the job used SSH

An ETL service (`etl.service`) on the database server pulled data files from the application server over SSH, every cycle. It ran under systemd as an unprivileged service account, `appsvc`, and it didn't use the system's `ssh` command. It used **Net::SSH**, an SSH implementation written in Ruby and bundled with the vendor's tooling.

The servers had been moved to **RHEL 8.8**, whose OpenSSH server follows RHEL 8's system-wide crypto policy. That policy disables old algorithms, including the key exchange `diffie-hellman-group1-sha1`.

## Symptom · "Manual SSH works"

ETL alarms fired and no new records arrived. The obvious checks all passed: from a terminal on the database server, SSH to the application server worked, and restarting the ETL service changed nothing.

The team's notes capture why that first check was misleading:

| | SSH from a terminal | SSH from the ETL service |
| --- | --- | --- |
| Client | OpenSSH (the system `ssh`) | Ruby Net::SSH 2.9.4 |
| Runs as | An interactive shell | A systemd service |
| Reads the private key with | OpenSSH itself | Net::SSH's own key parser |
| Algorithms offered | Modern defaults | A limited, older set |
| Unknown host keys | Prompts the user | No one to prompt |
| Result | Works | Fails |

**Testing SSH from a shell proves nothing about an application that uses its own SSH library.**

## Investigation · Four layers, one at a time

Each fix let the job get one step further, which revealed the next fault. The commands below are the ones recorded in the notes, with names anonymized.

```text
systemctl status etl -l
journalctl -u etl -n 80 --no-pager
tail -f /opt/app/log/etl.log
```

**Layer 1 · A compatibility patch that crashed the job.** An earlier attempt to change the library's algorithms had been loaded into the service. After a restart, Ruby stopped before any ETL code ran:

```text
alias_method': undefined method `kex_algorithms'
```

The patch tried to override an internal method that doesn't exist in Net::SSH 2.9.4. Overriding a library's internals ties you to one version of it. The team replaced it with an override at the library's public entry point, `Net::SSH.start`, which accepts a `:kex` option in every version:

```ruby
# Force Net::SSH to avoid diffie-hellman-group1-sha1
require 'net/ssh'
module Net
  module SSH
    class << self
      alias __orig_start start
      def start(host, user, options = {}, &block)
        options ||= {}
        options[:kex] ||= [
          "curve25519-sha256",
          "curve25519-sha256@libssh.org",
          "ecdh-sha2-nistp256",
          "ecdh-sha2-nistp384",
          "ecdh-sha2-nistp521",
          "diffie-hellman-group-exchange-sha256",
          "diffie-hellman-group14-sha256"
        ]
        __orig_start(host, user, options, &block)
      end
    end
  end
end
```

The patch was loaded through a systemd drop-in rather than by editing the vendor's unit file, so a package update can't silently remove it:

```text
sudo systemctl edit etl
#   [Service]
#   Environment="RUBYOPT=-r/opt/app/etc/net_ssh_kex_fix.rb"
sudo systemctl daemon-reload
sudo systemctl restart etl
```

**Layer 2 · A key exchange the server refuses.** Earlier failures had referenced the library's `diffie_hellman_group1_sha1.rb`. Left to its defaults, Net::SSH 2.9.4 could still try `diffie-hellman-group1-sha1`, which RHEL 8.8's sshd rejects during the handshake, before any user or key is checked. The `:kex` list above removed it. **The SSH server's configuration was not changed:** re-enabling a SHA-1 key exchange on the server would have weakened it for every client to fix one.

**Layer 3 · A private key the library couldn't read.** With the handshake working, the job failed inside `Net::SSH::KeyFactory.read`. The service account's key was in the newer OpenSSH private key format (it starts `-----BEGIN OPENSSH PRIVATE KEY-----`), which `ssh` reads but this version of Net::SSH doesn't parse reliably. The key was backed up and converted to PEM format in place:

```text
cp -a /opt/app/.ssh/etl_key /opt/app/.ssh/etl_key.bak_$(date +%F_%H%M%S)
ssh-keygen -p -m PEM -f /opt/app/.ssh/etl_key -P "" -N ""
```

`ssh-keygen -p` rewrites the key file with the format given by `-m`, keeping the same key, so nothing needed changing on the server.

**Layer 4 · The wrong remote user.** The job still couldn't sign in. Adding debug logging of the connection parameters to the patch exposed the last fault in one line:

```text
host=<application server> user=appsvc keys=["/opt/app/.ssh/etl_key"]
```

The job's configuration named a different remote account, the one that key was authorized for. But Net::SSH, like `ssh`, defaults the remote user name to the **local** user running the process, and this code path didn't pass the configured user through. The patch was extended to set the configured remote user explicitly for that host.

## Resolution · What confirmed the fix

- An SSH test through Ruby, run as the service account, succeeded.
- `etl.service` restarted cleanly.
- The ETL log showed a successful connection to the application server, with no further SSH, key, or algorithm errors.

## Prevention · Actions from the review

These come from the team's recorded recommendations:

1. **Don't patch a library's internals.** Override only its public entry points, such as `Net::SSH.start`.
2. **Test SSH the way the application uses it,** as the service account and through the application's own client, not from an interactive shell.
3. **Standardize the format of automation keys** to one the oldest client in use can read.
4. **Pass the remote user explicitly** in automation, never rely on the local user name.
5. **Log the SSH parameters** (host, user, key, algorithms) when a connection fails, so the next investigation takes minutes.

One wider lesson: the move to RHEL 8 didn't create these faults. It removed old defaults that had been hiding them.

## Practise it · Where this track teaches the skills

- [Users, sudo & SSH](04-users-sudo-and-ssh.html): keys, `authorized_keys`, and why the server's log, not the client's, says why sign-in failed.
- [systemd: Services, Timers & Logs](07-systemd-and-services.html): drop-in overrides instead of editing vendor unit files.
- [Seeing Inside a Process](14-debugging-tools.html): `strace -f -e trace=network` shows what an application's own SSH client is really doing.
- [Security Hardening, AppArmor & TLS](17-security-and-hardening.html): fixing clients rather than weakening servers.

## Check yourself · Pop quiz

Five questions: three on the ideas in this review, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: Why didn't "SSH works from my terminal" prove the ETL job's SSH would work?
- The terminal used a different network path
* The job used its own SSH library, with different algorithms, key parsing, and user defaults
- Terminals bypass the firewall
- The job ran on a different server
= The system `ssh` and the job's Ruby library are separate SSH clients. They negotiate different algorithms, read keys differently, and pick the remote user differently.
Q: The server rejected `diffie-hellman-group1-sha1`. Why was the fix made on the client instead of re-enabling it on the server?
- Changing sshd needs a reboot
* Re-enabling a weak SHA-1 key exchange would weaken the server for every client, to fix one old client
- RHEL 8 can't re-enable it
- The client was easier to restart
= The secure fix is to make the old client offer modern algorithms. Lowering the server's crypto policy trades everyone's security for one job's convenience.
Q: What does `ssh-keygen -p -m PEM -f key` do?
- Generates a brand-new key pair
* Rewrites the existing private key in PEM format, keeping the same key
- Adds the key to `authorized_keys`
- Removes the key's passphrase only
= `-p` rewrites the key file, and `-m PEM` chooses the format. The public key is unchanged, so nothing needs updating on the servers that trust it.
S: An automation job signs in over SSH as the wrong remote user, even though its config names the right one. What default is the likely cause?
- The server picks the user at random
* SSH clients default the remote user to the local user running the process
- The remote user comes from DNS
- `authorized_keys` chooses the user
= If the remote user isn't passed explicitly, the client uses the local user name. Logging the connection parameters shows this immediately.
S: You need to load a fix into a vendor's systemd service. Where should the change go?
- Edit the vendor's file in `/usr/lib/systemd/system/` directly
* A drop-in created with `systemctl edit`, so package updates don't overwrite it
- A cron job that patches the file every hour
- The service account's `.bashrc`
= Drop-ins in `/etc/systemd/system/name.service.d/` survive package updates. Editing the vendor's file works until the next update silently undoes it.
```
