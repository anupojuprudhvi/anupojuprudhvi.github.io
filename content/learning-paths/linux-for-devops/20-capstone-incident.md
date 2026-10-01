---
title: Capstone: An Incident with Three Unknown Faults
date: 2026-10-01
track: linux-for-devops
order: 20
module: 20
summary: Put the whole track together. Build a three-tier shop (nginx, a Python app, and PostgreSQL), save a snapshot, then inject three random faults you haven't seen. Restore service working from the outside in, find every root cause, prove it survives a reboot, and write a blameless postmortem.
level: Capstone · Incident simulation
readingTime: 18 min read
stack: [nginx, PostgreSQL, Python, systemd, nftables, Multipass]
tags: [linux, capstone, incident, troubleshooting, postmortem, nginx, postgresql]
---

**In this module, you'll learn to:**

- Build and run a small three-tier application on Linux
- Work a live incident with several overlapping faults, from the outside in, keeping a timeline
- Write a blameless postmortem that leads to real fixes

**Before you start:** finish Parts 1 to 4. Set aside about two hours. This lab uses a fresh VM, so nothing left over from earlier labs gets in the way.

## Scenario · The shop is down

You're on call for a small online shop. Every request goes through three tiers, all on one server for this exercise. In production they'd usually be separate servers, but the troubleshooting is the same.

```flow
title: The path of every request to the shop
group: Your laptop
Customer | curl http://<server>/
end
-> TCP port 80; any firewall must allow it (Modules 11, 12)
group: The server
nginx | the web tier: accepts the request and forwards it (Module 07)
-> proxy_pass to 127.0.0.1 port 5000
shop.service | the Python app, run by systemd as the user shop (Modules 07, 08)
-> connects to the database on 127.0.0.1 port 5432
* PostgreSQL | the database: answers "how many orders are there?" (Modules 09, 10)
end
```

## Build · Set up the stack

Create a fresh VM for the capstone and open a shell on it:

```text
multipass launch 24.04 --name capstone --cpus 2 --memory 2G --disk 10G
multipass shell capstone
```

Install the three tiers, and create the database with some orders in it:

```text
sudo apt install -y nginx postgresql python3-psycopg2

sudo -u postgres psql -c "CREATE ROLE app LOGIN PASSWORD 'lab-only-password';"
sudo -u postgres psql -c "CREATE DATABASE shop OWNER app;"
PGPASSWORD=lab-only-password psql -h 127.0.0.1 -U app -d shop -c \
  "CREATE TABLE orders (id serial PRIMARY KEY, item text);
   INSERT INTO orders (item) VALUES ('keyboard'), ('monitor'), ('cable');"
```

The application, and the service that runs it:

```text
sudo useradd --system --no-create-home --shell /usr/sbin/nologin shop
sudo mkdir -p /opt/shop
sudo tee /opt/shop/app.py <<'EOF'
import http.server, os
import psycopg2

DB = dict(host=os.environ.get("DB_HOST", "127.0.0.1"), dbname="shop", user="app",
          password=os.environ["DB_PASSWORD"], connect_timeout=3)

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            conn = psycopg2.connect(**DB)
            try:
                cur = conn.cursor()
                cur.execute("SELECT count(*) FROM orders")
                body, status = f"orders: {cur.fetchone()[0]}\n".encode(), 200
            finally:
                conn.close()
        except Exception as e:
            print(f"database error: {e}", flush=True)
            body, status = b"database unavailable\n", 500
        self.send_response(status)
        self.end_headers()
        self.wfile.write(body)

http.server.ThreadingHTTPServer(("127.0.0.1", 5000), Handler).serve_forever()
EOF

sudo tee /etc/systemd/system/shop.service <<'EOF'
[Unit]
Description=Shop app
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
User=shop
Environment=DB_PASSWORD=lab-only-password
ExecStart=/usr/bin/python3 /opt/shop/app.py
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now shop
curl -s localhost:5000          # orders: 3
```

The web tier:

```text
sudo tee /etc/nginx/sites-available/shop <<'EOF'
server {
    listen 80 default_server;
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_connect_timeout 3s;
        proxy_read_timeout 10s;
    }
}
EOF
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/shop /etc/nginx/sites-enabled/shop
sudo nginx -t && sudo systemctl reload nginx

curl -s localhost/              # orders: 3, through nginx
ip -br addr                     # note the VM's address
```

From your laptop, `curl http://<capstone-ip>/` should also return `orders: 3`. That's the definition of "working" for the rest of this module.

The password in the unit file keeps the lab simple. In production it would come from a secret store, never from a file in Git.

## Snapshot · Save the known-good state

