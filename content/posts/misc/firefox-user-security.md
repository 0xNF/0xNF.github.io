---
title: "Towards a Secure and Private Firefox Installation"
date: 2018-07-05T07:20:43-07:00
draft: false
description: "A post where we look at what extensions and browser overrides can make a modern security and privacy focused environment for Firefox in 2018."
categories:
- security
- privacy
- browser
tags:
- overview
- firefox
---

With the massive overhaul that was Firefox Quantum (FF57), it's worth checking out how to make a modern Firefox install secure. 

Much of modern Firefox's security comes from the fact that in addition to doing extensive work on the architecture underlying the browser as a whole, they also removed the old extensions system. That has been a double-edged sword, because many beloved extensions relied on the that old architecture, but the Firefox developers have been working closely with the authors of popular extensions to add back in the necessary pieces they require.

As explained in [this post](), security and privacy are separate but related concepts. Security ultimately comes down to controlling untrusted third-party code, which is what the first extension section covers, and privacy comes down to restricting information flow, which is what the second covers.

Security, like always, comes down to layers. No one thing is a silver bullet, but with enough protections in place, something resembling a secure system comes into existence. And hopefully we can accomplish this without reducing the usability of the web browser too much.

Let's examine some of the ways we can take a fresh install of Firefox make it both secure and private:

# Extensions - Security

These extensions focus on improving the security of your Firefox browsing environment, although they come with privacy benefits as well.

## ![NoScript](https://addons.cdn.mozilla.net/user-media/addon_icons/0/722-64.png?modified=mcrushed) [NoScript](https://addons.mozilla.org/en-US/Firefox/addon/noscript/)

If you can only choose one addon to install, this is the one. This venerated extension has existed since 2004 and is the number one thing to install.

At its most basic level, NoScript is JavaScript whitelisting addon which prevents JavaScript from running on a website by default, unless explicitly allowed by the user. 

JavaScript is untrusted third party code and can have all sorts of negative effects from slowing down your browser, loading potentially malicious advertisements, running crypto-currency miners in the background, or logging your keystrokes in the extreme cases.

Unfortunately, JavaScript is necessary for the proper functioning of many websites, so you will have to enable JavaScript on a lot of sites you encounter, but once you get used to the whitelisting flow, you'll appreciate the additional security and improved performance your browser offers. The web becomes a nicer, smoother experience when javascript is disabled by default.

## ![uBlockOrigin](https://addons.cdn.mozilla.net/user-media/addon_icons/607/607454-64.png?modified=mcrushed) [uBlock Origin](https://addons.mozilla.org/en-US/Firefox/addon/ublock-origin/?src=userprofile)
If you've been using an AdBlocker, then you've been doing good. But if you haven't been using uBlockOrigin, then you can do even better.

The original king of AdBlocking, AdBlock Plus, has changed its priorities and now comes preinstalled with a whitelist of advertiser domains. Companies can pay to be placed on the whitelist, effectively defeating the entire purpose. uBlock Origin is the spiritual successor to AdBlock Plus, and its better in basically every way at that. 

We discussed the performance and privacy benefits of disabling JavaScript by default, and this continues along those lines. Ads are a primary source of website sluggishness, so disabling them will greatly improve performance. Ads are also a primary source of malicious and shady behavior, meaning that you reduce your attack surface, as well as increase your privacy by disabling them. 

You are free to disable the adblocker on any given site if you so choose, but you will likely never encounter a reason to do so. Unlock NoScript, the internet works perfectly well with ads perpetually blocked.

# Extensions - Privacy

These extensions focus on improving the privacy environment of your browser by disabling various tracking methods.

## ![Firefox Multi-Account Containers](https://addons.cdn.mozilla.net/user-media/addon_icons/782/782160-64.png?modified=mcrushed) [Firefox Multi-Account Containers](https://addons.mozilla.org/en-US/Firefox/addon/multi-account-containers/)

Containers are a recently introduced way to divide a Firefox session into any number of completely unrelated sessions - that is, any cookies, local storage, or followed-links aren't shared between contained. This super useful feature allows you to, for instance, be logged into multiple Google or Facebook accounts at the same time.  

In fact, Mozilla's flagship use for this technology is specifically separating Facebook into its own thing. There's a special Facebook Container extension you can install for that  specific usecase, which makes separating Facebook specifically one-click easy. 

It's worth knowing that the Facebook Container is built upon the more general purpose Multi-Account Containers extension linked above. 

This is a great way to keep tracking cookies, session cookies and other identity related information cleanly separated from any other aspect of your web use. 

One wonderful usecase, besides Facebook, is to have a container for your banking activities. Don't let Google track your bank account behavior, and don't let your banks track your behavior across the web. 

Although this is downloaded as an addon, it's a core Firefox feature built and distributed by the Mozilla team themselves.

## ![Privacy Badger](https://addons.cdn.mozilla.net/user-media/addon_icons/506/506646-64.png?modified=mcrushed) [PrivacyBadger](https://addons.mozilla.org/en-US/Firefox/addon/privacy-badger17/)

In place of PrivacyBadger Ghostery and/or Disconnect used to be highly advocated for, but recent developments suggest that both of those extensions are either unhelpful or actively compromised. Stepping up to the plate is Privacy Badger by the Electronic Frontier Foundation. 

