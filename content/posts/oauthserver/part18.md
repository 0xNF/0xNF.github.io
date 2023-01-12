---
title: "Implement an OAuth 2.0 Server (Part 18)"
date: 2018-06-18T18:11:54-07:00
draft: false
description: "We continue our work on the OAuth server by adding Rate Limits, using a custom controller [Attribute]. Also there are some structs."
slug: "18"
categories: 
- Security
- Identity
- Authentication
- Authorization
series:
- Implement an OAuth 2.0 Server
series_weight: 18
tags:
- OAuth2.0
- OpenIdConnect
- Tutorial
- CSharp
- .NET Core
---

Welcome to the eighteenth part of a series of posts where we will implement an OAuth 2 Server using [AspNet.Security.OpenIdConnectServer](https://github.com/aspnet-contrib/AspNet.Security.OpenIdConnect.Server).


# Rate Limiting - Attribute Creation  

We left off last section with rate limits being granted to the to clients and tokens at creation time, but we don't yet have a way to check those limits when they call our API.

To do so, we'll be making an `Attribute` that we can use to decorate the controllers or methods that we want to be rate limited. 

Create a new folder `Attributes/`, and add `RateLimitAttribute.cs` to it:

```csharp
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class RateLimitAttribute : ActionFilterAttribute {

    public override async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next) {
        return await base.OnActionExecutionAsync(context, next);
    }

}
```

An attribute has a number of virtual methods available for us to override, but the only one we we are interested in is `OnActionExecutingAsync` - and we need the async version because we'll be calling out to the Database for some execution branches.

## Caches

We'll be utilizing the .NET `MemoryCache` class for our rate limiting. These caches contain various algorithmic optimizations that we would surely be worse off implementing ourselves, and they have a neat feature of automatic removal-upon-expiration.

{{< highlight csharp "linenos=inline,linenostart=1,hl_lines=4 6" >}}
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class RateLimitAttribute : ActionFilterAttribute {
    /* The cache for all items that will be placed into our rate limit cache */
    private static MemoryCache Cache { get; } = new MemoryCache(new MemoryCacheOptions());
    /* For items that are granted no-rate-limit, place their id in here so that we may avoid multiple database calls. */
    private static MemoryCache WhiteList { get; } = new MemoryCache(new MemoryCacheOptions());

    public override async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next) {
        await base.OnActionExecutionAsync(context, next);
    }
}
{{< / highlight >}}

## OnActionExecutionAsync

The heart of the attribute, and more importantly, all of its logic, lies in the OnActionExecution methods.

### Requisite Information Setup

{{< highlight csharp "linenostart=1,hl_lines=12 22" >}}
public override async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next) {
    ApplicationDbContext db = context.HttpContext.RequestServices.GetRequiredService<ApplicationDbContext>();
    Claim clientIdClaim = context.HttpContext.User.Claims.FirstOrDefault(x => x.Type == "client_id");
    string token = TokenFromContext(context);

    if (clientIdClaim == null || String.IsNullOrWhiteSpace(clientIdClaim.Value) || String.IsNullOrWhiteSpace(token)) {
        context.Result = new ContentResult { Content = "Failed to find appropriate claims" };
        context.HttpContext.Response.StatusCode = (int)System.Net.HttpStatusCode.BadRequest;
    }

    await base.OnActionExecutionAsync(context, next);
}
{{< / highlight >}}

To properly do rate limiting, we'll need access to the the token doing the requesting and the client the APIs are acting through. Because the RateLimit attribute necessarily comes after the incoming request has been `Authorized`, the claims in the token have been deserialized by ASOS and are available for examining here. Unfortunately, the token is a bit harder to access from this context, so we have a helper method that will be explained later.

### Lazy Function Closures