```text
# On your laptop
multipass stop capstone
multipass snapshot capstone --name ready
multipass start capstone
```

You can now break the stack as often as you like and return here with `multipass restore --destructive capstone.ready`.

## Incident · Three faults you haven't seen

This script picks three faults at random from a set of six, and applies them silently. **Don't read it before you've finished.** The point is to diagnose from symptoms, the way you would on call.

```text
cat > ~/break.sh <<'EOF'
#!/bin/bash
# Capstone fault injector. Run it, but don't read it until you've finished.
set -euo pipefail
f1() { sed -i 's|127.0.0.1:5000|127.0.0.1:5001|' /etc/nginx/sites-available/shop; systemctl reload nginx; }
f2() { mkdir -p /etc/systemd/system/shop.service.d
       printf '[Service]\nEnvironment=DB_HOST=127.0.0.2\n' > /etc/systemd/system/shop.service.d/50-db.conf
       systemctl daemon-reload; systemctl restart shop; }
f3() { sudo -u postgres psql -qc "ALTER ROLE app CONNECTION LIMIT 0;"; }
f4() { systemctl stop nginx; systemd-run --quiet --unit=legacy-health nc -lk 80; }
f5() { nft add table inet capstone
       nft add chain inet capstone input '{ type filter hook input priority 0; policy accept; }'
       nft add rule inet capstone input iifname != "lo" tcp dport 80 drop; }
f6() { systemctl disable --now postgresql >/dev/null 2>&1; }
for f in $(printf '%s\n' f1 f2 f3 f4 f5 f6 | shuf -n 3 | sort); do "$f"; done
echo "Three faults injected. Users report the shop is down. Start your timeline: $(date +%T)"
EOF

sudo bash ~/break.sh
```

**The rules:**

1. **Keep a timeline** in a text file as you go: the time, what you checked, what it showed, and what you changed.
2. **Work from the outside in**, the way a request travels: laptop, port 80, nginx, the app, the database. Prove each layer works before moving to the next.
3. **After every fix, test again from your laptop.** There are three faults, and fixing one often just reveals the next.
4. **You're done when** `curl http://<capstone-ip>/` from your laptop returns `orders: 3`, **and** it still does after `sudo reboot`. A fix that doesn't survive a reboot isn't a fix.

Work it now. Use the hints only when you're stuck.

### Hint 1 · Where to look

- Start from your laptop. A timeout, an immediate refusal, a hang after connecting, a `502 Bad Gateway`, and a `500` with "database unavailable" each point to a different layer. Then repeat the request on the server itself with `curl -sv localhost/`, and compare.
- Use the method from [A Troubleshooting Method](13-troubleshooting-method.html): one hypothesis at a time, one change at a time, everything written down.

### Hint 2 · Which tool

- **Network path:** `curl -v -m 5 http://<capstone-ip>/` from the laptop; on the server, `sudo ss -tlnp` (who owns port 80?) and `sudo nft list ruleset`.
- **nginx:** `systemctl status nginx`, `sudo nginx -t`, `sudo tail -20 /var/log/nginx/error.log`, and the `proxy_pass` line in `/etc/nginx/sites-available/shop`.
- **The app:** `systemctl status shop`, `journalctl -u shop -n 20`, `systemctl cat shop` (look for drop-ins), and `curl -s localhost:5000` to skip nginx.
- **The database:** `systemctl status postgresql`, `pg_lsclusters`, `systemctl is-enabled postgresql`, and a direct test: `PGPASSWORD=lab-only-password psql -h 127.0.0.1 -U app -d shop -c 'SELECT 1'`.

### Hint 3 · The six possible faults and their fixes

- **Wrong upstream port (f1):** nginx returns `502`, and its error log shows connections refused to `127.0.0.1:5001`. Fix the `proxy_pass` port back to `5000`, then `sudo nginx -t && sudo systemctl reload nginx`.
- **App pointed at the wrong database address (f2):** the app returns `500`, and its journal shows "connection refused" to `127.0.0.2`. `systemctl cat shop` reveals the drop-in. Remove `/etc/systemd/system/shop.service.d/50-db.conf`, then `sudo systemctl daemon-reload && sudo systemctl restart shop`.
- **Database role locked out (f3):** the app's journal shows "too many connections for role app", even with no connections open. Fix: `sudo -u postgres psql -c "ALTER ROLE app CONNECTION LIMIT -1;"`.
- **Port 80 taken by another process (f4):** requests connect and then hang; nginx is stopped and won't start, with "Address already in use". `sudo ss -tlnp` shows `nc` on port 80. Fix: `sudo systemctl stop legacy-health`, then `sudo systemctl start nginx`.
- **Firewall dropping outside traffic (f5):** the laptop times out while `curl localhost/` on the server works. `sudo nft list ruleset` shows the `capstone` table. Fix: `sudo nft delete table inet capstone`.
- **Database stopped and disabled (f6):** the app's journal shows "connection refused" to `127.0.0.1:5432`. Fix: `sudo systemctl enable --now postgresql`. The `enable` matters: without it, the outage comes back at the next reboot.

