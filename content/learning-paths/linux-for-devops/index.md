---
title: Linux for DevOps: From First Terminal to On-Call Troubleshooting
date: 2026-10-01
track: linux-for-devops
summary: A hands-on Linux path for new graduates and associate engineers. Start with your first hour on a server, learn how Linux works underneath, then practise diagnosing the faults that show up on call. Every module ends with a break-fix lab on a throwaway VM.
level: Beginner to Intermediate
duration: 25 Modules · 337 min read
stack: [Ubuntu 24.04, Bash, systemd, LVM, nftables, tcpdump, strace, eBPF, Ansible, Docker]
---

## Overview · Learn how Linux works, then practise fixing it

Most Linux courses teach commands. This track teaches how the system behaves, so that when something breaks you know where to look. It's written for two readers: a new graduate who has typed a few commands in college, and an associate engineer who uses Linux every day but still escalates when a server misbehaves. Each module builds on the ones before it.

Every module is built to be worked through, not just read. Each one opens with what you'll learn, includes hands-on **Try it** commands, recaps the key terms, and ends with a five-question **pop quiz**: three questions on the ideas and two real-world scenarios, shuffled into a new order every time. Score 4 out of 5 to pass.

<div class="callout"><b>Where to start.</b><ul><li><b>New to Linux, or only used it in college?</b> Start at <a href="01-shell-survival.html">Module 01</a> and read in order. It sets up the free lab VM that every module uses.</li><li><b>Use Linux at work already?</b> Take the pop quiz at the end of each Part 1 module. Pass all five, then start at <a href="06-boot-process.html">Part 2</a>, where most day-to-day troubleshooting knowledge lives.</li><li><b>Chasing a specific problem?</b> Go straight to the module for it: services in <a href="07-systemd-and-services.html">07</a>, memory in <a href="09-memory-and-the-oom-killer.html">09</a>, disks in <a href="10-storage-and-filesystems.html">10</a>, networking in <a href="11-networking-basics.html">11</a> and <a href="12-dns-firewalls-and-packets.html">12</a>, a slow server in <a href="13-troubleshooting-method.html">13</a>.</li><li><b>Think you already know it all?</b> Try the <a href="20-capstone-incident.html">capstone incident</a> first, and come back for whatever slows you down.</li></ul></div>

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

## Part 2 · How Linux works

What the system is doing underneath the commands. Every troubleshooting skill in Part 3 depends on these, so read them in order.

<ul class="lp-syllabus">
  <li>
    <a class="lp-module-card" href="06-boot-process.html">
      <span class="lp-module-num">06</span>
      <div class="lp-module-body">
        <h3>The Boot Process: From Power-On to Login</h3>
        <p>Firmware, GRUB, the kernel, initramfs, and systemd; reading boot history and timing; and catching a bad fstab line before a reboot.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="07-systemd-and-services.html">
      <span class="lp-module-num">07</span>
      <div class="lp-module-body">
        <h3>systemd: Services, Timers &amp; Logs</h3>
        <p>Turn a script into a hardened service, change it with drop-in overrides, replace cron with a timer, and read logs with journalctl.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="08-processes-and-signals.html">
      <span class="lp-module-num">08</span>
      <div class="lp-module-body">
        <h3>Processes, Signals &amp; File Descriptors</h3>
        <p>Process states including D and Z, stopping processes the right way, open files and their limits, and "Too many open files".</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="09-memory-and-the-oom-killer.html">
      <span class="lp-module-num">09</span>
      <div class="lp-module-body">
        <h3>Memory, the Page Cache &amp; the OOM Killer</h3>
        <p>Reading free correctly, the page cache, swap, memory limits for services and containers, and finding an out-of-memory kill.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="10-storage-and-filesystems.html">
      <span class="lp-module-num">10</span>
      <div class="lp-module-body">
        <h3>Storage, Filesystems &amp; LVM</h3>
        <p>Disks, filesystems, and mounts; finding what fills a disk; recovering a broken mount; growing an LVM volume live; and space held by deleted files.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="11-networking-basics.html">
      <span class="lp-module-num">11</span>
      <div class="lp-module-body">
        <h3>Networking Basics: Addresses, Routes, Ports &amp; TCP</h3>
        <p>Addresses and routing, listening sockets, the TCP handshake and states, and telling "refused" from a timeout.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="12-dns-firewalls-and-packets.html">
      <span class="lp-module-num">12</span>
      <div class="lp-module-body">
        <h3>DNS, Firewalls &amp; Packet Capture</h3>
        <p>How a name becomes an address, dig versus getent, drop versus reject in nftables, and reading packets with tcpdump.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
</ul>

## Part 3 · Troubleshooting

Turning knowledge into a method. How to go from a vague report to a root cause, see inside a process, and know something is wrong before users do.

<ul class="lp-syllabus">
  <li>
    <a class="lp-module-card" href="13-troubleshooting-method.html">
      <span class="lp-module-num">13</span>
      <div class="lp-module-body">
        <h3>A Troubleshooting Method: From Symptom to Root Cause</h3>
        <p>Symptom, change, scope, evidence, hypothesis; the USE method for every resource; and a 60-second checklist that finds most problems.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="14-debugging-tools.html">
      <span class="lp-module-num">14</span>
      <div class="lp-module-body">
        <h3>Seeing Inside a Process: strace, lsof &amp; eBPF</h3>
        <p>System calls traced with strace, open files and connections with lsof, and safe whole-system tracing with eBPF tools.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="15-logs-and-monitoring.html">
      <span class="lp-module-num">15</span>
      <div class="lp-module-body">
        <h3>Logs, Log Rotation &amp; Monitoring</h3>
        <p>Querying the journal, logrotate done right, shipping logs off the server, node_exporter metrics, and alerts worth having.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
