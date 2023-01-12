---
title: "Implement an OAuth 2.0 Server (Part 02)"
date: 2018-06-06T16:15:55-07:00
draft: false
description: "In this lightweight part of our OAuth 2 server tutorial, we set up the project, download our dependencies and move on."
slug: "02"
categories: 
- Security
- Identity
- Authentication
- Authorization
series:
- Implement an OAuth 2.0 Server
series_weight: 2
tags:
- OAuth2.0
- OpenIdConnect
- Tutorial
- CSharp
- .NET Core
---
Welcome to the second part of a series of posts where we will implement an OAuth 2 Server using [AspNet.Security.OpenIdConnectServer](https://github.com/aspnet-contrib/AspNet.Security.OpenIdConnect.Server).

# Project Setup and Dependency Downloads

Create a new `ASP.NET Core Web Application` named `OAuthTutorial`. You can use your own name, but make sure to get your namespaces correct if you do.

It's helpful if you have `Create directory for solution` and `Create new Git repository` checked.

![new project](/oauthserver/part02/createnewproject.png)

Select `Web Application (Model-View-Controller)`

![mvc](/oauthserver/part02/projecttype.png)

Click `Change Authentication` and choose `Individual User Accounts` with `Store user accounts in-app`.

![auth](/oauthserver/part02/useraccounts.png)


# Add Packages

Open the `Package Manager Console` and enter the following:


{{< highlight PowerShell "linenos=table, linenostart=1" >}}
Install-Package AspNet.Security.OpenIdConnect.Server -Version 2.0.0-rc2-final
Install-Package AspNet.Security.OpenIdConnect.Extensions -Version 2.0.0-rc2-final
Install-Package AspNet.Security.OpenIdConnect.Primitives -Version 2.0.0-rc2-final
Install-Package AspNet.Security.OAuth.Introspection -Version 2.0.0-rc2-final
Install-Package AspNet.Security.OAuth.Validation -Version 2.0.0-rc2-final
{{< / highlight >}}

# Changing Ports + Disabling SSL
Strictly for development purposes of this demo application, we're going to disable SSL because its more trouble than it's worth at this stage. We don't want to have to keep accepting a new root certificate each time we reboot our development machine, and if you're [using WSL](/posts/misc/wsl), then constantly forcing curl to ignore the invalid cert is also irritating.

We're also going to choose a nicer port for our server. This tutorial will use `5000`.

You can find these settings in the `Project -> OAuthTutorial Properties` menu from the topbar, then selecting `Debug` from the side bar.

![open properties](/oauthserver/part04/openprops.png)

Uncheck `Enable SSL` and change the port in `App URL` to `5000` or something nicer.
Finally, make sure you also change the `Launch Browser` setting to read `http://localhost:5000`. The important take away is to exchange `https` for regular `http` and to make the port the same as the one we selected.

![change the settings](/oauthserver/part04/changeusessl.png)

# Moving On

The demo of this project to this point can be found [here on GitHub](https://github.com/0xNF/OAuthTutorial/tree/02-ProjectSetup).

In the next section we'll adjust the password requirements and create our initial migration.

[Next](/posts/oauthserver/03)