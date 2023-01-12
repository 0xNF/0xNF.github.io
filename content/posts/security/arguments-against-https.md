---
title: "Arguments Against HTTPS"
date: 2018-09-03T14:50:34-07:00
draft: false
description: "HTTPS is a great but not unmitigated good and there are some real arguments against it. Here we address some of those concerns."
categories:
- Security
- Web
tags:
- HTTPS
- tls
- centralization
---

_Disclaimer: I think HTTPS everywhere is a generally good thing, but it isn't unmitigated. See [this earlier post](/posts/security/https-is-about-respecting-your-users/) about why HTTPS is good and why you should do it._

That being said, there are arguments against it that ought to be taken seriously.

Some of these arguments apply systemically, i.e., because of choices made by the browser vendors, such as the decision to mark all non-HTTPS sites as insecure by default.

Other arguments apply only if you've opted to make your site HTTPS-only, such as CA-uptime.


# Issues
There are essentially two main arguments:

A) Loss of control  
B) Increased maintenance cost

## Partly outsourced site-availability (A)

As long as you're opting for an HTTPS only experience, because anything less would be about as good as not offering it at all, then if your certificate has expired and the certificate authority that issued your cert is unreachable for one reason or another, then your site will be unreachable because you can't renew it.

This is a somewhat fringe concern, but not one to be dismissed out of hand.

## The CA decides your fate (A)

If a certificate authority decides to revoke your cert then your site becomes inaccessible. Whether the CA has due cause or not is irrelevant if your site is offline.


## The browser vendors decide your fate (A)

A cert that gets marked as invalid or otherwise untrusted (see [Symantec](HTTPS://wiki.mozilla.org/CA:Symantec_Issues)) renders your site inaccessible.

This could happen with DigiCert or Comodo on the whims of Google and no one could do a thing about it. 

## Additional complexity: Cert Maintenance (B)

Despite all the advances, Let's Encrypt and the EFF's CertBot are still not as easy to use as they should be to obtain and renew certs. To say nothing of what to do with other certificate vendors, or self-signed certs.

Although short-dated expiration dates on business critical functions is a great way to keep the process in institutional memory, and also encourages strong automation facilities, there's still just enough weirdness with how these programs function to make it non-trivial.

Ignore anyone who demeans you by saying Lets Encrypt is drop-dead simple. It is better but it is not yet good enough.

## Additional Complexity: Software Integrations (B)

Things like Postgres or mail servers need to be updated with new certificate chain information every time a cert is added or renewed. This can range from simple, to complicated and opaque, and either way it is additional complexity.


# Remediation

## Automation Improvements

The situation can be largely improved, both software complexity wise, and certificate maintenance wise with continued investment in automated procedures.

But with respect to the additional complexity of software integrations, the situation can get better but will likely never be alleviated completely. Each piece of software is just too unique to properly account for, and even some standard was developed and adopted, it would inevitably fracture and have their own silly pitfalls, as they all do.

That being said, if CertBot received continued improvements, and SSL-using software like Postgres supplied their own ease of use tools for managing certs, this situation could get a lot better.

## Decentralization

A big problem right now is that Lets Encrypt is the only real player in the free SSL certificate space, which means centralization of your critical resources. 

Lets Encrypt is benevolent, at least for now, and is a positive force on the world, but it doesn't always have to be that way.

Similarly, Lets Encrypt certs are in good standing with Google and Firefox, but it might not always be that way. 

And if Lets Encrypt has uptime issues, the whole internet will know it. If there were more widely used free cert services, we could federate this single-point-of-failure and gain a lot more sense of control back.


# Conclusion

The conclusion isn't much different than the introduction. HTTPS is a worthy cause and a general good, but there are legitimate reasons to be suspicious. We do ourselves a disservice by rejecting the arguments against it. There are real problems to solve with the certificate system, and we should start thinking about how to address them.