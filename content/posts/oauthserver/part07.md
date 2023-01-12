---
title: "Implement an OAuth 2.0 Server (Part 07)"
date: 2018-06-07T19:12:13-07:00
draft: false
description: "We'll wrap up creating the OAuth Client views by adding the actual razor page templated .cshtml views to our project."
slug: "07"
categories: 
- Security
- Identity
- Authentication
- Authorization
series:
- Implement an OAuth 2.0 Server
series_weight: 7
tags:
- OAuth2.0
- OpenIdConnect
- Tutorial
- CSharp
- .NET Core
---
Welcome to the seventh part of a series of posts where we will implement an OAuth 2 Server using [AspNet.Security.OpenIdConnectServer](https://github.com/aspnet-contrib/AspNet.Security.OpenIdConnect.Server).

# OAuth Client CRUD - Views
This is the second part of adding our OAuth Client management pages. In the previous section we generated a controller, which automatically generated some views for us. In this section, we'll make those views do what we need them to do. 



## Details and Delete Views

Delete the following two cshtml files - we don't need them, because we'll be rolling their functions into the `Edit` view.

* `Views/OAuthClients/Details.cshtml`
* `Views/OAuthClients/Delete.cshtml`


## Index

`Views/OAuthClients/Index.cshtml`

First, since we deleted our `GET DELETE` and `GET DETAILS` methods, we're going to want to delete their references from Index. Delete the two `<a>` tags near the bottom of `index.cshtml` that reference the `details` and `delete` links.

Second, it doesn't make sense to display the `client secret` so prominently, so let's change it to be the `client id` instead.

{{< highlight html "linenostart=1,hl_lines=13 28 37" >}}
@model IEnumerable<OAuthTutorial.Models.OAuth.OAuthClient>
@{
    ViewData["Title"] = "Index";
}
<h2>Index</h2>
<p>
    <a asp-action="Create">Create New</a>
</p>
<table class="table">
    <thead>
        <tr>
                <th>
                    @Html.DisplayNameFor(model => model.ClientId)
                </th>
                <th>
                    @Html.DisplayNameFor(model => model.ClientName)
                </th>
                <th>
                    @Html.DisplayNameFor(model => model.ClientDescription)
                </th>
            <th></th>
        </tr>
    </thead>
    <tbody>
@foreach (var item in Model) {
        <tr>
            <td>
                @Html.DisplayFor(modelItem => item.ClientId)
            </td>
            <td>
                @Html.DisplayFor(modelItem => item.ClientName)
            </td>
            <td>
                @Html.DisplayFor(modelItem => item.ClientDescription)
            </td>
            <td>
                <a asp-action="Edit" asp-route-id="@item.ClientId">Edit</a>
            </td>
        </tr>
}
    </tbody>
</table>
{{< / highlight >}}

## Create

`Views/OAuthClients/Create.cshtml`

Delete the `<div class="form-group">` containing the `ClientSecret` inputs. 

Also, in the `Model` up top, swap out the `OAuthClient` for our `OAuthClientsViewModes.CreateClientViewModel`.

{{< highlight html "linenostart=1,hl_lines=1" >}}
@model OAuthTutorial.Models.OAuthClientViewModels.CreateClientViewModel
@{
    ViewData["Title"] = "Create";
}
<h2>Create</h2>
<h4>OAuthClient</h4>
<hr />
<div class="row">
    <div class="col-md-4">
        <form asp-action="Create">
            <div asp-validation-summary="ModelOnly" class="text-danger"></div>
            <div class="form-group">
                <label asp-for="ClientName" class="control-label"></label>
                <input asp-for="ClientName" class="form-control" />
                <span asp-validation-for="ClientName" class="text-danger"></span>
            </div>
            <div class="form-group">
                <label asp-for="ClientDescription" class="control-label"></label>
                <input asp-for="ClientDescription" class="form-control" />
                <span asp-validation-for="ClientDescription" class="text-danger"></span>
            </div>
            <div class="form-group">
                <input type="submit" value="Create" class="btn btn-default" />
            </div>
        </form>
    </div>
</div>
<div>
    <a asp-action="Index">Back to List</a>
</div>
@section Scripts {
    @{await Html.RenderPartialAsync("_ValidationScriptsPartial");}
}
{{< / highlight >}}

## Edit

`Views/OAuthClients/Edit.cshtml`

Replace the HTML with this:
{{< highlight html "linenos=table,linenostart=1,hl_lines=39 44" >}}
@model OAuthTutorial.Models.OAuthClientViewModels.EditClientViewModel
@{ ViewData["Title"] = "Edit";
}
<h2>Edit</h2>
<h4>@Model.ClientName</h4>
<div>
    Client Id: <p>@Model.ClientId</p>
    <div>
        <div>
            Client Secret: <p>@Model.ClientSecret</p>
        </div>
        <form method="post" asp-action="ResetSecret">
            <input type="hidden" name="id" value="@Model.ClientId" />
            <button class="btn btn-xs btn-danger">RESET</button>
        </form>
    </div>
</div>
<hr />
<div class="row">
    <div class="col-md-4">
        <form asp-action="Edit">            
            <div class="form-group">
                <label asp-for="@Model.ClientDescription" class="control-label"></label>
                <textarea asp-for="@Model.ClientDescription" class="form-control"></textarea>
                <span asp-validation-for="@Model.ClientDescription" class="text-danger"></span>
            </div>
            <div id="rdiDivs" class="form-group">
                <label asp-for="@Model.RedirectUris" class="control-label" />
                <br />
                @for (int i = 0; i < Model.RedirectUris.Length; i++) {
                    <div id="rdiDiv_@i">
                        <input name="RedirectUris" value="@Model.RedirectUris[i]" />
                        <button type="button" onclick="RemoveRdiDiv(@i)">Remove</button>
                    </div>
                }
            </div>
            <button onclick="AddRdiDiv()" type="button">Add Redirect URI</button>
            <div class="form-group">
                <input type="submit" value="Save" class="btn btn-default" />
            </div>
        </form>
    </div>
</div>
<form method="post" asp-action="Delete">
    <input type="hidden" name="id" value="@Model.ClientId" />
    <button class="btn btn-xs btn-danger">DELETE</button>
</form>
<div>
    <a asp-action="Index">Back to List</a>
</div>
{{< / highlight >}}
Take note of lines 39 and 44 for the `Add Redirect URI` and `Remove` buttons. They have `type=button`, which prevents them from submitting the whole form as a `POST` request, and they have references to two JavaScript methods, which we will add shortly.

Finally, it's important to note that the `Redirect URI` inputs have `name="RediectUris"`. When multiple inputs have the same `name`, their values get packaged and sent as a `string[]` to the server. This is how we can group them all together as actually being Redirect URIs. 

#### JavaScript

Add the following `<Script>` above the `@section Scripts` section:

```html
<script>

    var count = @Model.RedirectUris.Length;

    function AddRdiDiv() {
        count += 1;
        console.log("ayyy");
        $("#rdiDivs").append('<div id="rdiDiv_' + count +'"><input name="RedirectUris" value=""/><button type="button" onclick="RemoveRdiDiv('+count+')">remove</button></div>');
    }

    function RemoveRdiDiv(id) {
        $("#rdiDiv_" + id).remove();
    }

</script>

```
We initialize `count` to be however many `RedirectURIs` exist in this `OAuthClient`, which serves as a way to uniquely identify inputs for addition and removal.

`AddRdiDiv()` adds another empty Redirect URI input to the page, and `RemoveRdiDiv()` takes one away. 

# Testing

At this point it's likely a good time to take a small break and see if our server is behaving.

Start your server, register a new user or login with one you've already created.

    Note: If you created a user before, deleted the database and regenerated it, you'll remain logged in but encounter errors because you are cookie identified as a now non-existant user. Log out and try again.

Things to try:

1. Create a new `OAuth Client Application`
1. Reset its `Client Secret`
1. Add some `Redirect URIs`
1. Delete the application

You can find these options at http://localhost:5000/OAuthClients

# Moving On

The demo of this project to this point can be found [here on GitHub](https://github.com/0xNF/OAuthTutorial/tree/07-ClientCRUDhtml).

In the next section, we'll add Scopes to our application.

[Next](/posts/oauthserver/08)