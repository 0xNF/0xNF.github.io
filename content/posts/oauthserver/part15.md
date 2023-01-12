---
title: "Implement an OAuth 2.0 Server (Part 15)"
date: 2018-06-18T18:11:49-07:00
draft: false
description: "In this section of our OAuth tutorial we add the ability to authorize against the scopes we created back in part 8 using ASP.NET policies."
slug: "15"
categories: 
- Security
- Identity
- Authentication
- Authorization
series:
- Implement an OAuth 2.0 Server
series_weight: 15
tags:
- OAuth2.0
- OpenIdConnect
- Tutorial
- CSharp
- .NET Core
---

Welcome to the fifteenth part of a series of posts where we will implement an OAuth 2 Server using [AspNet.Security.OpenIdConnectServer](https://github.com/aspnet-contrib/AspNet.Security.OpenIdConnect.Server).


# Scope Authorization with Policies, Requirements and Handlers

Just adding Authorization attributes is insufficient for our purposes - our tokens have scopes associated with them, and our endpoint authorization checks should reflect that. 
To do so, we will use policies, which you can read about on the [Microsoft Docs](https://docs.microsoft.com/en-us/aspnet/core/security/authorization/policies?view=aspnetcore-2.0).

Policies are fragments you can add to an authorization attribute that confirm whether a given HttpContext meets the requirements of the attribute, beyond simply being authenticated or not. 

Policies are composed of two parts - the actual policy, referred to as the `AuthorizationRequirement`, and the class responsible validating the requirement, known as the `AuthorizationHandler`. 

The handlers are generic classes that accept a `<T>` requirement - and then `Handle` it appropriately. For any given policy, a handler can choose to `Succeed`, or pass the requirement, `Fail` or reject the requirement, or ignore it altogether and let someone else handle it.

A single authorization attribute can go through multiple different policy handlers, and they operate on a short-circuit policy - meaning that the first policy to `Succeed` means the entire chain succeeds. Following that, the first policy to `Fail` means the whole chain fails. Any policy that is ignored passes the responsibility to the next item in the chain. 

If the context is never marked as succeeded, then the chain implicitly fails.

# Has Scope Policy
Create a new folder named `Policies/` and add a `HasScopeRequirement` class:

```csharp
public class HasScopeRequirement : IAuthorizationRequirement {

    public string Issuer { get; set; }
    public string Scope { get; set; }

    public HasScopeRequirement(string scope, string issuer) {
        Scope = scope ?? throw new ArgumentNullException(nameof(scope));
        Issuer = issuer ?? throw new ArgumentNullException(nameof(issuer));
    }
}
```

Requirements need to implement `IAuthozationRequirement`, which alert the authorization provider that it is, rather obviously, a requirement.

The primary thing we're concerned with is the `Scope`, but because this server is capable of also being an `OpenId` provider, we should double check the `Issuer` to make sure that we issued the item being authenticated.

It is possible that someone else authenticating against our server has scopes of the same name for their own service that we do not wish to authenticate for, so we'll include an issuer check.


# Has Scope Handler

Also under `Policies/`, create a `HasScopeHandler` class, inheriting from `AuthorizationHandler<T>`:

```csharp
public class HasScopeHandler : AuthorizationHandler<HasScopeRequirement> {
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, HasScopeRequirement requirement) {
        IEnumerable<Claim> scopeClaims = context.User.FindAll(x => x.Type == "scope" && x.Issuer == requirement.Issuer);
        // If user does not have the scope claim, get out of here
        if (!scopeClaims.Any()) {
            return Task.CompletedTask;
        }
        // Split the scopes string into an array
        IEnumerable<string> scopes = scopeClaims.Select(x => x.Value);
        // Succeed if the scope array contains the required scope
        if (scopes.Any(s => s == requirement.Scope)) {
            context.Succeed(requirement);
        }
        return Task.CompletedTask;
    }
}
```
Take note of the `FindAll` method used - multiple claims of the same type can exist on the same object, so grabbing the first scope result that matches could potentially be insufficient.

You can choose to implement either `HandleRequirement` or `HandleRequirementAsync`.

The comments explain the process inside the handler - we get all claims on the user of type `scope`, and of the issuer that we specify in our requirement.

    Note: Requirements are typically instantiated at startup with immutable values and then compared when needed - a HasScopeRequirement is therefore flexible enough to handle any potential scope, which is why we did not define one for each that we have.

Assuming that the resulting list isn't empty, we check to see if the scopes on this claim match the scope in the passed-in requirement. If a scope exists as such, then we `Succeed` the context and move on. If no scope matches, then we leave it to the other parts of the authentication pipeline to determine if the request is valid. 

Perhaps you have other policies in your pipeline that you want to check against, so we'll let it implicitly fail rather than explicitly fail.

    Note: you have to supply the requirement that succeeded if you `Succeed` the context: context.Succeed(requirement)

# Dynamically Handling Policies

    shout out to Jerrie Pelser, whose post on dynamic policy resolution is the basis for this section: 
    https://www.jerriepelser.com/blog/creating-dynamic-authorization-policies-aspnet-core/

Typically specifying policies is an only-once-at-startup affair, meaning that we have to specify the universe of potential policies upfront. In our case, we know what the whole set will be, but that doesn't negate the tedium of manufacturing policies and handlers for each one, which is a code-increasing and developer-time-consuming task. 

To alleviate these pressures, we'll create a dynamic handler that will create a new Requirement for each policy that it encounters at runtime.

Under `Policies/`, create an `AuthorizationPolicyProvider` class:

```csharp
public class AuthorizationPolicyProvider : DefaultAuthorizationPolicyProvider {
    private readonly IConfiguration _configuration;

    private readonly AuthorizationOptions _options;

    public AuthorizationPolicyProvider(IOptions<AuthorizationOptions> options, IConfiguration configuration) : base(options) {
        _configuration = configuration;
        _options = options.Value;
    }

    public override async Task<AuthorizationPolicy> GetPolicyAsync(string policyName) {
        // Check static policies first
        AuthorizationPolicy policy = await base.GetPolicyAsync(policyName);

        if (policy == null) {
            policy = new AuthorizationPolicyBuilder()
                .AddRequirements(new HasScopeRequirement(policyName, "LOCAL AUTHORITY"))
                .Build();
            _options.AddPolicy(policyName, policy);
        }
        return policy;
    }

}
```

We inherit from the Default provider because we will override it at startup with our own, hence why we also hand in the `options` and `configurations`.
The main part of the provider that we're interested is the overridden `GetPolicyAsync`.

    Note: you are free to implement the non-async GetPolicy if that suits your project requirements better.

For any policy, defined simply as being a string, that this provider encounters, it checks to see if an existing one is already registered. If it is, then we simply pass the found policy along.
If the policy is not yet defined, then we create one on the fly using `AuthorizationPolicyBuilder` and give it a single `HasScopeRequirement` from earlier. 

The created requirement is given the name of the new string, and an issuer of `LOCAL AUTHORITY`, which the default issuer name for claims. Again, this is relevant for `OpenID` providers, which you may or may not be.

    Note: if you're serious about being a provider or consumer of third party OpenId tokens, you should change "LOCAL AUTHORITY" to something that uniquely identifies your service. 
    
    Anyone else issuing tokens will have the same default name.

Finally, we add our requirement back into the pool of requirements for our application. 
The next time a requirement of this scope is requested, it will be able to pull it from the pool instead of creating a new one.


# Registering our AuthorizationPolicyProvider

Open `ConfigureServices` and add the following two highlight lines. They should be familiar at this point:

{{< highlight csharp "linenos=inline,linenostart=1,hl_lines=38-39" >}}
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
    services.AddSingleton<IAuthorizationPolicyProvider, AuthorizationPolicyProvider>();
    services.AddSingleton<IAuthorizationHandler, HasScopeHandler>();

    services.AddMvc();
}
{{< / highlight >}}

We add them as singletons because there is no need for a given requirement, once instantiated, to exist multiple times. Same for the handler. Nothing is different about it from run-to-run, so a singleton suits them best.


# Adding Scope Policies to the Authorization Attributes

Recall the scopes we chose to include in our token grants:


|Scope Name|Scope Description|
|-------------------|--------------------------|
|`user-read-email`|Permission to know your email address|
|`user-read-birthdate`|Permission to know your birthdate|
|`user-modify-email`|Permission to change your email address|
|`user-modify-birthdate`|Permission to change your birthdate|

Let's add them to our `[Authorize]` attributes:

{{< highlight csharp "linenos=inline,linenostart=1,hl_lines=2 8 14 20" >}}
// Scoped Methods - Authenticated methods that require certain scopes
[Authorize(AuthenticationSchemes = AspNet.Security.OAuth.Validation.OAuthValidationDefaults.AuthenticationScheme, Policy = "user-read-birthdate")]
[HttpGet("birthdate")]
public IActionResult GetBirthdate() {
    return Ok("Birthdate Get Request was successful but this endpoint is not yet implemented");
}

[Authorize(AuthenticationSchemes = AspNet.Security.OAuth.Validation.OAuthValidationDefaults.AuthenticationScheme, Policy = "user-read-email")]
[HttpGet("email")]
public async Task<IActionResult> GetEmail() {
    return Ok("Email Get Request was successful but this endpoint is not yet implemented");
}

[Authorize(AuthenticationSchemes = AspNet.Security.OAuth.Validation.OAuthValidationDefaults.AuthenticationScheme, Policy = "user-modify-birthdate")]
[HttpPut("birthdate")]
public IActionResult ChangeBirthdate(string birthdate) {
    return Ok("Birthdate Put successful but this endpoint is not yet implemented");
}

[Authorize(AuthenticationSchemes = AspNet.Security.OAuth.Validation.OAuthValidationDefaults.AuthenticationScheme, Policy = "user-modify-email")]
[HttpPut("email")]
public async Task<IActionResult> ChangeEmail(string email) {
    return Ok("Email Put request received, but function is not yet implemented");
}
{{< / highlight >}}

# Multiple Policies per Authorize

If you wish to add multiple policies to authorize against in a single attribute, you'll need to implement them in the handler. There is unfortunately no way to list multiple policies within the attribute. See [this StackOverflow post](https://stackoverflow.com/questions/35609632/asp-net-5-authorize-against-two-or-more-policies) for more details. 

You can however, have multiple requirements in a given handler. That is covered in the [Microsoft Docs](https://docs.microsoft.com/en-us/aspnet/core/security/authorization/policies?view=aspnetcore-2.0) page for Policies.


# Testing Scopes

Launch the server and ensure the following:

1. Make sure you are logged in, or register and log in if you deleted the database.
1. Create a client application, and add a valid redirect uri

Once you have those checked, navigate to the authorization url and make sure `scope` is a part of your querystring. As an example, our test client application url looks like this:

http://localhost:5000/authorize/?scope=user-read-birthdate&response_type=token&client_id=77904dfb-8fc2-498d-8317-e5a5f7fc3386&redirect_uri=http://localhost/cb

You should see that it's requesting the `user-read-birthdate` scope:

![requesting scopes](/oauthserver/part15/scoperequested.png)

Your redirect uri is almost certainly not valid, so grab the supplied access token from the url your browser navigated to:

![grab the token](/oauthserver/part15/token.png)

Use curl to construct a request using our OAuth Token:

```bash
curl -H "Authorization: Bearer CfDJ8IGBmusd_JZPhIsNcrUVwgchLN8qKVeq-iU6xMgilkUY5co4KfikjrZ5aBQI1f_Rvu63TIDfsK7alCs5CC5Pw1Xw1NzR72O4pTpeYlGvTZA5zNfOW0ltbdE_MZBFYRf-hoUJdPDkjxJ1Fqv9Xo_Iy4fH2iPpwkelVp9yT11J-lUQB0lkX7b-WSG0K0EQ4uwWU9Ub9Dtl3SNqXM-46SN2FdjcK4ublKuFMMs5tWi80XIb3y1Boq8u5TvBEr2pYYKrteTTlNCXCu9Sj0D_BfJtXUiCx74hN89uSCnSFhqrFre-fowHBMs2lSpa05FfFEqEHwKKbft0HvuEcHfwVN1c1_1NjwL8GBhJ4RMEfDawguukJTjkHnuzFku5z7epUsh56Arrmje3aD-NGJpfFAUKYqlGAAOZvuSt88p4lRHBim5p89S7VwuJJjgB2RR16YdsJIhIL3tVaWLADPsh2r-CyV_gUNnYPLRrNPWkniGgxo5YBeerou7zEGUvVakgBD1VKRBwpI6wUabnLCJSm8u9StRb8TOO7cvG7HiVpEg44BHlArHfDeln3EFfEu4MY7IhAwHQ04_GihHdHFV0VGT3guDZ8_MFZddGNr-0PD_AD5Jr_gtxz7oZTJu59xmvkhE0ae_VlfO1phEDwTVliokFpyF36g-tukKqqp_Rjy13Y8DgW7oifnE2OJvTuEClhwKvCXGTmgqckSqbiWqS548ezvPh_qcSxhAnxnfd-DRJ0-koiXtA5xdD6LiWPHAY9DZK7D_kC-SNAKSWzgmxT4oHgc4iCTO4o0UWPYw3nuQX9FAuiwOxXc_M4Ce-Q_myHBwOMkUq-PZjSIPpyiG8kKDyl9-WQyZDg3vANVFGQpdrjPkx0uTMPjRgyvA1OfTslZBq46gOESWWeuBRNebfv6QzgfEaV4BPiUV-PzXeILjHFNPtWKOiAz6bTKI5HHOjrXqktH9008CBRVxr5wpGIQAIjhWmMCpd2uxi8dGIssj8U4RM" http://localhost:5000/api/v1/hello
```

OAuth Validation is looking for an authorization header with a key-value pair where the key is `Bearer` and the value is our token. `-H` means add a header. You'll need to enclose it in quotes (`"`)

## /hello

Hello should return fine, because it is unauthenticated:

{{< highlight csharp "hl_lines=3" >}}
djori@jormungandr:~/projects/OAuthTutorial$ curl -H "Authorization: Bearer CfDJ8IGBmusd_JZPhIsNcrUVwgchLN8qKVeq-iU6xMgilkUY5co4KfikjrZ5aBQI1f_Rvu63TIDfsK7alCs5CC5Pw1Xw1NzR72O4pTpeYlGvTZA5zNfOW0ltbdE_MZBFYRf-hoUJdPDkjxJ1Fqv9Xo_Iy4fH2iPpwkelVp9yT11J-lUQB0lkX7b-WSG0K0EQ4uwWU9Ub9Dtl3SNqXM-46SN2FdjcK4ublKuFMMs5tWi80XIb3y1Boq8u5TvBEr2pYYKrteTTlNCXCu9Sj0D_BfJtXUiCx74hN89uSCnSFhqrFre-fowHBMs2lSpa05FfFEqEHwKKbft0HvuEcHfwVN1c1_1NjwL8GBhJ4RMEfDawguukJTjkHnuzFku5z7epUsh56Arrmje3aD-NGJpfFAUKYqlGAAOZvuSt88p4lRHBim5p89S7VwuJJjgB2RR16YdsJIhIL3tVaWLADPsh2r-CyV_gUNnYPLRrNPWkniGgxo5YBeerou7zEGUvVakgBD1VKRBwpI6wUabnLCJSm8u9StRb8TOO7cvG7HiVpEg44BHlArHfDeln3EFfEu4MY7IhAwHQ04_GihHdHFV0VGT3guDZ8_MFZddGNr-0PD_AD5Jr_gtxz7oZTJu59xmvkhE0ae_VlfO1phEDwTVliokFpyF36g-tukKqqp_Rjy13Y8DgW7oifnE2OJvTuEClhwKvCXGTmgqckSqbiWqS548ezvPh_qcSxhAnxnfd-DRJ0-koiXtA5xdD6LiWPHAY9DZK7D_kC-SNAKSWzgmxT4oHgc4iCTO4o0UWPYw3nuQX9FAuiwOxXc_M4Ce-Q_myHBwOMkUq-PZjSIPpyiG8kKDyl9-WQyZDg3vANVFGQpdrjPkx0uTMPjRgyvA1OfTslZBq46gOESWWeuBRNebfv6QzgfEaV4BPiUV-PzXeILjHFNPtWKOiAz6bTKI5HHOjrXqktH9008CBRVxr5wpGIQAIjhWmMCpd2uxi8dGIssj8U4RM" http://localhost:5000/api/v1/hello

Hello
{{< / highlight >}}

## /clientcount

Client Count should return fine - because our access token is valid:

{{< highlight csharp "hl_lines=3" >}}
jori@jormungandr:~/projects/OAuthTutorial$ curl -H "Authorization: Bearer CfDJ8IGBmusd_JZPhIsNcrUVwgchLN8qKVeq-iU6xMgilkUY5co4KfikjrZ5aBQI1f_Rvu63TIDfsK7alCs5CC5Pw1Xw1NzR72O4pTpeYlGvTZA5zNfOW0ltbdE_MZBFYRf-hoUJdPDkjxJ1Fqv9Xo_Iy4fH2iPpwkelVp9yT11J-lUQB0lkX7b-WSG0K0EQ4uwWU9Ub9Dtl3SNqXM-46SN2FdjcK4ublKuFMMs5tWi80XIb3y1Boq8u5TvYYKrteTTlNCXCu9Sj0D_BfJtXUiCx74hN89uSCnSFhqrFre-fowHBMs2lSpa05FfFEqEHwKKbft0HvuEcHfwVN1c1_1NjwL8GBhJ4RMEfDawguukJTjkHnuzFku5z7epUsh56Arrmje3aD-NGJpfFAUKYqlGAAOZvuSt88p4lRHBim5p89S7VwuJJjgB2RR16YdsJIhIL3tVaWLADPsh2r-CyV_gUNnYPLRrNPWkniGgxo5YBeerou7zEGUvVakgBD1VKRBwpI6wUabnLCJSm8u9StRb8TOO7cvG7HiVpEg44BHlArHfDeln3EFfEu4MY7IhAwHQ04_GihHdHFV0VGT3guDZ8_MFZddGNr-0PD_AD5Jr_gtxz7oZTJu59xmvkhE0ae_VlfO1phEDwTVliokFpyF36g-tukKqqp_Rjy13Y8DgW7oifnE2OJvTuEClhwKvCXGTmgqckSqbiWqS548ezvPh_qcSxhAnxnfd-DRJ0-koiXtA5xdD6LiWPHAY9DZK7D_kC-SNAKSWzgmxT4oHgc4iCTO4o0UWPYw3nuQX9FAuiwOxXc_M4Ce-Q_myHBwOMkUq-PZjSIPpyiG8kKDyl9-WQyZDg3vANVFGQpdrjPkx0uTMPjRgyvA1OfTslZBq46gOESWWeuBRNebfv6QzgfEaV4BPiUV-PzXeILjHFNPtWKOiAz6bTKI5HHOjrXqktH9008CBRVxr5wpGIQAIjhWmMCpd2uxi8dGIssj8U4RM" http://localhost:5000/api/v1/clientcount

Client Count Get Request was successful but this endpoint is not yet implemented
{{< / highlight >}}

## /birthdate

Birthdate should be fine as well, because we asked for the `user-read-birthdate` scope when we requested our token:

{{< highlight csharp "hl_lines=3" >}}
djori@jormungandr:~/projects/OAuthTutorial$ curl -H "Authorization: Bearer CfDJ8IGBmusd_JZPhIsNcrUVwgchLN8qKVeq-iU6xMgilkUY5co4KfikjrZ5aBQI1f_Rvu63TIDfsK7alCs5CC5Pw1Xw1NzR72O4pTpeYlGvTZA5zNfOW0ltbdE_MZBFYRf-hoUJdPDkjxJ1Fqv9Xo_Iy4fH2iPpwkelVp9yT11J-lUQB0lkX7b-WSG0K0EQ4uwWU9Ub9Dtl3SNqXM-46SN2FdjcK4ublKuFMMs5tWi80XIb3y1Boq8u5TvBEr2pYYKrteTTlNCXCu9Sj0D_BfJtXUiCx74hN89uSCnSFhqrFre-fowHBMs2lSpa05FfFEqEHwKKbft0HvuEcHfwVN1c1_1NjwL8GBhJ4RMEfDawguukJTjkHnuzFku5z7epUsh56Arrmje3aD-NGJpfFAUKYqlGAAOZvuSt88p4lRHBim5p89S7VwuJJjgB2RR16YdsJIhIL3tVaWLADPsh2r-CyV_gUNnYPLRrNPWkniGgxo5YBeerou7zEGUvVakgBD1VKRBwpI6wUabnLCJSm8u9StRb8TOO7cvG7HiVpEg44BHlArHfDeln3EFfEu4MY7IhAwHQ04_GihHdHFV0VGT3guDZ8_MFZddGNr-0PD_AD5Jr_gtxz7oZTJu59xmvkhE0ae_VlfO1phEDwTVliokFpyF36g-tukKqqp_Rjy13Y8DgW7oifnE2OJvTuEClhwKvCXGTmgqckSqbiWqS548ezvPh_qcSxhAnxnfd-DRJ0-koiXtA5xdD6LiWPHAY9DZK7D_kC-SNAKSWzgmxT4oHgc4iCTO4o0UWPYw3nuQX9FAuiwOxXc_M4Ce-Q_myHBwOMkUq-PZjSIPpyiG8kKDyl9-WQyZDg3vANVFGQpdrjPkx0uTMPjRgyvA1OfTslZBq46gOESWWeuBRNebfv6QzgfEaV4BPiUV-PzXeILjHFNPtWKOiAz6bTKI5HHOjrXqktH9008CBRVxr5wpGIQAIjhWmMCpd2uxi8dGIssj8U4RM" http://localhost:5000/api/v1/birthdate

Birthdate Get Request was successful but this endpoint is not yet implemented
{{< / highlight >}}

## /email

We did not ask for the `user-read-email` scope, so a request to `/email` should fail:

We'll add the `-v` flag to our curl request so that we can see the headers:

{{< highlight bash "linenostart=1,hl_lines=8" >}}

[...]
> GET /api/v1/email HTTP/1.1
> Host: localhost:5000
> User-Agent: curl/7.47.0
> Accept: */*
> Authorization: Bearer CfDJ8IGBmusd_JZPhIsNcrUVwgchLN8qKVeq-iU6xMgilkUY5co4KfikjrZ5aBQI1f_Rvu63TIDfsK7alCs5CC5Pw1Xw1NzR72O4pTpeYlGvTZA5zNfOW0ltbdE_MZBFYRf-hoUJdPDkjxJ1Fqv9Xo_Iy4fH2iPpwkelVp9yT11J-lUQB0lkX7b-WSG0K0EQ4uwWU9Ub9Dtl3SNqXM-46SN2FdjcK4ublKuFMMs5tWi80XIb3y1Boq8u5TvBEr2pYYKrteTTlNCXCu9Sj0D_BfJtXUiCx74hN89uSCnSFhqrFre-fowHBMs2lSpa05FfFEqEHwKKbft0HvuEcHfwVN1c1_1NjwL8GBhJ4RMEfDawguukJTjkHnuzFku5z7epUsh56Arrmje3aD-NGJpfFAUKYqlGAAOZvuSt88p4lRHBim5p89S7VwuJJjgB2RR16YdsJIhIL3tVaWLADPsh2r-CyV_gUNnYPLRrNPWkniGgxo5YBeerou7zEGUvVakgBD1VKRBwpI6wUabnLCJSm8u9StRb8TOO7cvG7HiVpEg44BHlArHfDeln3EFfEu4MY7IhAwHQ04_GihHdHFV0VGT3guDZ8_MFZddGNr-0PD_AD5Jr_gtxz7oZTJu59xmvkhE0ae_VlfO1phEDwTVliokFpyF36g-tukKqqp_Rjy13Y8DgW7oifnE2OJvTuEClhwKvCXGTmgqckSqbiWqS548ezvPh_qcSxhAnxnfd-DRJ0-koiXtA5xdD6LiWPHAY9DZK7D_kC-SNAKSWzgmxT4oHgc4iCTO4o0UWPYw3nuQX9FAuiwOxXc_M4Ce-Q_myHBwOMkUq-PZjSIPpyiG8kKDyl9-WQyZDg3vANVFGQpdrjPkx0uTMPjRgyvA1OfTslZBq46gOESWWeuBRNebfv6QzgfEaV4BPiUV-PzXeILjHFNPtWKOiAz6bTKI5HHOjrXqktH9008CBRVxr5wpGIQAIjhWmMCpd2uxi8dGIssj8U4RM
>
< HTTP/1.1 403 Forbidden
< Server: Kestrel
< X-SourceFiles: =?UTF-8?B?QzpcVXNlcnNcRGpvcmlcRG9jdW1lbnRzXHByb2plY3RzXE9BdXRoVHV0b3JpYWxcT0F1dGhUdXRvcmlhbFxhcGlcdjFcZW1haWw=?=
< X-Powered-By: ASP.NET
< Date: Mon, 18 Jun 2018 17:34:38 GMT
< Content-Length: 0
{{< / highlight >}}

the returned data has been edited for brevity, but the highlighted line shows a status code of  `403 Forbidden`, which is the correct behavior, because we did not have a token that could pass the `user-read-email` check.


# Moving On

The demo of this project to this point can be found [here on GitHub](https://github.com/0xNF/OAuthTutorial/tree/15-Policies).

In the next section, we'll implement Token Revocation, along with some pages under `/manage` to make it easy for users to do so.

[Next](/posts/oauthserver/16)