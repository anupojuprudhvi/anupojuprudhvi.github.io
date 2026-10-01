---
title: The Boot Process: From Power-On to Login
date: 2026-10-01
track: linux-for-devops
order: 6
module: 6
summary: What happens between pressing the power button and a login prompt: firmware, GRUB, the kernel, initramfs, and systemd. Read a server's boot history, find what slowed it down, and catch a bad /etc/fstab line before a reboot turns it into an outage.
level: How Linux works · Core concept
readingTime: 13 min read
stack: [GRUB, Linux kernel, initramfs, systemd, journalctl, fstab]
tags: [linux, boot, grub, kernel, systemd, fstab, troubleshooting]
---

**In this module, you'll learn to:**

- Name each stage of the boot process and what can go wrong in it
- Read a server's boot history and timing with `journalctl` and `systemd-analyze`
- Check a risky change before a reboot, and know your options when a cloud server won't come back

**Before you start:** finish Part 1, especially [Files, Inodes & Permissions](03-files-and-permissions.html). Open a shell on your lab VM with `multipass shell lab`.

## Stages · Five handovers from power-on to login

Booting is a relay race. Each stage does a small job, then hands control to the next one. When a server "won't boot", the first question is always: **which stage did it reach?**

```flow
title: From power-on to a login prompt
Firmware (UEFI or BIOS) | checks the hardware and finds a bootable disk
-> loads the boot loader from the disk
GRUB | the boot loader: picks a kernel and the options to start it with
-> loads the kernel and the initramfs into memory
Kernel | starts drivers for the CPU, memory, disks, and network
-> unpacks the initramfs as a temporary root filesystem
initramfs | a tiny toolkit that finds and mounts the real root filesystem
-> hands over to /sbin/init on the real root
* systemd, PID 1 | starts every service in dependency order, mounts /etc/fstab entries
-> reaches the default target, multi-user.target on a server
Login | sshd and the console accept users
```

| Stage | Typical failure | What you'd see |
| --- | --- | --- |
| Firmware | No bootable disk, wrong boot order | A firmware message; nothing from Linux at all |
| GRUB | Missing or broken GRUB files | A `grub>` or `grub rescue>` prompt |
| Kernel | Bad or missing driver, kernel panic after an update | "Kernel panic" on the console |
| initramfs | Root disk not found, often after a disk or driver change | A `(initramfs)` shell |
| systemd | A required mount or service fails | **Emergency mode** or rescue mode on the console |

On a cloud server you don't see the console unless you ask for it. The server simply never answers SSH. AWS, Azure, and Google Cloud all offer a way to read the console output, and a serial console you can type into, for exactly this situation.

## Read · A server's boot story

```text
uname -r                    # the running kernel version
ls /boot                    # installed kernels (vmlinuz-*) and initramfs images (initrd.img-*)
cat /proc/cmdline           # the options GRUB passed to the kernel
systemctl get-default       # the target systemd boots towards

sudo dmesg -T | head -30    # the kernel's own messages, with readable times
journalctl -b               # everything logged since this boot
journalctl --list-boots     # earlier boots this machine remembers
journalctl -b -1 -p err     # errors only, from the previous boot
```

`journalctl -b -1` is the most useful line here. After an unexpected reboot, the end of the previous boot's log usually tells you why: an out-of-memory kill, a kernel error, or a clean shutdown someone requested.

**Try it.** Reboot the lab VM, reconnect, and confirm the journal now remembers two boots:

```text
sudo reboot
# wait a few seconds, then on your laptop:
multipass shell lab
journalctl --list-boots
```

## Timing · What made the boot slow

`systemd-analyze` breaks a boot down by stage and by service:

```text
systemd-analyze                  # time spent in firmware, loader, kernel, and userspace
systemd-analyze blame | head     # the slowest services
systemd-analyze critical-chain   # the chain of services the boot actually waited on
```

`blame` lists everything that took time, but services start in parallel, so a slow service doesn't always delay the boot. `critical-chain` shows only the path the boot waited on, which is where a fix actually helps.

## Configure · Kernels, GRUB, and targets

Kernel updates install alongside the old kernel rather than replacing it. If a new kernel fails, GRUB's menu can still boot the previous one. The new kernel only runs after a reboot, which is why `/var/run/reboot-required` appears after a kernel update.

GRUB's settings live in `/etc/default/grub`. After editing it, regenerate the real configuration. Never edit `/boot/grub/grub.cfg` directly, because the next update overwrites it:

```text
sudo update-grub                                # Ubuntu, Debian
sudo grub2-mkconfig -o /boot/grub2/grub.cfg     # RHEL, Rocky
```

systemd boots towards a **target**, a named group of services. Two special targets matter when things go wrong:

- **rescue.target:** a single-user system with filesystems mounted but no network services. For repairs.
- **emergency.target:** the bare minimum, with the root filesystem often read-only. Where systemd drops you when something essential, such as an `/etc/fstab` mount, fails.

To boot into one from the GRUB menu, edit the kernel line and add `systemd.unit=rescue.target`. Resetting a lost root password works the same way: on Ubuntu you boot with `init=/bin/bash`, on RHEL family systems with `rd.break`, then remount the root filesystem read-write and run `passwd`.

## Mounts · Why /etc/fstab can stop a boot

During boot, systemd mounts every filesystem listed in `/etc/fstab`. If a listed disk is missing, it waits (90 seconds by default), and then, unless the entry is marked `nofail`, it gives up and drops into emergency mode. On a cloud server, that means no network and no SSH: the server just looks dead.

