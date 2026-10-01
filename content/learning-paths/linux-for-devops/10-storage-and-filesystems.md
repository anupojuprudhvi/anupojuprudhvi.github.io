---
title: Storage, Filesystems & LVM
date: 2026-10-01
track: linux-for-devops
order: 10
module: 10
summary: Disks, partitions, filesystems, and mounts, and how to find what's filling a disk. Build an LVM volume and grow it while it's in use, then solve the classic puzzle where df says the disk is full but du can't find the files.
level: How Linux works · Hands-on lab
readingTime: 15 min read
stack: [lsblk, df, du, mount, fstab, LVM, ext4, lsof]
tags: [linux, storage, filesystems, lvm, fstab, disk-space, troubleshooting]
---

**In this module, you'll learn to:**

- Map disks, partitions, filesystems, and mount points with `lsblk`, `df`, and `findmnt`
- Find what's using disk space, and recognise when inodes run out instead
- Create an LVM volume, grow it without unmounting, and recover space held by deleted files

**Before you start:** finish [Files, Inodes & Permissions](03-files-and-permissions.html) and [The Boot Process](06-boot-process.html). Open a shell on your lab VM with `multipass shell lab`.

## Layers · From a disk to a directory

Storage on Linux is built in layers. Knowing which layer you're looking at is half of every storage problem.

```flow
title: The layers between a disk and a directory
Block device | a whole disk: /dev/sda or /dev/vda on most VMs, /dev/nvme0n1 on NVMe and newer cloud instances
-> divided into partitions, or handed to LVM
Partition or logical volume | /dev/sda1, or /dev/datavg/datalv
-> formatted with a filesystem
Filesystem | ext4 or xfs: organises inodes, directories, and data blocks
-> mounted at a directory
* Mount point | /data: where the filesystem appears in the single directory tree
```

```text
lsblk                  # disks and partitions, and where each is mounted
lsblk -f               # plus filesystem type, label, and UUID
findmnt                # every mount, as a tree
df -hT                 # space used and free per filesystem, with its type
```

**ext4** is the default on Ubuntu and Debian. **xfs** is the default on RHEL family systems and handles very large files well. One practical difference: ext4 can be shrunk, xfs can only grow.

## Space · What's filling the disk

`df` answers *how full is each filesystem*. `du` answers *which directories use the space*. Together they find almost every full disk:

```text
df -h                                          # which filesystem is full?
sudo du -xh --max-depth=1 / 2>/dev/null | sort -h | tail -8
                                               # biggest directories on that filesystem
sudo du -xh --max-depth=1 /var 2>/dev/null | sort -h | tail -8
                                               # then go one level deeper, and repeat
```

`-x` keeps `du` on one filesystem, so it doesn't wander into other mounts. The usual culprits are logs in `/var/log`, container images in `/var/lib/docker` or `/var/lib/containerd`, old kernels, and forgotten backups.

A filesystem can also run out of **inodes** while plenty of space remains, as [Files, Inodes & Permissions](03-files-and-permissions.html) explained. Every new file then fails with "No space left on device", even though `df -h` shows free space:

```text
df -i                  # inode use per filesystem; look for 100% IUse
```

## Mounts · Temporary and permanent

`mount` attaches a filesystem now; `/etc/fstab` attaches it at every boot.

```text
# device                                    mount point  type  options           dump pass
UUID=0a1b2c3d-1111-2222-3333-444455556666   /data        ext4  defaults,nofail   0    2
```

