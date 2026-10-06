---
title: Shell Survival: Your First Hour on a Linux Server
date: 2026-10-01
track: linux-for-devops
order: 1
module: 1
summary: Start here. Set up a free Ubuntu lab VM you're allowed to break, then learn to move around, read files and logs, chain commands with pipes, and use exit codes to tell whether a command really worked.
level: Foundations · Start here
readingTime: 14 min read
stack: [Ubuntu 24.04, Bash, Multipass]
tags: [linux, shell, bash, multipass, lab, basics, beginner]
---

**In this module, you'll learn to:**

- Create, reset, and delete a free Ubuntu lab VM with Multipass
- Move around the filesystem, read files and logs, and find help for any command
- Connect commands with pipes and redirects, and check exit codes to see what really happened

**Before you start:** nothing. You need a laptop with about 4 GB of free memory and permission to install software. Every idea in this track is explained when it first comes up.

## Setup · A lab VM you're allowed to break

You'll break things on purpose throughout this track, so you need a Linux machine where mistakes cost nothing. **Multipass** creates Ubuntu virtual machines on your laptop with one command. It's free and runs on Windows, macOS, and Linux.

```text
# Windows (Pro uses Hyper-V; Home uses VirtualBox, installed separately)
winget install Canonical.Multipass

# macOS, with Homebrew
brew install --cask multipass

# Linux
sudo snap install multipass
```

Create the lab VM and open a shell on it:

```text
# Ubuntu 24.04 LTS with 2 CPUs, 2 GB of memory, and a 10 GB disk
multipass launch 24.04 --name lab --cpus 2 --memory 2G --disk 10G

# Open a shell on it; type exit to leave
multipass shell lab
```

Before you break anything, save a snapshot so you can roll back in seconds:

```text
# Run these on your laptop, not inside the VM
multipass stop lab
multipass snapshot lab --name fresh
multipass start lab

# Later, to undo everything since the snapshot
multipass stop lab
multipass restore --destructive lab.fresh

# Or start over completely
multipass delete --purge lab
```

## Orientation · Reading the prompt and moving around

When the shell opens, you see a **prompt** like `ubuntu@lab:~$`. It tells you three things: you're the user `ubuntu`, on the machine `lab`, in the directory `~` (your home directory). The `$` means you're a normal user. A `#` means you're **root**, the all-powerful administrator, so slow down when you see one.

Linux has a single tree of directories starting at `/`, called the root. A path that starts with `/` is **absolute** (the full address). Any other path is **relative** to where you are now.

```text
pwd                  # print working directory: where am I?
ls                   # list what's here
ls -la               # long format, including hidden files (names starting with .)
ls -lh /var/log      # human-readable sizes, in another directory
cd /var/log          # change directory, absolute path
cd ..                # up one level
cd ~                 # home (cd on its own does the same)
cd -                 # back to the previous directory
```

**Try it · Get to know your server.** On any machine you've never seen before, these answer the first questions you'll have:

```text
hostname             # what is this machine called?
whoami               # who am I signed in as?
cat /etc/os-release  # which Linux distribution and version?
uptime               # how long since it started, and how busy is it?
nproc                # how many CPUs?
free -h              # how much memory, and how much is free?
df -h /              # how full is the main disk?
ip -br addr          # which network addresses does it have?
ls /home             # which users have home directories?
```

## Read · Files, logs, and help

Most of your time on a server is spent reading: config files, logs, and command output.

```text
cat /etc/hostname              # print a short file
less /etc/ssh/sshd_config      # page through a long file:
                               #   space = next page, / = search, q = quit
head -n 5 /etc/passwd          # the first 5 lines
tail -n 20 /var/log/cloud-init-output.log   # the last 20 lines
tail -f somefile.log           # keep printing new lines as they arrive
                               #   (Ctrl+C to stop)
```

Logs live under `/var/log`, and some need `sudo` to read. `sudo` runs one command as root. You'll learn exactly how it decides who's allowed in [Users, sudo & SSH](04-users-sudo-and-ssh.html).

