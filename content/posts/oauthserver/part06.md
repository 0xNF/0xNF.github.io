---
title: "Implement an OAuth 2.0 Server (Part 06)"
date: 2018-06-06T16:16:01-07:00
draft: false
description: "We'll spend some time creating setting up the OAuth Client views, which let a user register and edit an OAuth Client. This section deals with the ViewModels and Controllers."
slug: "06"
categories: 
- Security
- Identity
- Authentication
- Authorization
series:
- Implement an OAuth 2.0 Server
series_weight: 6
tags:
- OAuth2.0
- OpenIdConnect
- Tutorial
- CSharp
- .NET Core
---
Welcome to the sixth part of a series of posts where we will implement an OAuth 2 Server using [AspNet.Security.OpenIdConnectServer](https://github.com/aspnet-contrib/AspNet.Security.OpenIdConnect.Server).

# OAuth Client CRUD - Controller and ViewModels
This is the first part of adding our OAuth Client management pages. We'll set up the controller and the viewmodel here. [In next part](/posts/oauthserver/part07), we'll add the html views.

## View Models

ViewModels are, at least in the context of `ASP.NET` (as opposed to UWP where the MVVM pattern changes what it means slightly), is a way of firewalling our models from our views. Our models may have fields we don't want to expose all the time. This may get in the way of automatically validating fields, it may lead to extra hidden form fields in our views, and it can generally be a pain to deal with.

To get around that, we create some `ViewModels`, which only contain the data we wish to send to and from our views. In our case, we're going to be using them to avoid sending over the `ClientSecret` and `Owner` all the time.

Under the `Models/` folder, create a new folder called `OAuthClientsViewModels/`.

### Create View Model
The first class we're going to create under `Models/OAuthClientsViewModels/` is `CreateClientViewModel`:

```csharp
public class CreateClientViewModel {

    [Required]
    [MinLength(2)]
    [MaxLength(100)]
    public string ClientName { get; set; }

    [Required]
    [MinLength(1)]
    [MaxLength(500)]
    public string ClientDescription { get; set; }
}
```

Our Create page only requires the user to supply a `name` and a `description`. A complete `OAuthClient` has other fields like `ClientId` and `ClientSecret`, but we'd be inviting disaster if we let the user supply their own ids. We'll be generating those values on the server, without user input.

We specify attributes on the fields so that the automatic validation knows what kinds of errors to provide back to the user.

### Edit View Model

We'll send over many of the same fields that make up a regular client, but the only thing we expect back is the client description, which may or may not have changed. The user is allowed to view but not edit the other fields.

We set the RedirectURIs to be a `string[]` because we'll be using Razor Page binding techniques to automatically group submitted urls together into one field.

```csharp
public class EditClientViewModel {
    [Required]
    [MinLength(1)]
    [MaxLength(500)]
    public string ClientDescription { get; set; }

    public string ClientName { get; internal set; }

    public string ClientId { get; internal set; }

    public string ClientSecret { get; internal set; }

    public string[] RedirectUris { get; set; } = new string[0];
}
```

We mark some of these as being `internal set` so that the validation doesn't try to check them. We'll send the client secret over too, so that a user can regenerate the secret if they need to.

## Controller

Next is to add a new controller. Unlike the public API controller, we'll be generating this one automatically. 

Right click on `Controllers`, select `Add`, and click `Controller`.
Choose `MVC Controller with views, using Entity Framework`

![New Controller](/oauthserver/part06/newcontroller_withviews.png)

Fill out the `Model class` with the `OAuthClient`,
Fill out the `Data conext class` with `ApplicationDbContext`,  
and leave the rest as the defaults.

![new defaults](/oauthserver/part06/newcontroller_details.png)

This has the benefit of automatically generating all the necessary views for us. We just need to make a few tweaks to them.

### Authorization
First off we need to add an `[Authorize]` attribute to the controller. Unauthorized visitors, aka, users that are not signed in, will be redirected to the home page.

{{< highlight csharp "linenostart=1,hl_lines=1" >}}
[Authorize]
public class OAuthClientsController : Controller
{
    private readonly ApplicationDbContext _context;

    public OAuthClientsController(ApplicationDbContext context)
    {
        _context = context;
    }

    ...

}
{{< / highlight >}}

### User Manager

We'll need to manipulate the users who access these pages, so we need to inject `UserManager` into the constructor

{{< highlight csharp "linenostart=1,hl_lines=5 7 9" >}}
[Authorize]
public class OAuthClientsController : Controller {

    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;

    public OAuthClientsController(ApplicationDbContext context, UserManager<ApplicationUser> userManager) {
        _context = context;
        _userManager = userManager;
    }

    ...

}
{{< / highlight >}}

### Index

The Index should only return the clients for which the current user is the `Owner`.

This also introduces the `Entity Framework` concept of `Includes`.

If you're not familiar with Entity Framework Core, models with additional models on them, like our `Owner` on the `OAuthClient` are not populated by default when querying. This is to save on bandwidth and I/O costs, but it can be a surprise if you're not expecting a sudden Null Pointer. The solution is to call `.Include()` on the `DbSet` with the field we need. In this case, the method chain looks like `_context.ClientApplications.Include(x => x.Owner)...`


{{< highlight csharp "linenostart=1,hl_lines=3-4" >}}
// GET: OAuthClients
public async Task<IActionResult> Index() {
    string uid = _userManager.GetUserId(this.User);
    return View(await _context.ClientApplications.Include(x => x.Owner).Where(x => x.Owner.Id == uid).ToListAsync());
}
{{< / highlight >}}


### Details

Delete the `Details(string id)` method - we won't be using it, because we're going to combine it with our `Edit` page.

### POST Create

We can leave the GET Create method alone and move on to the POST Create method.

This method gets changed quite a bit - we swap out the `OAuthClient` for our `CreateClientViewModel`, change what fields we're listening to in the `[Bind]` parameter, and we create a new `OAuthClient` with generated values for `ClientId` and `ClientSecret`. 

{{< highlight csharp "linenostart=1,hl_lines=0" >}}
// POST: OAuthClients/Create
// To protect from overposting attacks, please enable the specific properties you want to bind to, for 
// more details see http://go.microsoft.com/fwlink/?LinkId=317598.
[HttpPost]
[ValidateAntiForgeryToken]
public async Task<IActionResult> Create([Bind("ClientName,ClientDescription")] CreateClientViewModel vm)
{
    if (ModelState.IsValid)
    {
        ApplicationUser owner = await _userManager.GetUserAsync(this.User);
        OAuthClient client = new OAuthClient() {
            ClientDescription = vm.ClientDescription,
            ClientName = vm.ClientName,
            ClientId = Guid.NewGuid().ToString(),
            ClientSecret = Guid.NewGuid().ToString(),
            Owner = owner,
        };

        _context.Add(client);
        await _context.SaveChangesAsync();
        return RedirectToAction(nameof(Index));
    }
    return View(vm);
}
{{< / highlight >}}

### GET Edit

This is the `GET` version of `EDIT`. POST will get its own special treatment.

We'll be using the `EditClientViewModel` from before, along with our standard checks for ownership.
To match the viewmodel's fields, we transform any existing `RedirectURIs` to their string form, then to an array with LINQ.

{{< highlight csharp "linenostart=1,hl_lines=0" >}}
// GET: OAuthClients/Edit/5
public async Task<IActionResult> Edit(string id)
{
    if (String.IsNullOrEmpty(id)) {
        return NotFound();
    }

    string uid = _userManager.GetUserId(this.User);
    var oAuthClient = await _context.ClientApplications.Include(x => x.Owner).Include(x=>x.RedirectURIs)
        .SingleOrDefaultAsync(m => m.ClientId == id && m.Owner.Id == uid);
    if (oAuthClient == null) {
        return NotFound();
    }

    EditClientViewModel vm = new EditClientViewModel() {
        ClientName = oAuthClient.ClientName,
        ClientDescription = oAuthClient.ClientDescription,
        ClientId = oAuthClient.ClientId,
        ClientSecret = oAuthClient.ClientSecret,
        RedirectUris = oAuthClient.RedirectURIs.Select(x => x.URI).ToArray()
    };

    return View(vm);
}
{{< / highlight >}}


### POST EDIT

The method is large but not as big as it looks - it contains a nested internal method. It could be extracted out, but it only exists to deal with one specific scenario while editing a client, so it's been stuffed inside this one.

We've edited the Bind parameters to be just the fields that a user can actually edit - the `Client Description` and the `RedirectUris`.

After our standard ownership checks, we make sure to include the `RedirectURIs` while fetching from the context, because we need to perform some operations on the ones that already exist.

The meat of the method is under `CheckAndMark`, which just adds re-submitted URIs, creates ones that didn't exist before, and then uses LINQ's `Except` and `Select` to mark any deleted URIs as `EntityState.Deleted` for Entity Framework.


{{< highlight csharp "linenostart=1,hl_lines=0" >}}
// POST: OAuthClients/Edit/5
// To protect from overposting attacks, please enable the specific properties you want to bind to, for 
// more details see http://go.microsoft.com/fwlink/?LinkId=317598.
[HttpPost]
[ValidateAntiForgeryToken]
public async Task<IActionResult> Edit(string id, [Bind("ClientDescription", "RedirectUris")] EditClientViewModel vm)
{
    string uid = _userManager.GetUserId(this.User);
    OAuthClient client = await _context.ClientApplications.Include(x => x.Owner).Include(x=>x.RedirectURIs).Where(x => x.ClientId == id && x.Owner.Id == uid).FirstOrDefaultAsync();
    if (client == null)
    {
        return NotFound();
    }

    if (ModelState.IsValid)
    {
        try
        {
            List<RedirectURI> originalUris = client.RedirectURIs;
            CheckAndMark(originalUris, vm.RedirectUris);

            client.ClientDescription = vm.ClientDescription;
            _context.Update(client);
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!OAuthClientExists(vm.ClientId))
            {
                return NotFound();
            }
            else
            {
                throw;
            }
        }
        return RedirectToAction(nameof(Index));
    }
    return View(vm);


    void CheckAndMark(List<RedirectURI> originals, IEnumerable<string> submitted) {
        List<RedirectURI> newList = new List<RedirectURI>(); 
        foreach(string s in submitted) {
            if (String.IsNullOrWhiteSpace(s)) {
                continue;
            }
            RedirectURI fromOld = originals.FirstOrDefault(x => x.URI == s);
            if(fromOld == null) {
                // this 's' is new.
                RedirectURI rdi = new RedirectURI() { OAuthClient = client, OAuthClientId = client.ClientId, URI = s };
                newList.Add(rdi);
            } else {
                // this 's' was re-submitted
                newList.Add(fromOld);
            }
        }

        // Marking deleted Redirect URIs for Deletion.
        originals.Except(newList).Select(x => _context.Entry(x).State = EntityState.Deleted);

        // Assign the new list back to the client
        client.RedirectURIs = newList;
    }
}
{{< / highlight >}}