An anti-tracking addon, PrivacyBadger looks at the scripts and adverts that a site is trying to load and blocks their attempts to track you. Crucially, PrivacyBadger is trying to prevent violation of consent. PrivacyBadger will monitor for Do-Not-Track requests from your browser, and if a script or ad continues to collect information despite that, PrivacyBadger will blacklist it.

Things blocked by PrivacyBadger include cookies, script loading, and http requests to third parties. 

## ![Tracking Token Stripper](https://addons.cdn.mozilla.net/user-media/addon_icons/939/939692-64.png?modified=1519183224) [Tracking Token Stripper](https://addons.mozilla.org/en-US/Firefox/addon/utm-tracking-token-stripper/)

GoogleAnalytics is a massively popular library supplied by Google that allows developers to embed certain tracking and user statics features into their webpage. Often when sharing a webpage with GoogleAnalytics embedded in it, the URL will contain an extra bit of tracking information known as a UTM - an Urchin Tracking Module. Read more about what these do, straight from the digital marketers who use them [here](https://www.launchdigitalmarketing.com/what-are-utm-codes/). The short of it is that it can contain any kind of embedding that a marketer wants - your user name, what site you came from, your browser history if available.

This addon deletes UTMs of most formats from URLS when they are clicked. This makes it harder for marketers to follow you around on the web.

## ![Cookie AutoDelete](https://addons.cdn.mozilla.net/user-media/addon_icons/784/784287-64.png?modified=mcrushed) [Cookie AutoDelete](https://addons.mozilla.org/en-US/Firefox/addon/cookie-autodelete/?src=userprofile)

This extension contains a lot more complicated behavior than just offering to automatically delete cookies - as it says in the description, once installed it replaces Firefox's default Cookie Manager. 

When you close your browser, all cookies are automatically deleted, which is one of the effects of browsing in private mode, if you choose to do that. 

Additionally, there's a regularly scheduled auto delete function which will periodically delete cookies that have accumulated. This is an optional feature that you can turn on or off at will.

It also allows you to whitelist or greylist domains. Greylisted sites will stay until the end of session, i.e., until you close the browser window, while whitelisted cookies will not be deleted unless manually cleaned. Grey listing overrides the auto-delete system.

Cookies are one of the primary ways companies track you across the internet and use them to associate your identity even across sessions. 


# About:Config changes

In the options menu, or alternatively, at the url `about:preferences`, both lead to the same place, we should check a few of the Privacy and Security options. We're only going to cover options that don't come pre-checked by default from Mozilla.

## Cookies and Site Data

### Accept Third-Party Cookies and Site Data
By default, this is set to `Always`, which is code-word for "third-party". This isn't recommended because third party cookies almost always amount to tracker cookies from advertisers. The recommended option is to select `From Visited`, which means "first party". We can't do away with cookies entirely, but this lets us control them a bit more. 

This is mostly made redundant with the various cookie extensions above, but its nice to tell Firefox to handle it at a lower, more core level as well.

## Tracking Protection

"Send websites a “Do Not Track” signal that you don’t want to be tracked" should be set to `Always`. Without this, PrivacyBadger won't operate properly.

There are some downsides to consider with this, since it can, in certain circumstances, make your browser more likely to be fingerprinted and therefore can actually reduce your privacy sometimes, but other addons like PrivacyBadger work to counteract those effects. 

Enabling Do Not Track is recommended.


# Why not use Chrome?

One question that gets asked sometimes is why not just stick to Chrome? As it pertains to extensions, the Firefox Quantum revamp brought parity to the extension mechanisms, which means, for the most part, that any extension available to Chrome is available to Firefox. That that case, why use Firefox at all?

One of the common cases made for Chrome is that it's fast - Firefox Quantum brings the speed of Firefox past that of Chrome, and now Firefox is the fastest browser around. Memory bloat is no longer an issue with Firefox either, unlike Chrome, which continues to use up to 300mb per tab.

From the security angle however, from the perspective of the user, Chrome's security model is the same as Firefox's. Meaning that it suffers from the same problems of cookies, trackers and potentially malicious advertisements.

The second thing to consider is Google's priorities. Much of the browser that Chrome is built on, Chromium, is open sourced, but the core aspects of it are not. The things that make Chrome into Chrome are not available for review, while the entirety of Firefox is. If this matters to you, then that's a strike against it.

Furthermore, and perhaps more sinisterly, Google is an advertising company for which the vast majority of its revenue comes from enabling the effective delivery of ads, which they do by using your rich user data. This is stance that is fundamentally at odds with user privacy, and Google has a direct conflict-of-interest between offering sufficiently effective privacy focused tooling and satisfying their patrons.  

The Google built-in adblocker for instance comes with whitelisting for certain google domains and trusted advertisers. 

# Final Thoughts

In short, Firefox is:

* Fast
* Open Source
* Privacy Focused

As always, if a website is acting up, you should look into temporarily whitelisting it in your addons. Allow Scripts, followed by allow cookies, followed by allow ads. 

In the most extreme cases, you can disable the addons entirely and try again - but rather than doing that, it is strongly recommended to instead try using the offending website in a different, less locked down browser. Always have a backup browser, maybe even multiple. For me, those backup browsers are Edge, Chrome, and Internet Explorer, in that order.

Enjoy having a secure, private, fast web browsing experience.