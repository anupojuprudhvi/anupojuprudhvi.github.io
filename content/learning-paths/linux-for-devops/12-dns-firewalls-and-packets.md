---
title: DNS, Firewalls & Packet Capture
date: 2026-10-01
track: linux-for-devops
order: 12
module: 12
summary: Follow a name lookup from an application through /etc/hosts and systemd-resolved to a DNS server, see how a firewall decides between a timeout and "connection refused", and watch real packets with tcpdump. Then fix a lookup where dig gives the right answer but every application gets the wrong one.
level: How Linux works · Hands-on lab
readingTime: 15 min read
stack: [systemd-resolved, dig, getent, nftables, ufw, tcpdump]
tags: [linux, dns, firewall, nftables, tcpdump, networking, troubleshooting]
---

**In this module, you'll learn to:**

- Trace how a name becomes an address on Linux, and why `dig` and applications can disagree
- Read and write simple firewall rules, and predict whether a block shows up as a timeout or a refusal
- Capture and read packets with `tcpdump` to prove what really crossed the wire

**Before you start:** finish [Networking Basics](11-networking-basics.html). Open a shell on your lab VM with `multipass shell lab`, and install the tools:

```text
sudo apt install -y bind9-dnsutils tcpdump
```

## DNS · How a name becomes an address

Applications almost never talk to DNS directly. They ask the system's C library, which follows a chain of sources set in `/etc/nsswitch.conf`. On Ubuntu, that chain ends at **systemd-resolved**, a local caching resolver.

```flow
title: What happens when curl looks up api.example.com
curl | calls getaddrinfo() in the C library
-> reads the hosts line in /etc/nsswitch.conf: files, then dns
/etc/hosts | checked first; a match here ends the lookup, right or wrong
-> no match, so ask DNS
systemd-resolved | listens on 127.0.0.53, named in /etc/resolv.conf; caches answers
-> forwards to the upstream servers it was given by DHCP or netplan
* Upstream DNS server | in a cloud VPC, the VPC's own resolver
```

```text
grep hosts /etc/nsswitch.conf     # the order of sources
cat /etc/hosts
cat /etc/resolv.conf              # nameserver 127.0.0.53: the local resolver
resolvectl status                 # the real upstream servers, per interface
resolvectl query example.com      # look up through systemd-resolved
sudo resolvectl flush-caches      # forget cached answers
```

Two tools, two different paths, and the difference matters:

| Tool | Path it takes | Use it to answer |
| --- | --- | --- |
| `dig example.com` | Sends a DNS query straight to a server, skipping `/etc/hosts` and `nsswitch.conf` | What does DNS say? |
| `getent hosts example.com` | The same path as every application | What will my application actually get? |

```text
dig example.com                   # the full DNS answer, with the TTL
dig +short example.com            # just the addresses
dig @1.1.1.1 example.com          # ask a specific server, bypassing the local resolver
getent hosts example.com          # what applications will see
```

The **TTL** (time to live) in a DNS answer says how many seconds resolvers may cache it. After a DNS change, old answers keep being served until their TTL runs out, which is why DNS changes seem to "take a while".

## Firewalls · netfilter, nftables, and ufw

The Linux kernel filters packets with **netfilter**. Today you write rules for it with **nftables** (`nft`). Older `iptables` commands still work on top of it, and Ubuntu's **ufw** is a simple front end that writes the rules for you. Cloud security groups and network ACLs filter traffic *before* it reaches the server, so they never appear in `nft list ruleset`.

```text
sudo nft list ruleset       # every rule the kernel is applying
sudo ufw status verbose     # ufw's view, if it's in use
```

A rule can **drop** a packet (throw it away silently) or **reject** it (send an error back). That choice decides what the client sees, which is why the previous module could tell a stopped service from a firewall:

**Try it · Drop versus reject.** On the lab VM, start a web server, then block it two different ways. These rules touch only port 8080, so your SSH session is safe:

```text
python3 -m http.server 8080 &

# A table and chain of your own, so cleaning up is one command
sudo nft add table inet lab
sudo nft add chain inet lab input '{ type filter hook input priority 0; policy accept; }'

sudo nft add rule inet lab input tcp dport 8080 drop
#   From your laptop: curl -m 5 http://<lab-ip>:8080   -> times out

sudo nft flush chain inet lab input
sudo nft add rule inet lab input tcp dport 8080 reject with tcp reset
#   From your laptop: curl -m 5 http://<lab-ip>:8080   -> connection refused

sudo nft delete table inet lab      # remove every lab rule
kill %1
```

## Packets · tcpdump shows what really happened

When logs disagree about what happened, look at the packets. `tcpdump` captures traffic on an interface and prints each packet.

```text
sudo tcpdump -i any -nn port 53           # DNS lookups, from every interface
#   in a second terminal: dig example.com

sudo tcpdump -i lo -nn -A port 8080       # a local HTTP request, with contents (-A)
#   in a second terminal: python3 -m http.server 8080 &  then  curl localhost:8080

sudo tcpdump -i any -nn -w capture.pcap host 1.1.1.1   # save to a file for Wireshark
```

