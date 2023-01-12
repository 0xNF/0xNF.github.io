---
title: "Proper 2-Factor Auth"
date: 2018-08-26T14:55:21-07:00
draft: true
description: "TODO"
categories:
- Authentication
- Security
tags:
- phishing
- FIDO U2F
- 2FA
- MFA
---


* If your 2FA is an SMS message to your phone, you are not doing proper 2FA
* If you only have one 2FA device per account, you will get screwed when that device is lost or dies.
* If you use a manual TOTP 2FA and do not write down your security codes, you will get screwed when that device is lost or dies.
* You should probably use a U2F key instead, because [insert link here] [fishing can happen, even to you](--Insert Link here --).
* Proper storage of your 2FA codes is critical, but the depth of your strategy changes based on your threat model. See also, [threat modeling is how you make the tradeoffs between security vs convenience](--Insert Link Here--).