Creating, copying, and removing files:

```text
mkdir -p projects/demo     # make a directory (-p: and any parents)
touch notes.txt            # create an empty file
cp notes.txt notes.bak     # copy
mv notes.bak old.txt       # move, which is also how you rename
rm old.txt                 # remove. There is no recycle bin.
rm -r projects             # remove a directory and everything in it
```

`rm` has no undo. Get in the habit of running `ls` with the same path first, to see exactly what you're about to delete.

When you don't know how a command works, ask the system:

```text
man ls          # the full manual page (q to quit)
ls --help       # a shorter summary, for most commands
type cd         # is it a program, or built into the shell?
```

## Connect · Pipes and redirects

Every program starts with three connections. **stdin** (standard input) is where it reads from, usually your keyboard. **stdout** (standard output) is where normal results go, usually your screen. **stderr** (standard error) is where error messages go, also usually your screen. Redirects and pipes rewire them.

```text
ls /etc > files.txt          # stdout to a file (overwrites it)
ls /etc >> files.txt         # stdout appended to a file
ls /nope 2> errors.txt       # stderr (stream 2) to a file
ls /etc /nope > all.txt 2>&1 # both streams into one file
ls /nope 2> /dev/null        # throw errors away

# A pipe sends one command's stdout into the next command's stdin
ls /etc | wc -l              # how many entries are in /etc?
ps aux | grep sshd           # is the SSH server running?
```

A pipe carries only stdout. Error messages still go to your screen, which is often what you want: you see failures even in the middle of a pipeline.

## Signal · Exit codes tell you what really happened

Every command finishes with an **exit code**, a number the shell keeps in `$?`. `0` means success. Anything else means something went wrong. Scripts, CI pipelines, and monitoring all decide "did it work?" from this number, not from the text on screen.

```flow
title: What happens when you press Enter
You | type ls -l /var/log | wc -l
-> the shell expands variables, ~, and wildcards like *.log
Shell | finds each program in the directories listed in $PATH
-> starts the programs and connects them with a pipe
Programs | ls writes to stdout, wc reads it from stdin
-> each one finishes with an exit code
* Exit code in $? | 0 means success; anything else is a failure
```

```text
ls /etc
echo $?            # 0: it worked

ls /does-not-exist
echo $?            # 2: ls failed

# && runs the next command only if the last one succeeded
mkdir -p /tmp/demo && cd /tmp/demo

# || runs the next command only if the last one failed
grep -q ubuntu /etc/passwd || echo "no ubuntu user"
```

A few codes are worth knowing on sight. `127` means command not found, often a typo or a missing package. `126` means the file isn't executable. `130` means you pressed Ctrl+C. One trap: `grep` exits with `1` when it simply finds nothing. That's not an error, but a script that treats every non-zero code as one will think it is.

## Speed · Habits that save hours

- **Tab completion:** type the start of a command, file, or directory name and press Tab. It finishes the name, or shows the options when there are several. It also prevents typos.
- **History:** the up arrow repeats earlier commands. `history` lists them, and **Ctrl+R** searches them as you type.
- **Ctrl+C** stops the running command. **Ctrl+L** clears the screen. **Ctrl+A** and **Ctrl+E** jump to the start and end of the line.
- **Quote paths with spaces:** `cd "My Files"`. Without quotes, the shell sees two separate words.
- **Wildcards:** `ls *.log` matches every name ending in `.log`. The shell expands it *before* the command runs. Check what a wildcard matches with `ls` before using it with `rm`.

## Break it, fix it · The backup that said it worked

A teammate wrote a backup script. It prints "Backup complete" every night, but when someone tried to restore from it, the archive held the wrong files. Create the script exactly as they wrote it, and run it:

```text
cat > backup.sh <<'EOF'
#!/bin/bash
cd /var/backups/app
tar -czf /tmp/app-backup.tar.gz .
echo "Backup complete"
EOF

chmod +x backup.sh
./backup.sh

# What's actually in the backup?
tar -tzf /tmp/app-backup.tar.gz | head
```

Your job: find out why the archive holds the wrong files, and change the script so it fails loudly instead of lying. Try it before opening a hint.

### Hint 1 · Where to look

- The script has three steps, and each one finishes with an exit code. Check whether every step really succeeded, especially the first one. The last line only proves the script reached the end.

### Hint 2 · Which tool

- Run `bash -x ./backup.sh`. The `-x` flag prints each command before it runs, so you can see what happens and in what order. Then try `cd /var/backups/app; echo $?` on its own.

### Hint 3 · The cause and the fix

- **Cause:** `/var/backups/app` doesn't exist, so `cd` failed with exit code 1. Bash carried on regardless, and `tar` archived the current directory (your home directory) instead. `echo` then reported success, because nothing told the script to stop.
- **Fix:** add `set -euo pipefail` as the second line. `-e` stops the script at the first failing command, `-u` treats unset variables as errors, and `-o pipefail` makes a pipeline fail if any part fails. You can also guard the one step: `cd /var/backups/app || exit 1`.
- **Prevent it:** start every Bash script with `set -euo pipefail`, and test that a script fails when it should, not just that it succeeds.

### Implementation notes

- **Check the prompt before a dangerous command.** The hostname in it tells you whether you're on the lab VM or a real server. Many engineers have run the right command on the wrong machine.
- **Read what you're about to delete before you delete it.** `ls` the path first, then press the up arrow and change `ls` to `rm`.
- **A message on screen isn't proof.** Exit codes are what scripts, pipelines, and monitoring trust, so check them the same way.
- **Restore the snapshot instead of repairing a confused lab.** `multipass restore --destructive lab.fresh` is faster than undoing ten experiments by hand.

## Recap · Key terms

- **Shell:** the program that reads your commands and runs them. Ubuntu's default is Bash.
- **Absolute and relative paths:** a path from `/`, or a path from the current directory.
- **stdin, stdout, stderr:** a program's input, normal output, and error output.
- **Pipe (`|`):** sends one command's stdout into the next command's stdin.
- **Exit code:** the number a command finishes with. `0` is success, and `$?` holds the last one.
- **root:** the administrator account. `sudo` runs a single command as root.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: What does an exit code of 0 mean?
* The command succeeded
- The command produced no output
- The command was not found
- The command is still running
= `0` is success, and every non-zero value is some kind of failure. Scripts and CI pipelines decide whether a step worked from this number, not from the text it printed.
Q: Which command sends both normal output and error messages into `out.txt`?
- `cmd | out.txt`
- `cmd 2> out.txt`
* `cmd > out.txt 2>&1`
- `cmd >> out.txt`
= `> out.txt` sends stdout to the file, and `2>&1` sends stderr (stream 2) to the same place as stdout. A pipe needs a command on its right, not a file.
Q: Your prompt ends in `#` instead of `$`. What does that tell you?
- The last command failed
* You're signed in as root, so every command runs with full privileges
- You're inside a script
- The shell is waiting for more input
= `#` marks the root user. Nothing protects root from a mistake, so it's the moment to slow down and re-read each command.
S: A deploy script printed "Deployed successfully", but the new version isn't running. What do you check first?
- Run the script again and watch the output
* The exit code of each step inside the script, for example with `bash -x`
- Reboot the server
- Delete the old version by hand
= A success message only proves the script reached that line. Bash keeps going after a failed step unless the script uses `set -e`, so trace the steps and check each exit code.
S: You run `deploy-app` and get exit code 127. What's the most likely cause?
- The app crashed during start-up
- You pressed Ctrl+C
* The shell couldn't find a program with that name in your `PATH`
- The disk is full
= `127` means "command not found": a typo, a package that isn't installed, or a program in a directory that isn't listed in `$PATH`.
```
