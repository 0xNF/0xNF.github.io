---
title: "Home Networking 4 - Switch"
date: 2026-03-16T13:32:31+09:00
draft: true
description: "Fourth post in the Home Networking series, describing setting up our Switch"
categories:
- defaultcategory
tags:
- defaulttag
---

## TODO
* VLAn Setup
* Configuration Backups
* SSH keys
* NTP, which isn't working
* Setting the HTTPS flag
* Portfast and Spanning Tree on 1/12
  * "never ever disable it. Except sometimes. because portstroms"


# Switch Setup

This post continues from [Home Networking 3](/network/home/home3).

Here we'll set up our FS S3900 Switch. If you have an FS switch, it may be useful to you. If you don't, then maybe you can at least see the general idea of what's happening.

## Updating

n.b., This switch was already fairly old when I got it, and it is even older now. It was outdated by many, many versions, and had to undergo multiple arcane step-wise update proceedures to bring it up to the modern OS version that FS officially supports. You should skip this section without losing any insights.


The switch as I received it was using firmware version v0140, and the current supported firmware version is v0169. It's not enough to upgrade directly, there's shennanigans afoot. One first needs to upgrade to 150, and then to a step-upgrade firmware who'se only purpose is to prepare to move beyond 150, and then finally to the modern 169.

This switch was old. It had all sorts of issues with using outdated SSH ciphers that all my SSH clients did not support -- I had to use Putty in legacy mode to access the ssh console. This was resoved after the latest version update, but it still have other sharp edges. 

## Quirks
### File Copying
Getting the binaries onto the system itself is an exercise in confusion. There's strange UI translations from, presumably, Mandarin Chinese. There's weird button UX leading to places one wouldn't expect. And there's a deeply baffling upload procedure involving ambiguity of whether you're about to do what you think you're about to do.

To upload a file is to click the "Copy" button. By default it will try to "copy" into a file that already exists. It can only store 2 binary files on the system at once. To delete, you also have to "copy". And then delete after clicking "copy", because "copy" just means "file operation". 

### HTTPS Certificates
Certs can only be uploaded via a [Trivial File Transfer Protocol (TFTP) server](https://en.wikipedia.org/wiki/Trivial_File_Transfer_Protocol), which is not an ftp server, an ftps server, or an sftp server. There is no way to upload a certificate manually in any otherwise normal way.

See also: https://reintech.io/blog/installing-configuring-tftp-server-debian-12

Also, exactly what kind of certs it accepts are undocumented. I have been unable to get any of my certificates, each with increasingly degraded, broken, and ancient ciphers in hopes to getting it to upload successfully, but alas all my attempts have ever only been met with `File transfer: error`, which is almost poetic in how unhelpful it is as a diagnostics.

I have tried:
* PEM-chain
* Bare PEM 
* DER 
for the formats, 
and
* ED25519
* RSA 384
* P384
for the ciphers, and all combinations thereof.

I have made no progress on getting it to accept a certificate. 

#### Update 1
Enabling the `https` option in the webui, or deleting `no service https enable` from the config file, you can turn on an https server, which comes with a default certificate.

The cert is SHA-1, RSA-1024, with a ten-year expiry lasting until 2029. Not exactly industrial strength but it'll do.

#### Updtae 2
Using the `copy tftp https-certificate` command from inside the switch, and then looking at the logs, we can see the following:

>[1771] copy publickey TFTP(172.30.0.48/cert.key) to running-config failed.  
[1770] copy publickey TFTP(172.30.0.48/cert.crt) to running-config succeeded.

If the logs are accurate, and if my interpretation is correct, then it looks like the switch is trying to download the private key as a public key, and failing. This would mean the switch's firmware itself is busted. 




# other links
firewall setup:
https://homenetworkguy.com/how-to/disable-root-user-opnsense/
https://iampusateri.com/posts/sshd-config/
no-password login is already setup by opnsene default