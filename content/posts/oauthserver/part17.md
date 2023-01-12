---
title: "Implement an OAuth 2.0 Server (Part 17)"
date: 2018-06-18T18:11:52-07:00
draft: false
description: "We enter the home stretch of our OAuth server by adding Rate Limits to our application. We use a dual limit structure where we can discriminate against both clients and users individually."
slug: "17"
categories: 
- Security
- Identity
- Authentication
- Authorization
series:
- Implement an OAuth 2.0 Server
series_weight: 17
tags:
- OAuth2.0
- OpenIdConnect
- Tutorial
- CSharp
- .NET Core
---

# Rate Limiting - Models and Provider Changes

There are any number of different ways to implement rate limits - the approach we will follow is outlined like so:

1. All endpoints under `/v1/api` are limited, no endpoint is free.
1. All endpoints share a limit. Calling `/me` 1,999 times, then `/albums` once will rate limit you on the next call. (Assuming a limit of 2,000 for some timeframe.)
1. Renewing a token counts towards the limit - after all, the `token` endpoint is underneath `/api/v1/`.
1. Different levels of authorization are granted different rate limits. In descending order of highest rate limits:
    * Authorization Grants
    * Implicit Grants
    * Client Credentials
1. Rate limits are incremented against both a `client + user` combo, and then again against just the `client`. 
    * This has implications we'll explore below
1. A given client can be granted a rate limit override.
    * The overall limit of a client can be overridden, and
    * The limits granted to subordinate tokens can be overridden
1. Rate Limits are on a rolling timespan of `1 hour`
    * Calls collect for an hour after the initial call, and are purged at the expiration of that hour.


## Implications of `User + Client` separate from  `Client` limits

In our implementation, a given `client` will have two rate limits: One for each user that requests a token, with a varying default based on the `grant_type`, and one for the client itself. The client one will be exponentially higher than the one applied to the users.

By having two rate limits associated with a given `Client`, we can support limiting particularly expensive users while ensuring that a client's other users are unaffected, while also being able to limit an expensive application if necessary. If an applications users are individually medium-weight API consumers, but the application itself grows so big that its strain on the system becomes too great, the ability to restrict the application itself as opposed to an individual user becomes necessary.

In our implementation, we don't care how about a user's pattern of rate limitation across all authorized applications, so we won't be tracking on a per-user basis, just on a token basis, and a client-id basis.


## Note on Sources
The rate limits that we'll produce at the end of this section are adapted from two other places:

* https://www.johanbostrom.se/blog/request-throttling-in-net-core-mvc-and-api
* https://github.com/stefanprodan/AspNetCoreRateLimit

Without these resources, our rate limiting implementation would be a whole lot messier. If either of these solutions fit your use-case better, please refer to them instead. However, they do not readily support ASOS, or a two-tiered rate limit structure like we will implement, so we're going to create our own.


# Rate Limit Model

Rate Limiting will focus around a three-part architecture. We're going to need:

1. The actual rate limit that gets read and written from the database
1. The service that reads and writes limits to an efficient cache
1. And the efficient object representing our rate limit inside that cache.

First, let's make our main model. Under `Models/OAuth/`, create a `RateLimit.cs` file with a `RateLimit` class:

{{< highlight csharp "linenostart=1,hl_lines=0" >}}
public class RateLimit {
    [Key]
    public int RateLimitId { get; set; } // Primary key for Entity Framework, because this will also be a database object

    public int? Limit { get; set; } // Nullable, so that a limit of 'null' may represent no limit at all.

    public TimeSpan? Window { get; set; } // The timespan of the rolling window. 

    [ForeignKey("TokenId")]
    public Token Token { get; set; }

    public string ClientId { get; set; }
    public OAuthClient Client { get; set; }

    public string SubordinatedClientId { get; set; }
    public OAuthClient SubordinatedClient { get; set; }
}
{{< / highlight >}}

It's pretty simple - a Key to denote to Entity Framework what item gets what Rate Limit, and two nullable fields.
`Limit` stores the raw number requests that this Rate Limit will be governed by before considering any additional request to be locked out, and `Window` is the timeframe for when a limit is considered lifted. 

We make these fields nullable to indicate that a Rate Limit does not actually apply. Our service class later on will interpret these nullable values. 

The other fields exist to placate the Entity Framework for the relationships we'll set up in a bit.

