---
title: Networking Basics: Addresses, Routes, Ports & TCP
date: 2026-10-01
track: linux-for-devops
order: 11
module: 11
summary: How a Linux server talks to the network. IP addresses and CIDR, routing, ports and sockets, the TCP handshake and connection states, and the difference between "connection refused" and a timeout. Then fix a service that works locally but refuses every connection from outside.
level: How Linux works · Core concept
readingTime: 14 min read
stack: [ip, ss, curl, nc, ping, tracepath, TCP/IP]
tags: [linux, networking, tcp, ports, routing, ss, troubleshooting]
---

**In this module, you'll learn to:**

- Read a server's addresses, routes, and listening ports with `ip` and `ss`
- Explain the TCP handshake and the connection states you'll see on busy servers
- Tell "connection refused", a timeout, and "no route to host" apart, and know what each one means

**Before you start:** finish [Processes, Signals & File Descriptors](08-processes-and-signals.html). Open a shell on your lab VM with `multipass shell lab`.

## Addresses · Where a server is on the network

Each network interface has an **IP address** written with a prefix length, such as `192.168.64.5/24`. The prefix (CIDR notation) says how many leading bits identify the network. `/24` means the first three numbers are the network, so `192.168.64.0/24` holds 256 addresses, `192.168.64.0` to `192.168.64.255`. `/16` holds 65,536, and `/32` is exactly one address.

Three ranges are reserved for private networks and never appear on the internet: `10.0.0.0/8`, `172.16.0.0/12`, and `192.168.0.0/16`. Cloud VPCs and Multipass both use them.

```text
ip -br addr            # each interface and its addresses, one line each
ip -br link            # each interface's state (UP or DOWN) and MAC address
ip link show           # details for each interface, including the MTU (largest packet size)
hostname -I            # just the addresses
```

`lo` is the **loopback** interface, `127.0.0.1`, which only the machine itself can reach.

## Routes · How the kernel picks a path

For every outgoing packet, the kernel looks up the destination in its **routing table**. Addresses on a directly connected network go straight out of that interface. Everything else goes to the **default gateway**, the router that knows the way further.

```text
ip route                # the routing table; "default via ..." is the gateway
ip route get 1.1.1.1    # the exact route, interface, and source address for one destination
```

```flow
title: How a packet leaves the server
Application | connects to 1.1.1.1 port 443
-> the kernel looks up 1.1.1.1 in the routing table
Routing table | no closer match, so the default route wins: via the gateway, out of the main interface
-> the packet leaves that interface with the server's own address as the source
Gateway | the router; in a cloud VPC, the VPC's router
-> forwarded hop by hop across networks
* Destination | 1.1.1.1 receives the packet and replies along the reverse path
```

## Ports · Many services on one address

An IP address gets traffic to the right machine. A **port**, a number from 1 to 65535, gets it to the right program. A program that accepts connections **listens** on an address and port, a pair called a **socket**. Some are well known: 22 for SSH, 80 for HTTP, 443 for HTTPS, 5432 for PostgreSQL.

```text
sudo ss -tlnp      # TCP (-t), listening (-l), numeric (-n), with the process (-p)
sudo ss -ulnp      # the same for UDP
ss -tn             # established TCP connections
ss -s              # a summary: how many connections in each state
```

Look closely at the local address of each listening socket. It decides who can connect:

| Listening on | Who can connect |
| --- | --- |
| `0.0.0.0:8080` or `[::]:8080` | Anyone who can reach any of the server's addresses |
| `127.0.0.1:8080` | Only programs on the same machine |
| `192.168.64.5:8080` | Only connections arriving at that one address |

## TCP · The handshake and connection states

TCP sets up every connection with a three-way **handshake** before any data moves. The client sends **SYN**, the server answers **SYN-ACK**, and the client confirms with **ACK**. Most network faults show up as one of these three packets going missing, which the next module shows you how to see.

The states you'll meet in `ss` output:

| State | Meaning |
| --- | --- |
| `LISTEN` | Waiting for new connections |
| `ESTABLISHED` | Connected and able to send data |
| `TIME_WAIT` | Closed by this side; kept about 60 seconds so stray packets don't confuse a new connection. Thousands are normal on busy servers |
| `CLOSE_WAIT` | The other side closed, but this program hasn't. A growing number means the program is leaking connections |
| `SYN_SENT` | Trying to connect, no reply yet. Many of these mean something is blocking outgoing connections |

Each outgoing connection also uses a local **ephemeral port**, chosen from a range (`cat /proc/sys/net/ipv4/ip_local_port_range`). A server making huge numbers of short outgoing connections to the same destination can run out of them, which Part 4 comes back to.

## Diagnose · Refused, timed out, or unreachable

When a connection fails, the exact error tells you where to look:

| Error | What happened | Usual causes |
| --- | --- | --- |
| Connection refused | The server's machine answered with a reset: nothing accepts connections on that port | Service down, listening on another port, or bound to `127.0.0.1` only; or a firewall rule that rejects |
| Timed out | No answer at all | A firewall or cloud security group silently dropping packets, a wrong address, or the host is down |
| No route to host | The network said the destination can't be reached | No route, or a firewall rule that rejects with this message |

"Refused" is good news in a way: the network path works, and the problem is on the server. A timeout means you need to look along the path.

