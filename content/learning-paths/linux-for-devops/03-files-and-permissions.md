---
title: Files, Inodes & Permissions
date: 2026-10-01
track: linux-for-devops
order: 3
module: 3
summary: Where things live on a Linux system, what a file really is underneath its name, and exactly how read, write, and execute work on files and on directories. Build a shared team folder, then fix a "Permission denied" that chmod 777 can't fix.
level: Foundations · Core concept
readingTime: 14 min read
stack: [Ubuntu 24.04, chmod, chown, setfacl, stat, namei]
tags: [linux, permissions, filesystem, inodes, acl, basics]
---

**In this module, you'll learn to:**

- Find your way around the standard Linux directory layout
- Explain inodes, hard links, and symbolic links, and what deleting a file really does
- Read and set permissions, including the special bits and ACLs, and diagnose "Permission denied"

**Before you start:** finish [Shell Survival](01-shell-survival.html). Open a shell on your lab VM with `multipass shell lab`.

## Map · Where things live

Every Linux system follows roughly the same layout, so once you know it you can find your way around any server. These directories cover most of what you'll touch:

| Path | What lives there | You'll go there to |
| --- | --- | --- |
| `/etc` | System and application configuration | Change how a service behaves |
| `/var/log` | Log files | Find out what happened |
| `/var/lib` | Application state: databases, package lists, container images | See what's using disk space |
| `/home`, `/root` | Users' home directories, and root's | Find user files and SSH keys |
| `/tmp` | Temporary files; on Ubuntu they're cleared at boot | Scratch work, never anything important |
| `/usr/bin`, `/usr/sbin` | Programs installed by the package manager | Check which version of a tool is installed |
| `/usr/local`, `/opt` | Software installed by hand, outside the package manager | Find what someone installed themselves |
| `/proc`, `/sys` | Live views of the kernel and processes, not real files on disk | Inspect running processes and hardware |
| `/dev` | Devices such as disks (`/dev/sda`) and `/dev/null` | Work with disks |
| `/boot` | The kernel and boot loader files | Rarely, and carefully |

Linux treats almost everything as a file: devices, kernel settings, even running processes. The first character of `ls -l` output tells you which kind you're looking at: `-` for a regular file, `d` a directory, `l` a symbolic link, `c` or `b` a device, `s` a socket, `p` a pipe.

## Inside · What a file really is

A file name is just a label. The file itself is an **inode**: a record that holds the file's owner, permissions, size, timestamps, and where its data sits on the disk. A directory is a list that maps names to inode numbers.

```text
echo "hello" > notes.txt
ls -i notes.txt          # the inode number
stat notes.txt           # everything the inode holds

ln notes.txt hard.txt    # a hard link: a second name for the SAME inode
ln -s notes.txt soft.txt # a symbolic link: a small file holding a path
ls -li notes.txt hard.txt soft.txt

rm notes.txt
cat hard.txt             # still works: the inode still has a name
cat soft.txt             # fails: the path it points to is gone
```

Two facts here explain real incidents later in this track:

- **Deleting a file removes a name, not the data.** The space is freed only when no names point to the inode *and* no running program has the file open. That's why deleting a huge log that a service is still writing to doesn't free any disk space.
- **A disk has a fixed number of inodes, as well as a fixed amount of space.** Millions of tiny files can use up every inode while `df -h` still shows free space. `df -i` shows inode usage.

## Permissions · Who can do what

Every file and directory has an **owner**, a **group**, and three sets of permissions: for the owner (`u`), for members of the group (`g`), and for everyone else (`o`).

```text
ls -l notes.txt
-rw-r----- 1 ubuntu devteam 6 Oct  1 10:00 notes.txt
 └┬┘└┬┘└┬┘   └─┬──┘ └──┬──┘
  u  g  o    owner   group
```

Each set is some combination of **r** (read), **w** (write), and **x** (execute). Permissions are often written as numbers, where r = 4, w = 2, and x = 1, added up for each set. So `rw-r-----` is 6, 4, 0, written `640`.

```text
chmod 640 notes.txt          # owner rw, group r, others nothing
chmod u+x script.sh          # add execute for the owner
chmod g-w,o-r report.txt     # remove group write and others' read
sudo chown alice notes.txt   # change the owner
sudo chown alice:devteam notes.txt   # change owner and group
```

**On a directory, the same letters mean something different**, and this is where most confusion comes from:

| Permission | On a file | On a directory |
| --- | --- | --- |
| r | Read the contents | List the names inside |
| w | Change the contents | Create, delete, or rename entries, including other people's files |
| x | Run it as a program | Enter it and reach anything inside it, also called traversing |

To open `/srv/reports/2026/q3.txt`, you need `x` on `/`, `/srv`, `/srv/reports`, and `/srv/reports/2026`, as well as `r` on the file itself. One missing `x` anywhere along the path blocks you, whatever the file's own permissions say. Root skips all of these checks.

New files get their starting permissions from your **umask**, a set of bits to remove. Run `umask` to see yours. On Ubuntu it's usually `0002` for regular users, which gives new files `664` and new directories `775`.

## Special bits · setuid, setgid, and sticky

Three extra bits handle cases the basic permissions can't:

- **setuid** on a program: it runs as the file's owner, not as you. `ls -l /usr/bin/passwd` shows `rws`, which is how a normal user can change their own password in a file only root can write.
- **setgid** on a directory: new files inside get the directory's group, not the creator's. This is the key to shared team folders.
- **sticky bit** on a directory: only a file's owner can delete it, even if everyone can write to the directory. `ls -ld /tmp` shows `drwxrwxrwt`; the `t` is the sticky bit.

