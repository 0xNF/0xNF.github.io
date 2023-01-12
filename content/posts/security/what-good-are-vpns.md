---
title: "What Good Are VPNs?"
date: 2018-07-24T18:00:02-07:00
draft: false
description: "One of the most common pieces of security advice on the internet is to get a VPN. That way, you'll be safe from all kinds of bad things and ne'er-do-wells. VPNs can be good, but they aren't a panacea, and often just punt the main problems somewhere else."
categories:
- security
- privacy
tags:
- vpn
---

### Good at some things, bad at others.

At the most basic level, a VPN is an end-to-end service that encrypts network activity on one end and decrypts it at another. Depending on what kind of platform you are on, VPNs can be installed at different and deeper layers of the network stack.  

That's all it is. Encrypted data at one end, decrypted data at the other. Anything else is fluff, extras added on top.

Brian Krebs has [an article](https://krebsonsecurity.com/2017/03/post-fcc-privacy-rules-should-you-vpn/) on what to be looking out for when you pick a VPN, including tips to be aware of the shady practices of the VPN industry, but this is assuming you've already chosen to get a VPN. If you're that far along in the decision process, then be sure to read his article and choose a good VPN, or set one up yourself.  

But if you're not that far along, instead of picking a VPN we should be asking ourselves what good, really, even is a VPN.

If you're looking to make it seem like your internet traffic is coming from some other location in the world, like the inside of your corporate network, then a VPN can be useful. This is particularly good for defeating services that geofence, like Netflix.

If you want to make sure the people and services between you and your endpoint can't surveil or modify any of your traffic, then a VPN is perfect for that.  

But buried in that last point is the crux of VPNs and the reason they aren't the big security bonus many people make them out to be: a VPN is only protecting the data flowing between you and it.  

Once the data reaches the VPN, it is decrypted and sent out again, exactly as securely as it was when it was encrypted in the first place. Credentials sent as plaintext will remain sent as plaintext.

If you're worried about your ISP<sup>[1](#1)</sup> spying on you, you've just shifted the problem. Your ISP can't know what you're doing on the VPN, but the ISP of your VPN provider can. People on your local network don't know what you're doing, but snooping can now happen at any point after the VPN. Not to mention what can happen if your VPN provider is less than above-board. Remember, you are now sending all your traffic to a foreign server. Who knows what's going on over there.

VPNs are useful if you do not trust your local network, and there are many times when you don't. It is perfectly reasonable to use a VPN in those instances. Defeating your ISP is a totally fine thing to use a VPN for. Just bear in mind that some other ISP is now monitoring you instead. You may be defeating the Man-In-The-Middle attacker sitting the coffee shop with you, but you what if the outgoing connection your VPN uses is also being MITM'd? It's unlikely, but not impossible.

All of this is to say that VPNs are a good and useful piece of a larger security architecture, but they are not by themselves sufficient for security. Like all other security practices, you need to understand what its real purpose is, and you need to balance it against your own threat models.

<small>
###### <small>1</small>
Additionally, if you're worried about data caps, the ISP still has to transmit the raw bytes, which will count against your limit, so a VPN can't save you here. You're just adding another limit to your bandwidth consumption because now you have to deal with whatever limits the VPN has as well.
</small>