`-nn` shows numbers instead of names, which is faster and avoids extra DNS lookups that would appear in your own capture. In the output, the `Flags` show the TCP handshake from the previous module:

| Flags | Meaning |
| --- | --- |
| `[S]` | SYN: a new connection is requested |
| `[S.]` | SYN-ACK: the server accepts |
| `[.]` | ACK: an acknowledgement |
| `[P.]` | Data being pushed, such as the HTTP request |
| `[F.]` | FIN: one side is closing |
| `[R]` or `[R.]` | Reset: refused, or torn down |

What you *don't* see is often the answer. SYNs going out with no reply mean something is dropping them; a SYN answered by `[R.]` means the port is closed.

## Break it, fix it · dig says yes, curl says no

Requests from this server to `api.github.com` started timing out this morning. Other sites work, and `dig api.github.com` returns normal-looking addresses. Reproduce the situation:

```text
echo "10.255.255.1 api.github.com" | sudo tee -a /etc/hosts

dig +short api.github.com                  # looks fine
curl -sS -m 5 https://api.github.com       # times out
```

Your job: find out why `curl` and `dig` disagree, and fix it. Try it before opening a hint.

### Hint 1 · Where to look

- `dig` and `curl` don't look names up the same way. Find out which address `curl` is actually trying to connect to, using the path applications follow.

### Hint 2 · Which tool

- `getent hosts api.github.com` shows the address every application gets. Then check the first source in that path: `grep github /etc/hosts`. `curl -v` also prints the address it connects to.

### Hint 3 · The cause and the fix

- **Cause:** someone left an entry for `api.github.com` in `/etc/hosts`, pointing at an address nothing answers on. Applications check `/etc/hosts` before DNS, so they all get the wrong address and time out. `dig` asks DNS directly, skipping `/etc/hosts`, so it looked fine.
- **Fix:** remove the line, `sudo sed -i '/api.github.com/d' /etc/hosts`, then confirm with `getent hosts api.github.com` and the `curl` command.
- **Prevent it:** treat `/etc/hosts` overrides as temporary, with a comment saying who added them and why, and manage the file with automation. When debugging name problems, always compare `getent hosts` with `dig`.

### Implementation notes

- **"It's always DNS" is a joke because it's often true.** Check name resolution early, with `getent hosts`, whenever something "can't connect".
- **Lower a record's TTL a day before you change it,** so the change spreads in minutes instead of hours, then raise it again afterwards.
- **A rule you add with `nft` disappears at reboot** unless it's saved to the configuration (`/etc/nftables.conf`) or managed by ufw or automation. Cloud security groups are often the better place for the rules that matter.
- **Packet captures can hold passwords, tokens, and personal data.** Capture only what you need, store captures carefully, and delete them when you're done.

## Recap · Key terms

- **nsswitch.conf:** sets the order of sources for name lookups, usually `/etc/hosts`, then DNS.
- **systemd-resolved:** Ubuntu's local caching DNS resolver, at `127.0.0.53`.
- **`dig` versus `getent hosts`:** what DNS says, versus what applications actually get.
- **TTL:** how long a DNS answer may be cached.
- **netfilter, nftables, ufw:** the kernel's packet filter, its rule language, and a simple front end.
- **Drop versus reject:** silent loss, which causes a timeout, versus an error sent back, which causes a refusal.
- **tcpdump:** captures packets so you can see what really crossed the network.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: Why can `dig` return a different address from the one an application uses?
- `dig` uses a newer DNS protocol
* `dig` queries DNS directly, while applications check `/etc/hosts` and the sources in `nsswitch.conf` first
- Applications cache answers forever
- `dig` only works for IPv6
= Applications resolve names through the C library, which reads `/etc/hosts` before DNS. `getent hosts` follows that same path, so use it to see what applications get.
Q: A firewall rule silently drops packets to port 443. What does a client see?
- Connection refused, immediately
* A timeout, after waiting for a reply that never comes
- An HTTP 403 error
- No route to host
= A drop sends nothing back, so the client waits until it gives up. A reject sends a reset or an error message, which the client reports at once.
Q: In tcpdump output, what does a SYN answered by `[R.]` tell you?
- The connection succeeded
- A firewall dropped the packet
* The host is reachable, but nothing accepted the connection on that port
- The DNS lookup failed
= A reset in reply to a SYN is the "connection refused" answer: the network path works, and the port is closed or rejected.
S: You changed a DNS record an hour ago. Some users reach the new server and some still reach the old one. What's the most likely reason?
- The DNS server is broken
* Resolvers are still serving the old answer from cache until its TTL runs out
- The new server's firewall is blocking some users
- `/etc/hosts` on the DNS server is wrong
= Each resolver keeps an answer for its TTL. Until that runs out, old answers are still served. Lowering the TTL before a planned change avoids this.
S: An application can't reach its database. The database's `ss -tlnp` shows it listening, and both teams say "the firewall is fine". How do you settle it?
- Restart both servers
* Run `tcpdump` on the database server while the app connects, and look for SYNs arriving and replies leaving
- Raise the open-file limit
- Change the database's port
= Packets don't lie. No SYNs arriving means something along the path drops them; SYNs with no reply means the server's own firewall; a reset means the port is closed.
```