{{< highlight csharp "linenostart=1,hl_lines=7-14" >}}
public override async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate {
    
    ...

    /* Closures representing the way to get the rate limit of the relevant item, if necessary.
    * These are lazily executed functions and won't be called unless a given id isn't in our cache. */
    async Task<RateLimit> RateLimitFromToken() {
        RateLimit rl = (await db.Tokens.Include(x => x.RateLimit).FirstOrDefaultAsync(x => x.Value == token))?.RateLimit;
        return rl;
    }
    async Task<RateLimit> RateLimitFromClient() {
        RateLimit rl = (await db.ClientApplications.Include(x => x.RateLimit).FirstOrDefaultAsync(x => x.ClientId == clientIdClaim.Value))?.RateLimit;
        return rl;
    }

    await base.OnActionExecutionAsync(context, next);
}
{{< / highlight >}}

With an empty cache or with an item whose limit has already expired, we won't have the necessary rate limit information and won't be able to accurately increment or check the limit counts. We solve this by adding two internal functions that are ready-to-execute and return the necessary information. Like the comment says, they are lazy, and won't be executed every time. We just need to store the how, not the what. 

Additionally, the returns use the `safe navigation operator (?.)` so that any errors that occur in the fetching will also return null, instead of throwing an exception. This returned null value will be interpreted as a signal to short circuit the operation.

### Cache Apply
{{< highlight csharp "linenostart=1,hl_lines=12 22" >}}
public override async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate {
    
    ...

    bool shortCircuit = await CheckOrApplyRateLimit(token, RateLimitFromToken, "You have issued too many requests. Please check the retry-after headers and try again.", context);
    if (!shortCircuit) {
        /* If the specific token has been rate limited, don't add a count to the Client's overall limit, just exit early. */
        await CheckOrApplyRateLimit(clientIdClaim.Value, RateLimitFromClient, "The application being used has issued too many requests. Please contant the application author.", context);
    }

    await base.OnActionExecutionAsync(context, next);
}
{{< / highlight >}}

The last part of the main function is the application of all the set-up materials. We check the cache of the token first, and if its not rate limited, we check the cache of the limit of the client as a whole.

## The whole function Rate Limit function
The entire function, unbroken, is as follows:

{{< highlight csharp "linenostart=1,hl_lines=0" >}}
public override async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next) {
    ApplicationDbContext db = context.HttpContext.RequestServices.GetRequiredService<ApplicationDbContext>();
    Claim clientIdClaim = context.HttpContext.User.Claims.FirstOrDefault(x => x.Type == "client_id");
    string token = TokenFromContext(context);

    if (clientIdClaim == null || String.IsNullOrWhiteSpace(clientIdClaim.Value) || String.IsNullOrWhiteSpace(token)) {
        context.Result = new ContentResult { Content = "Failed to find appropriate claims" };
        context.HttpContext.Response.StatusCode = (int)System.Net.HttpStatusCode.BadRequest;
        return;
    }

    /* Closures representing the way to get the rate limit of the relevant item, if necessary.
    * These are lazily executed functions and won't be called unless a given id isn't in our cache. */
    async Task<RateLimit> RateLimitFromToken() {
        RateLimit rl = (await db.Tokens.Include(x => x.RateLimit).FirstOrDefaultAsync(x => x.Value == token))?.RateLimit;
        return rl;
    }
    async Task<RateLimit> RateLimitFromClient() {
        RateLimit rl = (await db.ClientApplications.Include(x => x.RateLimit).FirstOrDefaultAsync(x => x.ClientId == clientIdClaim.Value))?.RateLimit;
        return rl;
    }

    bool shortCircuit = await CheckOrApplyRateLimit(token, RateLimitFromToken, "You have issued too many requests. Please check the retry-after headers and try again.", context);
    if (!shortCircuit) {
        /* If the specific token has been rate limited, don't add a count to the Client's overall limit, just exit early. */
        await CheckOrApplyRateLimit(clientIdClaim.Value, RateLimitFromClient, "The application being used has issued too many requests. Please contant the application author.", context);
    }

    await base.OnActionExecutionAsync(context, next);
}
{{< / highlight >}}