# Token Adjustments
Recall that our rate limit implementation will restrict on clients and also on tokens - which means our tokens will need to account for their assigned rate limit, independent of whatever the clients rate limit is.

Open up the `Models/OAuth/Token.cs` class and add a field for its limit:

{{< highlight csharp "linenostart=1,hl_lines=12" >}}
public class Token {

    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int TokenId { get; set; } // This is set by the database and isbn't useful to us as consumers.

    public string GrantType { get; set; } // How this token was created: 'token', 'authorization_code', 'client_credentials', 'refresh'
    public string TokenType { get; set; } //Access, Refresh
    public string Value { get; set; } // The raw value of a token.

    /* Rate limit for this token, which is independant, but lower than, the rate limit of the client that its authenticated to. */
    public RateLimit RateLimit { get; set; } 

    public string OAuthClientId { get; set; }
    public OAuthClient Client { get; set; }

    public string UserId { get; set; }
    public ApplicationUser User { get; set; }
}
{{< / highlight >}}

# OAuth Client Adjustment

Our implementation allows for double overrides of limits - a client's overall client limit can be changed, and the limits that each token generated for the client can be changed. This means we need to two additional fields in our `OAuthClient` class:

{{< highlight csharp "linenostart=1,hl_lines=23 29" >}}
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

    /* This field, combined with the RedirectURI.OAuthClient field, lets EntityFramework know that this is a (1 : Many} mapping */
    public List<RedirectURI> RedirectURIs { get; set; } = new List<RedirectURI>();

    /*  Like above, this notifies EntityFramework of another (1 : Many) mapping */
    public List<Token> UserApplicationTokens { get; set; } = new List<Token>();

    /* A Rate limit object for our client - separate from any rate limits applied to the users of this application. */
    public RateLimit RateLimit { get; set; }

    /* A rate limit objects for tokens issued to this client - usually null
    * but if a client has been granted special overrides, the limits specified here will be issued to the tokens, 
    * as opposed to the default grant_type token limits.
    * This allows us to offer specific applications increased overall limits, and increased per-user limits, if so desired. */
    public RateLimit SubordinateTokenLimits { get; set; }

    [Required]
    [MinLength(2)]
    [MaxLength(100)]
    public string ClientName { get; set; } // Each App needs a Name, which is submutted by the user at Creation

    [Required]
    [MinLength(1)]
    [MaxLength(300)]
    public string ClientDescription { get; set; } // Each App needs a Description, which is submitted by the Creation
}
{{< / highlight >}}


The comments explain it, but to recap, SubordinateTokens, if not null, is our override for the limits that a given token issued against this client will receive. If null, then they receive the standard defaults. Meanwhile, the regular `RateLimit` field is the record for what this client's overall limit across all users will be.

# Third Migration

We need to make some changes to our `ApplicationDbContext.OnModelCreating()` method. Namely, we need to alert Entity Framework that we have rate limits, and that tokens and clients have a relationship to them:

{{< highlight csharp "linenostart=1,hl_lines=15-19 22-26 29-32">}}
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

    /* When an OAuthClient is deleted, delete its Rate Limits */
    builder.Entity<OAuthClient>()
        .HasOne(x => x.RateLimit)
        .WithOne(x => x.Client)
        .HasForeignKey<RateLimit>(x => x.ClientId)
        .OnDelete(DeleteBehavior.Cascade);

    /* When an OAuthClient is deleted, delete its Subordinate Rate Limit */
    builder.Entity<OAuthClient>()
        .HasOne(x => x.SubordinateTokenLimits)
        .WithOne(x => x.SubordinatedClient)
        .HasForeignKey<RateLimit>(x => x.SubordinatedClientId)
        .OnDelete(DeleteBehavior.Cascade);

    /* RWhen a Rate Limit is deleted, delete any Tokens that use this rate limit */
    builder.Entity<RateLimit>()
        .HasOne(x => x.Token)
        .WithOne(x => x.RateLimit)
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
{{< / highlight>}}



## Deletions
At this point we should add our third migration. Of course, with SQLite, that means deleting everything and re-creating our existing migrations.

Remember to delete everything under the `Migrations/` folder, including `xxxx_WithModels.cs` or any other migrations you may have created, any `.Designer` files includes in those migrations, as well as the `ApplicationDbContextModelSnapshot.cs`.

Be sure to delete the `OAuthTutorial.sqlite` file as well.

