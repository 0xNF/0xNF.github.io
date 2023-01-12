---
title: "Why aren't you using WSL"
date: 2018-06-06T21:38:01-07:00
draft: false
slug: "wsl"
tags:
- wsl
- linux
- command line
- windows
---

A few years ago Microsoft shipped an experimental feature in their insider builds called the `Windows Subsystem for Linux`, which is a bizarrely named thing that runs Linux natively from within Windows.

To nitpick a bit, it doesn't strictly run `Linux` as in the kernel, but it does run the `userspace` applications. And it's not really a Windows-like subsystem for Linux, it's more of a Linux subsystem for Windows, but it's difficult to pronounce "LSW". 

It's capable of running `ELF` binaries natively, which it does by translating Linux syscalls to `NT` equivalent syscalls on the fly. It's pretty damn neat. 

The system has now been out of beta for a while now and it's very stable. 

As an example, I use it to develop NodeJS applications, deploy .NET Core to Linux, ssh into remote machines, and more. If you've been avoiding Windows machines because Apple devices have native Unix tools from their command line, you should give Windows another look.

## Installing WSL

`Start -> Add Features -> Turn Windows Features On or Off -> Windows Subsystem For Linux`.

The thing you're looking for looks like this:

![turn on or off](/usewsl/addfeatures.png)

After the install process finishes, you need to find a Linux distribution you'd like to use. You can find any number of them in the Windows Store:


![get Linux](/usewsl/getlinux.png)

At the moment the packaged distributions available are Kali Linux for all you pen-testers out there, SUSE, openSUSE, Standard Debian, and Ubuntu.
If this list isn't enough for you, the system supports building and supplying your own. If you want to run Arch Linux, go for it.

You can find more about building your own distro on the Microsoft docs page [over here](https://docs.microsoft.com/en-us/Windows/wsl/build-custom-distro).

## Caution

The Windows devs make a big fuss of this point but's worth repeating here too.

Don't ever try to access your Linux filesystem from Windows. You will trash the whole thing and be forced to re-install.

But you are encouraged to do the reverse - access Windows from Linux to your hearts content. This opens up a pretty incredible development workflow where you can use the wonderfully polished world of desktop Windows with the powerful development and deploy tools of Linux.