## Helper 1 - Check or Apply Rate Limit

```csharp
private async Task<bool> CheckOrApplyRateLimit(string id, Func<Task<RateLimit>> f, string limitAppliedMessage, ActionExecutingContext context) {
    /* If the item is whitelisted, bail early */
    if (WhiteList.TryGetValue(id, out bool whitelisted)) {
        return true;
    }
    if(!Cache.TryGetValue(id, out LimitCounter counter)) {
        RateLimit rl = await f();
        if(rl == null) {
            /* Something happened to the client application between the receipt of request and the receipt of rate limit. 
             * So we'll just short circuit and bail early */
            return true; 
        }
        return InsertLimit(id, rl);
    } else {
        return CacheUpdate(context, id, counter, limitAppliedMessage);
    }
}
```

Given a id for the cache item, the lazy function that describes how to get a rate limit from the database, the message to respond with if limiting occurs, and the context for the application, we do the following:

If the id is found in the white list, we quit early.  

If the item isn't found in the cache at all, we execute our lazy function to get the rate limits, and insert it into the cache. Side note, if an error occurs, we fail open.  

Finally, if the item is found in the cache, we increment the limit count with another helper function. 

## Helper 2 - Insert Limit

```csharp
/* Inserts the limit as a LimitCounter struct tied to the given id, and expiring when the Window lapses.
* The boolean returned indictes whether this item was whitelisted, and therefore if we should
* short-circuit our computation and return early. 
*/
private bool InsertLimit(string id, RateLimit limit) {
    DateTimeOffset now = DateTimeOffset.UtcNow;
    /* Nulls in these spots mean this item is whitelisted. Add it to our whitelist. */
    if (limit.Window == null || limit.Limit == null) {
        /* White-listing lasts one hour, so that if whitelisting status changes, server won't require a restart to clear the cache. */
        WhiteList.Set(id, true, new MemoryCacheEntryOptions().SetAbsoluteExpiration(TimeSpan.FromHours(1)));
        return true;
    }
    else {
        LimitCounter counter = new LimitCounter(now, limit.Window.Value, 1, limit.Limit);
        Cache.Set(id, counter, new MemoryCacheEntryOptions().SetAbsoluteExpiration(limit.Window.Value)); // Passed a null check above, value exists
        return false;
    }
}
```

For a limit that isn't cached, we either add it to the cache with initial values set to 1 API call starting `UTCnow()`, or, if the item is unlimited, we add it to the Whitelist cache.  

In either case, we give the cached item a time limit of `1 hour`, which helps us avoid server resets if an applications whitelist status changes. 

## Helper 3 - Cache Update

```csharp
/* Updates the the cached item with an incremented call-count.
* Returns whether our incremented count puts us over the limit for the token
* If so, boolean indicates whether we should short-circuit our conputation and return early.
*/
private bool CacheUpdate(ActionExecutingContext context, string id, LimitCounter oldCounter, string message) {
    LimitCounter updatedCounter = new LimitCounter(oldCounter.FirstCallTimestamp, oldCounter.Window, oldCounter.CallCount + 1, oldCounter.Limit);

    /* Cache will periodically prune itself, but if we happen to pull one that expired, we'll take care of it. */
    if (oldCounter.FirstCallTimestamp + oldCounter.Window <= DateTimeOffset.UtcNow) {
        Cache.Remove(id);
        return false;
    }

    /* Due to the nature of distributed or off-site storage, limits may be incremented past their theoretical max. 
        * We account for this with a greater than check, rather than a strict equals check */
    if (updatedCounter.CallCount > updatedCounter.Limit) {
        TimeSpan availableAt = (updatedCounter.FirstCallTimestamp + updatedCounter.Window) - DateTimeOffset.UtcNow;

        context.Result = new ContentResult { Content = message };
        context.HttpContext.Response.StatusCode = 429; /* Too Many Requests */
        context.HttpContext.Response.Headers.Add("Retry-After", availableAt.TotalSeconds.ToString());
        return true;
    }
    else {
        Cache.Set(id, updatedCounter, new MemoryCacheEntryOptions().SetAbsoluteExpiration(updatedCounter.FirstCallTimestamp + updatedCounter.Window));
        return false;
    }
}
```

