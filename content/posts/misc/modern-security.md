---
title: "Modern Security"
date: 2018-06-29T16:55:18-07:00
draft: true
description: ""
categories:
- security
tags:
- overview
---

# Target Audience
A tech savvy computer user. Not a programmer, or even an IT repair guy, but not your average joe either.

# Dissection

Security is a loaded term so we'll break it out.

There are two overarching categories, and a bunch of others that fall underneath them.

1. Privacy: Concealing information from others
    1. Authorization
1. Integrity: Making sure that information is not tampered, sabotaged, or changed

Permissions  
Untrusted Code  
Buffer overflow  
Tracking  
Data collection  
fingerprinting  
data leakage

# Encryption is not integrity, encryption is privacy
# Hashing is not privacy, hashing is integrity


# Stay Safe Online:
1. Anti Tracking (tracking)
1. Adblocking (untrusted code, tracking)
1. No Scripts (untrusted code, tracking)

# Stay safe on your computer
1. Patches (untrusted, data leakage)

# General
1. Strong passwords (unauthorized access)
1. Two-Factor Auth (unauthorized access/password fallback)

VPNs are nice, but they really just punt the problem.
(non-https connections become secured between you and the vpn server, but are again insecure from vpn to the server. Your ISP no longer knows where your traffic is going, but the ISP out of your VPN server does.)

# A Programming Language has no performance characteristics
The Assembly produced by the compilation has performance characteristics.
# A Programming Language is not garbage collected
Its runtime is

# A Programming Language is not its standard library

# What is a PL
{ syntax, tokens }

# Compilation?
{ Lexer, parser, tokenizer }

# Runtime?
{JIT / VM }

# Final Product?
{ Assembly Code }
