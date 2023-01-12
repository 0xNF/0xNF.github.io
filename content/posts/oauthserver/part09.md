---
title: "Implement an OAuth 2.0 Server (Part 09)"
date: 2018-06-18T18:11:28-07:00
draft: false
description: "This is our first real exposure to the OpenIdConnectServer library - this is part 1 of 2 for setting this class up. We'll handle the Authorization series of methods in this section."
slug: "09"
categories: 
- Security
- Identity
- Authentication
- Authorization
series:
- Implement an OAuth 2.0 Server
series_weight: 9
tags:
- OAuth2.0
- OpenIdConnect
- Tutorial
- CSharp
- .NET Core
---

Welcome to the ninth part of a series of posts where we will implement an OAuth 2 Server using [AspNet.Security.OpenIdConnectServer](https://github.com/aspnet-contrib/AspNet.Security.OpenIdConnect.Server).


# Authorization Provider - Authorize Methods

It's worth taking a moment to have an overview of how the `OpenIdConnectServer` library actually works. You are encouraged to read Kevin Chalet's post [here](https://kevinchalet.com/2016/07/13/creating-your-own-openid-connect-server-with-asos-creating-your-own-authorization-provider/).

An authorization provider is an implementation of the `OpenIdConnectServerProvider` type which overrides the virtual methods we want to implement. We're going to leave most of these un-overridden, but if you ever need additional functionality, you can always override it and inspect/implement that stage of the pipeline.


## Provider Stub

Create a new folder named `Providers/`, and to it a class named `OAuthProvider`. Make sure it inherits from `OpenIdConnectServerProvider`.

```csharp
public class OAuthProvider : OpenIdConnectServerProvider {
    // TODO it's empty now, but we'll fill it in in a bit.
}
```

## Startup Registration

`Startup.cs`

We need to add our OAuth server to the middleware pipeline, which we do by calling it on the `ConfigureServices()` method chain.

{{< highlight csharp "linenos=inline,linenostart=1,hl_lines=16-28 33" >}}
public void ConfigureServices(IServiceCollection services) {
    services.AddDbContext<ApplicationDbContext>(options =>
        options.UseSqlite(Configuration.GetConnectionString("DefaultConnection")));

    services.AddIdentity<ApplicationUser, IdentityRole>((x) => {
        x.Password.RequiredLength = 6;
        x.Password.RequiredUniqueChars = 0;
        x.Password.RequireNonAlphanumeric = false;
        x.Password.RequireDigit = false;
        x.Password.RequireLowercase = false;
        x.Password.RequireUppercase = false;
    })
        .AddEntityFrameworkStores<ApplicationDbContext>()
        .AddDefaultTokenProviders();

    services.AddAuthentication()
        .AddOpenIdConnectServer(options => {
            options.UserinfoEndpointPath = "/api/v1/me";
            options.TokenEndpointPath = "/api/v1/token";
            options.AuthorizationEndpointPath = "/authorize/";
            options.UseSlidingExpiration = false; // False means that new Refresh tokens aren't issued. Our implementation will be doing a no-expiry refresh, and this is one part of it.
            options.AllowInsecureHttp = true; // ONLY FOR TESTING
            options.AccessTokenLifetime = TimeSpan.FromHours(1); // An access token is valid for an hour - after that, a new one must be requested.
            options.RefreshTokenLifetime = TimeSpan.FromDays(365 * 1000); //NOTE - Later versions of the ASOS library support `TimeSpan?` for these lifetime fields, meaning no expiration. 
                                                                            // The version we are using does not, so a long running expiration of one thousand years will suffice.
            options.AuthorizationCodeLifetime = TimeSpan.FromSeconds(60);
            options.IdentityTokenLifetime = options.AccessTokenLifetime;
            options.ProviderType = typeof(OAuthProvider);
        });

    // Add application services.
    services.AddTransient<IEmailSender, EmailSender>();
    services.AddScoped<OAuthProvider>();

    services.AddMvc();
}
{{< / highlight >}}

Let's investigate each assignment:

`UserinfoEndpointPage` is where any authorized applications know to go for user information. This is more of an OpenIdConnect feature than OAuth feature, but we're implementing a user endpoint anyway, so we'll notify our server of it here.  

`TokenEndpointPath` is where the server knows to send incoming requests that want a Token. This is for `Client Credentials`, and `Refresh Token` grants. 

`AuthorizationEndpointPath` is for interactive flows like `Implicit (token)` and the beginning of their `Authorization Code` flows. 

`UseSlidingExpiration` is so that ASOS knows not to try to regenerate a refresh token. You may have different requirements, but in our implementation, a user is given only one refresh token, unless other things like their security stamp changes.

`AllowInsecureHttp` is strongly recommended to be set top `false` in production - we have it set to `true` here because SSL certs on our dev machine are a bit of a pain. If any incoming request that is handled by this middleware is not `http` if this is set to true, it will automatically fail.

`AccesTokenLifeTime` is how long an access token is valid for - if a user supplied an access token past its expiration, the request is rejected.

`RefreshTokenLifetime` is the same for a refresh token. Like the comment says, later versions of ASOS allow for nullable `TimeSpan?` for infinite lifetimes - but we'll make do with 1,000 years here.

`IdentityTokenLifeTime` is a feature of the `OpenIdConnect` spec, which is tangential to what we're implementing - but if you do decide to implement it, it's fine to have it set to the same as the access token.

`ProviderType` is how the service knows what provider to use - you could potentially have multiple different providers, and in theory, multiple different instances of an OpenIdConnectServer running. We're making sure that this instance knows to use our custom one. There are a few other ways to specify the provider, including in-line object creation, or setting the concrete instance of the provider with `Options.Provider`, but we're sticking with type resolution.

That means we also have to register our provider as a `ScopedService`, which lets the server dynamically resolve the provider as needed.


## Filling in the Provider

`Providers/OAuthProvider.cs`:

We're going to stub out all the methods we're interested in implementing:

```csharp
public class OAuthProvider : OpenIdConnectServerProvider {

    // These doesn't exist yet - but they will further down.
    private ValidationService VService;
    private TokenService TService;

    public override Task MatchEndpoint(MatchEndpointContext context) {
        return Task.CompletedTask;
    }


    #region Authorization Requests
    public override async Task ValidateAuthorizationRequest(ValidateAuthorizationRequestContext context) {
        base.ValidateAuthorizationRequest(context);
    }

    public override async Task ApplyAuthorizationResponse(ApplyAuthorizationResponseContext context) {
        base.ApplyAuthorizationResponse(context);
    }
    #endregion


    #region Token Requests
    public override async Task ValidateTokenRequest(ValidateTokenRequestContext context) {
        base.ValidateTokenRequest(context);
    }

    public override Task HandleTokenRequest(HandleTokenRequestContext context) {
        return base.HandleTokenRequest(context);
    }

    public override async Task ApplyTokenResponse(ApplyTokenResponseContext context) {
        base.ApplyTokenResponse(context);
    }
    #endregion

}
```

The control flow of the ASOS library is for a given endpoint registered to it is to flow through `Validate`, then to `Handle`, then to `Apply`.  

For example, because we've told ASOS that our Token endpoint is `/api/v1/token`, any incoming http request to our server at that path will be sent to the `TokenRequest` line of methods. First it will be passed to `ValidateTokenRequest`, then to `HandleTokenRequest`, then to `ApplyTokenResponse`. At any stage, a request may be rejected and returned to the user immediately. If that happens, the remaining methods will not be executed.

In the most minimal possible of all ASOS set ups, it's not necessary to override all of the available virtual methods - in fact, we don't even have to override the ones we're going to. In order for ASOS to minimally function, you only need to implement `ValidateAuthorizationRequest` and `ValidateTokenRequest` - You'll be left with a barely functional server, but it will work. 

One thing to note is that although the flow is from validate, to handle, to apply, we don't need to implement each step unless we really want to - for instance, we are not implementing `HandleAuthorizationRequest`. We are essentially going to outsource the events that would normally be under its purview to a different part of our application later.

Side note 1: if you want to complain about `#region`, don't. [They are completely fine](/posts/misc/regionisfine).

Side note 2: Before the Validate method in a given control flow is executed, an Extract method runs before it. We can override this if we have a custom/non-standard way of performing an authorization or token request. This is a good solution for handling legacy systems. If you're starting from scratch, or the old implementations were standards compliant, then there is no need to override these methods.  

## Difference between Authorization and Token requests

### Authorization

Two of the three main OAuth 2.0 flows, the `Implicit Grant` and `Authorization Code`, require user authorization. These flows are interactive and require presenting the user with information about the application, the scopes it permissions its requesting, and the opportunity for the user to accept or reject the request.

That is what is handled by the `Authorization` series of methods.

### Token

Once an application has already received authorization, or if it is an authorization-free flow like `Client Credentials`, it can request a token. For example, in the `Authorization Code` flow, an application will first ask hit up the `Authorization` endpoint, and then send the received `code` to the `Token` endpoint to receive its tokens.

Once that same application needs another token, it will send its `refresh token` back to the `Token` endpoint to receive a new `access token`. The application has already been authorized - it just needs another token.

The tl;dr is that `Token` is how you get a token, but `Authorization` is how you get permission to get a token.


## Match Endpoint

Before we can work on the Validation methods, we need to do something with `MatchEndpoint`. 

`ASOS` is by default very conservative, and doesn't accept anything outside a strictly defined set of endpoints. If we want to implement the interactive flows, it'd be nice if we had just one page the user could be redirected to, where they could `accept` or `deny` a request.

If we want the library to accept this user-friendly sequence of events, we'll have to define how the library should respond to requests that come its way.

We've already defined our `authorization` endpoint as being at `/authorize/`, as seen when we registered the server with `startup`, so we'll just use that endpoint as the check for redirection.

```csharp
public override Task MatchEndpoint(MatchEndpointContext context) {
    if (context.Options.AuthorizationEndpointPath.HasValue &&
        context.Request.Path.Value.StartsWith(context.Options.AuthorizationEndpointPath)) {
        context.MatchAuthorizationEndpoint();
    }
    return Task.CompletedTask;
}
```

    It's also common in setups like this to include the Revocation endpoint here as well - our revocation implementation will be different, so we won't include it here, but feel free to add it to the match endpoint list.

## Validate Authorization Request

This is the first function in the Authorization flow that is called. Here we extract the necessary information from the incoming request and check that it's all valid:

* The supplied client id needs to exist
* The redirect uri cannot be empty and must be properly registered to the client
* If scopes are requested, they must not be bogus

{{< highlight csharp >}}
public override async Task ValidateAuthorizationRequest(ValidateAuthorizationRequestContext context) {
    VService = context.HttpContext.RequestServices.GetRequiredService<ValidationService>();

    if(!context.Request.IsAuthorizationCodeFlow() && !context.Request.IsImplicitFlow()) {
        context.Reject(
            error: OpenIdConnectConstants.Errors.UnsupportedResponseType,
            description: "Only authorization code, refresh token, and token grant types are accepted by this authorization server."
        );
        return;
    }

    string clientid = context.ClientId;
    string rdi = context.Request.RedirectUri;
    string state = context.Request.State;
    string scope = context.Request.Scope;

    if (String.IsNullOrWhiteSpace(clientid)) {
        context.Reject(
                    error: OpenIdConnectConstants.Errors.InvalidClient,
                    description: "client_id cannot be empty"
                );
        return;
    }
    else if (String.IsNullOrWhiteSpace(rdi)) {
        context.Reject(
                    error: OpenIdConnectConstants.Errors.InvalidClient,
                    description: "redirect_uri cannot be empty"
                );
        return;
    }
    else if (!await VService.CheckClientIdIsValid(clientid)) {
        context.Reject(
                    error: OpenIdConnectConstants.Errors.InvalidClient,
                    description: "The supplied client id does not exist"
                );
        return;
    }
    else if (!await VService.CheckRedirectURIMatchesClientId(clientid, rdi)) {
        context.Reject(
                    error: OpenIdConnectConstants.Errors.InvalidClient,
                    description: "The supplied redirect uri is incorrect"
                );
        return;
    } else if (! await VService.CheckScopesAreValid(scope)) {
        context.Reject(
                error: OpenIdConnectConstants.Errors.InvalidRequest,
                description: "One or all of the supplied scopes are invalid"
            );
        return;
    } 

    context.Validate();

}
{{< / highlight >}}

If any one of these conditions fail, we reject the request, which returns to the user with the error message indicated. Otherwise, we assert that the incoming request is valid, and move on.

Notably at the top, we reject a request that isn't either for an `authorization_code` or for `implicit grant`. When it comes to the authorization endpoints, these are the only two we are concerned with. Other token requests are handled elsewhere.

    If you're playing around yourself, be aware that some information can only be found on the context.Request or context.HttpContext items.


## Apply Authorization Request

We don't need to implement `HandleAuthorizationRequest` because its functions will be implemented in a different section, but we do need to implement `ApplyAuthorizationResponse`. The only type of OAuth flow that makes it this far is the `Implicit Grant`, so we can safely treat this function as issuing only implicit grant tokens. This can be a bit confusing - we are issuing an access token from an authorization endpoint, but that's an artifact of the way Implicit Grants work.

```csharp
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

    await TService.WriteNewTokenToDatabase(context.Request.ClientId, access, claimsUser);
}
```

The first step is to check if there was an error - rejected contexts, or contexts that have otherwise suffered some kind of error have a non-null `Error` field, a string for the error message. If we somehow get this far with an invalid context, we'd like to leave before we do more work.

We ask for the ApplicationDbService in the event that the authoring OAuth client has been deleted between when the token has been requested and when it is granted. If it's MIA, we leave before persisting the token.

Again, we'll cover the implementations of TokenService and ValidationService later.

# Moving On
The demo of this project to this point can be found [here on GitHub](https://github.com/0xNF/OAuthTutorial/tree/09-OAuthProviderA).

In the next section we'll implement the three token methods.  
[Next](/posts/oauthserver/10)
