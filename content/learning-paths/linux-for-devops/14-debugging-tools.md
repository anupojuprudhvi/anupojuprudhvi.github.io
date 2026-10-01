---
title: Seeing Inside a Process: strace, lsof & eBPF
date: 2026-10-01
track: linux-for-devops
order: 14
module: 14
summary: When logs say nothing, watch what the program actually does. Trace system calls with strace, list open files and connections with lsof, and get a first taste of eBPF tools that watch the whole system safely. Then find out why a service is "running" but has done nothing for ten minutes.
level: Troubleshooting · Hands-on lab
readingTime: 15 min read
stack: [strace, lsof, ss, perf, eBPF, bcc, bpftrace]
tags: [linux, strace, lsof, ebpf, bpftrace, debugging, troubleshooting]
---

**In this module, you'll learn to:**

- Explain system calls, and trace them with `strace` to see what a program is really doing
- Find a process's files, sockets, and connections with `lsof` and `ss`
- Use eBPF tools to watch every new process, file open, or connection on the system

**Before you start:** finish [A Troubleshooting Method](13-troubleshooting-method.html). Open a shell on your lab VM with `multipass shell lab`, and install the tools:

```text
sudo apt install -y strace lsof
```

## Principle · Every program talks to the kernel

A program can't touch a file, a network connection, or another process by itself. It asks the kernel, through **system calls**: `openat` to open a file, `read` and `write` to move data, `connect` to open a connection, `execve` to start a program. Watching those calls shows what a program is doing, even when it prints nothing and you don't have its source code.

```flow
title: Where each tool watches
Application | your code, or a binary you can't change
-> asks the kernel for everything through system calls
* System call boundary | openat, read, write, connect, execve, ...
-> strace watches here, for one process
Kernel | files, sockets, processes, scheduling
-> eBPF tools attach here, for the whole system, with little overhead
Hardware | disks, network cards, CPUs
```

## strace · What is this process doing?

```text
strace ls /tmp                          # every system call ls makes (to stderr)
strace -e trace=openat cat /etc/hostname     # only file opens
strace -c ls /tmp                       # a summary: calls, counts, time spent
strace -f -tt -o /tmp/trace.txt cmd     # follow child processes, timestamps, save to a file
sudo strace -p <PID>                    # attach to a process that's already running
```

The output reads as `call(arguments) = result`. A result of `-1` comes with an error name, such as `ENOENT` (no such file) or `EACCES` (permission denied), which is often the whole answer.

**Try it · Which files does a program really read?** This shows exactly which configuration a command loads, which is the quickest way to settle "is it even reading my config?":

```text
strace -f -e trace=openat curl -s -o /dev/null https://example.com 2>&1 \
  | grep -v ENOENT | grep -E "/etc|ssl"
```

You'll see `curl` open `/etc/nsswitch.conf`, `/etc/hosts`, and `/etc/resolv.conf`, the lookup path from [DNS, Firewalls & Packet Capture](12-dns-firewalls-and-packets.html), and then the certificate store under `/etc/ssl`.

`strace` slows the traced process down a lot. Use it on production processes briefly, for a specific question, and detach (Ctrl+C) as soon as you have the answer.

## lsof and ss · Files and connections

`lsof` lists open files, and on Linux almost everything is a file, including network connections:

```text
sudo lsof -p <PID>                  # everything one process has open
sudo lsof /path/to/file             # which processes have this file open
sudo lsof +L1                       # deleted files still held open
sudo lsof -i :443                   # what's using port 443
sudo lsof -i -a -p <PID>            # just this process's network connections
sudo ss -tnp | grep <PID>           # the same connections, from ss
```

## eBPF · Safe tracing for the whole system

**eBPF** lets small, verified programs run inside the kernel, attached to events such as "a process started" or "a file was opened". The kernel checks each program before it runs, so it can't crash the system, and the overhead is low enough for production. Many modern monitoring, networking, and security tools are built on it.

The **bcc** tools are ready-made eBPF programs for common questions. On Ubuntu they end in `-bpfcc`:

```text
sudo apt install -y bpfcc-tools linux-headers-$(uname -r)

sudo execsnoop-bpfcc         # every new process, as it starts, with its arguments
sudo opensnoop-bpfcc         # every file opened, by any process
sudo tcpconnect-bpfcc        # every outgoing TCP connection
sudo biolatency-bpfcc 5 1    # how long disk I/O takes, as a histogram
```

`execsnoop` is especially useful. Leave it running for a minute on a busy server and you often find a cron job or health check starting thousands of short-lived processes that never show up in `top`.

**bpftrace** is a small language for writing your own one-line traces:

```text
sudo apt install -y bpftrace
# Every file opened, and which program opened it
sudo bpftrace -e 'tracepoint:syscalls:sys_enter_openat { printf("%s %s\n", comm, str(args->filename)); }'
```

For CPU questions ("where does this process spend its time?"), `perf top` shows the hottest functions live, and `perf record -g` followed by a flame graph shows the whole picture. That's worth learning once you're comfortable with the tools above.

