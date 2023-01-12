---
title: "Long Lived SSH Keys Considered Harmful"
date: 2018-09-03T15:01:45-07:00
draft: false
description: "A small post on why long-lived highly privileged credentials are bad."
categories:
- Security
- Authentication
tags:
- SSH
---

_Disclaimer: This advice goes for any credential, including and especially passwords_

tl;dr:  You should, at regular intervals, change out and retire old SSH keys.

## SSH keys are dangerous

An SSH key should be considered a short-lived resource and as such and should be refreshed periodically. Here are a few reasons why:

* They can be compromised
* They are highly privileged
* They can be automatically generated
* They can easily be replaced on many services


Refreshing your SSH keys has the added benefit of following the Let's Encrypt School of Critical Process Management:

    The important things should be performed at regular intervals to keep institutional memory of the process fresh and resilient against irregular but inevitable failures like employee turnover.

I am paraphrasing the above, but its definitely a philosophy they follow.

This goes for any long-lived highly privileged credential. Passwords too. Even if you [practice good password management](INSERT_LINK_HERE___) you should still cycle out your passwords. This is annoying to do when you try to commit your passwords to memory, but if you are practicing good management, it becomes no bigger an issue than just copy and pasting your password. 


### Side Notes
You should use different SSH Keys for each service, much like how you should use different passwords for each service. `~/.ssh/config` supports this to make it easy.

While we're talking about good SSH hygiene, when you create a key you should encrypt it with a passphrase. *But be sure to use `-o`*. [Don't](http://www.daemonology.net/papers/scrypt-slides.pdf) [accept](https://news.ycombinator.com/item?id=17682946) [the](https://latacora.singles/2018/08/03/the-default-openssh.html) [defaults](https://blog.g3rt.nl/upgrade-your-ssh-keys.html).

Also you should use some kind of proper key storage, because any old userspace process on your system can read your `~/.ssh` directory. Do you trust your development machine? You probably shouldn't.