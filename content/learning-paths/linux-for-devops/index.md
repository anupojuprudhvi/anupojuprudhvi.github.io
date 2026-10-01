---
title: Linux for DevOps: From First Terminal to On-Call Troubleshooting
date: 2026-10-01
track: linux-for-devops
summary: A hands-on Linux path for new graduates and associate engineers. Start with your first hour on a server, learn how Linux works underneath, then practise diagnosing the faults that show up on call. Every module ends with a break-fix lab on a throwaway VM.
level: Beginner to Intermediate
duration: 5 Modules · 67 min read
stack: [Ubuntu 24.04, Bash, Multipass, OpenSSH, apt, grep · awk · sed]
---

## Overview · Learn how Linux works, then practise fixing it

Most Linux courses teach commands. This track teaches how the system behaves, so that when something breaks you know where to look. It's written for two readers: a new graduate who has typed a few commands in college, and an associate engineer who uses Linux every day but still escalates when a server misbehaves. Each module builds on the ones before it.

Every module is built to be worked through, not just read. Each one opens with what you'll learn, includes hands-on **Try it** commands, recaps the key terms, and ends with a five-question **pop quiz**: three questions on the ideas and two real-world scenarios, shuffled into a new order every time. Score 4 out of 5 to pass.

<div class="callout"><b>Where to start.</b><ul><li><b>New to Linux, or only used it in college?</b> Start at <a href="01-shell-survival.html">Module 01</a> and read in order. It sets up the free lab VM that every module uses.</li><li><b>Use Linux at work already?</b> Skim the recap and take the pop quiz at the end of each Part 1 module. Pass all five and you're ready for Part 2 as it's published.</li></ul></div>

```flow
title: The route through this track
Part 1 · Foundations | the shell, text tools, files and permissions, users and SSH, packages
-> you can work on any Linux server without guessing
Part 2 · How Linux works | boot, systemd, processes, memory, storage, networking, DNS
-> you can explain what the system is doing and why
Part 3 · Troubleshooting | a method, the tracing tools, logs and monitoring
-> you can go from a symptom to a root cause
Part 4 · Linux for DevOps | containers from scratch, hardening, automation, performance
-> you understand the layer that Docker, Kubernetes, and CI run on
* Part 5 · Capstone | an incident with several faults at once, and a written postmortem
```

## Break-fix · How every lab ends

Reading about a full disk isn't the same as fixing one. So every module ends with a **Break it, fix it** exercise. You run one command that breaks your lab VM the way real servers break. Then you get only the symptom a user would report. Three hints are folded underneath, to open one at a time if you get stuck:

1. **Where to look:** the part of the system to check first.
2. **Which tool:** the command that shows the cause.
3. **The cause and the fix:** what went wrong, how to fix it, and how to stop it happening again.

Try to fix it before opening a hint. Being stuck for ten minutes and then finding the cause is how the skill actually forms.

All you need is a laptop. Module 01 sets up a free Ubuntu VM with **Multipass** that you can break, reset, and recreate in a minute. A small cloud VM, such as an EC2 instance running Ubuntu 24.04, works just as well. Stop it when you finish so it doesn't keep costing money.

## Part 1 · Foundations

No Linux experience needed. Get comfortable on a server: move around, find things in logs, understand permissions, sign in securely, and install software the right way.

<ul class="lp-syllabus">
  <li>
    <a class="lp-module-card" href="01-shell-survival.html">
      <span class="lp-module-num">01</span>
      <div class="lp-module-body">
        <h3>Shell Survival: Your First Hour on a Linux Server</h3>
        <p>Set up a free lab VM, move around the filesystem, read files and logs, chain commands with pipes, and use exit codes to tell success from failure.</p>
      </div>
      <span class="lp-module-action">Start here →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="02-text-processing.html">
      <span class="lp-module-num">02</span>
      <div class="lp-module-body">
        <h3>Text Processing: grep, awk, sed, and Friends</h3>
        <p>Answer real questions from a web server log in one line: who's calling, what's failing, and when. Plus find, xargs, and jq.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="03-files-and-permissions.html">
      <span class="lp-module-num">03</span>
      <div class="lp-module-body">
        <h3>Files, Inodes &amp; Permissions</h3>
        <p>Where things live on a Linux system, what a file really is, how read, write, and execute work on files and directories, and a shared team folder.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="04-users-sudo-and-ssh.html">
      <span class="lp-module-num">04</span>
      <div class="lp-module-body">
        <h3>Users, sudo &amp; SSH</h3>
        <p>Users and groups, safe sudo rules, key-based SSH, a jump host, and changing the SSH server's settings without locking yourself out.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="05-packages-and-repositories.html">
      <span class="lp-module-num">05</span>
      <div class="lp-module-body">
        <h3>Packages, Repositories &amp; Where Software Lives</h3>
        <p>What a package is, apt and dnf side by side, adding a signed third-party repository, finding which package owns a file, and safe upgrades.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
</ul>

## Coming next · Parts 2 to 5

These parts are being written and will appear here as each one is published.

- **Part 2 · How Linux works:** the boot process, systemd and services, processes and signals, memory and the OOM killer, storage and filesystems, networking, and DNS and firewalls.
- **Part 3 · Troubleshooting:** a repeatable troubleshooting method, debugging with strace and lsof, and logs and monitoring.
- **Part 4 · Linux for DevOps:** building a container by hand from namespaces and cgroups, security hardening, automation and safe scripting, and performance tuning.
- **Part 5 · Capstone:** an incident with three unknown faults across a web server, an app, and a database, finished with a blameless postmortem.
