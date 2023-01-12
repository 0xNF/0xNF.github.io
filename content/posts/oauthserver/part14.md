---
title: "Implement an OAuth 2.0 Server (Part 14)"
date: 2018-06-18T18:11:47-07:00
draft: false
description: "In this section of our OAuth tutorial, we'll add OAuth Validation to our application and actually authenticate a user with their access tokens."
slug: "14"
categories: 
- Security
- Identity
- Authentication
- Authorization
series:
- Implement an OAuth 2.0 Server
series_weight: 14
tags:
- OAuth2.0
- OpenIdConnect
- Tutorial
- CSharp
- .NET Core
---

Welcome to the fourteenth part of a series of posts where we will implement an OAuth 2 Server using [AspNet.Security.OpenIdConnectServer](https://github.com/aspnet-contrib/AspNet.Security.OpenIdConnect.Server).

# Adding OAuth Validation

Our server successfully issues the three token types, but we don't have a way to actually force a token check on our endpoints yet. One of the packages we downloaded initially was `AspNet.Security.OAuth.Validation`. We're going to use that to add OAuth Validation to our server.

In `Startup.cs's` `ConfigureServices`, add `.AddOAuthValidation()` to the Authentication chain:

{{< highlight csharp "linenos=inline,linenostart=1,hl_lines=19" >}}
// This method gets called by the runtime. Use this method to add services to the container.
public void ConfigureServices(IServiceCollection services)
{
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
        .AddOAuthValidation()
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
    services.AddTransient<ValidationService>();
    services.AddTransient<TokenService>();

    services.AddMvc();
}
{{< / highlight >}}

If you want to specify a different Authentication scheme for the OAuth validation, for instance if you have two different areas of your server performing OAuth validation on a different set of users, then you can specify the scheme by supplying a string in the method call. We will leave it blank because we're fine with the default. 

You can read more about Authentication Schemes on the [Microsoft Docs](https://docs.microsoft.com/en-us/aspnet/core/security/authorization/limitingidentitybyscheme?view=aspnetcore-2.1&tabs=aspnetcore2x).

# Adding Authentication Schemes to our App
We've left the OAuth Validation scheme as the default, but when we add endpoint authorization, we will need to specify what we're using - if we leave it as the default, the server will attempt to use a cookie identity, and will promptly fail because an incoming request with an OAuth token won't have the necessary cookie information.

Open up `Controllers/APIController.cs` and add some Authorization attributes:

{{< highlight csharp "linenos=inline,linenostart=1,hl_lines=3 10 16 22 28 35" >}}
// Authenticated Methods - only available to those with a valid Access Token
// Unscoped Methods - Authenticated methods that do not require any specific Scope
[Authorize(AuthenticationSchemes = AspNet.Security.OAuth.Validation.OAuthValidationDefaults.AuthenticationScheme)]
[HttpGet("clientcount")]
public async Task<IActionResult> ClientCount() {
    return Ok("Client Count Get Request was successful but this endpoint is not yet implemented");
}

// Scoped Methods - Authenticated methods that require certain scopes
[Authorize(AuthenticationSchemes = AspNet.Security.OAuth.Validation.OAuthValidationDefaults.AuthenticationScheme)]
[HttpGet("birthdate")]
public IActionResult GetBirthdate() {
    return Ok("Birthdate Get Request was successful but this endpoint is not yet implemented");
}

[Authorize(AuthenticationSchemes = AspNet.Security.OAuth.Validation.OAuthValidationDefaults.AuthenticationScheme)]
[HttpGet("email")]
public async Task<IActionResult> GetEmail() {
    return Ok("Email Get Request was successful but this endpoint is not yet implemented");
}

[Authorize(AuthenticationSchemes = AspNet.Security.OAuth.Validation.OAuthValidationDefaults.AuthenticationScheme)]
[HttpPut("birthdate")]
public IActionResult ChangeBirthdate(string birthdate) {
    return Ok("Birthdate Put successful but this endpoint is not yet implemented");
}

[Authorize(AuthenticationSchemes = AspNet.Security.OAuth.Validation.OAuthValidationDefaults.AuthenticationScheme)]
[HttpPut("email")]
public async Task<IActionResult> ChangeEmail(string email) {
    return Ok("Email Put request received, but function is not yet implemented");
}

// Dynamic Scope Methods - Authenticated methods that return additional information the more scopes are supplied
[Authorize(AuthenticationSchemes = AspNet.Security.OAuth.Validation.OAuthValidationDefaults.AuthenticationScheme)]
[HttpGet("me")]
public async Task<IActionResult> Me() {
    return Ok("User Profile Get request received, but function is not yet implemented");
}
{{< / highlight >}}

We've added a standard `[Authorize]` attribute to our endpoints, but we've told it what AuthenticationScheme to use. We left the scheme name blank in `ConfigureServices`, so it chose the default value of `AspNet.Security.OAuth.Validation.OAuthValidationDefaults.AuthenticationScheme`. If you change the ConfigureServices default scheme name, you should reflect it here in the endpoints.


# Moving On

The demo of this project to this point can be found [here on GitHub](https://github.com/0xNF/OAuthTutorial/tree/14-OAuthValidation).

In the next section, we'll cover adding policies, dynamically resolving them, and adding them to our endpoints. 

[Next](/posts/oauthserver/15)