```text
curl -v http://localhost:8080        # an HTTP request, showing each step
nc -zv 192.168.64.5 22               # is this TCP port open? (-z: just connect)
ping -c 3 1.1.1.1                    # is the host reachable? (ICMP; often blocked)
tracepath 1.1.1.1                    # each hop along the path, and the path MTU
ping -M do -s 1472 -c 3 1.1.1.1      # can a full 1500-byte packet get through unfragmented?
```

The last line tests **MTU**, the largest packet a link carries. When a link along the path has a smaller MTU and the messages that should report it are blocked, small requests work and large ones hang. VPNs and tunnels are the usual cause.

## Lab · Map every listening port

On the lab VM, start a web server, then answer: *what is listening, which program is it, and who can reach it?*

```text
python3 -m http.server 8000 &          # a quick web server on port 8000
sudo ss -tlnp                          # find it, and every other listener
curl -s localhost:8000 | head -3
ss -tn state established               # your own SSH session shows up here
ip route get 1.1.1.1                   # how this server reaches the internet
kill %1                                # stop the web server
```

## Break it, fix it · Works on the server, refused from everywhere else

A developer says their new service works: `curl localhost:8080` on the server returns the page. But the load balancer's health checks fail, and testing from your laptop says "connection refused". Start the service the way they did:

```text
# On the lab VM
mkdir -p ~/site && echo "hello" > ~/site/index.html
cd ~/site && python3 -m http.server 8080 --bind 127.0.0.1 &
curl localhost:8080                       # works
ip -br addr                               # note the VM's address
```

```text
# On your laptop, using that address
curl http://<lab-ip>:8080
```

Your job: work out why it's refused from outside, and fix it. Try it before opening a hint.

### Hint 1 · Where to look

- "Refused", not a timeout, so the network path is fine and the server itself answered. Look at exactly which address the service is listening on.

### Hint 2 · Which tool

- `sudo ss -tlnp | grep 8080` shows the listening socket's local address. Compare it with the addresses in the "Ports" table above.

### Hint 3 · The cause and the fix

- **Cause:** the service is bound to `127.0.0.1:8080`, the loopback address. Only programs on the server itself can connect to it. Connections arriving on the VM's real address find nothing listening on port 8080, so the kernel answers with a reset: "connection refused".
- **Fix:** stop it (`kill %1`) and listen on all addresses: `python3 -m http.server 8080 --bind 0.0.0.0 &`. `ss` now shows `0.0.0.0:8080`, and the laptop's `curl` works. Stop it again with `kill %1` when you're done.
- **Prevent it:** many frameworks listen on `127.0.0.1` by default for safety. Make the listen address part of the service's configuration, and test from another machine, not just with `localhost`. Then let a firewall decide who may connect.

### Implementation notes

- **Check the server first, then the path.** `ss -tlnp` on the server takes five seconds and rules out half of all connection problems.
- **`CLOSE_WAIT` piling up is an application bug,** not a network one: the program never closes connections the other side has finished with.
- **Ping isn't proof of anything.** Many networks, including cloud defaults, block ICMP. A failed ping with a working `nc -zv` to the real port is common.
- **Test the real path.** `curl` from another machine, ideally from where real clients sit, catches binding and firewall problems that `localhost` hides.

## Recap · Key terms

- **CIDR:** an address with a prefix length, such as `10.0.0.0/16`, describing a range.
- **Default gateway:** the router that packets for every other network are sent to.
- **Port and socket:** the number that picks a program, and an address plus port a program listens on.
- **Loopback (`127.0.0.1`):** an address only the machine itself can reach.
- **Three-way handshake:** SYN, SYN-ACK, ACK, which opens every TCP connection.
- **Refused versus timed out:** a reset came back, or nothing came back at all.
- **MTU:** the largest packet a link carries.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: A service listens on `127.0.0.1:5432`. Who can connect to it?
- Anyone on the internet
- Any machine in the same network
* Only programs running on the same machine
- Nobody until it's restarted
= `127.0.0.1` is the loopback address, reachable only from the machine itself. That's a common default for databases, for safety.
Q: Which command lists listening TCP ports along with the process behind each one?
- `ip route`
* `sudo ss -tlnp`
- `ping -c 3 localhost`
- `ip -br addr`
= `-t` is TCP, `-l` listening, `-n` numeric, and `-p` the process. It needs `sudo` to show processes owned by other users.
Q: How many addresses does `10.0.0.0/24` contain?
- 24
* 256
- 65,536
- 16 million
= `/24` leaves the last 8 bits for hosts: 2 to the power of 8 is 256 addresses, 10.0.0.0 to 10.0.0.255.
S: `curl` to a server's port 443 hangs for 30 seconds and then times out. What's the most likely cause?
- The service is stopped
- The service listens on `127.0.0.1` only
* A firewall or security group is silently dropping the packets
- The TLS certificate has expired
= With no answer at all, something along the path is dropping traffic. A stopped service or a loopback-only listener would answer at once with "connection refused".
S: A server has thousands of connections in `CLOSE_WAIT`, and the number keeps growing. Where is the problem?
- The network is dropping packets
- The firewall is closing connections
* The application isn't closing connections that the other side has finished with
- The server needs more ephemeral ports
= `CLOSE_WAIT` means the remote side closed, and the local program still has the socket open. That's a bug in the program, usually a missing close or a connection-pool leak.
```
