---
title: "It's always DNS"
date: 2019-02-25T05:10:26-08:00
draft: false
description: "In which an intractable database issue that couldn't have been DNS was in fact DNS the whole time."
categories:
- development
tags:
- postgres
- dotnet
- networking
---

I had decided that I was going to re-visit the way Lyricall's infrastructure is deployed, because while functional, it was many complicated and esoteric steps away from "one-click deploy". Near the completion of the .NET Core side of the deploy where it became time to test production-like connections to the primary, real database, problems started to arise.

No matter the configuration, .NET was spewing connection refused errors to the postgres backend. I tried the following diagnostic steps:

1. use psql from my host machine to the production database. This succeeded.
1. use psql from my .NET machine to the production database. This succeeded.
1. Run Lyricall locally on my host machine to connect to the production database. This succeeded.
1. Run Lyricall on the .NET server to connect to the production database. This failed.

In between running these steps, I had a number of other attempts at diagnostics as well. Changing the pg_hba.conf settings to accept progressively more open connections, add more detailed debug statements to the .NET server, hard code credentials into the server, remove environment variable resolution, etc. 

Part of the diagnostics issue was that the ADO.NET provider Lyricall uses for postgres, npgsql, doesn't give fully detailed error messages. I was getting "connection refused" from npgsql, which was just turning into generic "socket error" from .NET. Deciding to check out psql pointed me into a more productive direction because it supplies fuller messages. In particular, the "no pg_hba.conf entry for host..." messages are much more helpful for figuring out what direction to go.

Getting that far prompted me to open the pb_hba.conf settings, but even after completely capitulating and both removing the `hostssl` lines and opening up connections to `host all    all     0.0.0.0/0       md5`, functionally equivalent to "literally anyone", it was still failing in 3 of the 4 tests outlined above.

At some point, with about as much hair remaining on my head as ideas to fix this inside it, I decided to just set up a listener on the postgres port on the database machine with `tcpdump -ni any port 5432` and watch what happens when the other 3 valid connections roll in.

Which is when things started to pick up.

Connecting successfully from my host machine via pgsql produced something like:

```
[...many lines of similar looking stuff edited for brevity...]
13:43:16.872823 IP 230.143.164.118 > 128.187.70.78: Flags [P.], seq 663:694, ack 3133, win 490, length 42
```

Connecting successfully from my host machine via the full local Lyricall produced the same output:

```
[...many lines of similar looking stuff edited for brevity...]
13:45:12.231190 IP 230.143.164.118 > 128.187.70.78: Flags [.], ack 5972, win 256, length 0
```

Connecting successfully from my .NET server via pgsql produced basically the same thing

```
[...many lines of similar looking stuff edited for brevity...]
13:47:19.774503 IP 75.238.63.162 > 128.187.70.78: Flags [.],  ack 695, win 490, length 0
```

...but launching the full Lyricall from the .NET server produced something starkly different:
```
13:54:25.145636 IP6 c830:df10:45d:1cf5:c042:8a22:5523:6fa2 > 7003:5172:8292:94ba:7eca:8557:89dc:25b8: Flags [P.],seq 651:682, ack 3128, win 545, options [nop,nop,TS val 3184622547 ecr 968662428], length 31 
```

That's a substantially different look than the others. That's not a regular address, that's an IPv6 address! This connection was refused.

For some reason, .NET on the server was resolving both the outgoing address and the database domain to their IPv6 addresses instead of their IPv4 addresses like it did every other time. This lead me to a bug in my postgres setup. Having neither any rules for allowing IPv6 host access, nor any IPv6 server listening addresses, it would of course refuse any such connections.

The solution was to fix that in my postgres configuration.
 
And once it was set properly, all 4 of the test cases succeeded.

I lost an entire weekend to this, by the way. 

 I still don't know why only one type of connection was resolving to IPv6, but DNS is weird, and it was DNS the whole time.