## Package-Manager

Open the Package Manager Console and do the following:

```PowerShell
Add-Migration WithRateLimit
```

Remember that if you get errors about the path, its the package manager with a temporary error - just try the command again.

Finally, apply the migration to generate our new database:

```PowerShell
Database-Update
```

As always with these sorts of nuclear-redo migrations, you'll have to create a new user, new client application, new redirect uris, and generate yourself some new tokens. 

# Token Defaults

It's convenient to have some defaults in place when it comes to the rate limits associated with tokens. Like alluded to at the top, different tokens can be assigned different rates. Typically, an authorization token, being the heaviest duty code flow, and the most secure, is afforded the highest limit for a token, while client credentials are often strictly limited. 

In the `Models/OAuth/RateLimits.cs` class, let's add some static default limits:

{{< highlight csharp "linenostart=1,hl_lines=18-22 24-28 30-34" >}}
public class RateLimit {

    [Key]
    public int RateLimitId { get; set; } // Primary key for Entity Framework, because this will also be a database object
    public int? Limit { get; set; } // Nullable, so that a limit of 'null' may represent no limit at all.
    public TimeSpan? Window { get; set; } // The timespan of the rolling window. 

    
    [ForeignKey("TokenId")]
    public Token Token { get; set; }

    public string ClientId { get; set; }
    public OAuthClient Client { get; set; }

    public string SubordinatedClientId { get; set; }
    public OAuthClient SubordinatedClient { get; set; }

    public static RateLimit DefaultClientLimit =>
        new RateLimit() {
            Limit = 5, // 10_000
            Window = TimeSpan.FromHours(1),
        };

    public static RateLimit DefaultImplicitLimit => 
        new RateLimit() {
            Limit = 1, // 150
            Window = TimeSpan.FromHours(1)
        };

    public static RateLimit DefaultAuthorizationCodeLimit =>
        new RateLimit() {
            Limit = 500,
            Window = TimeSpan.FromHours(1)
        };
}
{{< / highlight >}}

We've set the limits to be low for testing purposes, but some effective defaults have been commented out right next to our low limits.

In our implementation, any given `OAuthClient` will be able to field `10,000` requests per hour across all of its constituent users. The client will enter rate limit mode if, for example, one user issues one call, and another user issues 9,999 calls. It will also limit in the case of 10,000 users making one call each. 

In the specific case of an application using the `ClientCredentials` flow, then its own rate limit is equivalent to the `DefaultClientLimit`.

We've also granted tiers of limits to other two tokens - an implicit grant has as lower limit than an authorization code grant.

You are encouraged to adjust these numbers in your own implementations - this is just one way to do it.

# Add Rate Limit Values upon Client Creation

Open `OAuthClientsController` under `Controllers/` and take a look at the `Create` method. Add the default rate limit to it:

{{< highlight csharp "linenostart=1,hl_lines=12" >}}
[HttpPost]
[ValidateAntiForgeryToken]
public async Task<IActionResult> Create([Bind("ClientName,ClientDescription")] CreateClientViewModel vm) {
    if (ModelState.IsValid) {
        ApplicationUser owner = await _userManager.GetUserAsync(this.User);
        OAuthClient client = new OAuthClient() {
            ClientDescription = vm.ClientDescription,
            ClientName = vm.ClientName,
            ClientId = Guid.NewGuid().ToString(),
            ClientSecret = Guid.NewGuid().ToString(),
            Owner = owner,
            RateLimit = RateLimit.DefaultClientLimit
        };

        _context.Add(client);
        await _context.SaveChangesAsync();
        return RedirectToAction(nameof(Index));
    }
    return View(vm);
}
{{< / highlight >}}

# Add Rate Limit Values upon Token Creation

In `Providers/OAuthProvider.cs`:
## ApplyAuthorizationRequest

