---
title: Processes, Signals & File Descriptors
date: 2026-10-01
track: linux-for-devops
order: 8
module: 8
summary: Every running program is a process with an ID, a parent, a state, and a set of open files. Learn to read process states (including the D and Z states that confuse people), stop processes the right way with signals, and fix a service that crashes with "Too many open files".
level: How Linux works · Core concept
readingTime: 14 min read
stack: [ps, top, /proc, kill, lsof, ulimit, systemd]
tags: [linux, processes, signals, file-descriptors, ulimit, troubleshooting]
---

**In this module, you'll learn to:**

- Inspect processes with `ps`, `top`, and `/proc`, and read their states
- Stop processes with the right signal, and explain zombies and stuck D-state processes
- Find a process's open files and limits, and raise a service's file descriptor limit correctly

**Before you start:** finish [systemd: Services, Timers & Logs](07-systemd-and-services.html). Open a shell on your lab VM with `multipass shell lab`.

## Principle · A process is a running program

When you run a program, the kernel creates a **process**: a copy of the program in memory with its own ID (the **PID**), the user it runs as, its current directory, its environment variables, and its open files. Every process has a parent (its **PPID**) that started it, all the way back to systemd at PID 1.

```text
ps aux | head                   # every process: user, PID, CPU %, memory %, state, command
ps -ef --forest | less          # the parent and child tree
pstree -p | head -20            # the same tree, more compact
top                             # live view; press P to sort by CPU, M by memory, q to quit
pgrep -a sshd                   # PIDs and commands matching a name
```

The kernel shows each process as a directory under `/proc/<PID>`, and the commands above read from there. You can read it directly too:

```text
echo $$                              # the PID of your own shell
cat /proc/$$/status | head -10       # name, state, PID, parent, user
tr '\0' ' ' < /proc/$$/cmdline; echo # the exact command line
ls -l /proc/$$/cwd                   # its current directory
```

## States · R, S, D, Z, and T

The `STAT` column in `ps aux` shows what each process is doing. Most of the time almost everything is sleeping, which is normal.

| State | Meaning | What it tells you |
| --- | --- | --- |
| R | Running, or ready to run | Using CPU, or waiting for a turn |
| S | Sleeping, waiting for something such as network input | Normal for idle services |
| D | Uninterruptible sleep, waiting on disk or network storage | Can't be killed until the I/O finishes; many D processes point to a slow or hung disk |
| Z | Zombie: finished, but its parent hasn't collected its exit status | Harmless one at a time; a growing number means a buggy parent |
| T | Stopped, for example with Ctrl+Z | Paused until it's continued |

**Load average** (from `uptime` or `top`) counts processes that are running, waiting for CPU, *or* in D state. So a high load with an idle CPU usually means processes are stuck waiting on storage, not short of CPU. Part 3 uses this to diagnose slow servers.

**Try it · Make a zombie.** This parent starts a child that exits immediately, but never collects it:

```text
python3 -c 'import os, time
if os.fork() == 0:
    os._exit(0)
time.sleep(300)' &

ps -o pid,ppid,stat,cmd --ppid $!     # the child shows Z and <defunct>
kill $!                               # end the parent...
ps -o pid,ppid,stat,cmd --ppid $!     # ...and the zombie is gone
```

You can't kill a zombie, because it's already dead. When its parent exits, systemd adopts the zombie and collects it. The fix for a zombie build-up is always the parent.

## Signals · Asking, and telling, a process to stop

A **signal** is a short message from the kernel to a process. `kill` sends one, and despite its name, most signals aren't fatal.

| Signal | Number | Sent by | What it means |
| --- | --- | --- | --- |
| SIGTERM | 15 | `kill PID` (the default), `systemctl stop` | Please shut down cleanly: finish work, close files |
| SIGKILL | 9 | `kill -9 PID` | Stop now. Can't be caught, so there's no clean-up |
| SIGINT | 2 | Ctrl+C | Interrupt, from the keyboard |
| SIGHUP | 1 | `kill -HUP PID` | Many services re-read their config on this |
| SIGTSTP and SIGCONT | 20, 18 | Ctrl+Z, `fg` | Pause and resume |

```text
sleep 600 &
kill $!            # SIGTERM: the polite request
sleep 600 &
kill -9 $!         # SIGKILL: only when TERM didn't work
pkill -f "sleep 600"   # by matching the command line
```

Always try SIGTERM first and give it a few seconds. SIGKILL can leave half-written files, stale lock files, and lost data. `systemctl stop` does exactly this for you: TERM, a timeout, then KILL.

`nice` and `renice` set a process's priority, from -20 (most favoured) to 19 (least). `nice -n 10 tar czf backup.tgz /data` runs a backup without slowing everything else down.

## Files · Every open file is a file descriptor

Each file, network connection, or pipe a process has open is a **file descriptor** (fd), a small number. Every process starts with three: 0 is stdin, 1 is stdout, and 2 is stderr.

```text
ls -l /proc/$$/fd                     # your shell's open file descriptors
sudo apt install -y lsof
sudo lsof -p "$(pgrep -o sshd)"       # everything one process has open
sudo lsof -i :22                      # which process has port 22 open
```

The kernel limits how many descriptors one process may hold. A busy web server or database can need tens of thousands, one per connection.

```text
ulimit -n                         # your shell's limit (the soft limit)
ulimit -Hn                        # the ceiling it may be raised to (the hard limit)
cat /proc/$$/limits               # every limit for a running process
```

