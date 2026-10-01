---
title: Why Kubernetes Exists, Starting from a Single Container
date: 2026-10-01
track: kubernetes-operations
order: 1
module: 1
summary: Start here if Kubernetes is new to you. What a container is, in five minutes, then the problems that appear once you run many containers across many machines, and how Kubernetes solves them. Plus an honest look at when you don't need it.
level: Basics · Start here
readingTime: 10 min read
stack: [Containers, Docker, Kubernetes]
tags: [kubernetes, containers, docker, basics, beginner]
---

**In this module, you'll learn to:**

- Explain what an image, a container, and a registry are
- Name the problems that appear when you run many containers on many machines
- Describe what Kubernetes does about each one, and when you don't need it

**Before you start:** nothing. You only need to be comfortable typing commands into a terminal. Every other idea in this track is explained when it first comes up.

## Containers · The five-minute version

Kubernetes runs **containers**, so start there. A container is your application packaged together with everything it needs to run: the runtime (Python, Java, Node.js), libraries, and config files. Because it carries all of that with it, it runs the same way on your laptop, on a test server, and in production. "It works on my machine" stops being a problem.

Three words cover most of it:

- **Image:** the package. A read-only snapshot of your app and its dependencies, built once from a recipe called a **Dockerfile**.
- **Container:** a running copy of an image. You can start many containers from one image, and each is isolated from the others.
- **Registry:** where images are stored and shared, such as Docker Hub or Amazon ECR. Servers pull images from a registry, the way a phone downloads an app from a store.

```dockerfile
# A Dockerfile: the recipe for an image
# Start from an image that already has Python
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
# The app listens on port 8080
EXPOSE 8080
# What runs when the container starts
CMD ["python", "app.py"]
```

```flow
title: From source code to a running container
Dockerfile and code | the recipe and your application
-> docker build
Image orders-api:1.4 | a read-only package, built once
-> docker push
* Registry | stores the image so any machine can pull it
-> docker run, on any machine with a container runtime
Container | a running, isolated copy of the image
```

If you've never run a container, install **Docker Desktop** (or Docker Engine on Linux) and try `docker run -p 8080:80 nginx`, then open `http://localhost:8080`. You just ran a web server without installing one. That's the whole idea.

## Problem · One container is easy, hundreds are not

Running one container on one machine is simple. Now imagine a real system: twenty services, each needing three copies for reliability, spread over ten servers. Suddenly you have questions that `docker run` doesn't answer:

- **Where should each container run?** Which server has enough free CPU and memory right now?
- **What happens when one crashes,** or a whole server dies at 3 a.m.? Who restarts it, and where?
- **How do services find each other** when containers move between servers and change IP addresses?
- **How do you release a new version** without taking the service down?
- **How do you handle more traffic?** Who starts more copies, and stops them again later?
- **Where do passwords and settings go,** without baking them into every image?

Answering these by hand, with scripts and spreadsheets of which container runs where, works for a while and then falls apart. A system that answers them for you is called a **container orchestrator**. Kubernetes is the one that won.

## Solution · What Kubernetes does for you

Kubernetes turns a group of servers into one pool of capacity, called a **cluster**. You don't tell it which server to use. You describe what you want ("three copies of `orders-api:1.4`, reachable at the name `orders-api`"), and Kubernetes makes it happen and *keeps* it true.

| Problem | What Kubernetes gives you | Where this track covers it |
| --- | --- | --- |
| Where should it run? | A scheduler that places each container on a server with room | [How a Cluster Works](04-how-a-cluster-works.html) |
| It crashed | Automatic restarts and replacements, on another server if needed | [Pods, Deployments & Rollouts](05-pods-deployments-and-rollouts.html) |
| How do services find each other? | Stable names and built-in load balancing | [Services & Cluster Networking](06-services-and-cluster-networking.html) |
| Releasing without downtime | Rolling updates that stop if the new version is unhealthy | [Pods, Deployments & Rollouts](05-pods-deployments-and-rollouts.html) |
| More traffic | Autoscaling of containers and of servers | [Scaling & Cost](17-scaling-requests-and-cost.html) |
| Settings and secrets | Config and secrets kept separate from images | [Pods, Deployments & Rollouts](05-pods-deployments-and-rollouts.html) |
| Who may change what | Access control for people and programs | [Namespaces, RBAC & Service Accounts](08-namespaces-rbac-and-cluster-access.html) |

```flow
title: You describe the result, Kubernetes does the work
You | "run 3 copies of orders-api:1.4"
-> written down as a short YAML file and sent to the cluster
group: Kubernetes cluster
* Control plane | decides which servers run the copies, and watches them
-> starts containers on the servers it chose
paths
path: Server 1
orders-api copy 1 | running
path: Server 2
orders-api copy 2 | running
path: Server 3
orders-api copy 3 | crashed, so Kubernetes starts a new one
end
end
```

