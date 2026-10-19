---
title: "Home Networking 1 - Overview"
date: 2026-03-15T10:58:49+09:00
draft: false
description: "First post in the Home Networking series, describing what we're working with and what the baselines are"
categories:
- network
tags:
- defaulttag
---

# Setup and Overview


With advice from an expert friend, combined with barely even novice level talent and understanding of networks, here's how I've begun to set up a network that may be used for both learning at home, and some minor commerical endevaors.
One of the outstanding goals is to reduce reliance on cloud providers and proprietary solutions as much as is feasible. That process may also be a progressive one.

All of this is thanks to one specific friend. I won't name him here, but he knows who he is. As I am a cheapskate, if there's any kind of even remotely industrial hardware here, it is from his personal stash of equipment. In addition to his hardware, all of this is due to his many years of hard-earned expertise as a professional in the field, which I am fortunate to learn from.

For context, remmber that I am a software developer who has successfully avoided networking since university. I don't know nothin' about nothin'.

# Overview

This setup relies heavily on VLANs, hardware that supports VLANs, SFP+ modules, and other things that I have either only vaguely heard of, or have never heard of at all before this started. 

## Flow
This series of posts will vaguely follow this outline:
* Overview (this post)
* Physical and Virtual architecture including vlans, wiring, etc
* Setting up the Access Point and WiFi
* Setting up the Switch
* Setting up OPNSense Firewall
* Setting up our Public Key Infrastructure (PKI)
* Setting up OpenVPN
* Setting up Proxmox
* Spinning up VMs

## Hardware
* [Lian-Li PC-Q21](https://www.hardwarezone.com.sg/pc/components/tech-news-new-lian-li-pc-q21-tiny-spacious-mini-itx-chassis)
  * [Intel X520 DA-2](https://www.serversupply.com/NETWORKING/NETWORK%20INTERFACE%20CARD/10%20GIGABIT/INTEL/X520-DA2_138689.htm) 2x SFP+ 10GB Network Adapter (aka, a NIC)
  * Runs the firewall
* [Dell T420](https://i.dell.com/sites/content/shared-content/data-sheets/en/Documents/dell-poweredge-t420-technical-guide.pdf)
  * Same Intel X520 DA-2 as above
  * Runs the hypervisor
* [FS S3900 24T4S](https://www.fs.com/products/183384.html?attribute=127110&id=4791550) network switch
* [Netgear WAX610](https://www.netgear.com/support/product/wax610) Access Point
  

Some questions you may have:
> Why such a heavy duty switch?

Originally, I had a TP-Link switch. That, combined with the Lian-Li via one X520 NIC were supposed to be all that was needed for networking, but due to some ISP quirks related to the modem unit, the Intel branded NICs could not recognize the modem module, and a more heavy duty switch, the FS S3900, had to be brought in to handle that modem step. Aside from some general weirdness (why is the port numbering bottom-to-top? Why can't I upload a cert directly?) because FS the compnay is itself kind of weird, the switch is working fine. But only fine. This UIs on this thing are borderline unseable. 

> Why an AP and not a router with OpenWRT, which surely you already had?

Astutely observed. Sadly I fried my main router, a Nighthawk R7800 (RIP to a real one), by plugging in a 48v DC power adapter by accident, so that was the end of that. Then, a backup router my friend gave me also didn't boot, though we are uncertain if this is another 48v error, or if it wasn't working for other reasons. In any event, I figued that as I play pretend professional-network-engineer, I may as well lean into it and get something professional. We'll talk more about this one later, it largely works fine, with only one-and-half issues to complain about (tl;dr only 1 port, and does not yet run OpenWRT).


  For those in the know, this means that we ended up moving to a [Router On a Stick](https://en.wikipedia.org/wiki/Router_on_a_stick) architecture. I don't know enough to say whether thats good, bad, or neutral, but apparently that's what it is.

### Wires and Module knicknacks
We're doing things with SFPs, so we also have 4x 10GB intel-compatible SFP+ optical modules, with associated [LC UPC Duplex to LC UPC Duplex, Multimode (OM4)]() fiber patch cables to carry data over those modules.

Plus, obviously, a ton of ethernet cables of various grades, though a move to consistent Cat6e is underway.

## Software
* [OPNSense](https://opnsense.org/)
  * Firewall, plus all the things that would otherwise be handled by the router including VLAN assignments, DHCP, etc
  * [Kea DHCP](https://www.isc.org/kea/)
    * Bunled as part of OPNSense. Somewhat quirky, just like OPNSense, but it works.
* [Proxmox](https://www.proxmox.com/en/)
  * Hypervisor, like Hyper-V for those coming from the Windows World like myself.
* [OpenVPN](https://openvpn.net/client/) 
  * Why not Wireguard? Because I intend to have multiple people on the network at once and wireguard is mostly single-user.

There's a bunch of other things that will make appearnces as appropriate, like certificate management software. OpenWRT in particular was supposed to appear here until the r7800 got zapped to death. And the switches run their own OSs which is not _ideal_, but is basically _fine_.

The above 3 things are going to do the lions share of work to establish our network, its perimeters, and its rules.




# Keyword jumble of tech I've had to become acquainted with
- FreeBSD
  - And also its cousins OpenBSD (max security) and NetBSD (max device compatability), and why not to use them
- OPNSense
  - With a heathy amount of dishing on PFsense
- Proxmox
- "Firewall", as opposed to just "router", and also not just in the sense of "blocking ports" as though on a Host machine
- SFP+
- Infiniband
- Optical wiring
- Subnets and subnet masks
- VLANs
  - including Trunks, Tagged and Untagged, 802.1Q
- Kea
- DHCP at more than just a surface level understanding of "its the ip address assigner protocol"
  - including DHCP pools
- tcpdump beyond just "oh yeah I've heard of that"
- UDP beyond "its the thing thats not TCP"
- "Network Adapter" as opposed to "NIC"
- IPv6 at deep level
  - ULA schemes
- RAID
- Drive mirroring
- ZFS
  - including zpool, datasets, and iops
- Underlay / Overlay networks
- PKI
  - including Certificate Authorities, Sub-CAs, Extended Key Usage, Subject Alternative Name, Certificate Revocation Lists, etc
- TFTP
- RADIUS
- Virtual IP (VIP)
- S/MIME
- Syslog as a format (RFC5424), as opposed to the place on unix systems where system info get dumped to
- EEPROM
- Serial Console despite being ethernet shaped is not ethernet
- Baud rates
- "Management" with respect to device administration
- DynDNS
- LAGG