### Get Delete

Delete the `Delete (string id)` method. Like our `Details` method, we're going to combine it with `Edit`.

This is the `GET` version of `DELETE`. Like Edit, POST will get its own special treatment.


### POST Delete

Attempting to post a delete forces a client/user check.

{{< highlight csharp "linenostart=1,hl_lines=0" >}}
// POST: OAuthClients/Delete/5
[HttpPost, ActionName("Delete")]
[ValidateAntiForgeryToken]
public async Task<IActionResult> DeleteConfirmed(string id)
{

    if (String.IsNullOrEmpty(id)) {
        return NotFound();
    }

    string uid = _userManager.GetUserId(this.User);
    var oAuthClient = await _context.ClientApplications.Include(x => x.Owner)
        .SingleOrDefaultAsync(m => m.ClientId == id && m.Owner.Id == uid);

    if(oAuthClient == null) {
        return NotFound();
    }

    _context.ClientApplications.Remove(oAuthClient);
    await _context.SaveChangesAsync();
    return RedirectToAction(nameof(Index));
}
{{< / highlight >}}

### Reset Client Secret
This is a custom method we're going to add - it did not come generated in the controller.

We supply this method so a user can regenerate their `client secret` in the event they mistakenly check it into source control, or if it's leaked by any other means. The implications of this are that when a user's authentication tokens come up for renewal, they'll need to restart the entire process. If the client is on a phone, or is otherwise an installed application as opposed to a web app, the user will need to download a new build of the application containing the new secret. 

