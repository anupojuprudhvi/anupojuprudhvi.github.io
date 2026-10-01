---
title: Text Processing: grep, awk, sed, and Friends
date: 2026-10-01
track: linux-for-devops
order: 2
module: 2
summary: Logs, configs, and command output are all text, so the fastest way to answer questions on a server is to filter, count, and reshape text. Learn grep, awk, sed, sort, and uniq on a web server log, then find, xargs, and jq.
level: Foundations · Hands-on lab
readingTime: 13 min read
stack: [grep, awk, sed, sort, uniq, find, xargs, jq]
tags: [linux, grep, awk, sed, logs, text-processing, basics]
---

**In this module, you'll learn to:**

- Search files and output with `grep`, and pull out columns with `awk` and `cut`
- Count and rank anything with `sort | uniq -c | sort -rn`
- Edit text in a stream with `sed`, find files with `find`, and read JSON with `jq`

**Before you start:** finish [Shell Survival](01-shell-survival.html), especially pipes and exit codes. Open a shell on your lab VM with `multipass shell lab`.

## Principle · Small tools, joined by pipes

During an incident, the questions are urgent and specific: *which client is hammering us? When did the errors start? Which page is failing?* The answers are in logs, and logs are text. Linux gives you a set of small tools that each do one job: search, cut out a column, sort, count. Join them with pipes and you can answer almost any question in one line, on any server, with nothing to install.

```flow
title: Ranking the busiest clients in a web server log
access.log | one line per request: client IP, time, path, status code, size
-> awk '{print $1}' keeps only the first column, the client IP
sort | puts identical IPs next to each other
-> uniq -c collapses each run of identical lines into one, with a count
sort -rn | orders by that count, highest first
-> head -5
* The top 5 clients | answered in one line, on any server
```

## Setup · A web server log to work with

This loop writes 500 lines in the standard web server log format, with a realistic mix of status codes:

```text
for i in $(seq 1 500); do
  ip="10.0.0.$(( RANDOM % 20 + 1 ))"
  r=$(( RANDOM % 100 ))
  if   [ $r -lt 85 ]; then code=200
  elif [ $r -lt 92 ]; then code=404
  elif [ $r -lt 95 ]; then code=500
  elif [ $r -lt 98 ]; then code=502
  else code=503; fi
  path=$(shuf -n1 -e /api/orders /api/users /login /health)
  printf '%s - - [01/Oct/2026:10:%02d:%02d +0000] "GET %s HTTP/1.1" %s %s "-" "curl/8.5.0"\n' \
    "$ip" $(( i / 60 % 60 )) $(( i % 60 )) "$path" "$code" $(( RANDOM % 5000 + 200 ))
done > access.log

head -3 access.log
```

Each line splits on spaces into numbered **fields**. Field 1 is the client IP, field 4 starts with the time, field 7 is the path, field 9 is the status code, and field 10 is the response size in bytes.

## Search · grep finds lines

`grep` prints every line that matches a pattern. It's the tool you'll use most.

```text
grep "/login" access.log            # lines containing /login
grep -c "/login" access.log         # just count them
grep -v "/health" access.log        # lines NOT matching (hide noise)
grep -i "error" /var/log/cloud-init.log   # ignore upper/lower case
grep -n "Port" /etc/ssh/sshd_config # show line numbers
grep -r "PasswordAuthentication" /etc/ssh/   # search a whole directory
grep -E "/login|/api/users" access.log       # either pattern (extended regex)
```

A pattern is a **regular expression**, where some characters have special meanings. `.` matches any character, `^` anchors to the start of a line, `$` to the end, and `[0-9]` matches one digit. So `grep "^10.0.0.7 "` finds lines that *start* with that IP. Without the `^` and the trailing space, it would also match `10.0.0.17`.

## Extract · awk works in columns

`awk` reads each line, splits it into fields `$1`, `$2`, and so on, and lets you print or test them. Testing a field is far more precise than searching for text anywhere in the line.

```text
awk '{print $1}' access.log              # just the client IPs
awk '{print $9, $7}' access.log          # status code and path
awk '$9 == 404' access.log               # only lines whose status is 404
awk '$9 >= 500 {print $7}' access.log    # paths that returned a server error
awk '{sum += $10} END {print sum}' access.log   # total bytes sent

cut -d: -f1 /etc/passwd                  # cut: simpler, one delimiter
```

## Count · The pattern you'll use every week

`sort | uniq -c | sort -rn` turns any list into a ranked count. Learn it once and use it everywhere.

```text
# Busiest clients
awk '{print $1}' access.log | sort | uniq -c | sort -rn | head -5

# How many of each status code?
awk '{print $9}' access.log | sort | uniq -c | sort -rn

# Which paths fail with server errors most?
awk '$9 >= 500 {print $7}' access.log | sort | uniq -c | sort -rn

# Requests per minute, to see when a spike started
awk '{print substr($4, 2, 17)}' access.log | uniq -c | head

wc -l access.log                         # how many lines in total
```

`uniq` only merges *neighbouring* identical lines, which is why `sort` always comes first. The per-minute count skips the sort because the log is already in time order.

## Edit · sed changes text as it streams past

`sed` applies an edit to every line on its way through. The most common edit is substitution, `s/old/new/`:

```text
# Hide IP addresses before sharing a log with someone
sed -E 's/^10\.0\.0\.[0-9]+/[ip]/' access.log | head -3

sed -n '10,15p' access.log       # print only lines 10 to 15

# Edit a file in place, keeping a backup copy as file.bak first
cp /etc/hostname myhost.txt
sed -i.bak 's/lab/lab-01/' myhost.txt
cat myhost.txt myhost.txt.bak
```

