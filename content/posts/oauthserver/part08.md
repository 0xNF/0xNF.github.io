---
title: "Implement an OAuth 2.0 Server (Part 08)"
date: 2018-06-18T18:11:26-07:00
draft: false
description: "We'll add client scopes in this section - such as defining what it takes to read user information like email or birthdate."
slug: "08"
categories: 
- Security
- Identity
- Authentication
- Authorization
series:
- Implement an OAuth 2.0 Server
series_weight: 8
tags:
- OAuth2.0
- OpenIdConnect
- Tutorial
- CSharp
- .NET Core
---

Welcome to the eighth part of a series of posts where we will implement an OAuth 2 Server using [AspNet.Security.OpenIdConnectServer](https://github.com/aspnet-contrib/AspNet.Security.OpenIdConnect.Server).


# Adding Client Scopes

Scopes are ways to limit a client's ability to act on behalf of the user. The scopes are defined by the `Resource Server`, like `Spotify` or `Google`. The client requests the scopes they want to work with, and those scopes are presented to the `Resource Owner` for authorization - they can then choose to accept or reject the authorization request, meaning that just because an application requests certain, potentially high-value access, doesn't mean it automatically gets it.


## Spotify's Scopes Example
We'll take a short tour of `Spotify's` scopes as a demonstration of what we need to implement. You can view their list of scopes [here](https://developer.spotify.com/documentation/general/guides/scopes/).

|Scope Name|Scope Description|
|-------------------|--------------------------|
|`user-library-read`|Read access to a user's "Your Music" library. |
|`user-library-modify`|Write/delete access to a user's "Your Music" library. |
|`user-read-email`|Read access to user’s email address.|
|`user-follow-modify`|Write/delete access to the list of artists and other users that the user follows. |

There are a dozen more potential scopes that Spotify defines for their third-party OAuth Clients, but the idea is clear. Scopes define what a client is allowed to do. The developer of the application selects what scopes they want based on what they need their application to do.

Developers are encouraged to request only the minimum scopes necessary, but it is ultimately up to the user to authorize or reject an applications scope requests. 


## Adding our own Scope Class

Create a new file under `Models/OAuth` named `OAuthScope.cs` and add a class named `OAuthScope`.

We'll be using the `Type-Safe Enum` pattern to define the scopes. You can read more about it [here](https://ardalis.com/enum-alternatives-in-c), or anywhere on google. The basic idea is that `enums` can be a problem because they're a wrapper over `integers`, and therefore, even though you define a handful of enumerations, any valid integer is also a valid `enum` of your type, which can lead to a number of undesirable situations. Additionally, performing enum to string or vice versa operations is expensive. A type-safe enum pattern lets us strongly define the boundaries of our enumerations, while letting us give them low-cost string names.

```csharp
public class OAuthScope {
    private static List<OAuthScope> _AllScopes = new List<OAuthScope>();
    public static IReadOnlyList<OAuthScope> AllScopes => _AllScopes;

    public readonly string Name;
    public readonly string Description;

    private OAuthScope(string name, string description) {
        if (NameInScopes(name)) {
            throw new DuplicateNameException($"Tried to add an OAuthScope with the name {name}, but this name already existed");
        }

        this.Name = name;
        this.Description = description;
        _AllScopes.Add(this);
    }

    public static bool NameInScopes(string name) {
        return _AllScopes.Any(x => x.Name == name);
    }

    public static OAuthScope GetScope(string name) {
        return _AllScopes.First(x => x.Name == name);
    }
}
```
We define a static collection of our scopes that any application that needs to lookup if a scope exists or not can do so. We also allow public access to an `IReadOnlyList` version of the same collection so that any consumer can request a non-modifiable list of scopes. 

Scopes have a description so that the end-user being presented with an authorization request doesn't have to decipher the techno-jargon of our internal naming schemes.

We also add a few helper methods that let us quickly check those collections. Like the base collections the class is built around, accessing without confirming the existence of the requested key may result in an `ArgumentException`. 

A Scope's name is unique- you are free to disable this requirement, but only if it makes sense for you. 
## Adding Scopes

You have to define what you want your application to do before you can start to add meaningful scopes, but since we're at the very least working with `ApplicationUsers`, we can start by locking away some user information behind the appropriate scopes, like Spotify does.

Let's add the following:  

1. `user-read-email`    
1. `user-read-birthdate`
1. `user-modify-email`
1. `user-modify-birthdate`


{{< highlight csharp "linenostart=1,hl_lines=27-30" >}}
public class OAuthScope {

    private static List<OAuthScope> _AllScopes = new List<OAuthScope>();
    public static IReadOnlyList<OAuthScope> AllScopes => _AllScopes;

    public readonly string Name;
    public readonly string Description;

    private OAuthScope(string name, string description) {
        if (NameInScopes(name)) {
            throw new DuplicateNameException($"Tried to add an OAuthScope with the name {name}, but this name already existed");
        }

        this.Name = name;
        this.Description = description;
        _AllScopes.Add(this);
    }

    public static bool NameInScopes(string name) {
        return _AllScopes.Any(x => x.Name == name);
    }

    public static OAuthScope GetScope(string name) {
        return _AllScopes.First(x => x.Name == name);
    }

    public readonly static OAuthScope UserReadEmail = new OAuthScope("user-read-email", "Permission to know your email address");
    public readonly static OAuthScope UserReadBirthdate = new OAuthScope("user-read-birthdate", "Permission to know your birthdate");
    public readonly static OAuthScope UserModifyEmail = new OAuthScope("user-modify-email", "Permission to change your email address");
    public readonly static OAuthScope UserModifyBirthdate = new OAuthScope("user-modify-birthdate", "Permission to change your birthdate");

}
{{< / highlight >}}

The actual assignment and checking of scopes comes later, but this is the groundwork for it.

# Moving On

The demo of this project to this point can be found [here on GitHub](https://github.com/0xNF/OAuthTutorial/tree/08-Scopes).

In the next section, start investigating the heart of the ASOS library and implement the first bits of the Authorization Provider.  

[Next](/posts/oauthserver/09)