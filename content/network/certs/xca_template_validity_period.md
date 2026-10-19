---
title: "Fixing missing, undefined, or incorrect validity periods for XCA issued certificates"
date: 2026-03-21T18:02:36+09:00
draft: true
description: "Post Summary"
categories:
- networking
- certificates
tags:
- xca
- certs
- x509
- certificate authority
---

Check your template applications.


## Shot
Recently while trying to issue some certificates from [XCA](https://hohnstaedt.de/xca/), I struggled with getting XCA to issue certifivates with a defind expiry datetime. No matter what I did to set the dates manually, the validity period expires at was always "undefined" aka "forever". 

![expiry undefined](/static/certs/undefined_expiry.png)



## Chaser
Turns out the the reaosn is because I was applying an XCA template that specifically checked `[x] No Defindd Expiry Time`.

![no well defined expiry time](/static/certs/no_well_defind_expiry.png)


The application of such a template overrides the expiry time of certificates, evem you specifically uncheck the option, and even if you specifically set an expiry time.

The UI won't reflect this. The Certificate creation dialogs will tell you that you set an expiry time properly, but then you go and check the values of the created certificate and notice that the expiry date remains undefined. 

So, double check your templates.