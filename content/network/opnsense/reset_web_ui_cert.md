---
title: "Reset_web_ui_cert"
date: 2026-03-24T17:54:14+09:00
draft: true
description: "Resetting OPNSense's WebUI TLS Certificate"
categories:
- opnsense
tags:
- tls
- https
- certs
---

Upload a bad certificate to your OPNSense firewall?
If you can ssh in, you can run `configctl webgui restart renew` to reset the certificate and get web-ui access again.

h/t https://docs.opnsense.org/troubleshooting/webgui.html

If you can't ssh in, then you'll need to find another solution.

Good luck.