</ul>

## Part 4 · Linux for DevOps

The Linux layer that containers, automation, and cloud platforms are built on.

<ul class="lp-syllabus">
  <li>
    <a class="lp-module-card" href="16-containers-from-scratch.html">
      <span class="lp-module-num">16</span>
      <div class="lp-module-body">
        <h3>Containers from Scratch: Namespaces, cgroups &amp; Overlay Filesystems</h3>
        <p>Build a container by hand, then find the same namespaces, cgroup, and overlay filesystem inside a real Docker container.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="17-security-and-hardening.html">
      <span class="lp-module-num">17</span>
      <div class="lp-module-body">
        <h3>Security Hardening, AppArmor &amp; TLS</h3>
        <p>A practical hardening checklist, auditd, reading AppArmor and SELinux denials, and checking certificates and time sync.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="18-automation-and-scripting.html">
      <span class="lp-module-num">18</span>
      <div class="lp-module-body">
        <h3>Automation: Safe Bash, cloud-init &amp; Ansible</h3>
        <p>Scripts that fail safely and run twice without harm, first-boot configuration with cloud-init, and an idempotent Ansible playbook.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="19-performance-and-tuning.html">
      <span class="lp-module-num">19</span>
      <div class="lp-module-body">
        <h3>Performance &amp; Kernel Tuning</h3>
        <p>Load testing against a baseline, the kernel settings that matter for busy servers and Kubernetes nodes, and cloud limits.</p>
      </div>
      <span class="lp-module-action">Read module →</span>
    </a>
  </li>
</ul>

## Part 5 · Capstone

Everything at once, the way real incidents happen.

<ul class="lp-syllabus">
  <li>
    <a class="lp-module-card" href="20-capstone-incident.html">
      <span class="lp-module-num">20</span>
      <div class="lp-module-body">
        <h3>Capstone: An Incident with Three Unknown Faults</h3>
        <p>Build a three-tier shop, inject three random faults, restore service from the outside in, and write a blameless postmortem.</p>
      </div>
      <span class="lp-module-action">Start the capstone →</span>
    </a>
  </li>
</ul>

## Part 6 · Production Incident Reviews

Real incidents from a production platform on RHEL 8 servers in AWS, written up as blameless incident reviews: symptom, investigation, root cause, fix, and prevention. Every server name, path, account, and product name is replaced with a generic one, and nothing is added beyond what the engineering notes record. Each review links back to the modules that teach the skills it needed.

<ul class="lp-syllabus">
  <li>
    <a class="lp-module-card" href="21-incident-ssh-fails-for-service.html">
      <span class="lp-module-num">21</span>
      <div class="lp-module-body">
        <h3>Incident Review: SSH Worked by Hand but Failed for the Service</h3>
        <p>Four stacked faults in a job's own SSH library after a move to RHEL 8, fixed on the client without weakening the server.</p>
      </div>
      <span class="lp-module-action">Read review →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="22-incident-kernel-semaphore-limit.html">
      <span class="lp-module-num">22</span>
      <div class="lp-module-body">
        <h3>Incident Review: A Service Blocked by a Kernel Semaphore Limit</h3>
        <p>A start-up script that tried to change the kernel and was denied, and why kernel requirements belong in provisioning.</p>
      </div>
      <span class="lp-module-action">Read review →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="23-incident-postgresql-config-ownership.html">
      <span class="lp-module-num">23</span>
      <div class="lp-module-body">
        <h3>Incident Review: PostgreSQL Locked Out of Its Own Config File</h3>
        <p>How <code>cp -p</code> copied the wrong owner on every start, and why the template had to be fixed as well as the file.</p>
      </div>
      <span class="lp-module-action">Read review →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="24-incident-two-faults-one-daemon.html">
      <span class="lp-module-num">24</span>
      <div class="lp-module-body">
        <h3>Incident Review: Two Faults Behind One Failed Daemon</h3>
        <p>A pooler pointing at the wrong environment and a non-root change that broke shared memory, at the same time.</p>
      </div>
      <span class="lp-module-action">Read review →</span>
    </a>
  </li>
  <li>
    <a class="lp-module-card" href="25-incident-trust-authentication-failed.html">
      <span class="lp-module-num">25</span>
      <div class="lp-module-body">
        <h3>Incident Review: "trust" Authentication Failed, Through a Unix Socket</h3>
        <p>Two silent <code>psql</code> defaults, a Unix socket and the Linux user name, exposed by a database migration.</p>
      </div>
      <span class="lp-module-action">Read review →</span>
    </a>
  </li>
</ul>

## Next · Where this track leads

Finished the capstone? The [Kubernetes from Zero to Production on Amazon EKS](../kubernetes-operations/index.html) track builds directly on Parts 2 to 4: pods are the processes and cgroups from Modules 08, 09, and 16, and cluster networking relies on the routing, DNS, and connection tracking from Modules 11, 12, and 19.
