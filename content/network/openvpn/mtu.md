---
title: "OpenVPN - Message Too Long"
date: 2026-03-28T16:38:47+09:00
draft: true
description: "An OpenVPN connection issue related to MTU"
categories:
- defaultcategory
tags:
- defaulttag
---

If your OpenVPN logs show something like:
> Write UDPv4: Message too log

Then you should double-check your MTU settings. You can either set it on the client connection directly by overriding the .ovpn profile, ala:

![add override](/static/openvpn/opvnmtu.png)

Or more permanetly, by adding it directly into the OpenVPN template settings for your instance:

![add in instance](/static/openvpn/ovpninstancemtu.png)


In this case we've chosen an `MTU = 1425`. if you're calculating the MSSFix manually, [apparently](https://www.krugdocs.com/openvpn/trouble-shooting/mtu-problem.html) the optimal MSSFix value is `MTU - 40 = 1385` in our case, but your mileage may varry.