When owner, group, and other aren't enough, for example "everyone in the group, plus one auditor who can only read", use an **ACL** (access control list). A `+` at the end of the permissions in `ls -l` means a file has one.

## Lab · Build a shared team folder

Set up a folder where everyone in a team can create and edit files, and nobody else can see in:

```text
# A team group and two users in it
sudo groupadd devteam
sudo useradd -m -s /bin/bash -G devteam alice
sudo useradd -m -s /bin/bash -G devteam bob

# The folder: owned by the group, and setgid (the 2 in 2770)
sudo mkdir /srv/team
sudo chown root:devteam /srv/team
sudo chmod 2770 /srv/team

# A default ACL: every new file is group-writable, whatever each user's umask
sudo apt install -y acl
sudo setfacl -d -m g:devteam:rwx /srv/team

# Test it: alice creates a file, and bob can edit it
sudo -u alice touch /srv/team/plan.txt
sudo -u bob sh -c 'echo "bob was here" >> /srv/team/plan.txt'
ls -l /srv/team
getfacl /srv/team/plan.txt

# Everyone else is kept out
ls /srv/team
```

The last command fails for `ubuntu`, which isn't in `devteam`. That's the point: the folder is private to the team.

## Break it, fix it · Permission denied, with 777

Someone reports they can't read a quarterly report. They've already tried `chmod 777` on the file, and it didn't help. Set up the same situation:

```text
sudo mkdir -p /srv/reports/2026
echo "Q3 numbers" | sudo tee /srv/reports/2026/q3.txt
sudo chmod 777 /srv/reports/2026/q3.txt
sudo chmod 700 /srv/reports

# As your normal user:
ls -l /srv/reports/2026/q3.txt
cat /srv/reports/2026/q3.txt
```

Your job: let normal users read the report, without making anything world-writable. Try it before opening a hint.

### Hint 1 · Where to look

- The file's own permissions are only one of the checks. Think about everything the system has to pass through to reach the file.

### Hint 2 · Which tool

- `namei -l /srv/reports/2026/q3.txt` lists the owner and permissions of every directory on the path, one per line. Look for a directory where "others" don't have `x`.

### Hint 3 · The cause and the fix

- **Cause:** `/srv/reports` is `700`, so only root can enter it. Without `x` on that directory, no one else can reach anything inside it, whatever the file's own permissions are.
- **Fix:** `sudo chmod 755 /srv/reports`. Then put the file back to something sensible: `sudo chmod 644 /srv/reports/2026/q3.txt`. If people should reach the file but not list the directory, `711` gives traverse without read.
- **Prevent it:** never "fix" permissions with `777`. It hides the real cause and lets anyone change the file. Check the whole path with `namei -l` first. On some systems the same error can also come from a filesystem mounted `noexec` or from SELinux, which Part 4 of this track covers.

### Implementation notes

- **Use groups, not 777.** If several people need access, put them in a group and give the group the permission.
- **A new group membership needs a new session.** After `usermod -aG devteam alice`, alice must sign out and in again before `id` shows the group.
- **Know which files must stay private.** SSH refuses keys whose files other people can read, and many services refuse world-readable secrets. The next module shows what that looks like.
- **`ls -ld` shows a directory's own permissions.** Plain `ls -l` lists what's inside it instead.

## Recap · Key terms

- **Inode:** the record behind a file name: owner, permissions, size, and where the data is.
- **Hard link and symbolic link:** a second name for the same inode, or a small file pointing to a path.
- **Permission bits:** r, w, and x for the owner, the group, and others, often written as numbers like `640`.
- **Traverse:** passing through a directory, which needs `x` on it.
- **umask:** the bits removed from a new file's permissions.
- **setuid, setgid, sticky bit:** run as the owner; inherit the directory's group; only owners can delete.
- **ACL:** extra permission entries for specific users or groups.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: What does the `x` permission allow on a directory?
- Running the files inside it as programs
* Entering it and reaching anything inside it
- Listing the names of the files inside it
- Deleting it
= On a directory, `x` means traverse: you can pass through it to reach what's inside. Listing the names is `r`, and creating or deleting entries is `w`.
Q: What does `chmod 640 file` set?
* Owner read and write, group read, others nothing
- Owner read, group read and write, others nothing
- Everyone can read, only the owner can write
- Owner everything, group read, others nothing
= Each digit is r = 4, w = 2, x = 1 added together: 6 = rw for the owner, 4 = r for the group, 0 = nothing for others.
Q: You delete the original file. Which link stops working?
- The hard link
* The symbolic link
- Both
- Neither
= A hard link is another name for the same inode, so the data is still there. A symbolic link stores a path, and that path no longer exists.
S: You wrote `deploy.sh` and you own it, but `./deploy.sh` says "Permission denied". What's the fix?
- `sudo ./deploy.sh`
- `chmod 777 deploy.sh`
* `chmod u+x deploy.sh`
- Move it to `/tmp`
= New files are created without execute permission. `u+x` lets the owner run it, without opening it up to everyone the way `777` does.
S: `/tmp` is writable by everyone, yet a user can't delete another user's file in it. Why?
- `/tmp` is read-only
* The sticky bit on `/tmp` lets only a file's owner delete it
- The file is a symbolic link
- The user needs `x` on the file
= The `t` in `drwxrwxrwt` is the sticky bit. Everyone can create files in `/tmp`, but only the owner of a file (or root) can delete or rename it.
```