When you've finished, reboot and test once more. Then restore the snapshot and run `break.sh` again: with six faults and three chosen at random, there are 20 different incidents to practise on.

## Postmortem · Write it down, without blame

An incident isn't finished when service is back. It's finished when you understand why it happened and have made it less likely to happen again. A **blameless postmortem** focuses on how the system allowed the failure, not on who made a mistake, because people share what really happened only when they aren't afraid of being blamed for it.

Write one for your incident, using your timeline:

```markdown
# Postmortem: Shop outage, <date>

## Summary
Two or three sentences: what broke, for how long, and how it was fixed.

## Impact
Who was affected, how, and for how long. Use numbers where you have them.

## Timeline (all times local)
| Time  | Event                                      |
| ----- | ------------------------------------------ |
| 14:02 | Faults injected; shop unreachable          |
| 14:05 | Laptop curl times out; on-server curl OK   |
| ...   | ...                                        |

## Root causes
Each fault: what it was, how it was found, and how it was fixed.

## Detection
How did we find out? How could monitoring have told us sooner?

## What went well, and what didn't

## Action items
| Action                                         | Owner | Due   |
| ---------------------------------------------- | ----- | ----- |
| Alert on nginx 5xx rate from outside the server |       |       |
```

Good action items are specific and checkable: "add an external HTTP check that alerts within 2 minutes", not "be more careful".

### Implementation notes

- **Restore service first, then dig.** If a rollback or restart brings customers back, do it, capture evidence first if it takes seconds, and find the root cause afterwards.
- **One person changes things, everyone else watches.** In a real incident with several people, uncoordinated changes create new faults faster than you can find the old ones.
- **Communicate on a schedule.** A short update every 15 to 30 minutes ("still investigating; the database is ruled out") stops people interrupting the person fixing it.
- **Test from where customers are.** One of the six faults looks completely fine from the server itself, and in real incidents that kind of fault is common.

## Recap · Key terms

- **Three-tier application:** a web tier, an application tier, and a database tier.
- **Outside-in troubleshooting:** following the request's path from the client, proving each layer in turn.
- **Reverse proxy:** a server, here nginx, that accepts requests and forwards them to an application.
- **502 versus 500:** the proxy couldn't reach the app, versus the app answered with its own error.
- **Persistent fix:** a fix that survives a reboot, such as `enable`, files in `/etc`, and saved rules.
- **Blameless postmortem:** a write-up of what happened, why, and what changes, without assigning blame.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: nginx returns `502 Bad Gateway`. Which layer do you look at first?
- The customer's network
* The connection from nginx to the app: is the app up, and is nginx pointing at the right address and port?
- The database's disk space
- The TLS certificate
= 502 means nginx itself works, but it couldn't get a valid response from the upstream it forwards to. The nginx error log names the exact upstream address it tried.
Q: Why test from outside the server, not only with `curl localhost` on it?
- `localhost` is slower
* Some faults, such as a firewall rule or a service bound to `127.0.0.1`, only affect traffic arriving from outside
- `curl` behaves differently on servers
- It doesn't matter where you test from
= `localhost` skips the network path, so it can't see a firewall drop or a wrong listen address. Customers come from outside, so the final test must too.
Q: What makes a postmortem "blameless"?
- It doesn't mention any changes that were made
- It's written by someone who wasn't involved
* It focuses on how the system allowed the failure, so people share what really happened without fear
- It has no action items
= Blame makes people hide details, and the details are what prevent the next incident. The question is "what let this happen?", not "who did it?".
S: You've restored the shop by starting PostgreSQL with `systemctl start`. Is the incident over?
- Yes, the shop works
* Not yet; check it's enabled too, or it will be down again after the next reboot
- Only after a full restore from backup
- Only after reinstalling PostgreSQL
= `start` runs it now; `enable` makes it start at boot. The reboot test catches exactly this kind of half-fix.
S: Halfway through an incident, two engineers are both changing configuration on the same server. What do you do?
- Let them continue; two people are faster
* Agree that one person makes changes while the other investigates and records, and announce every change
- Restore yesterday's backup
- Reboot the server so they start from a clean state
= Uncoordinated changes cause new faults and make it impossible to tell which change fixed what. One person changes things, everyone else watches and keeps the timeline.
```
