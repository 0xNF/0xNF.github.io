---
title: "Implement an OAuth 2.0 Server (Part 11)"
date: 2018-06-18T18:11:42-07:00
draft: false
description: "In this part of our OAuth tutorial, we implement the missing services that help us validate our tokens and write to the database."
slug: "11"
categories: 
- Security
- Identity
- Authentication
- Authorization
series:
- Implement an OAuth 2.0 Server
series_weight: 11
tags:
- OAuth2.0
- OpenIdConnect
- Tutorial
- CSharp
- .NET Core
---

Welcome to the eleventh part of a series of posts where we will implement an OAuth 2 Server using [AspNet.Security.OpenIdConnectServer](https://github.com/aspnet-contrib/AspNet.Security.OpenIdConnect.Server).

# Services

Our methods thus far have been peppered with a reference to a service named `ValidationService`. This lightweight class is a service that queries our database. Nothing is preventing us from doing these checks inside the `OAuthProvider` class itself, but the abstraction lends itself to a cleaner batch of methods.

This is going to be a dependency-injected class that gets resolved by the server in `ConfigureServices`, so we can inject our database context into it.

Under `Services/`, create a new `ValidationService.cs` file with a new `ValidationService` class:

```csharp
public class ValidationService {

    private readonly ApplicationDbContext _context;

    public ValidationService(ApplicationDbContext context) {
        _context = context;
    }

    public async Task<bool> CheckClientIdIsValid(string client_id) {
        return true;
    }

    public async Task<bool> CheckClientIdAndSecretIsValid(string client_id, string client_secret) {
        return true;
    }

    public async Task<bool> CheckRedirectURIMatchesClientId(string client_id, string redirect_uri) {
        return true;
    }

    public async Task<bool> CheckRefreshTokenIsValid(string refresh) {
        return true;
    }

    public async Task<bool> CheckScopesAreValid(string scope) {
        return true;
    }
}
```

### Check Client Id is Valid

We'll just query the Database to see if any entries with our id exist.

```csharp
public async Task<bool> CheckClientIdIsValid(string client_id) {
    if (String.IsNullOrWhiteSpace(client_id)) {
        return false;
    }
    else {
        return await _context.ClientApplications.AnyAsync(x => x.ClientId == client_id);
    }
}
```

### Check Client Id and Client Secret is Valid

Like it says in the comment, you are strongly encouraged to use some form of `constant time equals` method when validating the client secret, in order to prevent timing attacks. We're lazy, so we won't. We're also on `.NET Core 2.0` and not `.NET Core 2.1`, which contains an easy library for this type of thing over at https://docs.microsoft.com/en-us/dotnet/api/system.security.cryptography.cryptographicoperations.fixedtimeequals?view=netcore-2.1

```csharp
public async Task<bool> CheckClientIdAndSecretIsValid(string client_id, string client_secret) {
    if (String.IsNullOrWhiteSpace(client_id) || String.IsNullOrWhiteSpace(client_secret)) {
        return false;
    }
    else {
        // This could be an easy check, but the ASOS maintainer strongly recommends you to use a fixed-time string compare for client secrets.
        // This is trivially available in any .NET Core 2.1 or higher framework, but this is a 2.0 project, so we will leave that part out.
        // If you are on 2.1+, checkout the System.Security.Cryptography.CryptographicOperations.FixedTimeEquals() mehod,
        // available at https://docs.microsoft.com/en-us/dotnet/api/system.security.cryptography.cryptographicoperations.fixedtimeequals?view=netcore-2.1
        return await _context.ClientApplications.AnyAsync(x => x.ClientId == client_id && x.ClientSecret == client_secret);
    }
}
```

### Check Redirect URI is valid
The OAuth 2.0 specification requires that a supplied redirect uri be a byte-for-byte match with one of the redirect uris that have been registered to an application. `http` versions of a registered `https` endpoint are no good, for example.

We use a double LINQ query to ask these questions of the database.

```csharp
public async Task<bool> CheckRedirectURIMatchesClientId(string client_id, string redirect_uri) {
    if (String.IsNullOrWhiteSpace(client_id) || String.IsNullOrWhiteSpace(redirect_uri)) {
        return false;
    }
    return await _context.ClientApplications.Include(x => x.RedirectURIs).
        AnyAsync(x => x.ClientId == client_id &&
            x.RedirectURIs.Any(y => y.URI == redirect_uri));
}
```

### Check Refresh Token is Valid

More double linq queries.

We just want to ask the whether database any such token exists that:

1. Has the type `refresh_token`, and
1. Has the value we're looking for.

Tokens that are revoked or otherwise invalidated are deleted from the database, so any true response is enough of a confirmation that the token is valid.

```csharp
public async Task<bool> CheckRefreshTokenIsValid(string refresh) {
    if (String.IsNullOrWhiteSpace(refresh)) {
        return false;
    }
    else {
        return await _context.ClientApplications.Include(x => x.UserApplicationTokens).AnyAsync(x => x.UserApplicationTokens.Any(y => y.TokenType == OpenIdConnectConstants.TokenUsages.RefreshToken && y.Value == refresh));
    }
}
```

### Check Scopes are Valid

There's a small curveball here - null or empty scopes are valid, unlike all our other checks. 
```csharp
public async Task<bool> CheckScopesAreValid(string scope) {
    if (string.IsNullOrWhiteSpace(scope)) {
        return true; // Unlike the other checks, an empty scope is a valid scope. It just means the application has default permissions.
    }

    string[] scopes = scope.Split(' ');
    foreach (string s in scopes) {
        if (!OAuthScope.NameInScopes(s)) {
            return false;
        }
    }
    return true;
}
```

## TokenService

Like `ValidationService`, this small class is a registered dependency-injected service, which we have to handle writing tokens to the database.


Under `Services/`, create a new `TokenService.cs` file with a new `TokenService` class:

```csharp
public class TokenService {

    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;

    public TokenService(ApplicationDbContext context, UserManager<ApplicationUser> userManager) {
        _context = context;
        _userManager = userManager;
    }

    public async Task WriteNewTokenToDatabase(string client_id, Token token) {
    }
}
```

### Write New Token To Database
This method is going to handle writing tokens to our database, along with what to do with old tokens.

```csharp
public async Task WriteNewTokenToDatabase(string client_id, Token token, ClaimsPrincipal user = null) {
    if (String.IsNullOrWhiteSpace(client_id) || token == null || String.IsNullOrWhiteSpace(token.GrantType) || String.IsNullOrWhiteSpace(token.Value)) {
        return;
    }

    OAuthClient client = await _context.ClientApplications.Include(x=>x.Owner).Include(x => x.UserApplicationTokens).Where(x => x.ClientId == client_id).FirstOrDefaultAsync();
    if (client == null) {
        return;
    }

    // Handling Client Creds
    if (token.GrantType == OpenIdConnectConstants.GrantTypes.ClientCredentials) { 
        List<Token> OldClientCredentialTokens = client.UserApplicationTokens.Where(x => x.GrantType == OpenIdConnectConstants.GrantTypes.ClientCredentials).ToList();
        foreach (Token old in OldClientCredentialTokens) {
            _context.Entry(old).State = EntityState.Deleted;
            client.UserApplicationTokens.Remove(old);
        }
        client.UserApplicationTokens.Add(token);
        _context.Update(client);
        await _context.SaveChangesAsync();
    }
    // Handling the other flows
    else if (token.GrantType == OpenIdConnectConstants.GrantTypes.Implicit || token.GrantType == OpenIdConnectConstants.GrantTypes.AuthorizationCode || token.GrantType == OpenIdConnectConstants.GrantTypes.RefreshToken) {
        if(user == null) {
            return;
        }
        ApplicationUser au = await _userManager.GetUserAsync(user);
        if (au == null) {
            return;
        }

        // These tokens also require association to a specific user
        IEnumerable<Token> OldTokensForGrantType = client.UserApplicationTokens.Where(x => x.GrantType == token.GrantType && x.TokenType == token.TokenType).Intersect(au.UserClientTokens).ToList();
        foreach (Token old in OldTokensForGrantType) {
            _context.Entry(old).State = EntityState.Deleted;
            client.UserApplicationTokens.Remove(old);
            au.UserClientTokens.Remove(old);
        }
        client.UserApplicationTokens.Add(token);
        au.UserClientTokens.Add(token);
        _context.ClientApplications.Update(client);
        _context.Users.Update(au);
        await _context.SaveChangesAsync();
    }
}
```

The operative idea here is that multiple tokens for the same client, user, and grant type shouldn't exist. There should really only ever be one set of tokens matching those characteristics at any given time. When another set is issued, any old ones should be deleted and the new one should take its place. We structure it this way in case any errant duplicates managed to find their way in.

`Client Credentials` are pretty straightforward because there's no user the tokens are registered to, but the other flows are a little more in-depth.
# Register our new Services with ConfigureServices

Like always, we need to register our services so that classes that depend on them can resolve them properly.

{{< highlight csharp "linenos=inline,linenostart=1,hl_lines=36-37" >}}
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

# Moving On

We're going to take a break here to implement the Authorization Accept/Deny page for our interactive flows.

The demo of this project to this point can be found [here on GitHub](https://github.com/0xNF/OAuthTutorial/tree/11-TokenAndValidationService).

[Next](/posts/oauthserver/12)