{{< highlight csharp "linenostart=1,hl_lines=19-24" >}}
public override async Task ApplyAuthorizationResponse(ApplyAuthorizationResponseContext context) {
    if (!String.IsNullOrWhiteSpace(context.Error)) {
        return;
    }
    TService = context.HttpContext.RequestServices.GetRequiredService<TokenService>();
    ApplicationDbContext db = context.HttpContext.RequestServices.GetRequiredService<ApplicationDbContext>();
    ClaimsPrincipal claimsUser = context.HttpContext.User;
    // Implicit grant is the only flow that gets their token issued here.
    Token access = new Token() {
        GrantType = OpenIdConnectConstants.GrantTypes.Implicit,
        TokenType = OpenIdConnectConstants.TokenUsages.AccessToken,
        Value = context.AccessToken,
    };

    OAuthClient client = db.ClientApplications.First(x => x.ClientId == context.Request.ClientId);
    if (client == null) {
        return;
    }
    if (client.SubordinateTokenLimits == null) {
        access.RateLimit = RateLimit.DefaultImplicitLimit;
    }
    else {
        access.RateLimit = client.SubordinateTokenLimits;
    }

    await TService.WriteNewTokenToDatabase(context.Request.ClientId, access, claimsUser);
}
{{< / highlight >}}

Because the only token request to be issued out of the `ApplyAuthorizationRequest` endpoint will be an Implicit Grant, we can just assign it the implicit grant items and be on our way. 

The only catch is to check whether the client we're issuing against has an overridden rate limit applied - that is, is its `SubordinateTokenLimits` field null? If a limit exists there, apply it to the token. If not, get the default limit for an implicit grant and move on.

## Apply Token Response

{{< highlight csharp "linenos=inline,linenostart=1,hl_lines=12 21 31 46" >}}
public override async Task ApplyTokenResponse(ApplyTokenResponseContext context) {
    if (context.Error != null) {

    }
    TService = context.HttpContext.RequestServices.GetRequiredService<TokenService>();
    ApplicationDbContext db = context.HttpContext.RequestServices.GetRequiredService<ApplicationDbContext>();
    OAuthClient client = await db.ClientApplications.FirstOrDefaultAsync(x => x.ClientId == context.Request.ClientId);
    if (client == null) {
        return;
    }

    RateLimit rl = client.SubordinateTokenLimits;

    // Implicit Flow Tokens are not returned from the `Token` group of methods - you can find them in the `Authorize` group.
    if (context.Request.IsClientCredentialsGrantType()) {
        // The only thing returned from a successful client grant is a single `Token`
        Token t = new Token() {
            TokenType = OpenIdConnectConstants.TokenUsages.AccessToken,
            GrantType = OpenIdConnectConstants.GrantTypes.ClientCredentials,
            Value = context.Response.AccessToken,
            RateLimit = rl ?? RateLimit.DefaultClientLimit,
        };

        await TService.WriteNewTokenToDatabase(context.Request.ClientId, t);
    }
    else if (context.Request.IsAuthorizationCodeGrantType()) {
        Token access = new Token() {
            TokenType = OpenIdConnectConstants.TokenUsages.AccessToken,
            GrantType = OpenIdConnectConstants.GrantTypes.AuthorizationCode,
            Value = context.Response.AccessToken,
            RateLimit = rl ?? RateLimit.DefaultAuthorizationCodeLimit,
        };
        Token refresh = new Token() {
            TokenType = OpenIdConnectConstants.TokenUsages.RefreshToken,
            GrantType = OpenIdConnectConstants.GrantTypes.AuthorizationCode,
        };

        await TService.WriteNewTokenToDatabase(context.Request.ClientId, access, context.Ticket.Principal);
        await TService.WriteNewTokenToDatabase(context.Request.ClientId, refresh, context.Ticket.Principal);
    }
    else if (context.Request.IsRefreshTokenGrantType()) {
        Token access = new Token() {
            TokenType = OpenIdConnectConstants.TokenUsages.AccessToken,
            GrantType = OpenIdConnectConstants.GrantTypes.AuthorizationCode,
            Value = context.Response.AccessToken,
            RateLimit = rl ?? RateLimit.DefaultAuthorizationCodeLimit,
        };
        await TService.WriteNewTokenToDatabase(context.Request.ClientId, access, context.Ticket.Principal);
    }
}
{{< / highlight >}}

Like before, we grab the client we're dealing with and apply its overridden rate limit to each issued token - or, if an override does not exist, we apply the default for its grant type.

We do not assign limits to a refresh token, because refresh tokens are not used for endpoint access.


# Moving On

The demo of this project to this point can be found [here on GitHub](https://github.com/0xNF/OAuthTutorial/tree/17-RateLimitAssignment).

In the next section, we'll add a `[RateLimit]` attribute that we can decorate our controllers with.

[Next](/posts/oauthserver/18)