Because we can't actually update an item in the cache, we'll have to overwrite it with a new entry that is functionally identical except for its incremented call count.  

To make up for the fact that we're actually inserting a new item, we'll give it a time-to-expiration that is the remaining time of the old item.

## Helper 4 - Token From Context

```csharp
/* Because Tokens are not serialized into themselves, we cannot extract the relevant info 
* from the claims alone. We must therefore manually grab the Authorization header ourselves.
*/
private string TokenFromContext(ActionExecutingContext context) {
    string AuthScheme = AspNet.Security.OAuth.Validation.OAuthValidationDefaults.AuthenticationScheme;
    string BearerToken = context.HttpContext.Request.Headers["Authorization"].FirstOrDefault(x => x.StartsWith(AuthScheme));
    string token = "";
    if (String.IsNullOrWhiteSpace(BearerToken)) {
        context.Result = new ContentResult { Content = "Authorization header was missing" };
        context.HttpContext.Response.StatusCode = (int)System.Net.HttpStatusCode.BadRequest;
    }
    else {
        string[] bearerSplit = BearerToken.Split(AuthScheme+" ");
        if (bearerSplit.Length == 0 || String.IsNullOrWhiteSpace(bearerSplit[1])) {
            context.Result = new ContentResult { Content = "Authorization was incorrectly formatted" };
            context.HttpContext.Response.StatusCode = (int)System.Net.HttpStatusCode.BadRequest;
        }
        token = bearerSplit[1];
    }
    return token;
}
```

We only need this because we can't get the actual token being used from the helper methods on the context - so we have to get it ourselves. We can do this because the context that is passed to the original `OnExecutingAction` function is also passed the `HttpContext`, which contains the header information necessary.

We use the default OAuth validation scheme name ("Bearer"), but we should stick to the defaults and avoid the hardcoded stuff were possible.  

One thing to pay attention to is that when we split the bearer token, we add a space - this is just how http headers are formed, so we accommodate for that.

# RateLimitCounter

We've been referencing a `LimitCounter` object, which is a simple `struct` (not class) that stores the information necessary to write efficiently to the cache.

Create a `LimitCounter.cs` class under `Models/OAuth/`:

{{< highlight csharp "linenostart=1,hl_lines=0" >}}
public struct LimitCounter {
    public readonly DateTimeOffset FirstCallTimestamp;
    public readonly TimeSpan Window;
    public readonly int CallCount;
    public readonly int? Limit;

    public LimitCounter(DateTimeOffset firstCallTimestamp, TimeSpan window, int callCount, int? limit) {
        FirstCallTimestamp = firstCallTimestamp;
        CallCount = callCount;
        Limit = limit;
        Window = window;
    } 
}
{{< /highlight >}}

# Add the Attribute to the Each Method

The last step is to apply our rate limiting attribute. You can choose to apply it only to specific methods, or to an entire controller. Because we want to keep `/hello` as an unauthenticated endpoint, we'll apply it to each authorized method instead: 

{{< highlight csharp "linenostart=1,hl_lines=1 8 15 22 29" >}}
[RateLimit]
[Authorize(AuthenticationSchemes = AspNet.Security.OAuth.Validation.OAuthValidationDefaults.AuthenticationScheme)]
[HttpGet("clientcount")]
public async Task<IActionResult> ClientCount() {
    return Ok("Client Count Get Request was successful but this endpoint is not yet implemented");
}