As a side note, this is why iOS and Android apps seem to update so frequently without adding anything in their release notes - they're cycling their application keys according to some schedule as a security precaution.

{{< highlight csharp "linenostart=1,hl_lines=0" >}}
// POST: OAuthClients/ResetSecret/
[HttpPost, ActionName("ResetSecret")]
[ValidateAntiForgeryToken]
public async Task<IActionResult> ResetClientSecret(string id) {

    string uid = _userManager.GetUserId(this.User);
    OAuthClient client = await _context.ClientApplications.Include(x => x.Owner).Include(x => x.RedirectURIs).Where(x => x.ClientId == id && x.Owner.Id == uid).FirstOrDefaultAsync();
    if (client == null) {
        return NotFound();
    }

    try {
        client.ClientSecret = Guid.NewGuid().ToString();
        _context.Update(client);
        await _context.SaveChangesAsync();
    }
    catch (DbUpdateConcurrencyException) {
        if (!OAuthClientExists(client.ClientId)) {
            return NotFound();
        }
        else {
            throw;
        }
    }
    return RedirectToAction(id, "OAuthClients/Edit");
}
{{< / highlight >}}

# Moving On
The demo of this project to this point can be found [here on GitHub](https://github.com/0xNF/OAuthTutorial/tree/06-ClientCRUDVMs).

In the next section we'll deal with the second half of this unit and modify the generated Views.
[Next](/posts/oauthserver/07)
