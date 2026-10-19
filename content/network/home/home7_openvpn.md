---
title: "Home7_openvpn"
date: 2026-03-28T16:13:20+09:00
draft: true
description: "Post Summary"
categories:
- defaultcategory
tags:
- defaulttag
---

* MTU + MSS fix
* Gotchas:
  * dont vip yourself to oblivion
* Data Ciphers and Fallback Cipher is empty by default, set to aes-gcm-256
* Copy as CN
* Strict checking
* udp v4
* keep-alive: empty -> 60
* time-to-live: empty -> 120
* Bind Address -> Empty (fine for all)
* Server (is what Address space it hands out) -> to .240, then note about vlans
* Locla Routes (is what we can access) -> underlay overlay
* Discuss fact that networking of OpenVPN is almost fully indistinct from networking owned by OPNSense

Discuss Gotchas on client:
* UDP packet size too big? Double check MTU
* Don't VIP yourself