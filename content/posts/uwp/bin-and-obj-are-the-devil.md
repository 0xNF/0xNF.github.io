---
title: "Bin and Obj Are the Devil"
date: 2018-06-19T09:06:33-07:00
draft: false
description: "the first in what is likely a series on cache invalidation being hard, where we explore what to do with UWP projects that try to use intermediate compilation and caching, but end up asking us to resolve 'system.string'."
categories:
- UWP
- Cache Invalidation
tags:
- debugging
- csharp
---

the first in what is likely a series on cache invalidation being hard.  

_tl;dr - close Visual Studio and delete your `obj/` and `bin/` directories if your project isn't building and giving cryptic errors._

Your project was working fine, but now all of a sudden it can't find a reference whose location didn't change. Or it won't build because something is out of date. Or the version is incorrect.

Maybe your project is suddenly throwing errors like `cannot find source file` or `xxx does not exist in namespace yyy`. Or maybe `System.String can't be found`, or `byte[] is not a valid type`, or `System.ValueTuple2 cannot be found`.

Nothing changed in your project, except that it was working before and now it can't even find your classes. 

`Clean` succeeds but doesn't help.  
`Rebuild` either fails, or is useless.  

Before you pull your hair out, I think I might know what's wrong. Chances are your `obj/` and `bin/` folders are the problem.

These two folders have been the cause of the vast majority of my UWP development headaches. Ostensibly they exist to provide debug symbols and information when stepping through your project, and to provide incremental compilation so your `build/rebuild` goes faster. These are nice when they work, but when they don't, the whole thing goes to hell.

Sometimes these folders get stuck in a halfway state between the previous build and the new build. Maybe the files were locked by Visual Studio and weren't released before the build process got to it. Maybe Roslyn just messed up. Either way, these two folders are probably the cause of your migraines.  Close Visual Studio, delete `obj/` and `bin/`, and try again.

The next time you rebuild your project, things should just work.