---
title: "Implement an OAuth 2.0 Server (Part 05)"
date: 2018-06-06T16:15:59-07:00
draft: false
description: "In this part of our tutorial, we add the models that our application needs to work with, including the OAuth Client Application and OAuth Tokens. We also work with the Entity Framework's Fluent API to properly set up our database with foreign key relationships and ON DELETE CASCADE events."
slug: "05"
categories: 
- Security
- Identity
- Authentication
- Authorization
series:
- Implement an OAuth 2.0 Server
series_weight: 5
tags:
- OAuth2.0
- OpenIdConnect
- Tutorial
- CSharp
- .NET Core
---

Welcome to the fifth part of a series of posts where we will implement an OAuth 2 Server using [AspNet.Security.OpenIdConnectServer](https://github.com/aspnet-contrib/AspNet.Security.OpenIdConnect.Server).


# Adding Models

We can't do very much without creating some models of our domain objects, both in memory and in the database.

At this point in time we only have two main things to worry about, and that's what our `OAuth Client Application` looks like, and how are they owned by `Users`?

The model for OAuth is that there is a provider (`Resource Server`), a user (`Resource Owner`), and an application (`Client`) that a user interfaces with. The OAuth model is useful for being able to provide targeted and pinpoint permissions, while also being able to revoke access to the server with minimal interruption, fanfare, and maintenance.

It's overkill if all you have is a single application, but it opens up an effective security model by allowing a provider to split their services into small pieces. These pieces can be first party, or more commonly, third-party. Users on a platform can create applications that interface with platform resources on behalf of a platform user. 

If you're feeling intrepid, you can read the `OAuth 2.0` specification [here](https://tools.ietf.org/html/rfc6749).

### Entity Framework Notes
Most of the classes we're going to create are going to be `Entity Framework` models, so they're going to get a little messy. 

We trade the drudgery of writing raw SQL and iterating over a `DbDataReader` for writing strangely constructed classes with odd fields.

### Namespacing

Before we get on with creating our models, we should make sure that we're separating our models properly. Since what we'll be creating is in theory one aspect of a larger application, we'll want to namespace out everything we create. 

Under the `Models/` folder, create a new folder called `OAuth/`. Any model work we do will be done under this folder unless otherwise specified.

## Client Application

A Client Application has the following mandatory parts:

1. A Client ID, which uniquely identifies the Client to the server.
1. A Client Secret, which is effectively the Client's password, which the client uses to authenticate itself with the server. 
1. Redirect Url(s), which the server uses as both a validation mechanism and for issuing `access tokens`.

Most clients have additional fields like a `name` and a `description`. The name, description and redirect urls are supplied by the user who generates the client, while the client id and client secret are server generated. 

### OAuthClient Model
Create a new file under `Models/OAuth/` called `OAuthClient.cs` and create a new class named `OAuthClient`:

{{< highlight csharp "linenostart=1" >}}
public class OAuthClient {

    /* EntityFramework classes that have an Id field that deviates from the auto-detectable formats need to have that field annotated with [Key] */
    [Key]
    public string ClientId { get; set; }

    /* Each App needs a Client Secret, but it is assigned at creation */
    [Required]
    public string ClientSecret { get; set; }

    /* Each App Needs an Owner, which will be assigned at creation. This is also a Foreign Key to the Users table. */
    [Required]
    [ForeignKey("Id")]
    public ApplicationUser Owner { get; set; }

    /* This field, combined with the RedirectURI.OAuthClient field, lets EntityFramework know that this is a (1 : Many) mapping */
    public List<RedirectURI> RedirectURIs { get; set; } = new List<RedirectURI>();

    /*  Like above, this notifies EntityFramework of another (1 : Many) mapping */
    public List<Token> UserApplicationTokens { get; set; } = new List<Token>(); 

    /* Each App needs a Name, which is submitted by the user at Creation time */
    [Required]
    [MinLength(2)]
    [MaxLength(100)]
    public string ClientName { get; set; } 

    /* Each App needs a Description, which is submitted by the user at Edit time */
    [Required]
    [MinLength(1)]
    [MaxLength(300)]
    public string ClientDescription { get; set; } 
}
{{< / highlight >}}

We don't have the `RedirectURI` or `Token` classes yet, but we will soon.

The important points are to note the comments. EntityFramework can only generate the tables properly if we have strongly defined `Foreign Key` relationships, which requires us to make some concessions on how we structure our models. Like most ORMs, Entity Framework is a leaky abstraction and our models reflect that.

We also have marked certain fields as `[Required]` or given them `[MinLength]` or `[MaxLength]`. This helps with client-side validation for the user, and makes certain fields non-nullable in the database.

For example, a client is useless without a name, and most OAuth providers require a description - so we will follow along with them and enforce similar rules.

## Redirect URI

Redirect URIs serve two purposes in the OAuth authentication process.  
The first is to provide a list of locations to permit sending a serialized access token. During any given OAuth flow, a response from the server may be sent back to the client as a URL parameter to the specified redirect uri, for example `http://MySuperWebsite.co.jp.us.nl.uk/myapp?access_token=23123`. 

The second is to serve as a validation mechanism - when performing the authentication process, the supplied `RedirctURI` must be an exact match with at least one redirect uri that has already been associated with the client. If you registered an `https` url, but the server is sent a regular `http` url, then according to the spec the process is supposed to fail.

### Redirect URI Model

Create a `RedirectURI.cs` file in the `Models/OAuth/` folder.

```csharp
public class RedirectURI {

    /*  These are the Foreign Key anchors that, combined with the OAuthClient.RedirectURIs field, lets EntityFramework know that this is a (1 : Many) mapping */
    public string OAuthClientId { get; set; }
    public OAuthClient OAuthClient { get; set; }

    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; } 
    public string URI { get; set; }

}
```

This is a bit heavy for what should really just be a free floating string, but EntityFramework requires these classes for it to function properly.

Of note, we've designated `Id` as the EntityFramework equivalent of `PRIMARY KEY INTEGER AUTO INCREMENT`. There is no need to generate an Id when we create a given RedirectUri, the database will handle it for us. 

## Tokens

Tokens are the final result of the entire `ASOS` library and the entire point of the OAuth process. There are two major types of tokens, `access` and `refresh`. Access tokens are only good while they haven't expired, and then they become permanently invalid. A `refresh token` can be sent to the server to obtain a new `access token`. Refresh tokens have varying expiration timers lasting from an hour to forever, depending on your requirements. 

Although a lot of information is serialized into a token, we don't need to worry about modeling any of it here.

The only thing we're concerned with is it's `type` its `value`, and how it it was generated, or, its `grant_type`. In addition, we're going to store the tokens relationship with the `OAuthClient` it's been issued under, and the `ApplicationUser` it's been issued for.

As long as we keep those two relationships straight, we'll be able to perform `Token Revoke` requests properly. You don't have to worry about token revoke yet though, we'll take care of that in [part 10](AYYY).

We don't need to model any other information on a token because `ASOS` will deserialize it and provide us with access to the information during the authentication pipeline, [which we'll also get to later](LMAO).
### Token Model