## Break it, fix it · Running, but doing nothing

The `orders-sync` service should sync orders with the inventory API every few seconds. It's "running" according to systemd, uses no CPU, and has logged nothing for ten minutes. Start both services:

```text
sudo systemd-run --unit=inventory-api nc -lk 127.0.0.1 9000

sudo tee /usr/local/bin/orders_sync.py <<'EOF'
import socket
print("syncing orders with inventory-api", flush=True)
s = socket.create_connection(("127.0.0.1", 9000))
s.sendall(b"GET /stock HTTP/1.0\r\n\r\n")
reply = s.recv(4096)
print("got reply:", reply[:40], flush=True)
EOF

sudo systemd-run --unit=orders-sync python3 /usr/local/bin/orders_sync.py
sleep 3; systemctl status orders-sync --no-pager
```

Your job: find out what `orders-sync` is stuck on, without reading its source, and get it moving. Try it before opening a hint.

### Hint 1 · Where to look

- A process using no CPU is usually waiting for something. Find out which system call it's sitting in, and what's on the other end.

### Hint 2 · Which tool

- `sudo strace -p $(systemctl show -p MainPID --value orders-sync)` shows the call it's blocked in. Then `sudo lsof -i -a -p <PID>` or `sudo ss -tnp | grep python3` shows the connection, and you can check who's on the other end.

### Hint 3 · The cause and the fix

- **Cause:** `strace` shows the process blocked in `recvfrom(3, ...`, waiting for a reply. `lsof` shows descriptor 3 is a connection to `127.0.0.1:9000`, the inventory API. That API accepts connections but never answers, and the client set no timeout, so it waits forever.
- **Fix:** restore the dependency. Here the "API" is a stub that never replies, so stop both with `sudo systemctl stop orders-sync inventory-api`. In real life, you'd restart or fail over the wedged API, then restart the client.
- **Prevent it:** every network call needs a timeout (`socket.create_connection(..., timeout=5)`, and the same for HTTP and database clients). Add a health check that alerts when a worker stops making progress, not just when its process dies.

### Implementation notes

- **Ask a specific question before you trace.** "Which file does it read?" or "what is it blocked on?" gives short, useful output. Tracing everything gives a wall of text.
- **`strace` needs permission,** and on some hardened systems even root needs `kernel.yama.ptrace_scope` relaxed. Containers often block it unless they're given the `SYS_PTRACE` capability.
- **eBPF needs a reasonably recent kernel** (Ubuntu 22.04 and later are fine) and root. Managed platforms often expose the same data through their own eBPF-based tools.
- **A stack of `epoll_wait` or `futex` calls is normal** for an idle server. It means "waiting for work", not "stuck".

## Recap · Key terms

- **System call:** a program's request to the kernel, such as `openat`, `read`, `connect`, or `execve`.
- **strace:** traces one process's system calls; slow, so use it briefly.
- **ENOENT, EACCES:** "no such file" and "permission denied", the two most common errors in a trace.
- **lsof:** lists open files and sockets per process, or per file.
- **eBPF:** verified programs that run safely inside the kernel to trace events system-wide.
- **bcc tools and bpftrace:** ready-made eBPF tools, and a language for writing your own.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: What does `strace` show you?
- The program's source code
* Every system call the process makes, with its arguments and result
- CPU usage per function
- Network packets on the wire
= `strace` sits at the boundary between the program and the kernel. Each line is one request, such as opening a file, and what the kernel answered.
Q: In a trace, `openat("/etc/app/config.yaml", O_RDONLY) = -1 ENOENT` means what?
- The file is open
- Permission was denied
* The program looked for that file and it doesn't exist
- The disk is full
= `-1` is failure, and `ENOENT` is "no such file or directory". It's often how you discover a program reads its config from somewhere you didn't expect.
Q: Why can eBPF tools be used on production servers when `strace` should be used sparingly?
- eBPF tools only read logs
* eBPF programs are verified by the kernel and run with low overhead, while `strace` slows the traced process a lot
- `strace` needs a reboot to work
- eBPF tools don't need root
= The kernel checks every eBPF program before running it, and it runs in the kernel without stopping the process on every call. `strace` pauses the process at each system call.
S: A worker process uses 0% CPU, has stopped logging, and its status is "active (running)". What's the quickest way to see what it's waiting for?
- Restart it and watch the logs
* `sudo strace -p <PID>` to see the system call it's blocked in
- Raise its memory limit
- Run `top` and sort by CPU
= A blocked process sits in one system call, such as `read`, `recvfrom`, or `futex`. Seeing which one, and on which descriptor, tells you what it's waiting for.
S: The server shows constant small CPU spikes, but `top` never shows a process responsible. What do you try?
- `free -m`
- `df -h`
* `sudo execsnoop-bpfcc`, to catch short-lived processes as they start
- `strace` on PID 1
= Processes that start and finish between `top` refreshes are invisible to it. `execsnoop` prints every new process as it starts, which exposes runaway cron jobs and health-check scripts.
```
