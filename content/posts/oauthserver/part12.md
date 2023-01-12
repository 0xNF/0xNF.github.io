---
title: "Implement an OAuth 2.0 Server (Part 12)"
date: 2018-06-18T18:11:43-07:00
draft: false
description: "We're ready to start working more seriously on issuing access tokens - the first step of which is to show the users a page that lets them review what permissions an application is requesting, and giving them the opportunity to accept or deny the request."
slug: "12"
categories: 
- Security
- Identity
- Authentication
- Authorization
series:
- Implement an OAuth 2.0 Server
series_weight: 12
tags:
- OAuth2.0
- OpenIdConnect
- Tutorial
- CSharp
- .NET Core
---

Welcome to the twelfth part of a series of posts where we will implement an OAuth 2 Server using [AspNet.Security.OpenIdConnectServer](https://github.com/aspnet-contrib/AspNet.Security.OpenIdConnect.Server).


# Authorization Request Accept/Deny View

Two of the the three flows we support, `Implicit Grant` and `Authorization Code`, are `interactive` flows - they require that the user be presented with a screen where they can `accept` or `deny` the authorization request.

As a preview, this is what our auth page will look like:
![Our auth confirmation page](/oauthserver/part09/authpagepreview.png)

# Add the ViewModel

Under `Models/`, add a new folder `AuthorizeViewModels/` and add a new `AuthorizeViewModel` class:

```csharp
public class AuthorizeViewModel {
    
    public string ClientName { get; internal set; }

    public string ClientId { get; internal set; }

    public string ClientDescription { get; internal set; }

    public string ResponseType { get; internal set; }

    public string RedirectUri { get; internal set; }

    public string[] Scopes { get; internal set; } = new string[0];

    public string State { get; internal set; }
}
```

Like before these fields are `internal set` to denote that we don't want any pages to attempt to treat them as inputs - they are purely for information conveyance.

# Add the Controller

Under `Controllers/` add a new controller named `AuthorizeController`.
Unlike before, we aren't generating this one automatically, and will instead set it up by hand:

```csharp
public class AuthorizeController : Controller {

    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;

    public AuthorizeController(ApplicationDbContext context, UserManager<ApplicationUser> userManager) {
        _context = context;
        _userManager = userManager;
    }


    public async Task<IActionResult> Index() {
        return Ok();
    }

    [HttpPost("deny")]
    public async Task<IActionResult> Deny() {
        return LocalRedirect("/");
    }
    
    [HttpPost("accept")]
    public async Task<IActionResult> Accept() {
        // TODO this will be a big method, we'll address it further down below.
        return Ok();
    }

}
```

## Index method
```csharp
public async Task<IActionResult> Index() {
    OpenIdConnectRequest request = HttpContext.GetOpenIdConnectRequest();
    OAuthClient client = _context.ClientApplications.Where(x => x.ClientId == request.ClientId).FirstOrDefault();
    if(client == null) {
        return NotFound();
    }

    AuthorizeViewModel vm = new AuthorizeViewModel() {
        ClientId = client.ClientId,
        ClientDescription = client.ClientDescription,
        ClientName = client.ClientName,
        RedirectUri = request.RedirectUri,
        ResponseType = request.ResponseType,
        Scopes = String.IsNullOrWhiteSpace(request.Scope) ? new string[0] : request.Scope.Split(' '),
        State = request.State
    };
}            
```

The only way to hit this page is to be directed to it via the OpenIdConnectServer - because if you recall, we registered `/authorization/` with it in Startup. That means that we will either have an invalid request, in which case the missing features will be presented to the user by ASOS, or we will have a valid request, and therefore our requests will have a filled-out `OpenIdConnectRequest` field on them. If you're having trouble finding that method, it's located under the `Microsoft.Extensions.DependencyInjection` namespace.

## Deny

If you copy&pasted from above, then the `deny` method is already fully implemented. We don't care what happens to a denied request except that the authorization fails to go through. 

Your implementation requirements may vary, however.  

## Accept
```csharp
[HttpPost("accept")]
public async Task<IActionResult> Accept() {
    ApplicationUser au = await _userManager.GetUserAsync(HttpContext.User);
    if (au == null) {
        return LocalRedirect("/error");
    }
    OpenIdConnectRequest request = HttpContext.GetOpenIdConnectRequest();
    AuthorizeViewModel avm = await FillFromRequest(request);
    if (avm == null) {
        return LocalRedirect("/error");
    }
    AuthenticationTicket ticket = TicketCounter.MakeClaimsForInteractive(au, avm);
    Microsoft.AspNetCore.Mvc.SignInResult sr = SignIn(ticket.Principal, ticket.Properties, ticket.AuthenticationScheme);
    return sr;
}
```

We need one helper method that we'll implement next, and we'll also include a call to `TicketCounter` - which, like before, remains unimplemented for the time being.

### Fill from Request

```csharp
private async Task<AuthorizeViewModel> FillFromRequest(OpenIdConnectRequest OIDCRequest) {
    string clientId = OIDCRequest.ClientId;
    OAuthClient client = await _context.ClientApplications.FindAsync(clientId);
    if (client == null) {
        return null;
    }
    else {
        // Get the Scopes for this application from the query - disallow duplicates
        ICollection<OAuthScope> scopes = new HashSet<OAuthScope>();
        if (!String.IsNullOrWhiteSpace(OIDCRequest.Scope)) {
            foreach (string s in OIDCRequest.Scope.Split(' ')) {
                if (OAuthScope.NameInScopes(s)) {
                    OAuthScope scope = OAuthScope.GetScope(s);
                    if (!scopes.Contains(scope)) {
                        scopes.Add(scope);
                    }
                }
                else {
                    return null;
                }
            }
        }

        AuthorizeViewModel avm = new AuthorizeViewModel() {
            ClientId = OIDCRequest.ClientId,
            ResponseType = OIDCRequest.ResponseType,
            State = OIDCRequest.State,
            Scopes = String.IsNullOrWhiteSpace(OIDCRequest.Scope) ? new string[0] : OIDCRequest.Scope.Split(' '),
            RedirectUri = OIDCRequest.RedirectUri
        };

        return avm;
    }
}
```

We use this method to assemble an `AuthorizeViewModel` from an incoming `OpenIdConnect` request, which is any incoming request to the `/authorize/` endpoint. It also helps ensure that incoming data is correct - an incoming post request may be coming from someone who tried to skip going through our view first.


# Add The View

Under `Views/` add a new Folder named `Authorize/` and then a new view called `Index`. Do not provide any model; we'll add one ourselves:

```html
@using OAuthTutorial.Models.AuthorizeViewModels
@model OAuthTutorial.Models.AuthorizeViewModels.AuthorizeViewModel
@{
    ViewData["Title"] = "Authorize an Application";
}

<h2><strong>@Model.ClientName</strong> wants your permission.</h2>
<div>
    Description:
    <strong>@Model.ClientDescription</strong>
</div>
<hr />
<div>
    This application is requesting the following permissions:
    <ul>
        @if (Model.Scopes.Any()) {
            foreach (string s in Model.Scopes) {
                <li>
                    @s
                </li>
            }
        }
        else {
            <li>
                None. This application doesn't need any special persmissions.
            </li>
        }
    </ul>
</div>

<div class="container">
    <div class="row">
        <div class="col-sm-3">
            <form method="POST" asp-action="accept">
                <input type="hidden" name="client_id" value="@Model.ClientId" />
                <input type="hidden" name="response_type" value="@Model.ResponseType" />
                <input type="hidden" name="scope" value="@string.Join(' ', Model.Scopes)" />
                <input type="hidden" name="redirect_uri" value="@Model.RedirectUri" />
                <input type="hidden" name="state" value="@Model.State" />

                <button class="btn btn-xs btn-danger" type="submit">
                    accept
                </button>
            </form>
        </div>

        <div class="col-sm-3">
            <form method="post" asp-action="deny">
                <button class="btn btn-xs btn-primary"
                        type="submit">
                    deny
                </button>
            </form>
        </div>
    </div>
</div>
```


# Moving On

The demo of this project to this point can be found [here on GitHub](https://github.com/0xNF/OAuthTutorial/tree/12-AuthorizationView).

In the next section we'll implement the `TicketCounter` and talk about `Claims`, `AuthenticationTickets` and more.  

[Next](/posts/oauthserver/13)