Create a `Token.cs` file in the `Models/OAuth/` folder.

```csharp
public class Token {

    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int TokenId { get; set; }

    /* How this token was created: 'token', 'authorization_code', 'client_credentials', 'refresh' */
    public string GrantType { get; set; }

    /* Access, Refresh */
    public string TokenType { get; set; }

    /* The raw value of a token. */
    public string Value { get; set; }

    /* Entity Framework Foreign Key Anchors for OAuth Clients */
    public string OAuthClientId { get; set; }
    public OAuthClient Client { get; set; }

    /* Entity Framework Foreign Key Anchors for Users */
    public string UserId { get; set; }
    public ApplicationUser User { get; set; }
}
```
Just like before, we have the necessary Entity Framework navigation properties attached to our model. It's leaky and ugly, but as long as we want to stick to a code-first approach, its the game we have to play.

# Adjusting the ApplicationUser

We're going to want our `ApplicationUser` to have a few extra properties, like what tokens are issued to it, and what, if any, OAuth Clients they have created.

Open `Models/ApplicationUser.cs` and add the following lines

{{< highlight csharp "linenostart=1,hl_lines=3 5" >}}
public class ApplicationUser : IdentityUser {
    /* The list of tokens that have been issued for a given user, across all applications */
    public List<Token> UserClientTokens { get; set; } = new List<Token>(); 
    /* The list of client applications a user has created. This is not the same as the UserClientTokens list. */
    public List<OAuthClient> UsersOAuthClients { get; set; } = new List<OAuthClient>(); 
}
{{< / highlight >}}

