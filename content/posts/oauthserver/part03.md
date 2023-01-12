---
title: "Implement an OAuth 2.0 Server (Part 03)"
date: 2018-06-06T16:15:56-07:00
draft: false
description: "We're still at the beginning of our OAuth 2 server tutorial, where we spend some time getting familiar with password requirements and Entity Framework migrations. Also we show how to make an ASP.NET Core project use SQLite instead of SQL Server."
slug: "03"
categories: 
- Security
- Identity
- Authentication
- Authorization
series:
- Implement an OAuth 2.0 Server
series_weight: 3
tags:
- OAuth2.0
- OpenIdConnect
- Tutorial
- CSharp
- .NET Core
---

Welcome to the third part of a series of posts where we will implement an OAuth 2 Server using [AspNet.Security.OpenIdConnectServer](https://github.com/aspnet-contrib/AspNet.Security.OpenIdConnect.Server).


# SQLite and Initial Migration

If you tried to start the website we just initialized, you'd find that you won't be able to login or register, receiving error messages instead of a welcome screen.

Although an initial migration has been provided for us, it hasn't been applied, and no database exists yet. And if we're not careful and rush to apply the migration ourselves we'll end up with a `SQL Server` dump file. We're going to switch our database provider to `SQLite`, and we're going to change our default `connection string` to reflect this.

## Setting the Default Connection String

Open the `appsettings.json` file and change the "DefaultConnection" field to

```JavaScript
 "DefaultConnection": "Data Source=OAuthTutorial.sqlite"
 ```

## Using SQLite

In `Startup.cs`, change the highlighted line so that we're using `SQLite` instead of `SQLServer`
 
{{< highlight csharp "linenostart=1,hl_lines=4" >}}
public void ConfigureServices(IServiceCollection services)
{
    services.AddDbContext<ApplicationDbContext>(options =>
        options.UseSqlite(Configuration.GetConnectionString("DefaultConnection")));

    services.AddIdentity<ApplicationUser, IdentityRole>()
        .AddEntityFrameworkStores<ApplicationDbContext>()
        .AddDefaultTokenProviders();

    // Add application services.
    services.AddTransient<IEmailSender, EmailSender>();

    services.AddMvc();
}
{{< / highlight >}}

## Password Requirements
While we're chilling out in `ConfigureServices()`, we might as well make some changes to the default password policy, which is strict and difficult. 
Instead of the defaults, we'll have it accept any 6 digit password. 

{{< highlight csharp "linenostart=1,hl_lines=6-13" >}}
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

    // Add application services.
    services.AddTransient<IEmailSender, EmailSender>();

    services.AddMvc();
}
{{< / highlight >}}

## Apply the Migration

Now we're ready to update the database for the first time and apply the migration.
Open the `Package Manager Console` again and enter the following:

```PowerShell
Update-Database
```

If you get errors related to the `Path` of the command, run the command again. The Package Manager Console can be finnicky at times.

It's important to note that with the EF Core + SQLite combination is functional but incomplete.  

Specifically with respect to performing migrations that involve `Foreign Key` relationships. EF cannot migrate any tables that have Foreign Keys, and will crash if you ask it to. To get around this, every time you want to add a new migration, you'll need to delete the old one, delete the old database file, run another `Add-Migration`, and another `Update-Database`.  
 

# Moving On

The demo of this project to this point can be found [here on GitHub](https://github.com/0xNF/OAuthTutorial/tree/03-InitialMigration).

In the next section, we'll create our initial bare-bones public API.  
[Next](/posts/oauthserver/04)