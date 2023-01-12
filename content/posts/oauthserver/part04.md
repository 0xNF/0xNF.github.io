---
title: "Implement an OAuth 2.0 Server (Part 04)"
date: 2018-06-06T16:15:58-07:00
draft: false
description: "For this part of our tutorial, we set up a basic public API that will eventually be what we authenticate our OAuth Tokens again in the future."
slug: "04"
categories: 
- Security
- Identity
- Authentication
- Authorization
series:
- Implement an OAuth 2.0 Server
series_weight: 4
tags:
- OAuth2.0
- OpenIdConnect
- Tutorial
- CSharp
- .NET Core
---

Welcome to the fourth part of a series of posts where we will implement an OAuth 2 Server using [AspNet.Security.OpenIdConnectServer](https://github.com/aspnet-contrib/AspNet.Security.OpenIdConnect.Server).


# Public API Barebones Setup

We're going to have a very small public API that will entertain a few `GET` and `PUT` methods.
At first, these methods will be entirely unauthenticated, but as time goes on we'll eventually put some of them behind `OAuth` authentication, then add `Scope` checks, and finally `Rate Limiting`. But for now, we're just going to implement some stub methods.

## Controller Implementation
Create a new controller under `OAuthTutorial/Controllers/` named `APIController`.

{{< highlight csharp "linenostart=1" >}}
[Route("/api/v1/")]
public class APIController : Controller {

    private readonly ILogger _logger;
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;

    public APIController(ILogger<ManageController> logger, ApplicationDbContext context, UserManager<ApplicationUser> userManager) {
        _logger = logger;
        _context = context;
        _userManager = userManager;
    }
}
{{< / highlight >}}

Notice that we've dependency-injected a `UserManager<ApplicationUser>` and the pre-generated `ApplicationDbContext`. We will need these when we come back to flesh this controller out in the future.

Also notice that we've denoted this controller to be for the `/api/v1/` route - this will be important later.
## Stubs

We'll also add some stubbed methods - this is the complete set of API methods that we will implement. At the moment they don't do much except acknowledge that they were invoked, but that's sufficient for now.

{{< highlight csharp "linenostart=1" >}}
// Unauthenticated Methods - available to the public
[HttpGet("hello")]
public IActionResult Hello() {
    return Ok("Hello");
}

// Authenticated Methods - only available to those with a valid Access Token
// Unscoped Methods - Authenticated methods that do not require any specific Scope
[HttpGet("clientcount")]
public async Task<IActionResult> ClientCount() {
    return Ok("Client Count Get Request was successful but this endpoint is not yet implemented");
}

// Scoped Methods - Authenticated methods that require certain scopes
[HttpGet("birthdate")]
public IActionResult GetBirthdate() {
    return Ok("Birthdate Get Request was successful but this endpoint is not yet implemented");
}

[HttpGet("email")]
public async Task<IActionResult> GetEmail() {
    return Ok("Email Get Request was successful but this endpoint is not yet implemented");
}

[HttpPut("birthdate")]
public IActionResult ChangeBirthdate(string birthdate) {
    return Ok("Birthdate Put successful but this endpoint is not yet implemented");
}

[HttpPut("email")]
public async Task<IActionResult> ChangeEmail(string email) {
    return Ok("Email Put request received, but function is not yet implemented");
}

// Dynamic Scope Methods - Authenticated methods that return additional information the more scopes are supplied
[HttpGet("me")]
public async Task<IActionResult> Me() {
    return Ok("User Profile Get request received, but function is not yet implemented");
}
{{< / highlight >}}

# Testing for Responses

Start the server and use your choice of `PowerShell` or `WSL` to hit a few of our endpoints to see if they respond as expected:

## PowerShell

### api/v1/hello
```PowerShell
PS C:\Users\Djori> curl http://localhost:5000/api/v1/hello


StatusCode        : 200
StatusDescription : OK
Content           : Hello
RawContent        : HTTP/1.1 200 OK
                    Transfer-Encoding: chunked
                    X-SourceFiles: =?UTF-8?B?QzpcVXNlcnNcRGpvcmlcRG9jdW1lbnRzXHByb2plY3RzXE9BdXRoVHV0b3JpYWxcT0F1dGhUdX
                    RvcmlhbFxhcGlcdjFcaGVsbG8=?=
                    Content-Type: text/plain; ...
Forms             : {}
Headers           : {[Transfer-Encoding, chunked], [X-SourceFiles, =?UTF-8?B?QzpcVXNlcnNcRGpvcmlcRG9jdW1lbnRzXHByb2plY3
                    RzXE9BdXRoVHV0b3JpYWxcT0F1dGhUdXRvcmlhbFxhcGlcdjFcaGVsbG8=?=], [Content-Type, text/plain;
                    charset=utf-8], [Date, Thu, 07 Jun 2018 00:42:26 GMT]...}
Images            : {}
InputFields       : {}
Links             : {}
ParsedHtml        : mshtml.HTMLDocumentClass
RawContentLength  : 5
```

### api/v1/me
```PowerShell
PS C:\Users\Djori> curl http://localhost:5000/api/v1/me


StatusCode        : 200
StatusDescription : OK
Content           : you get
RawContent        : HTTP/1.1 200 OK
                    Transfer-Encoding: chunked
                    X-SourceFiles: =?UTF-8?B?QzpcVXNlcnNcRGpvcmlcRG9jdW1lbnRzXHByb2plY3RzXE9BdXRoVHV0b3JpYWxcT0F1dGhUdX
                    RvcmlhbFxhcGlcdjFcbWU=?=
                    Content-Type: text/plain; char...
Forms             : {}
Headers           : {[Transfer-Encoding, chunked], [X-SourceFiles, =?UTF-8?B?QzpcVXNlcnNcRGpvcmlcRG9jdW1lbnRzXHByb2plY3
                    RzXE9BdXRoVHV0b3JpYWxcT0F1dGhUdXRvcmlhbFxhcGlcdjFcbWU=?=], [Content-Type, text/plain;
                    charset=utf-8], [Date, Thu, 07 Jun 2018 00:43:13 GMT]...}
Images            : {}
InputFields       : {}
Links             : {}
ParsedHtml        : mshtml.HTMLDocumentClass
RawContentLength  : 7
```

## WSL

### api/v1/hello
```Bash
djori@jormungandr:~$ curl http://localhost:5000/api/v1/hello
hello
```

### api/v1/me
```Bash
djori@jormungandr:~$ curl http://localhost:5000/api/v1/me
you get
```

If it all looks good, then we can move on.

# Moving On

The demo of this project to this point can be found [here on GitHub](https://github.com/0xNF/OAuthTutorial/tree/04-PublicAPI).  

In the next part, we'll add the models our server will depend on, and then do our second migration.  
[Next](/posts/oauthserver/05)