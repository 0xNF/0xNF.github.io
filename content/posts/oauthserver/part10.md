---
title: "Implement an OAuth 2.0 Server (Part 10)"
date: 2018-06-18T18:11:40-07:00
draft: false
description: "This is part 2 of 2 for setting up our OpenIdConnectServerProvider, where we'll wrap it up by implementing the Token series of methods"
slug: "10"
categories: 
- Security
- Identity
- Authentication
- Authorization
series:
- Implement an OAuth 2.0 Server
series_weight: 10
tags:
- OAuth2.0
- OpenIdConnect
- Tutorial
- CSharp
- .NET Core
---

Welcome to the tenth part of a series of posts where we will implement an OAuth 2 Server using [AspNet.Security.OpenIdConnectServer](https://github.com/aspnet-contrib/AspNet.Security.OpenIdConnect.Server).

# Authorization Provider - Token Methods

We're still implementing the `Providers/OAuthProvider.cs` class we made in the previous section. Here we're going to deal with the three Token methods we left un-overridden from last time: ValidateTokenRequest, HandleTokenRequest, ApplyTokenResponse.


## Validate Token Request

As a small warning, the validate token request endpoint is one of the longest methods we'll be implementing. To make it easier to digest, each significant sub-part has been split into its own mini section.

You'll notice that each of the request types is handled like the authorization validation was - check the existence of our client id, that the supplied redirects, if necessary, match properly, and if a client secret is supplied, we check that its the correct secret for the client requesting permission. 

### Check for supported grant types
First we'll automatically reject any request that isn't one of our supported flows:

{{< highlight csharp "linenos=inline,linenostart=1,hl_lines=6-13" >}}
public override async Task ValidateTokenRequest(ValidateTokenRequestContext context) {

    VService = context.HttpContext.RequestServices.GetRequiredService<ValidationService>();

    // We only accept "authorization_code", "refresh", "token" for this endpoint.
    if (!context.Request.IsAuthorizationCodeGrantType() 
        && !context.Request.IsRefreshTokenGrantType()
        && !context.Request.IsClientCredentialsGrantType()) {
        context.Reject(
                error: OpenIdConnectConstants.Errors.UnsupportedGrantType,
                description: "Only authorization code, refresh token, and token grant types are accepted by this authorization server."
            );
    }


    ...

}
{{< / highlight >}}

Recall that implicit grants are handled by the authorization methods from the previous section - meaning we don't have to deal with any unnecessary bits here.

### Set up the variables we'll be using

Each of the grants we'll deal with shares some subset of these variables, so we may as well declare them upfront, instead of repeatedly declaring them later:

{{< highlight csharp "linenos=inline,linenostart=1,hl_lines=5-9" >}}
public override async Task ValidateTokenRequest(ValidateTokenRequestContext context) {

    ...

    string clientid = null;
    string clientsecret = null;
    string redirecturi = null;
    string code = null;
    string refreshtoken = null;
    
    ...

}
{{< / highlight >}}

### Tackle the Authorization Code grant
Now we'll handle the `authorization_code` grant. We won't get around to testing this part for a while, but it's the second step of the `authorization code` flow:

{{< highlight csharp "linenos=inline,linenostart=1,hl_lines=6-57" >}}
public override async Task ValidateTokenRequest(ValidateTokenRequestContext context) {

    ...

    // Validating the Authorization Code Token Request
    if (context.Request.IsAuthorizationCodeGrantType()) {
        clientid = context.ClientId;
        clientsecret = context.ClientSecret;
        code = context.Request.Code;
        redirecturi = context.Request.RedirectUri;

        if (String.IsNullOrWhiteSpace(clientid)) {
            context.Reject(
                        error: OpenIdConnectConstants.Errors.InvalidClient,
                        description: "client_id cannot be empty"
                    );
            return;
        }
        else if (String.IsNullOrWhiteSpace(clientsecret)) {
            context.Reject(
                        error: OpenIdConnectConstants.Errors.InvalidClient,
                        description: "client_secret cannot be empty"
                    );
            return;
        }
        else if (String.IsNullOrWhiteSpace(redirecturi)) {
            context.Reject(
                        error: OpenIdConnectConstants.Errors.InvalidClient,
                        description: "redirect_uri cannot be empty"
                    );
            return;
        }
        else if (!await VService.CheckClientIdIsValid(clientid)) {
            context.Reject(
                        error: OpenIdConnectConstants.Errors.InvalidClient,
                        description: "The supplied client id was does not exist"
                    );
            return;
        }
        else if (!await VService.CheckClientIdAndSecretIsValid(clientid, clientsecret)) {
            context.Reject(
                        error: OpenIdConnectConstants.Errors.InvalidClient,
                        description: "The supplied client secret is invalid"
                    );
            return;
        }
        else if (!await VService.CheckRedirectURIMatchesClientId(clientid, redirecturi)) {
            context.Reject(
                        error: OpenIdConnectConstants.Errors.InvalidClient,
                        description: "The supplied redirect uri is incorrect"
                    );
            return;
        }

        context.Validate();
        return;
    }

    ...
}
{{< / highlight >}}

### Tackle the Refresh Token grant

Next we'll handle the `refresh_token`, which is the third step and last of the `authorization code` flow steps

{{< highlight csharp "linenos=inline,linenostart=1,hl_lines=5-49" >}}
public override async Task ValidateTokenRequest(ValidateTokenRequestContext context) {

    ...

    // Validating the Refresh Code Token Request
    else if (context.Request.IsRefreshTokenGrantType()) {
        clientid = context.Request.ClientId;
        clientsecret = context.Request.ClientSecret;
        refreshtoken = context.Request.RefreshToken;

        if (String.IsNullOrWhiteSpace(clientid)) {
            context.Reject(
                        error: OpenIdConnectConstants.Errors.InvalidClient,
                        description: "client_id cannot be empty"
                    );
            return;
        }
        else if (String.IsNullOrWhiteSpace(clientsecret)) {
            context.Reject(
                        error: OpenIdConnectConstants.Errors.InvalidClient,
                        description: "client_secret cannot be empty"
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
        else if (!await VService.CheckClientIdAndSecretIsValid(clientid, clientsecret)) {
            context.Reject(
                        error: OpenIdConnectConstants.Errors.InvalidClient,
                        description: "The supplied client secret is invalid"
                    );
            return;
        }
        else if (!await VService.CheckRefreshTokenIsValid(refreshtoken)) {
            context.Reject(
                        error: OpenIdConnectConstants.Errors.InvalidClient,
                        description: "The supplied refresh token is invalid"
                    );
            return;
        }

        context.Validate();
        return;
    }

    ...

}
{{< / highlight >}}

### Tackle Client Credentials grant
{{< highlight csharp "linenos=inline,linenostart=1,hl_lines=5-42" >}}

public override async Task ValidateTokenRequest(ValidateTokenRequestContext context) {

    ...

    // Validating Client Credentials Request, aka, 'token'
    else if (context.Request.IsClientCredentialsGrantType()) {
        string clientid = context.ClientId;
        string clientsecret = context.ClientSecret;


        if (String.IsNullOrWhiteSpace(clientid)) {
            context.Reject(
                        error: OpenIdConnectConstants.Errors.InvalidClient,
                        description: "client_id cannot be empty"
                    );
            return;
        }
        else if (String.IsNullOrWhiteSpace(clientsecret)) {
            context.Reject(
                        error: OpenIdConnectConstants.Errors.InvalidClient,
                        description: "client_secret cannot be empty"
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
        else if (!await VService.CheckClientIdAndSecretIsValid(clientid, clientsecret)) {
            context.Reject(
                        error: OpenIdConnectConstants.Errors.InvalidClient,
                        description: "The supplied client secret is invalid"
                    );
            return;
        }

        context.Validate();
        return;
    }

    ...

}
{{< / highlight >}}

### Error Catchall

Just in case anything managed to make it this far without being `validated`, we'll just blanket reject the request.

{{< highlight csharp "linenos=inline,linenostart=1,hl_lines=5-11" >}}
public class OAuthProvider : OpenIdConnectServerProvider {

    ...

    else {
        context.Reject(
            error: OpenIdConnectConstants.Errors.ServerError,
            description: "Could not validate the token request"
        );
        return;
    }
}
{{< / highlight >}}


## Handle Token Request

We said we'd outsource the `Handle` for the Authorization requests to another method, but we do have to actually deal with it here in the Token flow. This method is itself not so complicated because we still end up outsourcing some major parts to another section of the application, namely, the `TicketCounter` - which we'll get to later.  

For now it's just important to understand that unless ASOS has a valid, non-null `AuthenticationTicket`, it cannot issue any tokens properly and will fail if you attempt it. Authentication tickets are a complicated subject that will be explained when we get around to implementing the `TicketCounter` - until then, just hold on. 

{{< highlight csharp "linenos=inline,linenostart=1,hl_lines=7 13" >}}
public override Task HandleTokenRequest(HandleTokenRequestContext context) {
    AuthenticationTicket ticket = null;
    // Handling Client Credentials
    if (context.Request.IsClientCredentialsGrantType()) {
        // If we do not specify any form of Ticket, or ClaimsIdentity, or ClaimsPrincipal, our validation will succeed here but fail later.
        // ASOS needs those to serialize a token, and without any, it fails because there's way to fashion a token properly. Check the ASOS source for more details.
        ticket = TicketCounter.MakeClaimsForClientCredentials(context.Request.ClientId);
        context.Validate(ticket);
        return Task.CompletedTask;
    }
    // Handling Authorization Codes
    else if (context.Request.IsAuthorizationCodeGrantType() || context.Request.IsRefreshTokenGrantType()) {
        ticket = context.Ticket;
        if (ticket != null) {
            context.Validate(ticket);
            return Task.CompletedTask;
        }
        else {
            context.Reject(
                error: OpenIdConnectConstants.Errors.InvalidRequest,
                description: "User isn't valid"
            );
            return Task.CompletedTask;
        }

    }
    // Catch all error
    context.Reject(
        error: OpenIdConnectConstants.Errors.ServerError,
        description: "Could not validate the token request"
    );
    return Task.CompletedTask;
}
{{< / highlight >}}

Something to pay attention to are lines 7 and 13. If performing a client credentials grant, we have to supply the authentication ticket ourselves here in this method - but if this incoming request is for one of the other flows, then the ticket is already available on the context (at least it should be, which is why we have the null check) - this behavior is implemented at a later section, when we cover implementing the Views for the authorization flows.

## Apply Token Response

Once a given token flow has succeeded and been serialized into the response by ASOS, we need to write the new tokens to our database. We take note of the token type, the grant type, and the raw value, then we send it off to our not-yet-existent TokenService to be written to the database.

```csharp
// Our Token Request was successful - we should write the returned values to the database.
public override async Task ApplyTokenResponse(ApplyTokenResponseContext context) {
    if (context.Error != null) {
        return;
    }
    TService = context.HttpContext.RequestServices.GetRequiredService<TokenService>();
    ApplicationDbContext dbContext = context.HttpContext.RequestServices.GetRequiredService<ApplicationDbContext>();
    OAuthClient client = await dbContext.ClientApplications.FirstOrDefaultAsync(x => x.ClientId == context.Request.ClientId);
    if (client == null) {
        return;
    }

    // Implicit Flow Tokens are not returned from the `Token` group of methods - you can find them in the `Authorize` group.
    if (context.Request.IsClientCredentialsGrantType()) {
        // The only thing returned from a successful client grant is a single `Token`
        Token t = new Token() {
            TokenType = OpenIdConnectConstants.TokenUsages.AccessToken,
            GrantType = OpenIdConnectConstants.GrantTypes.ClientCredentials,
            Value = context.Response.AccessToken,
        };

        await TService.WriteNewTokenToDatabase(context.Request.ClientId, t);
    }
    else if (context.Request.IsAuthorizationCodeGrantType()) {
        Token access = new Token() {
            TokenType = OpenIdConnectConstants.TokenUsages.AccessToken,
            GrantType = OpenIdConnectConstants.GrantTypes.AuthorizationCode,
            Value = context.Response.AccessToken,
        };
        Token refresh = new Token() {
            TokenType = OpenIdConnectConstants.TokenUsages.RefreshToken,
            GrantType = OpenIdConnectConstants.GrantTypes.AuthorizationCode,
            Value = context.Response.RefreshToken,
        };

        await TService.WriteNewTokenToDatabase(context.Request.ClientId, access, context.Ticket.Principal);
        await TService.WriteNewTokenToDatabase(context.Request.ClientId, refresh, context.Ticket.Principal);
    }
    else if (context.Request.IsRefreshTokenGrantType()) {
        Token access = new Token() {
            TokenType = OpenIdConnectConstants.TokenUsages.AccessToken,
            GrantType = OpenIdConnectConstants.GrantTypes.AuthorizationCode,
            Value = context.Response.AccessToken,
        };
        await TService.WriteNewTokenToDatabase(context.Request.ClientId, access, context.Ticket.Principal);
    }
}
```

Authorization Code grants supply both a Refresh and an Access token, so we need to account for both those. The other grants just return a single access token. Remember though that in some implementations, including perhaps your own, a refresh request might return another refresh token in addition to a new access token - be sure to adjust for what your implementation requirements are.


# Moving On
The demo of this project to this point can be found [here on GitHub](https://github.com/0xNF/OAuthTutorial/tree/10-OAuthProviderB).

In the next section we'll implement the TokenService and ValidationService classes that we've been referencing.   
[Next](/posts/oauthserver/11)