[RateLimit]
[Authorize(AuthenticationSchemes = AspNet.Security.OAuth.Validation.OAuthValidationDefaults.AuthenticationScheme, Policy = "user-read-birthdate")]
[HttpGet("birthdate")]
public IActionResult GetBirthdate() {
    return Ok("Birthdate Get Request was successful but this endpoint is not yet implemented");
}

[RateLimit]
[Authorize(AuthenticationSchemes = AspNet.Security.OAuth.Validation.OAuthValidationDefaults.AuthenticationScheme, Policy = "user-read-email")]
[HttpGet("email")]
public async Task<IActionResult> GetEmail() {
    return Ok("Email Get Request was successful but this endpoint is not yet implemented");
}

[RateLimit]
[Authorize(AuthenticationSchemes = AspNet.Security.OAuth.Validation.OAuthValidationDefaults.AuthenticationScheme, Policy = "user-modify-birthdate")]
[HttpPut("birthdate")]
public IActionResult ChangeBirthdate(string birthdate) {
    return Ok("Birthdate Put successful but this endpoint is not yet implemented");
}

[RateLimit]
[Authorize(AuthenticationSchemes = AspNet.Security.OAuth.Validation.OAuthValidationDefaults.AuthenticationScheme, Policy = "user-modify-email")]
[HttpPut("email")]
public async Task<IActionResult> ChangeEmail(string email) {
    return Ok("Email Put request received, but function is not yet implemented");
}
{{< / highlight >}}

# Testing the Rate Limits

Launch your server.  

Because we created a new migration last time, we'll need to create another new user, client with redirect uris, and issue a new token. Once you've done that, try calling the `/clientcount` endpoint twice in a row:

{{< highlight csharp "linenostart=1,hl_lines=3" >}}
djori@jormungandr:~/projects/OAuthTutorial$ curl -H "Authorization: Bearer CfDJ8IGBmusd_JZPhIsNcrUVwgdUlbovc7WYVUPbiagJast6__y3Ez-AhgxgP3QucEwH4H3GZZpLdboWaZ0XgC5yRIbMNGGICIHK_rCwvVKzAo29odjcbMiMDMXx8tAYzS4oXfMpN6mTuP_ci14dbXJ8T_1CiSkyF3DG0bVKaAdJz97BrYojYTdEl1ttJFGxIr9Mrood3E79iY4GBQjIlJ6worfBntJiH7iva4DUBU1QbLgIxTtX004OCRpU_p8BDyYMcuJtc5DLmFHzYxSLErX4PhwKS00BT1mhCXMrL1z3sb0DLDpJcz-k3UeoebF0NTNDpnlQph0FB9geynS91VuoV3VDcJvRiobERG6AYyjRSnp3XbBnaq9e0ZA6kWx0SQJbwmVXBHVwSHB27hty3r9yXjHio4vbeYJLc75pxd5FgAOQwPkVDDEVqb79bDTMdRIAgrohhZRJ8IHw2V61FwLOlAOjXrKJCFgRzDhralpN92KTFY8sqNMzhwPAhuriHBj7VssO1mq8gbkFYNQYZ7jn_N3Yale6E9gXCcdYrSvqGyU-2iG7ssiSXa5l8fFcy6tB1f0rAhNfW-dmOY-zT2OvR0OiFWNWgKxfYOhiBafsgQ-IB72Y_ABeCnEy4eoanC2wP3Sl6gdbnkRzoXcMyJFdeSR_xenB2Td897rLkK8MdWltPPXH2U8DrbgiOJAZI1BywFgchF0cEO46mn5JmVPAi7FGej4nPezHVYiufmvGyCbKi54jv2DNVsjxU-20_5QQOMh1TWSrf3Tphquo03wTKEa7dNqyOwTTtudtDKV_BTehB-_kj_gQYvT8o5qmo93A86qNzEwZWgNW4UQM8SbCg4O_PWd3UBZ6-2OIC8QeQbYklC3LO8-3NWYPnux8clA1QLnHGzNS_ZLHCobLq8wnuNQAgs7qmqtLkpfRRbH7F-SdtHVEv9Jbo2srLuIpaD1cPA" http://localhost:5000/api/v1/clientcount

