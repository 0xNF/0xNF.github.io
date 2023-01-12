---
title: "HTTPS Is About Respecting Your Users"
date: 2018-07-24T16:47:57-07:00
draft: false
description: "One common misconception about https is that it is way to secure your site - this is incorrect. It is about ensuring the integrity of your data and respecting your users."
categories:
- security
- privacy
tags:
- https
---

### Respect Your Users
As of July 24th, 2018, Google Chrome is visibly marking all non-HTTPS sites as "not secure". In light of this, it might be prudent to elaborate on what exactly HTTPS is meant to do.

A site without HTTPS is vulnerable to Man-In-The-Middle (MITM) attacks, which Troy Hunt shows off convincingly over at https://www.troyhunt.com/heres-why-your-static-website-needs-https/  

That site is all about demonstrating through words, video, and actions, what happens when you don't have HTTPS. What I want to touch on is why, morally speaking, HTTPS is a good thing. 

HTTPS is an encryption method that encrypts:

1. Page URL (although not the domain name)
1. Page Content

The only two entities who can decrypt an HTTPS page are the server sending the page and the entity requesting the page. This entity is usually, but not always, a browser like Chrome or Firefox. 

The primary benefit of this is that the user can trust that the data is correct. It cannot be tampered with in-flight.<sup>[1](#1)</sup> With HTTPS, the user has obtained [Information Assurance](https://en.wikipedia.org/wiki/Information_Assurance), and thus a level of confidence they did not possess prior. They can be sure that the data you intended to deliver is the data that they received, without anything modified, deleted, or added on by anyone else.<sup>[2](#2)</sup>

What this means in practice is that ISP's can't [shove unwanted messages](https://zdnet2.cbsistatic.com/hub/i/r/2015/11/23/296d2de3-4bb9-466c-b5a4-0a302b833e68/resize/770xauto/7f2485f3149b0b1b8d0caf736a76f1ec/comcast-stack.jpg) into your user's faces, their local coffee shop script kiddie can't use hidden fields to try to steal their credentials, Ukrainian hackers can't make their browser do cryptomining, and they can't be unintentionally redirected to some other site.  

None of this has any benefit to you, the site owner<sup>[3](#3)</sup>. Not directly. Your site is exactly as secure (or insecure) as it would be without HTTPS. Your administrative credentials are exactly as secure, your server processes are exactly as memory-safe, the files being served remain as unmodified and readonly as they were before. 

The security is for the user. The user can trust your site more. What you intended to deliver is what was delivered. Https is about respecting your users. It's about respecting their time, their machine's resources, and their privacy.

Be a good internet citizen, enable HTTPS today.

<small>
###### <small>1</small>
In theory, an attacker with immense resources like a nation-state could use, for example, statistical analyses techniques to alter the bits in-transit to something meaningful, but this is a theoretical, highly targeted, and necessarily resource intensive attack. If this is happening to you, you have much larger things to worry about.

###### <small>2</small>
HTTPS guarantees that the data received is the data sent - if you choose to embed malicious iframes or load Googles's tracking script, the user is still being put at risk but it will be intentional on your part.

###### <small>3</small>
In some cases you, the site owner, actually do directly benefit. Imagine that you have a client-server application, and your server is sending data to the client. An attacker could corrupt, or worse, modify, your data in-flight causing your application to perform erroneously or operate on incorrect data. This is not the majority use-case for HTTPS, but it is no less legitimate a reason for enabling
</small>