| Field | Meaning |
| --- | --- |
| Device | Which filesystem. `UUID=` is safest: disk names like `/dev/sdb` can change between boots |
| Mount point | The directory where it appears. It must already exist |
| Type | `ext4`, `xfs`, `nfs`, and so on |
| Options | `defaults`, plus extras such as `nofail` (boot even if it's missing), `noatime` (fewer writes), `ro` (read-only), `noexec` (no programs run from it) |
| Dump | Legacy backup flag; always `0` |
| Pass | The order `fsck` checks filesystems at boot: `1` for root, `2` for others, `0` to skip |

After any change: `sudo findmnt --verify` and `sudo mount -a`, before you reboot.

## LVM · Volumes you can grow while they're in use

**LVM** (Logical Volume Manager) puts a flexible layer between disks and filesystems. Disks become **physical volumes** (PVs), PVs are pooled into a **volume group** (VG), and you carve **logical volumes** (LVs) out of the pool. When a volume fills up, you add a disk to the pool and grow the volume, with the filesystem still mounted.

The lab uses **loop devices**, ordinary files that act as disks, so you can practise without attaching real ones:

```text
sudo apt install -y lvm2
truncate -s 1G ~/disk1.img ~/disk2.img
LOOP1=$(sudo losetup -f --show ~/disk1.img)
LOOP2=$(sudo losetup -f --show ~/disk2.img)
echo "$LOOP1 $LOOP2"

# One disk into a pool, one volume using all of it, an ext4 filesystem on top
sudo pvcreate "$LOOP1"
sudo vgcreate datavg "$LOOP1"
sudo lvcreate -n datalv -l 100%FREE datavg
sudo mkfs.ext4 /dev/datavg/datalv
sudo mkdir -p /mnt/data
sudo mount /dev/datavg/datalv /mnt/data
df -h /mnt/data                 # about 1 GB

# The volume is filling up: add the second disk and grow, while mounted
sudo pvcreate "$LOOP2"
sudo vgextend datavg "$LOOP2"
sudo lvextend -r -l +100%FREE /dev/datavg/datalv
df -h /mnt/data                 # about 2 GB, with no unmount and no downtime

sudo pvs; sudo vgs; sudo lvs    # the three layers, summarised
```

`-r` on `lvextend` resizes the filesystem in the same step. Without it, the volume grows but the filesystem inside doesn't, and `df` shows no change. Cloud disks work the same way: after enlarging an EBS volume, for example, you still grow the partition and the filesystem inside the server.

## Break it, fix it · Full disk, empty directory

Monitoring alerts that `/mnt/data` is about 80% full. Someone already deleted the big log file to free space, yet the alert hasn't cleared. Reproduce it on the volume from the lab:

```text
sudo dd if=/dev/zero of=/mnt/data/app.log bs=1M count=1500
sudo systemd-run --unit=applog bash -c 'exec 3>>/mnt/data/app.log; sleep infinity'
sudo rm /mnt/data/app.log

df -h /mnt/data            # still about 80% used
sudo du -sh /mnt/data      # almost nothing
```

Your job: explain the difference between the two numbers and get the space back. Try it before opening a hint.

### Hint 1 · Where to look

- Remember what deleting a file really does: it removes a name. Ask when the space behind that name is actually freed, and whether anything might still be using the file.

### Hint 2 · Which tool

- `sudo apt install -y lsof`, then `sudo lsof +L1`. It lists open files whose link count is below 1, meaning files that have been deleted but are still held open. Note the process, its PID, and the size.

### Hint 3 · The cause and the fix

- **Cause:** the `applog` service still has `app.log` open. Deleting the file removed its name, so `du`, which walks names, can't see it. But the inode and its 1.5 GB stay allocated until the last process closes it, and `df` reports the space as used.
- **Fix:** restart or stop whatever holds it, here `sudo systemctl stop applog`. `df` drops immediately. If you can't restart a critical service, you can empty the file through the process instead: `sudo truncate -s 0 /proc/<PID>/fd/3`, using the PID and descriptor number from `lsof`.
- **Prevent it:** don't delete logs that are in use. Truncate them (`sudo truncate -s 0 file`), or let logrotate rotate them and signal the service to reopen its log, which Part 3 covers.

When you're done, remove the lab volume:

```text
sudo umount /mnt/data
sudo lvremove -y datavg/datalv
sudo vgremove datavg
sudo pvremove "$LOOP1" "$LOOP2"
sudo losetup -d "$LOOP1" "$LOOP2"
rm ~/disk1.img ~/disk2.img
```

### Implementation notes

- **ext4 keeps 5% of space for root by default,** so a filesystem can look "full" to normal users while root can still write. That reserve is what lets you sign in and fix a full disk.
- **A filesystem that turns read-only on its own** usually means the kernel saw I/O errors and protected your data. Check `sudo dmesg -T` for disk errors before remounting it read-write.
- **Grow, don't move.** With LVM, or a cloud volume resize, growing a full disk is minutes of work with no downtime. Plan volumes so the data that grows sits on its own volume, not on the root disk.
- **Loop devices don't survive a reboot,** which is fine for a lab and why real volumes are real disks.

## Recap · Key terms

- **Block device:** a disk, or something that acts like one, such as `/dev/sda`.
- **Filesystem:** the structure on a device that holds inodes, directories, and data. ext4 and xfs are the common ones.
- **Mount point:** the directory where a filesystem appears in the tree.
- **`df` and `du`:** space per filesystem, and space per directory.
- **Inode exhaustion:** no inodes left for new files, while space remains.
- **LVM (PV, VG, LV):** disks pooled into a group and carved into volumes you can grow.
- **Deleted-but-open file:** a file with no name left, whose space stays used until the last process closes it.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: Why identify disks by `UUID=` in `/etc/fstab` instead of `/dev/sdb`?
- UUIDs mount faster
* Device names can change between boots; a filesystem's UUID doesn't
- `/dev/sdb` only works for xfs
- UUIDs are required for LVM
= Adding or removing a disk, or a different detection order, can rename `/dev/sdb`. The UUID belongs to the filesystem itself, so the right one is always mounted.
Q: What does `lvextend -r` do that plain `lvextend` doesn't?
- Reboots after resizing
- Removes the old volume
* Resizes the filesystem inside the volume in the same step
- Adds a new disk to the volume group
= Growing the volume only makes room. `-r` also grows the filesystem, so the new space actually shows up in `df`.
Q: `df -h` shows 40% used, but creating any new file fails with "No space left on device". What do you check?
- The page cache
* `df -i`, because the filesystem may have run out of inodes
- The swap usage
- The open-file limit
= Each file needs an inode, and a filesystem has a fixed number of them. Millions of tiny files can use them all while space remains.
S: `df` shows a filesystem at 95%, but `du` on it adds up to only 40%. What's the most likely cause?
- `du` is broken
- The filesystem is corrupt
* Deleted files are still held open by a running process
- The journal is using the space
= Space behind a deleted file is freed only when the last process closes it. `sudo lsof +L1` finds the holder, and restarting it frees the space.
S: The application's data volume is almost full, and it's on LVM with free disks available. How do you add space with no downtime?
- Unmount it, copy the data to a bigger disk, and remount it
* Add a disk to the volume group, then `lvextend -r` the volume while it stays mounted
- Delete the oldest files until there's room
- Create a new filesystem and move the app to it
= LVM grows the volume and the filesystem in place. ext4 and xfs both grow while mounted, so the application keeps running.
```
