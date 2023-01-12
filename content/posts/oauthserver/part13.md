---
title: "Implement an OAuth 2.0 Server (Part 13)"
date: 2018-06-18T18:11:45-07:00
draft: false
description: "Here we work with Identity, Claims, and Authorization tickets so that the OpenIdConnectServer library can generate a valid and useful access token for our users."
slug: "13"
categories: 
- Security
- Identity
- Authentication
- Authorization
series:
- Implement an OAuth 2.0 Server
series_weight: 13
tags:
- OAuth2.0
- OpenIdConnect
- Tutorial
- CSharp
- .NET Core
---

Welcome to the thirteenth part of a series of posts where we will implement an OAuth 2 Server using [AspNet.Security.OpenIdConnectServer](https://github.com/aspnet-contrib/AspNet.Security.OpenIdConnect.Server).

# Identity, Claims, and Authorization Tickets

We've been skirting talking about claims and authentication tickets by hiding all of it behind our `TicketCounter` class. You can get a in-depth overview of what those are over at the [Microsoft Docs](https://docs.microsoft.com/en-us/dotnet/framework/wcf/feature-details/managing-claims-and-authorization-with-the-identity-model#claims).

Claims are how the ASP.NET team has approached identity and authorization details since about 2016. The short of it is that claims are a way of specifying permissions - certain things have claims, other things have claim requirements, and if your claim matches the claims requirement, then you can access the resource locked behind the claim. They're a bit like `roles`, but more low level: roles are just a special claim on an `IdentityUser`.

A collection of claims represents an `Identity`, specifically in our circumstances, they're represented by the `ClaimsIdentity` class. Identity is itself a complicated topic, but it's the fundamental unit behind what we're doing setting up an OAuth server in the first place. Identities and Claims are the two pillars of the 'I' and the 'A' of Identity and Access Management. The 'M' is the easily revocable and scope-separated OAuth layer we're adding.

Finally, an `AuthenticationTicket` is a container for one or more identities belonging to a single owning-entity. It's possible for me to have multiple accounts on one service for instance - this would help resolve that. Importantly, it also holds the authentication scheme in charge of handling the authentication process when the server receives the ticket. For our tutorial, we give it the ASOS default of `OpenIdConnectServerDefaults.AuthenticationScheme`.

We didn't register that explicitly in startup, but because it is the default setting whenever an instance of `OpenIdConnectServer` is registered, it is implicitly specified to be associated with that same authentication scheme. 

When it comes to creating AuthenticationTickets though, we do have to explicitly specify what scheme want to handle it - so in all the tickets we generate, we'll be supplying that same scheme.

# TicketCounter

Under `Providers/`, stub out a static `TicketCounter` class:

```csharp
public static class TicketCounter {
    public static AuthenticationTicket MakeClaimsForClientCredentials(string clientId) {
        return null;
    }

    public static AuthenticationTicket MakeClaimsForInteractive(ApplicationUser user, AuthorizeViewModel authorizeViewModel) {
        return null;
    }
}
```

It' static because we have no need to ever instantiate it. 

## Client Credentials

Because Client Credentials do not involve any user, we have to fudge what it means to have an "Identity".  What we're going to do is set the identity to be the client requesting access to the server, and then we'll just make a note of its grant type.  

When we deserialize these claims later, it'll be impossible to distinguish from the subject id what is meant to be a `user` versus what is a `client`, so the grant type claim will help us differentiate.

```csharp
public static AuthenticationTicket MakeClaimsForClientCredentials(string clientId) {
    ClaimsIdentity identity = new ClaimsIdentity(OpenIdConnectServerDefaults.AuthenticationScheme, OpenIdConnectConstants.Claims.Name, OpenIdConnectConstants.Claims.Role);

    identity.AddClaim(
        new Claim(OpenIdConnectConstants.Claims.Subject, clientId)
            .SetDestinations(OpenIdConnectConstants.Destinations.AccessToken));


    // We serialize the grant_type so we can user discriminate rate-limits. AuthorizationCode grants typically have the highest rate-limit allowance
    identity.AddClaim(
            new Claim("grant_type", OpenIdConnectConstants.GrantTypes.ClientCredentials)
                .SetDestinations(OpenIdConnectConstants.Destinations.AccessToken));

    // We serialize the client_id so we can monitor for usage patterns of a given app, and also to allow for app-based token revokes.
    identity.AddClaim(
            new Claim("client_id", clientId)
                .SetDestinations(OpenIdConnectConstants.Destinations.AccessToken));


    AuthenticationTicket ticket = new AuthenticationTicket(new ClaimsPrincipal(identity), new AuthenticationProperties(), OpenIdConnectServerDefaults.AuthenticationScheme);

    // In our implementation, an access token is valid for a single hour.
    return ticket;
}
```

Take note of the fact that ASOS requires a `ClaimsIdentity` with a `Subject` claim in order to work properly. Typically this represents a more formal identity like a user, but here we'll make it work with the client.

Also take note of the fact that we call `SetDestinations` on every claim that we create - this is an extension method from ASOS under `AspNet.Security.OpenIdConnect.Extensions`. Kevin Chalet explains it in his blog posts, but unless a destination is manually specified like it is here, ASOS will refuse to serialize anything into a token for fear of leaking data.  

All this to say that simply adding a claim and expecting it to work won't produce the results you want - you'll find that upon deserialization the fields you added are missing.

## Interactive Claims

The claims and ticket constructed from using the interactive authorization flows are more complicated than the client credentials claims. 

Because we're dealing with a user now, we have to find some way to put their information into the ticket. To do this, we add a `NameIdentifier` claim with the user's id, we add ` Name` claim with the user's user name, and we manually include the Security Stamp as well. 

The SecurityStamp is an ASP.NET Identity feature that implements a cryptographic hash of all the attributes of a user that are important from an identity and access standpoint. If the user's email changes, the stamp changes. If the user's password changes, the stamp changes. If you have some kind of user biography or self-description and that changes, the stamp does not change. 

The stamp only changes whenever something affecting a users fundamental identity attributes change - this is a way for us to know if a given token is invalid because it was assigned to a user who had critical details changed. 

This ticket that we're creating with the user's identity will allow us down the line to actually sign in with the user without their involvement - which is a neat trick, especially for applications that will interact on their behalf.

Additionally, we include details that aren't just related to identity, but are instead related to the users access to our servers through the requesting client. We include things like the grant type and the client id.

This will help us later when we deserialize the token and implement our actual authorization. For example, knowing the grant type will let us discriminate what kind of rate limit we should give the token - the more heavy weight a token the better rate limits they'll be able to get.

We also need to know the client id upon deserialization in order to check if a token still has access to the server - a deleted client is invalid, a client that has been rate-limited should be denied access, etc. 


```csharp
public static AuthenticationTicket MakeClaimsForInteractive(ApplicationUser user, AuthorizeViewModel authorizeViewModel) {
    /*
        *  If you want to issue an OpenId Token, the spec for which is available at https://openid.net/connect/
        *  Then in each of the SetDestinations, add a reference to OpenIdConnect.Destinations.IdentityToken, like so:
        *  
        *  new Claim("grant_type", OpenIdConnectConstants.GrantTypes.AuthorizationCode)
        *         .SetDestinations(OpenIdConnectConstants.Destinations.AccessToken, OpenIdConnectConstants.Destinations.IdentityToken));
        *         
        *   This ensures that the claims you are concerned about will be placed into the Identity Token, which other services may access.
        */
    ClaimsIdentity identity = new ClaimsIdentity(OpenIdConnectServerDefaults.AuthenticationScheme, OpenIdConnectConstants.Claims.Name, OpenIdConnectConstants.Claims.Role);

    identity.AddClaim(new Claim(ClaimTypes.NameIdentifier, user.Id).SetDestinations(OpenIdConnectConstants.Destinations.AccessToken));
    identity.AddClaim(new Claim(ClaimTypes.Name, user.NormalizedUserName).SetDestinations(OpenIdConnectConstants.Destinations.AccessToken));
    identity.AddClaim(new Claim("AspNet.Identity.SecurityStamp", user.SecurityStamp).SetDestinations(OpenIdConnectConstants.Destinations.AccessToken));

    // We serialize the user_id so we can determine which user the caller of this token is
    identity.AddClaim(
            new Claim(OpenIdConnectConstants.Claims.Subject, user.Id)
                .SetDestinations(OpenIdConnectConstants.Destinations.AccessToken));

    // We serialize the grant_type so we can user discriminate rate-limits. AuthorizationCode grants typically have the highest rate-limit allowance
    if (authorizeViewModel.ResponseType == OpenIdConnectConstants.ResponseTypes.Code) {
        identity.AddClaim(
            new Claim("grant_type", OpenIdConnectConstants.GrantTypes.AuthorizationCode)
                .SetDestinations(OpenIdConnectConstants.Destinations.AccessToken));
    }
    else if (authorizeViewModel.ResponseType == OpenIdConnectConstants.ResponseTypes.Token) {
        identity.AddClaim(
            new Claim("grant_type", OpenIdConnectConstants.GrantTypes.Implicit)
                .SetDestinations(OpenIdConnectConstants.Destinations.AccessToken));
    }

    // We serialize the client_id so we can monitor for usage patterns of a given app, and also to allow for app-based token revokes.
    identity.AddClaim(
            new Claim("client_id", authorizeViewModel.ClientId)
                .SetDestinations(OpenIdConnectConstants.Destinations.AccessToken));


    AuthenticationTicket ticket = new AuthenticationTicket(new ClaimsPrincipal(identity), new AuthenticationProperties(), OpenIdConnectServerDefaults.AuthenticationScheme);

    ICollection<string> scopesToAdd = new List<string>() {
        /* If  you've chosen to add an OpenId token to your destinations, be sure to include the OpenIdCOnnectConstants.Scopes.OpenId in this list */
        //OpenIdConnectConstants.Scopes.OpenId, // Lets our requesting clients know that an OpenId Token was generated with the original request.
    };

    if (authorizeViewModel.ResponseType == OpenIdConnectConstants.ResponseTypes.Code) {
        scopesToAdd.Add(OpenIdConnectConstants.Scopes.OfflineAccess); //Gives us a RefreshToken, only do this if we're following the `Authorization Code` flow. For `Implicit Grant`, we don't supply a refresh token.    
    }
    foreach (string s in authorizeViewModel.Scopes) {
        if (OAuthScope.NameInScopes(s)) {
            scopesToAdd.Add(s);
        }
    }

    ticket.SetScopes(scopesToAdd);

    return ticket;
}
```

Pay attention to the comments regarding the OpenId token - we're not implementing that in this tutorial, but if you are, this is the spot to add it in. 

One quirk of the ASOS library to be aware of is that in order to get a refresh token, you have to add the `OfflineAccess` scope. That is not a self-explanatory description of a refresh token, but that's the only way to get one.

And of course, you should only issue a refresh token if the grant type is for a `Code`, or depending on the requirements, for a grant type of `refresh_token`.

Finally, we have to add the scopes the client requested to the ticket. 

# Moving On

The demo of this project to this point can be found [here on GitHub](https://github.com/0xNF/OAuthTutorial/tree/13-Claims).

In the next section we'll enable OAuth authentication for our endpoints, including handling scopes using ASP.NET `Polcies`.  

[Next](/posts/oauthserver/14)