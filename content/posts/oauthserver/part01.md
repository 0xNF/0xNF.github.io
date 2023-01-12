---
title: "Implement an OAuth 2.0 Server (Part 01)"
date: 2018-06-06T16:15:39-07:00
draft: false
description: "This is the first part of a 19-part tutorial on how to implement an OAuth 2.0 / OpenIdConnect server. This tutorial will take us from start to finish using ASP.NET Core 2 from project creation to azure deployment."
slug: "01"
categories: 
- Security
- Identity
- Authentication
- Authorization
series:
- Implement an OAuth 2.0 Server
series_weight: 1
tags:
- OAuth2.0
- OpenIdConnect
- Tutorial
- CSharp
- .NET Core
---

Welcome to the first part of a series of posts where we will implement an OAuth 2 Server using [AspNet.Security.OpenIdConnectServer](https://github.com/aspnet-contrib/AspNet.Security.OpenIdConnect.Server).

The creator of the library, Kevin Chalet, has an excellent series of [blog posts](https://kevinchalet.com/2016/07/13/creating-your-own-openid-connect-server-with-asos-introduction/), that you are encouraged to read for more information, with less of a hands-on approach.

The final product is available [here on GitHub](https://github.com/0xNF/OAuthTutorial), and at the end of each step the project as completed up to that point will be available on its respective branch.

For a live demonstration of this application - [visit the hosted version on Azure](http://oauthtutorial.azurewebsites.net/), where you can do everything we'll describe.

## Tutorial Table of Contents

1. [Introduction](/posts/oauthserver/01)
1. [Project Setup and Dependency Downloads](/posts/oauthserver/02)
1. [SQLite and Initial Migration](/posts/oauthserver/03)
1. [Public API Barebones Setup](/posts/oauthserver/04)
1. [Adding Models](/posts/oauthserver/05)
1. [OAuth Client CRUD - Controller and ViewModels](/posts/oauthserver/06)
1. [OAuth Client CRUD - Views](/posts/oauthserver/07)
1. [Adding Client Scopes](/posts/oauthserver/08)
1. [Authorization Provider - Authorize Methods](/posts/oauthserver/09)
1. [Authorization Provider - Token Methods](/posts/oauthserver/10)
1. [Services](/posts/oauthserver/11)
1. [Authorization Request Accept/Deny View](/posts/oauthserver/12)
1. [Claims, Identity, Authentication Tickets](/posts/oauthserver/13)
1. [Adding OAuth Token Validation](/posts/oauthserver/14)
1. [Scope Authorization with Policies, Requirements and Handlers](/posts/oauthserver/15)
1. [Token Revocation](/posts/oauthserver/16)
1. [Rate Limiting - Models and Provider Changes](/posts/oauthserver/17)
1. [Rate Limiting - Attribute Creation](/posts/oauthserver/18)
1. [Pushing to Azure](/posts/oauthserver/19)

## Concepts
Along the way you'll be exposed to these concepts:

1. Beginner Concepts:
    1. curl
    1. CRUD
    1. REST APIs
1. Intermediate Concepts
    1. Razor Pages 2.0
    1. Authentication
    1. OAuth 2
    1. Entity Framework Core
    1. Rate Limiting
1. Advanced Concepts
    1. Identity
    1. Claims
    1. Authentication Schemes


## Libraries

We'll be using the following libraries in our application:

1. [AspNet.Security.OpenIdConnect.Extensions](https://www.nuget.org/packages/AspNet.Security.OpenIdConnect.Extensions/)
1. [AspNet.Security.OpenIdConnect.Primitives](https://www.nuget.org/packages/AspNet.Security.OpenIdConnect.Primitives/)
1. [AspNet.Security.OpenIdConnect.Server](https://www.nuget.org/packages/AspNet.Security.OpenIdConnect.Server/)
1. [AspNet.Security.OAuth.Introspection](https://www.nuget.org/packages/AspNet.Security.OAuth.Introspection/)
1. [AspNet.Security.OAuth.Validation](https://www.nuget.org/packages/AspNet.Security.OAuth.Validation/)


## What the application will be able to do
At a high level, our final application will be able to do these things:

* Users will be able to register and login on the website, with persisted login sessions via cookie authentication.
* Users will be able to create/delete OAuth Client Applications, give them a name, a description, and a list of redirect URIs.
* Users will also be able to edit the description and regenerate the `client secret`.
* Our server will support issuing OAuth 2.0 access tokens to those applications with the three major flows:
    * Client Credentials
    * Implicit
    * Authorization Code
* Our server will have a small authenticated-access API that utilizes OAuth Scopes
* Finally, we'll support rate limiting of our endpoints 


# Public API

We'll have a small public API that supports the following unauthenticated, authenticated, unscoped, and scoped endpoints:

* Unauthenticated Methods
    * GET `api/v1/hello`
        * Returns `"Hello"` in the body.
* Authenticated Methods
    * Unscoped Methods
        1. GET `api/v1/clientcount`
            * Returns `number of clients you've registered` in the body
    * Scoped Methods
        1. GET `api/v1/birthdate` 
            * Returns the `user's birthdate` in the body
        1. GET `api/v1/email`
            * Returns the `user's email`
        1. PUT `api/v1/email`
            * Changes the `user's email`
        1. PUT `api/v1/birthdate`
            * Changes the `user's birthdate`
        1. GET `api/v1/me`
            * gets the user object, requires no scopes but additional information is returned if more scopes are present.



# Moving On

In the next section we'll set up the basic project structure and download our libraries.

[Next](/posts/oauthserver/02)