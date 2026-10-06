---
title: Modern HCL — Types, Validations & Preconditions
date: 2026-09-17
track: terraform
order: 3
module: 3
summary: Modules that check their own inputs: typed variables, validation blocks, preconditions and postconditions, and for_each with stable keys so removing one item doesn't replace the others.
level: Core Architecture
readingTime: 7 min read
stack: [Terraform 1.5+, HCL, AWS]
tags: [hcl, validations, preconditions, types, for-each]
---

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