# Modifying the Database Context
We'll need to let our `ApplicationDbContext` know that we expect it to handle some new relationships.

## New DBSets
Open `Data/ApplicationDbContext.cs` and add the following fields:

{{< highlight csharp "linenostart=1,hl_lines=3 4" >}}
public class ApplicationDbContext : IdentityDbContext<ApplicationUser> {

    public DbSet<OAuthClient> ClientApplications { get; set; }
    public DbSet<Token> Tokens { get; set; }

    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        // Customize the ASP.NET Identity model and override the defaults if needed.
        // For example, you can rename the ASP.NET Identity table names and more.
        // Add your customizations after calling base.OnModelCreating(builder);
    }
}
{{< / highlight >}}

## FluentAPI Model Builder

Swap out the `OnModelCreating()` method for the following:

{{< highlight csharp "linenostart=1,hl_lines=0" >}}
protected override void OnModelCreating(ModelBuilder builder) {
    base.OnModelCreating(builder);

    /* An OAuthClients name is unique among all other OAuthClients */
    builder.Entity<OAuthClient>()
        .HasAlternateKey(x => x.ClientName);

    /* When an AspNet User is deleted, delete their created OAuthClients */
    builder.Entity<OAuthClient>()
        .HasOne(x => x.Owner)
        .WithMany(x => x.UsersOAuthClients)
        .OnDelete(DeleteBehavior.Cascade);

    /* When an AspNetUser is deleted, delete their tokens */
    builder.Entity<ApplicationUser>()
        .HasMany(x => x.UserClientTokens)
        .WithOne(y => y.User)
        .HasForeignKey(x => x.UserId)
        .OnDelete(DeleteBehavior.Cascade);

    /* When an OAuth Client is deleted, delete any Redirect URIs it used. */
    builder.Entity<RedirectURI>()
        .HasOne(x => x.OAuthClient)
        .WithMany(x => x.RedirectURIs)
        .HasForeignKey(x => x.OAuthClientId)
        .OnDelete(DeleteBehavior.Cascade);


    /* When an OAuth Client is deleted, delete any tokens it issued */
    builder.Entity<OAuthClient>()
        .HasMany(x => x.UserApplicationTokens)
        .WithOne(x => x.Client)
        .HasForeignKey(x => x.OAuthClientId)
        .OnDelete(DeleteBehavior.Cascade);
}
{{< / highlight >}}

Some relationships can't be specified accurately enough via the data annotations that were using above, so we need to dip into Entity Frameworks `Fluent API` to assist it with constructing our database.

What we're doing here is specifying what the `Foreign Keys` are, and setting dependent properties to `ON DELETE CASCADE`. If we skipped doing these things, we'd end up with primary key conflicts in our database because the default behavior for dependent deletes is to `Restrict`, aka, null-out the values but leave the keys in-tact, which is exactly not what we want.


# Second Migration

The introduction made a brief mention of this, but as a reminder, Entity Framework + SQLite gets hairy when migrating foreign key relationships. As a workaround, we'll delete the following files:

1. `Data/Migrations/00000000000000_CreateIdentitySchema.cs`
1. `Data/Migrations/ApplicationDbContextModelSnapshot.cs`
1. `OAuthTutorial.sqlite`

This is an unfortunate workaround because it means we lose old schemas information. Other database providers such as `postgres` or `sql server` don't have this issue.

## Apply the Migration

### Generation
From the Package Manager Console, execute:

```PowerShell
Add-Migration WithModels
```

If you get errors like 

```PowerShell
Add-Migration : Cannot bind argument to parameter 'Path' because it is null.
At line:1 char:1
+ Update-Database
+ ~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidData: (:) [Update-Database], ParameterBindingValidationException
    + FullyQualifiedErrorId : ParameterArgumentValidationErrorNullNotAllowed,Update-Database
```
Just try the command again. Sometimes the Package Manager Console gets funky.

### Application
```PowerShell
    Update-Database
```

If everything succeeds, our `OAuthTutorial.sqlite` file should be generated with all the correct relationships.


# Moving On

The demo of this project to this point can be found [here on GitHub](https://github.com/0xNF/OAuthTutorial/tree/05-Models).

Join us for the next section, where we'll handle the first half of setting up a client management page - the viewmodel and controllers.
[Next](/posts/oauthserver/06)