Client Count Get Request was successful but this endpoint is not yet implemented
{{< / highlight >}}

The first time returns correctly.

Trying it again however, yields a different result.

{{< highlight csharp "linenostart=1,hl_lines=3" >}}
[...]
> GET /api/v1/clientcount HTTP/1.1
> Host: localhost:5000
> User-Agent: curl/7.47.0
> Accept: */*
> Authorization: Bearer CfDJ8IGBmusd_JZPhIsNcrUVwgdUlbovc7WYVUPbiagJast6__y3Ez-AhgxgP3QucEwH4H3GZZpLdboWaZ0XgC5yRIbMNGGICIHK_rCwvVKzAo29odjcbMiMDMXx8tAYzS4oXfMpN6mTuP_ci14dbXJ8T_1CiSkyF3DG0bVKaAdJz97BrYojYTdEl1ttJFGxIr9Mrood3E79iY4GBQjIlJ6worfBntJiH7iva4DUBU1QbLgIxTtX004OCRpU_p8BDyYMcuJtc5DLmFHzYxSLErX4PhwKS00BT1mhCXMrL1z3sb0DLDpJcz-k3UeoebF0NTNDpnlQph0FB9geynS91VuoV3VDcJvRiobERG6AYyjRSnp3XbBnaq9e0ZA6kWx0SQJbwmVXBHVwSHB27hty3r9yXjHio4vbeYJLc75pxd5FgAOQwPkVDDEVqb79bDTMdRIAgrohhZRJ8IHw2V61FwLOlAOjXrKJCFgRzDhralpN92KTFY8sqNMzhwPAhuriHBj7VssO1mq8gbkFYNQYZ7jn_N3Yale6E9gXCcdYrSvqGyU-2iG7ssiSXa5l8fFcy6tB1f0rAhNfW-dmOY-zT2OvR0OiFWNWgKxfYOhiBafsgQ-IB72Y_ABeCnEy4eoanC2wP3Sl6gdbnkRzoXcMyJFdeSR_xenB2Td897rLkK8MdWltPPXH2U8DrbgiOJAZI1BywFgchF0cEO46mn5JmVPAi7FGej4nPezHVYiufmvGyCbKi54jv2DNVsjxU-20_5QQOMh1TWSrf3Tphquo03wTKEa7dNqyOwTTtudtDKV_BTehB-_kj_gQYvT8o5qmo93A86qNzEwZWgNW4UQM8SbCg4O_PWd3UBZ6-2OIC8QeQbYklC3LO8-3NWYPnux8clA1QLnHGzNS_ZLHCobLq8wnuNQAgs7qmqtLkpfRRbH7F-SdtHVEv9Jbo2srLuIpaD1cPA
>
< HTTP/1.1 429 Too Many Requests
< Content-Length: 86
< Content-Type: text/plain; charset=utf-8
< Retry-After: 3448.9964656
< Server: Kestrel
< X-SourceFiles: =?UTF-8?B?QzpcVXNlcnNcRGpvcmlcRG9jdW1lbnRzXHByb2plY3RzXE9BdXRoVHV0b3JpYWxcT0F1dGhUdXRvcmlhbFxhcGlcdjFcY2xpZW50Y291bnQ=?=
< X-Powered-By: ASP.NET
< Date: Mon, 18 Jun 2018 21:08:36 GMT

You have issued too many requests. Please check the retry-after headers and try again.
{{< / highlight >}}



# Moving On

The demo of this project to this point can be found [here on GitHub](https://github.com/0xNF/OAuthTutorial/tree/18-RateLimitAttribute).

In the next and final section, we'll push our application to Azure.

[Next](/posts/oauthserver/19)