## Honest answer · When you don't need Kubernetes

Kubernetes is powerful, but it's also a platform you have to run and understand. It's not always the right choice:

- **One or two small services:** a single virtual machine, or a simpler container service such as AWS App Runner or Amazon ECS, is less work.
- **Event-driven tasks** that run for seconds at a time often fit serverless functions (AWS Lambda) better.
- **A small team with no one to own the platform** may spend more time running Kubernetes than building the product.

It earns its place when you have many services, several teams, a need for consistent deploys across environments, or the scale where automation stops being optional. That's the situation the later parts of this track describe.

## Vocabulary · Words you'll meet in the next modules

You don't need to memorise these. Each one gets its own explanation later; this is just so they look familiar.

| Term | One-line meaning |
| --- | --- |
| Cluster | A group of machines that Kubernetes manages as one |
| Node | One machine in the cluster that runs containers |
| Control plane | The part of Kubernetes that makes decisions and stores the desired state |
| Pod | The smallest thing Kubernetes runs: a wrapper around one (or a few) containers |
| Deployment | Keeps a set number of identical pods running, and updates them safely |
| Service | A stable name and address in front of a group of pods |
| Namespace | A named section of a cluster, used to organise and separate things |
| `kubectl` | The command-line tool you use to talk to a cluster |
| Manifest | A YAML file that describes an object you want to exist |

## Try it · Run, stop, and inspect a container

With Docker installed, these commands show the image, container, and registry ideas from the top of this module:

```text
# Pull an image from Docker Hub (a registry) and run it as a container
docker run -d --name web -p 8080:80 nginx:1.27

# See running containers, and the images you have locally
docker ps
docker images

# Read the container's logs, then stop and remove it
docker logs web
docker stop web
docker rm web
```

Now picture doing that by hand for sixty containers across ten machines, every day. The next module gives you a real Kubernetes cluster to do it for you, on your own laptop, for free.

### Implementation notes

- **Containers aren't small virtual machines.** They share the host's operating system kernel, which is why they start in seconds and use far less memory than a VM.
- **Images are immutable.** You never patch a running container; you build a new image and replace the container. Kubernetes is built entirely around that idea.
- **Kubernetes doesn't build images.** It runs images that already exist in a registry. Building and publishing them is a separate step, covered in [Container Delivery](15-container-delivery-to-eks.html).

## Recap · Key terms

- **Image:** a read-only package of an app and everything it needs, built from a Dockerfile.
- **Container:** a running, isolated copy of an image.
- **Registry:** a store that machines pull images from, such as Docker Hub or Amazon ECR.
- **Container orchestrator:** software that places, restarts, connects, and scales containers across many machines.
- **Cluster:** a group of machines that Kubernetes manages as one pool of capacity.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: What's the difference between an image and a container?
- An image runs on a server; a container runs on a laptop
* An image is the read-only package; a container is a running copy of it
- A container is built from a Dockerfile; an image is pulled from a registry
- They're two names for the same thing
= You build an image once, from a Dockerfile, and start as many containers from it as you like. Each container is a running, isolated copy.
S: A server running three copies of your API dies at 3 a.m. What does an orchestrator such as Kubernetes do?
- Pages the on-call engineer to restart the containers by hand
- Waits for the server to come back, then restarts them there
* Notices the missing copies and starts replacements on servers that have room
- Nothing until the next deploy
= You declared that three copies should exist. When reality no longer matches, Kubernetes starts new copies on healthy machines, without waking anyone up.
Q: Where do servers get container images from?
* A registry, such as Docker Hub or Amazon ECR
- The Dockerfile, which they build on startup
- The Kubernetes control plane, which stores every image
- Each developer's laptop
= Images are pushed to a registry once, and every machine that needs one pulls it from there. Kubernetes runs images; it doesn't build or store them.
S: Which situation is the weakest case for adopting Kubernetes?
- Thirty services owned by five teams, deployed to four environments
- A platform that needs the same deploy process across dev, test, and production
* One small web app run by a two-person team with no one to own a platform
- Workloads whose traffic swings widely during the day
= Kubernetes pays off with many services, teams, and environments. For one small app, a VM or a simpler container service is usually less work.
Q: How do you usually tell a Kubernetes cluster what to run?
- You choose a server and start the container on it with a script
* You describe the result you want, and Kubernetes works out how to get there
- You log in to each node and run `docker run`
- You upload the image directly to a node
= You declare the desired state ("3 copies of this image") and Kubernetes decides where to run them and keeps them running. That idea runs through the whole track.
```