```flow
title: Where a process's open-file limit comes from
paths
path: Login sessions
/etc/security/limits.conf | applied when a user signs in, through PAM
-> inherited by everything started from that shell
Your shell and its commands | ulimit -n shows the result
path: systemd services
Unit file | LimitNOFILE= in the service or a drop-in
-> set by systemd when it starts the service
* The service's process | limits.conf is never read
end
```

That split catches people out: they raise the limit in `limits.conf`, sign in again, see a big number from `ulimit -n`, and the service still fails, because services never read that file.

## Break it, fix it · Too many open files

A new service, `filehog`, starts and then dies a few seconds later, every time. Create it:

```text
sudo tee /usr/local/bin/filehog.py <<'EOF'
import time
files = []
for i in range(200):
    files.append(open("/etc/hostname"))
    time.sleep(0.02)
print(f"opened {len(files)} files, now serving", flush=True)
time.sleep(3600)
EOF

sudo tee /etc/systemd/system/filehog.service <<'EOF'
[Unit]
Description=A service that needs a lot of open files

[Service]
ExecStart=/usr/bin/python3 /usr/local/bin/filehog.py
LimitNOFILE=64
EOF

sudo systemctl daemon-reload
sudo systemctl start filehog
sleep 5; systemctl status filehog
```

Your job: find out why it dies, and give it the limit it needs, the way you would for a real service. Try it before opening a hint.

### Hint 1 · Where to look

- The service's own output says what went wrong. Read the last lines of its log, then find out what limit the kernel enforced on this particular process.

### Hint 2 · Which tool

- `journalctl -u filehog -n 20` shows the error. `systemctl show filehog -p LimitNOFILE` shows the limit systemd applied, and `systemctl cat filehog` shows where it was set. For a process that's still running, `cat /proc/<PID>/limits` shows the same thing.

### Hint 3 · The cause and the fix

- **Cause:** the unit sets `LimitNOFILE=64`. The app needs 200 files plus its three standard descriptors, so an `open()` around the 60th file fails with `OSError: [Errno 24] Too many open files` and the process exits.
- **Fix:** raise the limit in a drop-in with `sudo systemctl edit filehog`, adding `[Service]` and `LimitNOFILE=65536`. Then `sudo systemctl restart filehog` and check `systemctl status filehog` stays active. Clean up afterwards with `sudo systemctl stop filehog`.
- **Prevent it:** set `LimitNOFILE` in the unit for anything that holds many connections, and monitor open descriptors against the limit (`ls /proc/<PID>/fd | wc -l`). Raising `/etc/security/limits.conf` wouldn't have helped, because services don't read it.

### Implementation notes

- **"Too many open files" isn't always about files.** Every network connection uses a descriptor too, so a busy server hits this through sockets long before it opens many files.
- **A process leaking descriptors** shows a count that only grows. Raising the limit buys time; the code still needs fixing.
- **Background jobs started from your shell** (`command &`) end when you sign out unless they're started with `nohup`. Anything that should keep running belongs in a systemd service.
- **Don't reach for `kill -9` first.** If SIGTERM doesn't work within a reasonable timeout, find out why (often a D state, or a process ignoring signals) before forcing it.

## Recap · Key terms

- **PID and PPID:** a process's ID, and its parent's ID.
- **`/proc/<PID>`:** the kernel's live view of a process: status, command line, limits, open files.
- **D state:** waiting on I/O and unkillable until it finishes. Counted in the load average.
- **Zombie:** a finished process whose parent hasn't collected its exit status.
- **SIGTERM and SIGKILL:** the polite request to stop, and the forced stop with no clean-up.
- **File descriptor:** the number for each open file, socket, or pipe in a process.
- **`LimitNOFILE`:** the open-file limit for a systemd service.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: What's the difference between `kill PID` and `kill -9 PID`?
* `kill` sends SIGTERM, a request to shut down cleanly; `-9` sends SIGKILL, which can't be caught
- They're the same, `-9` is just faster
- `kill` pauses the process; `-9` ends it
- `-9` restarts the process
= SIGTERM lets the program finish what it's doing and clean up. SIGKILL stops it instantly, which can leave corrupted or locked files, so it's the last resort.
Q: What is a zombie process?
- A process using 100% CPU
- A process stuck waiting on a disk
* A process that has finished, but whose parent hasn't collected its exit status
- A process with no open files
= A zombie is already dead and uses no CPU or memory, just a slot in the process table. Its parent should collect it; if the parent exits, systemd does.
Q: Why might `ulimit -n` show 65536 in your shell while a service still fails with "Too many open files"?
- `ulimit` only affects root
* Services started by systemd don't use `/etc/security/limits.conf`; their limit comes from `LimitNOFILE` in the unit
- The kernel ignores limits above 1024
- The service needs a reboot to see the new limit
= `limits.conf` applies to login sessions through PAM. systemd sets each service's limits from its unit file, so the fix goes in the unit or a drop-in.
S: A server's load average is 30, but `top` shows the CPUs mostly idle. What's the most likely explanation?
- The load average is wrong
- Too many users are signed in
* Many processes are in D state, waiting on slow disk or network storage
- A process is using too much memory
= The load average counts D-state processes as well as running ones. Look for `D` in `ps aux` and check the storage they're waiting on.
S: `ps` shows hundreds of zombie processes, all with the same parent PID. What fixes it?
- `kill -9` each zombie
* Restart or fix the parent process, so the zombies are collected
- Reboot immediately
- Raise the open-file limit
= Zombies can't be killed because they're already dead. The parent isn't collecting its children; restarting it lets systemd collect them, and the parent's code needs fixing.
```
