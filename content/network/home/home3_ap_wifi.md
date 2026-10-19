---
title: "Home Networking 3 - Access Point and WiFi"
date: 2026-03-15T17:42:51+09:00
draft: true
description: "Third post in the Home Networking series, describing setting up our Access Point"
categories:
- defaultcategory
tags:
- defaulttag
---

## TODO
* VLan tags
  * With mixup of 
* Bands

# Access Point Setup

This post continues from [Home Networking 3](/network/home/home2).

We're setting up the Access Point here -- this comes before the switch setup because there's some initial wonkiness with the single-port nature of our access point that I'd like to get out of the way first, and will make describing the Switch setup in [part 4](/network/home/home4) easier.


# Purchasing
After frying my R7800, and being gifted a Linksys E8450 that turns out also doesn't boot, I decided why not just get an Access Point, and skip the Router step. I had a few requirements for what to buy:
* 802.1Q VLAN Support
* Multiple concurrent WiFi networks
* OpenWRT support
* 2 ports

Sadly, 2 ports went out the window pretty quickly. Access points in my price range don't commonly come with 2+ ports. That's fine, we can make do.

I had scoured the OpenWRT [Table of Supported Hardware](https://toh.openwrt.org/?view=normal), and found the WAX610, which has good reviews, on it. Without doing much further research, I got the access point off Amazon quickly enough. Howwver, only after receing the AP did I do deeper research and found out that OpenWRT support is in the "Snapshot" stage ([Support Status Page](https://openwrt.org/toh/hwdata/netgear/netgear_wax610)), which is experimental. According some [posts](https://forum.openwrt.org/t/openwrt-support-for-netgear-wax610-wax610y-wax610pa/181995/24) on the OpenWRT forums, development seems slow, but ongoing (as of time of writing this post, March 16 2026. The last update on the forums was from June 2025).

No OpenWRT support is a setback, but not a world ending one, we'll continue with the Netgear OS for now and move to OpenWRT down the line

Thankfully, the OS included with the access point is capable of meeting our other requirements just fine.

 