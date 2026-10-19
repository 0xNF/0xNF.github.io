---
title: "Home Networking 4 - Switch"
date: 2026-03-28T16:11:24+09:00
draft: true
description: "Fifth post in the Home Networking series, describing setting up the OPNSense Firewall"
categories:
- defaultcategory
tags:
- defaulttag
---


## TODO
* Find the tutorials used and link them
* VIPS (plus vip gotchas)
  * As Alias, not as CARP because only one ISP
* KEA DHCP (plus restart requiredness)
* Interface Devices
* User creation
* SSH key uploads
* Root disable
* Setting TOTP access
* LAGG because of physical machine weirdness
* Firewall Groups
  * DHCPGroup
  * InternetAccess
  * LiterallALL
  * OpenVPN
  * Overlay
* Rules
  * Floating
    * Fiewall Services (dns, ntp, etc)
    * ICMP pings
  * InternetAccess Group
    * Not Private Address Space
    * OpenVPN access
  * LAN
    * IPv4 to any
    * IPv6 to any
  * OpenVPN
    * Any to Any