---
title: "Lyricall Security"
date: 2018-05-22T17:02:40-07:00
draft: false
description: "Security overview of lyricall.net as of May 2018. We talk data ownership, data boundaries, encrypted connections, and validation."
slug: "security"
categories: 
- lyricall
- architecture
- c#
- security
- database design
- .net core
- spotify
---

This is the Security Model for lyricall.net as of May 22nd, 2018.

<img src="/lyricallarch/lyricall.svg" height="150">


# Security Model

tl;dr: 
  
1. The servers are secure  
1. The services are secure  
1. Connections are secure  
1. Data is validated  
1. Ownership is checked  

todo:

1. Encrypt db at Rest  
1. Automatically rotate   dbhost/dbname/dbuer/dbpassword values
1. Spin out authentication server from api server  
1. Spin out client server from api server

## Server Provisioning
All machines are provisioned in the standard manner:

1. SSH key only access, no password authentication allowed
1. Standard SSH port is changed to be non-standard below 1024 to stop automated attacks on port 22
    * Ports below 1024 are privileged and can't be re-bound by another service.
1. No Root sign-on. Root only available via `sudo su` from an authenticated user
1. Access is done under an unprivileged user with an entry in `sudoers`
1. UFW is running with only the necessary service ports open. 
    * ssh
    * whichever applications are running  

## Data Boundaries
Any time a data-boundary is crossed, that boundary is treated as adversarial, and all data traveling across is verified before committed or consumed. 

The data boundaries for Lyricall are diagrammed here:

                                            + <--> Spotify Server (4)
                                            |
      Web Client (1. <-> API Server (2. <-> +
                                            |
                                            + <--> Database Server (3)

Data is validated on both ends of each boundary before passing along or using, with the exception of the Spotify Server which we don't control, and therefore cannot validate on their end. We do however, validate data coming back from it and going into it, according to the specs published on the https://developer.spotify.com documentation site. 

### Transport Security
All connections between data boundaries are secured behind TLS/SSL, courtesy of Let's Encrypt. 

Connections to the API Server and the Database Server are HTTPS only, and connections made via HTTP are rejected. This means that an attacker isn't afforded the opportunity to perform something like `sslstrip`.


## Basic Guarantees
Because we use C# with strong models, we have a minimum guarantee of runtime safety and data validation. As long as the models are conceptually correct, a lot of errors are automatically eliminated. Barring any incorrect implementations in the underlying libraries, buffer overflows or invalid states are impossible. 

## Database Side
The Database server resides on its own separate machine. 

    Postgres is not encrypted at rest, and none of the columns, tables, or databases are encrypted by default. 

### Config Settings
1. Postgres port is changed to reduce automated scan attack surface.
1. Postgres, via `pg_hba.conf` is configured to allow access when accessing via `localhost`, but only allows known ip ranges with known users, to known databases when connecting remotely.
1. All remote connections require SSL. Local connections are exempt from this requirement.
1. Of course even when connecting locally, authentication is necessary.

### User Settings
1. Main database uses a strong, secure, randomly generated 64-character string
1. Database is only accessible via a specific, lowest-privilege user, whose name is an equally random 64-character string. 
1. This user has an equally random 64-character string password
1. This user only has access to the app-database, and can not modify other Databases. It is not even an Administrator on the database. It has read-write access to most tables, but a second, more privileged Administrator user exists to execute various administrative tasks, like manually adjusting a users subscription.  

  
        In the future, these values will be rotated out occasionally.

### Data Validation, Incoming to Database (Boundary 2->3)

We make extensive use of the Postgres `CHECK` clause when constructing tables and inserting data to ensure data integrity. 

For example, `CONSTRAINT "Ensure Max Redemptions is uint" CHECK (("MaxRedemptions" >= 0))` makes sure that we don't submit any negative numbers to a field where it wouldn't make any sense if we did.

Foreign Key relationships also exist in most tables to help with cascading deletes as well as data integrity to protect against non-existent users or malicious/malformed data. 

## API Server
The API server resides on its own separate machine. 
The server runs Dot Net Core's Kestrel server, behind an nginx instance.

### Logging
Substantial logging occurs on the server allowing for appropriate security monitoring as well as developer debugging.

### Access Control
    Authentication is presently mixed with this server, and will be spun out to its own instance at a later date. 

Users must sign in with their Spotify account via the OAuth2 protocol. ASPNET security / EF Core modules handle safe storage of tokens and hashed user credentials. 

All API calls require proper authentication, as well as proper authorization. API calls that are not authenticated simply return `403 forbidden` as the status message. This is provided by the ASPNET Identity middleware and the `[Authorize (Role='member')]` attribute on the controllers and methods.

Authentication is provided by the ASPNET Identity middleware and supplies a client cookie.

Authorization is specified by roles. At the moment, everyone who signs up receives a role of `member`, which allows them access to the basic API.

A separate role of `administrator` exists and is only for support and statistics purposes. 

These roles are not transmitted by or to the users, and are only validated by the server against the database to check if a user has appropriate permissions for the given action. A user is not able to tell the server what role they possess.

Users are only able to access a handful of public pages if they are not signed in. All browser requests to forbidden or authentication-required resources result in a redirect to a 403 Error page.


### Secrets
Secrets such as the Spotify Client Secret or the Postgres Database Password are stored in environment variables only accessible to the webserver user. These secrets are not hardcoded in the source, nor are submitted by any user. They are transported only to the necessary endpoints via a secured channel.

Secrets are not checked into the git repositories and will not be found in the source, either in code or in config files.

### Data Validation, Incoming from Client API (Boundary 1->2)
For data being supplied by a client accessing the Client API, we validate all data with a number of checks, since we cannot guarantee that someone hitting the client endpoints is from the official webclient, or that the data in transit hasn't been manufactured, tampered with, or otherwise corrupted.  

1. For pagination requests, we validate that the limits and offsets are within bounds. 
1. For updates, we check that any given Spotify Playlists are in the correct format according to the Spotify specifications
1. We check that a Spotify playlist still exists on Spotify's servers
1. If a playlist is being modified, we check that the resource is owned by the requesting user. Tampering with someone else's playlist is not allowed, even if the ID of the playlist is known.
1. For Rules, we validate that the data is well formatted, and follows the Limits for the user. i.e., respects the Max_Nesting_Depth, and Max_Sources_Per_Playlist.
1. We also check that Rule values are within acceptable ranges. A field that operates upon doubles between 0.0 and 1.0 should refuse values outside that range. Similarly, it should fail for non-double values like strings or bytes.
1. Rules are also checked that the supplied field is valid. There is no rule by the property name of `nonexistantrulelol`, so the presence of a  supplied field not matching a known property results in rejection.


### Data Validation, Outgoing to Database (Boundary 2->3)

Values are not inserted by appending to a query, all values are substituted with Prepared Statements.


### Data Validation, Incoming from Database (Boundary 3->2)
Data is validated against statically, strongly typed models. Due to the nature of the enum-like classes, Rules are automatically guaranteed to be correct.

## Web Client

    Server hosting the Web Client is mixed with the Authentication and API Server. In the future, it should be moved to its own machine. At the moment this is difficult due to the .net antiforgery token system.


### Data Validation, Incoming from API Server (Boundary 2->1)
The web client is written in TypeScript and validates all incoming data according to the models described in the source.


### Data Validation, Outgoing to API Server (Boundary 1->2)
Prior to sending any data, the client checks and prevents invalid rule, rulegroup, or playlist states. 

This is mostly a quality of life improvement for the user, because any data can be modified and sent to the server. Validation is far stricter and more useful at other Boundaries.