`sed -i` rewrites the file with no undo. On real servers, use `-i.bak` or copy the file first. Better still, change config files through automation such as Ansible, which you'll meet in Part 4.

## Find · find locates files, xargs acts on them

```text
find /var/log -name "*.log"                  # by name
find /var/log -name "*.log" -mtime -1        # changed in the last day
sudo find / -type f -size +100M 2>/dev/null  # big files: who filled the disk?
find /tmp -name "*.tmp" -mtime +7 -delete    # clean up old temp files

# Pass the files to another command
find /etc -name "*.conf" | xargs grep -l "Port"

# -print0 and -0 keep file names with spaces in one piece
find . -name "*.txt" -print0 | xargs -0 wc -l
```

## JSON · jq for modern tools

Cloud CLIs, Kubernetes, and many APIs output JSON, which `grep` and `awk` handle badly. `jq` is the `awk` of JSON:

```text
sudo apt install -y jq

# ip -j prints the network configuration as JSON
ip -j addr | jq '.[].ifname'                      # every interface name
ip -j addr | jq -r '.[] | "\(.ifname) \(.addr_info[0].local)"'
```

`-r` prints plain text instead of quoted JSON strings, which is what you want when the result goes into another command.

## Break it, fix it · The dashboard that missed most of the errors

A teammate's script reports how many server errors happened in the last hour. Today it says only a handful, but users are reporting lots of failed requests. Create their script and run it against your log:

```text
cat > errors.sh <<'EOF'
#!/bin/bash
set -euo pipefail
count=$(grep -c ' 500 ' access.log)
echo "Server errors: $count"
EOF

chmod +x errors.sh
./errors.sh
```

Your job: find out why the number is too low, and rewrite the count so it's correct. Try it before opening a hint.

### Hint 1 · Where to look

- "Server error" covers every status code from 500 to 599, not just 500. Look at which status codes actually appear in the log, and compare them with what the pattern can match.

### Hint 2 · Which tool

- `awk '{print $9}' access.log | sort | uniq -c` lists every status code with its count. Then ask: which of these does the text `' 500 '` match?

### Hint 3 · The cause and the fix

- **Cause:** the pattern only matches the exact text ` 500 `, so every 502 (bad gateway) and 503 (service unavailable) is missed. Those are usually the most common errors when a backend is down. Worse, a response that happens to be exactly 500 bytes would be counted wrongly, because the size field matches too.
- **Fix:** test the status *field* instead of searching the whole line: `count=$(awk '$9 >= 500 && $9 <= 599' access.log | wc -l)`.
- **Prevent it:** match fields, not text that can appear anywhere in a line. Then check the result against a breakdown such as `sort | uniq -c` before you trust a number on a dashboard.

### Implementation notes

- **Test a pattern on a sample before trusting a count.** Run `grep` without `-c` first and look at a few matching lines.
- **Logs can be huge.** Filter first with `grep` or `awk`, then sort. Sorting a multi-gigabyte file before filtering it is slow, and it uses a lot of disk space for temporary files.
- **Compressed logs:** rotated logs end in `.gz`. `zgrep` and `zcat` read them without unpacking them first.
- **Share logs with care.** Mask IP addresses, user names, and tokens with `sed` before pasting a log into a ticket or a chat.

## Recap · Key terms

- **Regular expression (regex):** a pattern language for matching text. `^` is the start of a line, `$` the end, `.` any character.
- **Field:** one column of a line, numbered `$1`, `$2`, and so on in `awk`.
- **`sort | uniq -c | sort -rn`:** turns any list into a ranked count.
- **Stream editing:** `sed` changes text as it passes through. `-i` writes the change back to the file.
- **xargs:** turns a list of names into arguments for another command.
- **jq:** filters and reshapes JSON on the command line.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: Why does `uniq -c` usually need `sort` in front of it?
- `uniq` only works on numbers
* `uniq` only merges identical lines that are next to each other
- `sort` removes blank lines that would break `uniq`
- It doesn't; the order of the two makes no difference
= `uniq` compares each line only with the one before it. Sorting first puts every identical line together, so each value gets one total count.
Q: In a standard web server log line, how do you print only the client IP?
* `awk '{print $1}' access.log`
- `grep -o ip access.log`
- `sed 's/ip//' access.log`
- `cut access.log`
= `awk` splits each line on spaces, and the client IP is the first field, `$1`.
Q: What's the safest way to change a value in a config file with `sed`?
- `sed 's/old/new/' file`, then check the screen
* `sed -i.bak 's/old/new/' file`, which keeps a backup copy first
- `sed -i 's/old/new/' file`, which is reversible
- Delete the file and type it out again
= `-i` edits the file in place with no undo. `-i.bak` saves the original as `file.bak` first, so a bad edit is easy to roll back.
S: The disk on a server is nearly full and you need to find what's taking the space. Which command helps most?
- `grep -r big /`
* `sudo find / -type f -size +100M 2>/dev/null`
- `ls -la /`
- `cat /var/log/*`
= `find` with `-size` lists every large file anywhere on the disk. `2>/dev/null` hides "permission denied" noise from the directories it can't read.
S: An outage began a few minutes ago. How do you find out when the errors started, from the web server log?
- `tail -n 1 access.log`
- `grep -c 500 access.log`
* Filter for error status codes, then count lines per minute
- Restart the web server and watch the log
= `awk '$9 >= 500 {print substr($4, 2, 17)}' access.log | uniq -c` shows server errors per minute. The first minute where the count jumps is when the incident started.
```