```text
cat /etc/fstab
# device            mount point  type  options   dump  pass
# UUID=1b2c...      /            ext4  defaults  0     1
```

Each line names a device (preferably by `UUID=`, which stays the same even if disk names change), a mount point, a filesystem type, and options. [Storage & Filesystems](10-storage-and-filesystems.html) covers each field. For now, the rule that saves outages: **test every `/etc/fstab` change before you reboot**.

```text
sudo findmnt --verify     # checks every fstab line for problems
sudo mount -a             # actually tries to mount everything listed
```

If `mount -a` fails now, the next boot fails too.

## Break it, fix it · The reboot scheduled for tonight

A teammate added a mount for a new data disk and scheduled a reboot for 10 p.m. to apply a kernel update. Before they go home, they ask you to check that the server will come back. Reproduce their change, keeping a backup first:

```text
sudo cp /etc/fstab /etc/fstab.bak
echo "UUID=3f1c2a9e-7b4d-4e2a-9c1f-5d8e6a7b2c10 /data ext4 defaults 0 2" \
  | sudo tee -a /etc/fstab
```

Your job: decide whether the server would survive tonight's reboot, without rebooting it, and make it safe. Try it before opening a hint.

### Hint 1 · Where to look

- systemd mounts everything in `/etc/fstab` at boot. Ask two questions: does the device on the new line actually exist on this server, and what happens at boot if it doesn't?

### Hint 2 · Which tool

- `sudo findmnt --verify` and `sudo mount -a` test `/etc/fstab` without a reboot. `lsblk -f` lists the UUID of every disk that really is attached.

### Hint 3 · The cause and the fix

- **Cause:** no attached disk has that UUID. The volume was never attached, or the UUID was copied wrongly. At boot, systemd would wait for it, give up, and drop into emergency mode, with no SSH to get back in.
- **Fix:** remove the line (`sudo cp /etc/fstab.bak /etc/fstab`) until the disk really is attached. Then add it back with the UUID shown by `lsblk -f`, create the mount point with `sudo mkdir -p /data`, and run `sudo mount -a` to prove it works.
- **Prevent it:** add `nofail` to the options for data disks the system can boot without, for example `defaults,nofail`. Then a missing disk is logged, not fatal. And make `findmnt --verify` plus `mount -a` part of every fstab change.

### Implementation notes

- **If a cloud server does drop into emergency mode,** you have two options. Use the provider's serial console to fix `/etc/fstab` in place. Or stop the server, attach its root volume to a healthy "rescue" server, fix the file there, and move the volume back.
- **Know the previous boot's ending.** `journalctl -b -1 -n 50` after an unplanned reboot is the fastest way to tell a crash from a planned restart.
- **Keep at least one older kernel installed.** It's your way back if a new one panics. On Ubuntu, `apt autoremove` keeps the running kernel and the most recent ones.
- **Reboot one server at a time** after kernel updates, and check it's healthy before moving on to the next.

## Recap · Key terms

- **Firmware (UEFI or BIOS):** the code built into the machine that finds a disk to boot from.
- **GRUB:** the boot loader that chooses a kernel and the options it starts with.
- **initramfs:** a small temporary root filesystem that finds and mounts the real one.
- **PID 1 (systemd):** the first process; it starts everything else.
- **Target:** a named state systemd boots towards, such as `multi-user.target` or `rescue.target`.
- **Emergency mode:** the minimal shell systemd falls back to when something essential fails.
- **`nofail`:** an `/etc/fstab` option that lets the boot continue if that disk is missing.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: What's the job of the initramfs?
- Choosing which kernel to boot
* Finding and mounting the real root filesystem, then handing over to it
- Starting every service on the system
- Checking the hardware before anything else runs
= The kernel needs drivers and tools to reach the root disk. The initramfs carries them, mounts the real root, and hands over to systemd.
Q: Which command shows the services the boot actually waited on?
- `systemd-analyze blame`
* `systemd-analyze critical-chain`
- `journalctl --list-boots`
- `uname -r`
= `blame` lists everything that took time, but much of it ran in parallel. `critical-chain` shows the path that really determined when the boot finished.
Q: You changed `/etc/default/grub`. What do you run on Ubuntu so the change takes effect at the next boot?
- `sudo systemctl daemon-reload`
- Edit `/boot/grub/grub.cfg` to match
* `sudo update-grub`
- Nothing; GRUB reads the file at boot
= `update-grub` regenerates `grub.cfg` from your settings. Editing `grub.cfg` by hand is undone by the next kernel update.
S: A server rebooted unexpectedly overnight. What do you check first once it's back?
- `systemd-analyze` to see how long the boot took
* `journalctl -b -1`, the end of the previous boot's log
- `ls /boot` for new kernels
- `cat /etc/fstab`
= The last lines of the previous boot's log usually show why it ended: a kernel error, an out-of-memory kill, or a requested shutdown.
S: After a planned reboot, a cloud server never answers SSH again. Its console log ends in emergency mode, waiting on a disk. What's the most likely cause?
- The SSH key was rotated
- The kernel update failed
* An `/etc/fstab` entry for a disk that isn't attached, without `nofail`
- The firewall blocked port 22
= A missing required mount stops the boot at emergency mode, before networking and sshd start. Fix `/etc/fstab` from the serial console or from a rescue server.
```
