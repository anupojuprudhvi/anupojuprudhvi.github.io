---
title: Modern HCL — Types, Validations & Preconditions
date: 2026-09-17
updated: 2026-10-06
track: terraform
order: 3
module: 3
summary: Modules that check their own inputs: typed variables, validation blocks, preconditions and postconditions, and for_each with stable keys so removing one item doesn't replace the others.
level: Core Architecture
readingTime: 8 min read
stack: [Terraform 1.5+, HCL, AWS]
tags: [hcl, validations, preconditions, types, for-each]
---

**In this module, you'll learn to:**

- Give module inputs types and validation blocks, so bad values fail at `terraform plan`
- Check assumptions around a resource with preconditions and postconditions
- Choose `for_each` with stable keys over `count`, so removing one item doesn't replace the others

**Before you start:** read [Enterprise Repository & Module Layout](01-enterprise-module-design.html). The checks here go into its child modules.

## Principle · Catch bad inputs before they reach AWS

Many production mistakes start as a bad input to a module: an invalid CIDR block, a name with characters AWS won't accept, a retention period out of range.

Terraform can check these for you. A module with typed, validated inputs fails at `terraform plan` with a clear message, before anything is changed.

## Validation · Custom variable validation blocks

Give every input a type, a description, and a `validation {}` block where a wrong value is possible:

<pre><code># variables.tf

variable "environment" {
  type        = string
  description = "Target deployment environment (dev, stage, or prod)."

  validation {
    condition     = contains(["dev", "stage", "prod"], var.environment)
    error_message = "The environment variable must be one of: dev, stage, prod."
  }
}

variable "vpc_cidr" {
  type        = string
  description = "Base IPv4 CIDR block for the VPC."

  validation {
    condition     = can(cidrnetmask(var.vpc_cidr))
    error_message = "The vpc_cidr value must be a valid IPv4 CIDR address (e.g. 10.0.0.0/16)."
  }

  validation {
    # try() turns a malformed value into false, so the error message shows instead of a crash
    condition     = try(contains(range(16, 21), tonumber(split("/", var.vpc_cidr)[1])), false)
    error_message = "The VPC CIDR prefix must be between /16 and /20, so there's room for subnets."
  }
}</code></pre>

## Guardrails · Lifecycle preconditions & postconditions

Variable validation checks one input on its own. A `precondition` checks an assumption before a resource is created, using data sources and other values. A `postcondition` checks the result after it's created.

<pre><code># main.tf

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["<ami-owner-account-number>"] # the image publisher (Canonical, for Ubuntu)

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  lifecycle {
    # Before launch: the chosen AMI must be EBS-backed
    precondition {
      condition     = data.aws_ami.ubuntu.root_device_type == "ebs"
      error_message = "The selected AMI must use EBS storage for root persistence."
    }

    # After launch: the instance must get a private IP in 10.0.0.0/8
    postcondition {
      condition     = can(regex("^10\\.", self.private_ip))
      error_message = "The instance was allocated a non-compliant IP outside the 10.0.0.0/8 enterprise range."
    }
  }
}</code></pre>

## Mechanics · The `count` index-shift trap

Using `count` over a list, instead of `for_each` over a map, is one of the easiest ways to replace resources by accident.

### The problem with `count`
<pre><code># RISKY: count over a list
variable "subnet_cidrs" {
  default = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

resource "aws_subnet" "this" {
  count      = length(var.subnet_cidrs)
  vpc_id     = var.vpc_id
  cidr_block = var.subnet_cidrs[count.index]
}</code></pre>

Each subnet is known by its position: `this[0]`, `this[1]`, `this[2]`. Now remove the first CIDR from the list:
- `this[0]` now gets `10.0.2.0/24`, so Terraform replaces it.
- `this[1]` now gets `10.0.3.0/24`, so Terraform replaces it too.
- `this[2]` no longer exists, so Terraform destroys it.

**Result:** removing one subnet destroys and re-creates the other two as well.

### The fix: `for_each` with stable keys

<pre><code># SAFE: Using for_each with a map
variable "subnets" {
  type = map(object({
    cidr_block        = string
    availability_zone = string
  }))
  default = {
    "app-us-east-1a" = { cidr_block = "10.0.1.0/24", availability_zone = "us-east-1a" }
    "app-us-east-1b" = { cidr_block = "10.0.2.0/24", availability_zone = "us-east-1b" }
    "app-us-east-1c" = { cidr_block = "10.0.3.0/24", availability_zone = "us-east-1c" }
  }
}

resource "aws_subnet" "this" {
  for_each          = var.subnets
  vpc_id            = var.vpc_id
  cidr_block        = each.value.cidr_block
  availability_zone = each.value.availability_zone

  tags = {
    Name = each.key # each subnet is known by its key, not its position
  }
}</code></pre>

With `for_each`, removing `"app-us-east-1a"` destroys only that subnet. The other two keep their keys, so nothing else changes.

## Recap · Key terms

- **Validation block:** a `condition` and an `error_message` on a variable. A bad value fails the plan with that message.
- **`can()` and `try()`:** turn an error into `false` or a fallback, so a malformed value shows your message instead of a crash.
- **Precondition:** checks an assumption before a resource is created, using data sources and other values.
- **Postcondition:** checks the result after the resource is created, through `self`.
- **`count` index shift:** resources known by position are replaced when an item earlier in the list is removed.
- **`for_each`:** resources known by a stable key, so removing one item touches only that item.

## Check yourself · Pop quiz

Five questions: three on the ideas in this module, and two scenarios where you apply them. The order changes every time you take it, and 4 out of 5 passes.

```quiz
Q: When does a failing variable `validation` block stop a change?
* At `terraform plan`, before anything is changed
- At apply, after some resources exist
- When the AWS API rejects the request
- During `terraform fmt`
= Validation runs while Terraform evaluates the inputs, so the plan fails with your message and nothing reaches AWS.
Q: What's the difference between a precondition and a postcondition?
- Preconditions are for variables, postconditions for outputs
* A precondition checks an assumption before the resource is created; a postcondition checks the result after
- Postconditions only run in CI
- None; they're two names for the same check
= Both live in a resource's `lifecycle` block. One guards the inputs to the resource, the other its outcome.
Q: Why is the CIDR prefix check wrapped in `try(..., false)`?
- To make the plan faster
- To let any CIDR through
* So a malformed value fails with the validation's own error message instead of a crash
- Every validation must use `try()`
= Splitting a malformed CIDR would raise an error of its own. `try()` turns that into `false`, so the clear message shows instead.
S: Three subnets are created with `count` over a list. You remove the first CIDR. What does the plan show?
- One subnet destroyed, nothing else
* Two subnets replaced and one destroyed
- No changes
- An error
= Every subnet after the removed one shifts down a position and gets a different CIDR, so it's replaced. The last position no longer exists, so it's destroyed.
S: You need to switch that resource from `count` to `for_each` in production without replacing any subnet. What's the safe way?
- Destroy the subnets and let `for_each` create new ones
- Run `terraform state rm` on each subnet
* Switch to `for_each` with stable keys and add `moved` blocks from each index to its key (Module 05)
- Apply one subnet at a time with `-target`
= A `moved` block from `aws_subnet.this[0]` to `aws_subnet.this["app-us-east-1a"]` tells Terraform it's the same subnet, so the plan shows a move, not a replacement.
```
