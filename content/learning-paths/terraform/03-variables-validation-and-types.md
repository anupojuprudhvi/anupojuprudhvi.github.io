---
title: Modern HCL — Types, Validations & Preconditions
track: terraform
order: 3
module: 3
totalModules: 6
summary: Writing robust, self-defending Terraform with rich object schemas, custom validation blocks, lifecycle preconditions, and deterministic for_each key mapping.
level: Core Architecture
readingTime: 7 min read
stack: [Terraform 1.5+, HCL, AWS]
tags: [hcl, validations, preconditions, types, for-each]
---

## Principle · Make invalid states unrepresentable

In production, human errors often stem from invalid variable inputs passed to modules (e.g. invalid CIDR blocks, illegal naming characters, or out-of-range retention windows).

Modern Terraform (1.5+) allows you to build **self-defending modules** that fail fast during `terraform plan` before any API calls are made to AWS.

## Validation · Custom variable validation blocks

Always pair input variables with explicit types, descriptions, and custom `validation {}` blocks:

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
    condition     = tonumber(split("/", var.vpc_cidr)[1]) <= 20
    error_message = "The VPC CIDR prefix must be /20 or larger (/16 to /20) to ensure adequate subnet capacity."
  }
}</code></pre>

## Guardrails · Lifecycle preconditions & postconditions

While variable validation checks inputs in isolation, `lifecycle { precondition {} }` and `postcondition {}` assert architectural assumptions against real resource attributes and data sources during the plan and apply phases.

<pre><code># main.tf

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  lifecycle {
    # Assert that the selected AMI is EBS-backed and modern before launching
    precondition {
      condition     = data.aws_ami.ubuntu.root_device_type == "ebs"
      error_message = "The selected AMI must use EBS storage for root persistence."
    }

    # Assert that the instance receives an approved private IP post-creation
    postcondition {
      condition     = can(regex("^10\\.", self.private_ip))
      error_message = "The instance was allocated a non-compliant IP outside the 10.0.0.0/8 enterprise range."
    }
  }
}</code></pre>

## Mechanics · The catastrophic `count` index-shift trap

One of the most dangerous patterns in Terraform is using `count` on a list of resources instead of `for_each` with a map.

### The Problem with `count`:
<pre><code># DANGEROUS: Using count with a list
variable "subnets" {
  default = ["subnet-a", "subnet-b", "subnet-c"]
}

resource "aws_subnet" "this" {
  count      = length(var.subnets)
  cidr_block = "10.0.${count.index}.0/24"
}</code></pre>

If an engineer deletes `"subnet-a"` from the beginning of `var.subnets`:
- Index `0` is now `"subnet-b"` (Terraform forces **destruction and re-creation** of subnet B!).
- Index `1` is now `"subnet-c"` (Terraform forces destruction of subnet C!).
- Index `2` is deleted.

**Result:** A simple removal of one unused subnet destroys all active subnets in your infrastructure!

### The Production Solution: Use `for_each` with deterministic keys

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
  cidr_block        = each.value.cidr_block
  availability_zone = each.value.availability_zone

  tags = {
    Name = each.key # Identity is bound to key, not an array index!
  }
}</code></pre>

When using `for_each`, deleting `"app-us-east-1a"` targets **only** that specific resource for destruction. The remaining subnets are completely unaffected.
