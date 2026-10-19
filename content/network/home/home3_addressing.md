---
title: "Addressing and Naming"
date: 2026-04-05T14:59:46+09:00
draft: true
description: "Third post in the Home Networking series, describing how we set up ipv4 and 6 addrs, and naming schemes"
categories:
- defaultcategory
tags:
- defaulttag
---


## Naming
Everything on the network gets a specific hostname, which follows a template. The naming template you choose for your own network is likely to be different based on your own desires, but here's the one I've chosen:

`$TwoLetterSiteCode-$RoleTemplate-$instanceNumberOrUnit`.

### Two Letter Site Code
The two-letter-site-code is an abbreviation for sites that I have, or am likely to have, devices or vms located at. For devices, this is straight forward since they must physically exist somehwere. For VMs its trickier, because they could float around from place to place. For now, I've simply decided that VMs have a site code equal to their hypervisor host, but it's open to modification in the future. E.g., 's `ln` for `London`, `se` for `Seattle`, etc. 

_Physical_
| 2-letter ascii code | Location |
| ------------------- | -------- |
| ln                  | London   |
| se                  | Seattle  |


Additionally, we define two sets of pseudo-locations: 

Virtual is used when something we own is hosted on a cloud provider like AWS or Digital Ocean:

_Virtual_
| 2-letter ascii code | Location       |
| ------------------- | -------------- |
| do                  | Digitial Ocean |
| as                  | AWS            |

And finally, "Special", which is used for special case items, denotes with a `z` prefix.
_Special__
| 2-letter ascii code | Location                                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| zz                  | Floating, of indetermine location                                                                                 |
| za                  | Network-Wide: We need a prefix to make a name match, but there's only _ever_ one of a thing. Those things get za. |


These codes are self-describing as long as you have the intution for how the abbreviations were constructed. It is recommended to keep a lookup table detailing these codes somewhere.

### Role Template
The Role Template is a sub-template of the naming scheme, and is used to store information such as:
* the main role
* its staging environment
* its group count within that environment
  
  Its of the form: `$role.$env.$groupCount`

`role` is an abbreviated string of things like.
For example here is a highly abbriged list of roles I am using:
| Code | Role                  |
| ---- | --------------------- |
| fw   | Firewall              |
| sw   | Switch                |
| hv   | Hypervisor            |
| srv  | Generic Server        |
| web  | Generic Web Server    |
| ca   | Certificate Authority |
| ap   | Access Point          |
| zz   | Other                 |

Once again, the `z` prefix is used to indiciate special things that don't otherwise fit.

This list is not exhaustive, and contains more specialized role names for specific web services being run, e,g.:

| Code         | Role           |
| ------------ | -------------- |
| hue          | Philips Hue    |
| appletv      | Apple TV       |
| homeasistant | Home Assistant |
| obsidian     | Obsidian Notes |
etc.

`env` is a 1-letter code indicating its environment:
| Code | Meaning     |
| ---- | ----------- |
| p    | production  |
| d    | development |
| s    | staging     |
| t    | testing     |

Your network may have more or different codes for other purposes.

In my scheme, if no env code is found, it is implicitly of code `p` for `production`.

`groupCount` is which group this item belongs in. For instance, two different dev teams may have the same VM running for their own purposes. In which case, Team A gets `srv.d.1` and Team B gets `srv.d.2` for their individual purposes.

If no group count is found, it is implicitly in group `1`.

### Instance Number / Unit
All items get a defualt `-1` as the final portion of their hostname. A number greater than one indicates that the entre preceeding {Site-Code, RoleTemplate} has a second instance. For example, a -2 on a firewall could be a failover, -3 or -4 could be for load balancers.

However, it's also possible to use colors: `-green` or `-blue`, which are used to inidicate co-equal items where no one unit is of greater implicit importance than the other. For example,
"firewall-green" and "firewall-blue" are equivalent, and used in a prod/staging [flip-flop gate](https://en.wikipedia.org/wiki/Flip-flop_(electronics)) where one is active currently, but may be backgrounded for the other at any point in time. These items can either be always co-equal, or take turns being the primary, but as far naming and setting up the hosts themselves, there is nothing intrinsict at setup time that would imply numeric naming. These items get the -color scheme.

### Example
A fully built example hostname would be something like:
*  `ln-fw-green`,  meaning: "green" Firewall 1, located in the London office, the primary/standby status of which would be be queries spearately 
* `se-ap-3`, meaning: the third Access Point in the Seattle office
* `mn-web.d.3-7` meaning: Montreal office; Dev Webserver third grouping, instance 7
* `mn-web.d.3-8` meaning: Montreal office, Dev websever third grouping,  instance 8. 
* `mn-web.d.4.7` meaning: Montreal office, Dev Weberverr, fourth grouping, instance 7
  
Typically, the unit number would be dependant on the grouping. Otherwise it should be taken that they are independent.

### 16 characters
Windows Domains havea 16-character limit for hostnames. We _generally_ try to restrict ourselves to the same limit, but we also break this from time to time. If you intend to manage windows domains, or intend to manage things from Active Directory, you should take care to make things fit into 16 characters, or at least be sure that the items that will be inclued in AD to be under that limit.u

## Static Assignments
For the most part, everything that gets a hostname also gets a static IP assignment. One way of thinking about what gets a static IP is that clients make do with DHCP but servers get a static IP. Anything that needs to be accessed by other things gets an IP. Your phone doesn't need to be accessed except by you, and by physically operating it.

My switch needs to be located often, so it needs a static IP.

In our setup, we do not use DHCP reservations. You are free to use them, but we will just be using ip assignemnts on the devices themselves.

For example, our firewall will be given the following static IP: `172.30.0.1`, and our main switching hub will be given `172.30.0.2`.  This list will include not just other infrastructure like our hypervisor, but also overlay things like Hue Bridges, or VMs serving important apps on our network. File storage? `10.96.16.35`. Mail server? `10.96.16.27`. 

Phones, desktops, etc can just rely on getting a dynamic IP from the DHCP server, since they are not expected to be accessible except by phsyical operators.


### ULA
Although the network will be primarily IPv4, it will also be created with an eye towards IPv6. One such IPv6-thing is the concept of a [Unique Local Adddress (ULA)](https://en.wikipedia.org/wiki/Unique_local_address), which is a specially derived IPv6 address with certain properties. 

The exact reasons for why ULAs are interesting is beyond the scope of this post, but among other things, it means:
* If in the future. networks merge together, there will be a statistically-zero chance of collision 
* We can encode a lot of data into the ULA that make the addresses self-describing in certain capacities

Using this [IO Tool's generator webapp](https://iotools.cloud/tool/ipv6-ula-generator/), we can create some initial ULA templates for use. For my purposes, I used the main MAC addresses of my firewall's built-in NIC for my underlay, and the MAC address of the SFP+ 520 card for the overlay, which mirrors the intended data that each card is expected to carry.

# TODO ULA Encoding