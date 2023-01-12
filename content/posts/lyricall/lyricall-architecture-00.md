---
title: "Lyricall Architecture"
date: 2018-05-22T15:35:08-07:00
draft: false
description: "Architecture summary of lyricall.net as of November 2017 - this is no longer consistent with the current implementation, but remains a bssic overview all the same."
slug: "architecture"
categories: 
- lyricall
- architecture
- c#
- security
- database design
- .net core
- react
- spotify
- typescript
- redux
---

This summary of the architecture was correct upon its initial posting (November 2017). Changes have since been made. There is no guarantee that this post remains accurate into the future.

<img src="/lyricallarch/lyricall.svg" height="150">


# Table of Contents

* Architecture of lyricall.net
    * Technology tl;dr:
    * App Overview
    * Front End
        * TypeScript
        * Why TypeScript
        * Redux
        * React
        * Why React
    * Back End
    * Database - PostgreSQL
        * Why Postgres
        * Database Schema
        * Lyricall Tables
        * Straggler Tables
        * ASP.NET / Entity Framework Tables
    * Server - .NET Core 2.0 / ASP.NET Core 2.0
        * Why .NET Core
        * Intermission - the DotNetStandardSpotifyWebApi library
        * Intermission - the ASP.NET Security Project
        * API
        * Server Architecture
        * Entity Framework vs Hand Crafted SQL
        * Automatic Timed Services
        * Services
        * Models
        * Validation
        * Scanning
    * Hosting
    * Digital Ocean
        * Security
        * Backups
        * CI/CD
    * Microsoft Azure
        * Backups
        * CI/CD
    * Let’s Encrypt

Architecture of lyricall.net  
<img src="/lyricallarch/NetworkDiagram.png" height="500">

# Technology tl;dr:

## Front End

* React
* Redux
* TypeScript

## Back End

* ASP.NET Core 2.0

## Database

* PostgreSQL

## Hosting

* Database: Digital Ocean
* Server: Microsoft Azure  



Developer Note:
It’s worth mentioning that prior to this endeavor, my experience in software development had been on desktop clients, command line utilities, and high performance computation. My experience with most of these technologies, ecosystems, and practices, including HTML/CSS was either virtually or truly zero, and as such almost every single aspect of this project involved learning substantial amounts of new technologies and concepts.


# App Overview
Lyricall is classic client-server application. The front end client is an ASP.NET Core 2.0 program running on a Microsoft Azure instance, and the back end is a Digital Ocean-hosted Ubuntu VM running a Postgres 9.5 instance.

Except for the initial OAuth authorization flow between the user and Spotify, all communication with Spotify’s servers happen from the .NET back end server.

# Front End
he front end is split into three distinctive parts:

1. Static HTML
1. Server Rendered Razor Page
1. Client Rendered React-Redux app

In the future reducing the number of different technologies involved in rendering various pages of the front end would be nice to do, but this is the present state of affairs.

The pages found under lyricall.net/faq and lyricall.net/privacy are static HTML files that are served by the back end directly with a text/html encoding.

The landing page at lyricall.net/ is a server rendered Razor Page. Originally this page was also a plain HTML file, but because authenticating with Spotify and logging into the application is supported from the front page, and because ASP.NET encourages, by default, to use Anti-XRSF tokens, it was easier to render the page dynamically because as a Razor Page View, it can insert the necessary Anti-XRSF token onto the page itself.

And thirdly, the actual webapp located under lyricall.net/app is a client rendered Reect-Redux application.

<img src="/lyricallarch/ts.svg" height="75">

The front end is delivered as a React-Redux application, but is built as a TypeScript project, which, knowing nothing about Front End development, was made doable with Microsoft’s react-typescript starter project.

## Why TypeScript

There is a standard choice for web development, there are the add-on choices, and there are the esoteric choices. If were aiming for maximum esotericism, we’d have gone with Elm - Haskell in the browser. If we were masochistic, we’d go for plain JavaScript. But we are rational folk, so the JavaScript-Plus route seemed the way to go. That particular route has two main flavors - Flow, and TypeScript. Both are systems that add typing to JavaScript, and they have their perks and minuses. Flow boasts a sound type system, which means they guarantee that a value possesses the type that is specified, while TypeScript has some scenarios that do not produce such soundness, i.e., a value says it’s an Foo but it may be a Bar. This can cause some occasional complications.

TypeScript meanwhile has A-Class tooling, broad community support, geniuses behind the project in the form of Anders Heijsberg of Delphi, Turbo Pascal, and C# fame, and a truly extensive collection of available typings via the Definitely Typed project. In addition, many major libraries include their own typings file.

There are two main questions people ask when it comes to choosing the front-end language - the boring one is whether to use Flow or TypeScript. Both are great! I have chosen TypeScript because I wanted to, and because I think its the winning competitor in the front-end-language wars as of this writing (December, 2017).

The other question, usually by people who haven’t used a non dynamically typed language before, is why not just JavaScript?

That’s a more interesting question, because it touches upon the arguments of compilation vs interpretation, strong types vs weak types, dynamic typing vs static typing, and language design more generally. One of the common arguments against typings, which is also the most common argument in favor of NoSQL solutions, is that strong types slow down the developer and prevent rapid prototyping. I think this is patently false. In addition to not being encumbered by types, I find that having a static type system does wonders for my ability to hold a codebase in my head.

I have to worry less about exactly what collection of properties an object has or what is needed by a method, and can instead collapse that collection into an object with a name. Mentally, this saves incredible amounts of processing. Additionally, for those of us who use an IDE or an otherwise fleshed out editor, static typings means the IDE can start to help us out a lot - painless refactoring, code completion, instant access to signatures and docstrings. This is an amazing boost to productivity.

Being able to catch type mismatch errors at compile-time, or even at design-time if your editor or IDE has the ability means we increase our ability to produce better code, and our ability to produce code faster. The sooner we can catch an error, the better. This doesn’t eliminate runtime errors of course - but we reduce their number by magnitudes.

Once upon a time an argument could have been made that adding in a build-step was too much to ask for a front end project, but ever since Bower hit the scene, the idea that a compilation step (whether by gulp, webpack, or anything else) is a burden is no longer credible.

## Client Structure

The client has the following structure:

* src/
    * actions/
    * actionCreators/
    * actionInterfaces/
    * actionTypes/
    * components/
    * containers/
    * models/
    * reducers/
    * services/
    * stores/

Meanwhile this what the Redux State Store looks like.:

```javascript
interface LyricallStoreShape {
    readonly User: User;
    readonly LoadingSection: LoadingSectionShape;
    readonly Selection: SelectionShape;
    readonly CurrentPages: CurrentPagesShape;
    readonly PageCache: PageCacheShape;
    readonly FullSmartPlaylistsCache: FullSmartPlaylistsCacheShape;
    readonly AvailableProperties: Property[];
}

export interface LoadingSectionShape {
    readonly IsLoading: boolean;
    readonly IsModalOpen: boolean;
    readonly ErrorMessage: string;
}

export interface SelectionShape {
    readonly SmartPlaylist: SmartPlaylist;
    readonly DidModify: boolean;
    readonly SelectedPlaylistSourcesPage: Paging<SpotifyPlaylist | UserLibrary>;        
    readonly SelectedAddedTracksPage?: Paging<Track>;  
    readonly IsLoading: boolean;
    readonly ErrorMessage: string | null;
}

export interface CurrentPagesShape {
    readonly SpotifySourcesPage: Paging<UserLibrary | SpotifyPlaylist> | null;
    readonly SuggestedListenersPage: Paging<RuleGroup> | null;
    readonly SimpleSmartPlaylistsPage: Paging<SimpleSmartPlaylist> | null;
}

export interface PageCacheShape {    
    readonly SimpleSmartPlaylistCache: PageCache<SimpleSmartPlaylist>;
    readonly SpotifySourcesCache: PageCache<UserLibrary | SpotifyPlaylist>;
    readonly AvailableListenersCache: PageCache<RuleGroup>;
}

export interface FullSmartPlaylistsCacheShape {
    readonly IsInavlid: boolean;
    readonly SmartPlaylists: Map<string, SmartPlaylist>;
}
```
    It is my understanding that null is poor form and non-idiomatic TypeScript, but like many first iteration products, especially in a technology that the developer is completely new to, non-idiomatic patterns find their way into the codebase. Coming from a C# background with almost no substantial experience in JavaScript, nulls are a well-understood pattern. Making proper usage of TypeScript’s undefined and optional arguments is slated for the next iteration.

When a sign in is successful or when the session cookie is authenticated, the app performs a number of immediate actions:


* Setting the current User
* Zeroing out all the caches
* Fetching the user’s pre-existing Smart Playlists
* Fetching the user’s Spotify Playlists
* Fetching the pre-made Listeners


## Redux
<img src="/lyricallarch/redux.svg" height="150">

All of these actions are initiated by various Service functions located under src/services/, such as GetUsersSmartPlaylists() from the SmartPlaylistService.ts file.

Each service method sends a notification to the Redux Action Creators under src/actions/actionCreators/, which, using the Redux-Thunk package, then asynchronously initiates a number of related Redux Actions:

* a Requested action
* a Failed action
* a Succeeded action

When Redux is altered of a Requested action, depending on the operation, such as if it is a network transaction, the relevant sections of the Store have their IsLoading flag flipped, or set IsModalOpen, enabling the Loading Screen for the application.

If a request fails for any reason, the appropriate Failed Action is initiated, the loading flags are disabled, and an error message is displayed to the user.

If a request succeeds, then the data is cached in the appropriate place and the pages controls are updated to reflect the change in state.

## React
<img src="/lyricallarch/react.svg" height="150">

### Why React
What a mess front end development is. After nearly 70 years of doing desktop computing in various forms, and nearly 50 years of graphical computing, we as an industry have a set of front end toolkits that build in solid patterns, have been battle tested and are more or less easy to use. Qt, Windows Forms, Cocoa. And then web developers saw all that and said, ‘nah’, leaving us with a long trail of bodies as they struggled to find something even remotely resembling the desktop frameworks: Ember, Knockout, Polymer, Backbone, Meteor and countless others.

For a period of time, it looked as though Angular would win the Front End Framework War, and gained a huge amount of traction as a well supported Google project. During the same period of time, an upstart React project was emerging out of Facebook. In time, we would see that although Angular was definitely a contender, it would begin to lose out to React in terms of popularity.

It is of course important to draw attention to the fact that these two frameworks are not 1:1 compatible - Angular comes with an opinionated structure, with canonical ways to call out to third parties and how to set up your project, while React is much more lightweight, essentially only packaging a way to create view components. However, no sane project chooses to combine these - although they technically serve different purposes, it is an effectively mutually exclusive choice.

So why React? As someone on HackerNews said in a thread I cannot find anymore, React essentially did WebComponents better than WebComponents. WebComponents are of course, the proposed W3C spec for browsers standardizing custom reusable HTML5 components. React did this problem so well it seems to have put a serious damper on how fast the WebComponent spec is working through the committee. React is no Windows Forms, but it is very good.

I would be remiss not to mention Vue.js. Just as React was an upstart, so too is Vue. There’s a lot to like about it, and if you know React, it’s easy to pick up View. Additionally, Vue has ginormous support by Chinese developers. The majority of front end projects that I encounter with Chinese authors choose Vue as their front end framework of choice.

The choice here came down to the same reasons TypeScript was chosen - It looks like it is winning. If I were a betting man, I would bet that React will be here longer. The community is excited about React unlike Angular, companies are choosing React more than Angular, it even seems like it chilled the W3C. React seems like the more solid choice, and so React it is.

### React Structure
There are a number of components the project uses, most are located under `src/components/`, but some which require direct Redux access are located under `src/containers/`. Some of these controls include

* PagingBox, which controls flipping through pages of Spotify Playlists, Smart Playlists, or Listeners
* ListenerTree, which is a wrapper for `react-sortable-tree`, and
* RuleNode / RuleGroupNode, which are how Lyricall displays its atomic units

These components were made as Stateless Function Components (SFC) by default, and upgraded to a full Class if necessary, such as is the case with with `ListenerTree`.

All these components have their corresponding ReactProps and ReactState if necessary, and are of course typed.

These react components are how the user interacts with Lyricall - and either directly or indirectly are what call the back end REST API.

# Back End
## Database - PostgreSQL
<img src="/lyricallarch/postgres.svg" height="150">
### Why Postgres
During the initial setup, I was conflicted on what to use for the Database. I have a lot of experience with SQLite, but as the developer says, SQLite is a replacement FOpen(), not a database. Lyricall is a small project that will likely see very few people using it, let alone concurrently. In this instance, SQLite would probably have been a fine choice for the back end database, but I took it as a learning project to get familiar with a real production database.

The standard options for anyone wanting to deploy such a database includes the usual suspects:

* MySQL
* PostgreSQL
* SQL Server
* MongoDB

In addition, there are a bunch of other non standard databases that are interesting as well:

* RethinkDB
* Cassandra
* MariaDB

While surely useful in their niches and certainly interesting in their own right, it seemed like a good idea to steer clear of that second set of databases, leaving us in the first set. My impression upon hearing the word “MySQL” is to recoil - after all, it is an Oracle project, and separately has a reputation for being a stodgy old-timer. Although research revealed that modern day MySQL seems to have caught up to the pack, I just didn’t feel like using it.

SQL Server is, I hear, a fantastic database, but it is a Microsoft enterprise offering meaning that it comes with an incredible price tag. I am not averse to paying money for a good solution, but the database space is special in that there’s really no reason to. The open source solutions are cutting edge, stable, and well documented. Why pay for what I don’t have to?

Thus the choice came down to either Mongo or Postgres. Although Mongo specifically, and NoSQL options more generally are darlings of practitioners of modern web design, my work with previous databases combined with the fact that my software engineering upbringing was not on the web, leaves me with a visceral dislike of NoSQL.

The idea that my data is unstructured, as a general statement, strikes me as profoundly wrong. Aside from certain fields like genomics where the data really can’t be counted on to be structured, or in situations where massive horizontal sharding is required, a NoSQL solution seems like the wrong choice. Additionally, though perhaps more personally, the idea that a structured database with strong types slows down development time is ludicrous. For myself at least, strong types are necessary for moving fast.

By process of elimination therefore, PostgreSQL was the last man standing. I’d like to note that the tooling is really what won it for Postgres. Although not quite as extensive as Mongo’s tooling, there is just the right amount of excellent support for the database - a good enough GUI client; iron-clad official documentation; thousands of competently answered StackOverflow questions; And most importantly, a fabulous .NET Core library that both integrates with Entity Framework and allows for complete manual control.

If a a few of those, but most significantly the .NET Core library, were missing, I would have been forced to go with Mongo - thankfully I was able to avoid the swamp of misery that I’ve been mired in before with that database, and was able to successfully and pleasantly work with Postgres. I couldn’t be happier with this decision.

### Database Schema
There are 2 disjoint sets of tables in the schema - one is the custom Lyricall-only set of tables, and the other is the set of tables that comes with ASP.NET / Entity Framework’s authentication and identity addon.

### Lyricall Tables
<img src="/lyricallarch/LyricallTable.PNG" height="500">

SmartPlaylists was intended on being the top-level table, but it ended up being that RuleGroups was the top-level. Meaning that in order to completely clear all lower level entries, deleting the rule group takes care of that, while deleting the Smart Playlist will leave remnant entries around.

That being said, it functions perfectly fine, and is in no way an urgent or even necessary fix. It’s really just a design quirk.

The scheme here is the product of a lot of back and forth about how best to represent the persistence layer. There’s an impedance mismatch between objects stored in memory and objects stored in a tabular format - this is of course well documented, well understood, and if one has the proper training, well taught. But it doesn’t go away, and figuring out how to resolve the mismatch in not just one direction, but two, is always an effort that will be resolved to better or worse degrees.

Some things map one-to-one, like Sources. In memory, I have a Playlist object, which contains a bunch of metadata like

```csharp
class SpotifyPlaylist : SpotifySource {
  string PlaylistName;
  User Owner;
  string SpotifyId;
  string SnapshotId;
}
```
among other fields. The main playlist object has more complicated fields like its own tracks, but Lyricall has no need to keep track of that, and can safely ignore their existence. This leaves us a simple object that can be mapped easily to a table with the fields

```sql
CREATE TABLE Sources(
  ID TEXT Primary Key,
  OwnerID TEXT, 
  PlaylistName TEXT,
  SnapshotId TEXT,
);
```

Easy.
We go slightly astray from a simple mapping when we have to account for the User Library, a Spotify object that resembles a playlist but is critically different. It has no Id, no Owner, and no Name. But it functions like a playlist, is structured like a playlist, and is handled, by the end user, like a playlist. And yet, it is not a playlist. So in memory, we end up with an object that looks like this,

```csharp
class UserLibrary : SpotifySource {

}
```

Yes, it is empty.

Its purpose is to be a differentiator in a list of Sources, held in memory. There are operations we perform that go over a list of `Sources`, and the two available types of sources are `SmartPlaylist` and `UserLibrary`.

Unfortunately now we have to put that into the same Sources table as well. There are surely other ways to solve this particular issue, but I settled on what’s known as a discriminator, a field that exists in the Database but does not exist on the in-memory class, letting us serialize and deserialize with much more certainty.

```sql
CREATE TABLE Sources(
  ID TEXT Primary Key,
  OwnerID TEXT, 
  PlaylistName TEXT,
  SnapshotId TEXT,
  IsLibrary BOOLEAN
);
```

That wasn’t too hard either.

Where we’ve run into the trickiest problem of the Database was transforming our tree-like rule structure into flat, tabular one.

In memory our rules look like this

```csharp
interface Listener {
  [...]
}

class Rule : Listener {
  [...]
}

class RuleGroup  : Listener {
  [...]
  List<Listener> rules;
  [...]
}
```
A `Rule` is a `Listener`.
Not a problem. Add a Rule table.

A `RuleGroup` is a `Listener`.
Still not a big deal, add mapping table with a discriminator.

A `RuleGroup` can contain arbitrarily deep nested `Listeners`, which in turn may also contain arbitrarily deep nested `Listeners`.
Now we’re getting into a fun problem.

The solution is to use a mapping table with a loop. Each entry in the RuleMap points to either:

* A `Rule` entry, or
* A `RuleGroup` entry

with the `IsRuleGroup` we’re able to at least determine what kind of `Listener` we’re looking at, but if we’ve referenced a `RuleGroup`, then we still have the problem of getting the next layer of `Listeners` that `RuleGroup` has. Thus we have a `ParentRuleGroupId` field which is a key to both a   `RuleGroup` and a recursive entry in `RuleMap`, solving our arbitrary nesting problem.

To an experienced developer, this solution likely sounds either obvious or suboptimal. For a developer like myself who has much experience with SQL but only a handful of run-ins with tree data, this was, while not a huge challenge, certainly not obvious.

There are a handful of other tables connected here. Their purposes are, briefly:


* `ScansInProgress`: If a playlist is being scanned and hasn’t completed, it goes here. Prevents launching multiple scans of the same Smart Playlist.
* `StagedTracksAddedMap`: Tracks that meet the criteria for a Smart Playlist are placed here until they can be uploaded successfully. Prevents permanent non-addition of tracks due to server failure.
* `TracksAddedMap`: Tracks that have been successfully added are removed from `StagedTracksAddedMap` and placed here. Prevents adding duplicate tracks to the same playlist. May be cleared by a `force` scan.
* `LyricallConditions` and `LyricallProperties`: Database versions of Lyricall Rule Properties. Prevents tampering of incoming data, such as if someone were to supply a field for rule scans that didn’t exist. This is essentially a source of truth. No operations by the server ever modify this.

### Straggler Tables
<img src="/lyricallarch/Misc.PNG" height="500">

* `_EFMIgrationsHistory`: Entity Framework curated migration table. Not relevant to this technical discussion.
* `ScanLimits`: Records how many times a User has requested a scan in a single Lyricall-Day. Because I try to avoid maxing out my Spotify API rate limit, this table restricts users from spamming scans. The limit is set by the Server, but hovers around 10 scans a day.
* `SpotifyAudioAnalysis`: A JSON store table keeping the extremely heavy `AudioAnalysis` objects from Spotify. This, along with `SpotifyAudioFeatures`, are caching tables which allow us to minimize calls to the Spotify API service.
* `SpotifyAudioFeatures`: Caches from the `get-audio-features` Spotify endpoint.

### ASP.NET / Entity Framework Tables

<img src="/lyricallarch/EfCoreTable.PNG" height="500">

 These are included for completeness’ sake, but are completely auto-generated by the Entity Framework’s migration tools dotnet ef migrations add and dotnet ef migrations update.

Noteworthy is mostly that an AspNetUser is a 1:1 mapping of a SpotifyUser, minus a bunch of fields that aren’t supplied by Spotify or aren’t useful to the lyricall.net service .

We also store the users OAuth access and refresh tokens in the AspNetUserTokens table.

In the future, I’d like to link the deletion of a user to the automatic deletion of their SmartPlaylists/RuleGroups via a foreign key constraint on SmartPlaylists.OwnerId => AspNetUser.Id, but as it stands now, doing a manual query on matching OwnerIds is a perfectly fine process.

# Server - .NET Core 2.0 / ASP.NET Core 2.0

<img src="/lyricallarch/netcore.svg" height="150">

## Why .NET Core

Similar to the discussion preceding the choice of Postgres as my database, I also had to make the decision of what would be the primary server.

The choices were:

* Node (JavaScript)
* Flask or Django (Python)
* Rails (Ruby)
* ASP.NET Core

Reading anything about web development over the last 5 years would lead one to believe that there is only NodeJS, and that all others are pretenders. Thankfully that isn’t so, and despite the mind bogglingly immense amount of articles, StackOverflow posts and hackathons evangelizing it, there are numerous better alternatives.
And that’s fabulous, because like Mongo, my experience with Node isn’t amazing, and I’d like to avoid it if I can get away with it.

Coming from a heavy C# background also means coming with a number of convictions and expectations that are often in diametric opposition to the values espoused in modern, or at least, vocal, web development circles. For example, like most people, I don’t like JavaScript. But heretically, I also don’t think it’s necessary. I understand that it is the lingua franca of the front-end web, but why for the love of god must I put it on my server too? There is simply no need for that. As long as I have a say in it, there’s no room for JavaScript on the server while better solutions exist. I’d damn sooner write something in pure C than JavaScript.

Strike Node from the list.

Flask or Django are certainly nice servers, and Python is a wonderful language, especially since the community has decided to finally move to 3+, but I just wasn’t that keen on doing what I imagined would be a decently complicated application in a dynamically typed language. That’s even with me knowing Python very well. The problem is compounded for a language like Ruby, which I don’t know anything about at all.

Barring the more interesting choice of .NET Core, I’d likely have chosen one of the Python servers, but .NET Core 2.0 had recently entered the final stages of its pre-release cycle, and the beta was rapidly approaching an end. In addition, I am extremely well versed in C# and enjoy the language immensely.

This decision was just as easy as the database one.

.NET Core 2.0 it would be.

## Intermission - the DotNetStandardSpotifyWebApi library

Before we discuss how the actual backend operates, its important to draw attention to two external dependencies of the lyricall project - the DotNetStandardSpotifyWebApi and ASP.NET Security project.

I’ve been using Spotify as a testing grounds for a number of projects, some of which get released, others which don’t - but whenever there’s an idea I’d like to test out or try, Spotify is often the first place I turn to provide some kind of application for the concept.

Originally I had a project that helped a user classify songs according to some user-specified criteria, which required pulling from the Spotify web api, pushing back to the service, and performing other related operations. This application was built as an early UWP project, and had a tightly coupled, highly intermixed way of interacting with the Spotify API.

Eventually the Spotify API portion was spun off into off into its own library, although it was still coupled around UWP, and was thus not portable outside the platform.

With the release of .NET Core also including the reveal of the .NET Standard, which specifies a unified API surface across all .NET implementations, it felt like the right time to update my Spotify Library. Although a lot of the building blocks were in place from all these prior iterations, specifically the data structures around the formalizing of json structures into C# classes like the `Track` or `Album`, much of the plumbing around fetching the data wasn’t up to par.

After a number of days of work refreshing the project for use as a .NET Standard library and writing tests for it, it looked good enough to place on GitHub, where it resides now. It isn’t finished, although it close. I imagine the remaining gaps will be filled in when I do a project that requires the missing features.

The Library provides an abstraction around Spotify’s API, allowing for someone to simply request a `Track` by the specified `Artist`, or to work easily on a `Playlist`, or any other such way of using their API.

## Intermission - the ASP.NET Security Project
Just having an easy-and-ready-to-use Spotify library wasn’t enough to begin work on the Lyricall.

Because the application is entirely dependent upon a user and their Spotify account, it’s necessary to be able to authenticate with Spotify and get a token that can be used to act upon the users account. Spotify, like many APIs, supports this scenario via the OAuth 2.0 authentication process.

I had, in the earlier versions of the DotNetSpotifyWebApi library, done this kind of OAuth authenticating by hand, which was overly reliant upon specific HTTP Clients in the .Net Framework, were prone to various failures, and was as a whole an unstable ill-tested mess liable to collapse at any moment.

As I was in the midst of updating that library anyway, it seemed like a good time to shop around for more professional authentication solutions than my own hand-rolled one, an enlightening learning experience though it was.

Research led me around the internet to various places and projects but none really fit the bill for what I needed. There were handfuls of pre-existing libraries for this that were built for NodeJS or Flask, but none for ASP.NET.

Given that Microsoft had recently open-sourced the entire .NET platform, and because Microsoft supplies a small number of official implementations for authenticating against various services, I decided to write another OAuth authenticator based around how Microsoft did it.

This was a successful endeavor, but it was hodgepodged together with kludges and certainly not best-practice development choices. As I later put it on a GitHub issue, it was a “homeless amalgam”. Bits from here, bits from there, and no real good place to put it for future use.

After some additional research some number of days later, I came across a promising community project, linked to from the official Microsoft docs, about OAuth processing for ASP.NET, called the ASP.NET Security project, which contained dozens and dozens of pre-supplied and pre-tested OAuth plugins for providers like YouTube, Twitch, Baidu, and others. Unfortunately, their main branch, while massive and thorough, was only for .NET Core 1.0. The 1.0 release and the 2.0 release had enough breaking changes that it was impossible to use 1.0 libraries as a drop-in solution in 2.0 projects, and unfortunately, 2.0 is where I had invested my time.

This led me to prowl around their issue tracker, where I found a thread asking about .NET Core 2.0 versions of the project - although there had been a fair amount of activity in that thread, it looked pretty dead by the time I arrived. Nevertheless, I posted about my working-but-wonky Spotify authentication, and asked if there was work being done that I could contribute to.

Fortunately for me, this necroposting revived the thread and spurred a bunch of latent activity on the project - including from the maintainers, who pointed me towards a beta 2.0 branch, and suggested placing my project there.

I had to scrap and rewrite my authentication program because it was so far out of the project guidelines, but in the end I was able to produce a well formatted and complete Spotify authentication solution for this project. Maybe others will find it useful as well.

The wonders of Open Source.

# API
There are presently 18 public endpoints structured as a REST application that a client may hit:

|method |endpoint
|-------|--------
|GET |/api/v1/revoke
|GET |/api/v1/playlists?id={id}
|PUT |/api/v1/playlists
|POST |/api/v1/playlists
|DELETE |/api/v1/playlists?id={id}
|DELETE |/api/v1/unfollow?id={id}
|DELETE |/api/v1/deletesmart?id={id}
|PUT |/api/v1/fetch?id={id}
|POST |/api/v1/playlists/update
|GET |/api/v1/me/smartplaylists
|GET |/api/v1/me/Spotifyplaylists
|GET |/api/v1/premade/
|PUT |/api/v1/fetch?id={id}&force=[t/f]
|PUT |/api/v1/pause?id={id}
|PUT |/api/v1/resume?id={id}
|PUT |/api/v1/clear?id={id}
|GET |/api/v1/tracks?id={id}
|GET |/api/v1/listenerinfo

# Server Architecture

At the root level, the project is structured to contain multiple projects, because they aren’t available on Nuget yet, as well as projects for tests. That looks like this:

* Lyricall/
    * AspNet.Security.OAuth.Spotify/
    * DotNetStandardSpotifyWebApi/
    * Lyricall.IntegrationTests/
    * Lyricall.UnitTests/
    * Lyricall/

Of course the magic happens in `Lyricall/Lyricall/`:
* Lyricall/
    * wwwroot/
    * Client/
    * Controllers/
    * Data/
        * Migrations/
    * Models/
        * Domain/
        * Staged/
    * Services/
    * Views/

`wwwroot/` stores our deployed front end, which is the fully compiled forms of the TypeScript project, as well as the static html files found under `Client/`.

Like all ASP.NET projects, the public API is defined by the controllers located under `Controllers/`. Logins are processed via `HomeController` and `AccountController`. These are holdovers from the default project where corresponding `Views/Home.cshtml` and `Views/Account.cshtml` views existed. Although the naming and structure is somewhat vestigial, their login and authentication functionality remains.

The heavy lifting API is defined by the `SmartPlaylistController` class. This is where `GetAPlaylist()`, `Update()`, `ClearAddedTracks()`, and the rest of the public API reside.

Sign in and authentication happen by first hooking the Spotify OAuth project into the `Startup.ConfigureServices()` method:

```csharp
services.AddAuthentication().AddSpotify((options => {
        AppConstants.ClientId = Configuration[AppConstants.ClientIdKey];
        AppConstants.ClientSecret = Configuration[AppConstants.ClientSecretKey];
        options.ClientId = AppConstants.ClientId;
        options.ClientSecret = AppConstants.ClientSecret;
        options.SaveTokens = true;
        options.Scope.Add(DotNetStandardSpotifyWebApi.Authorization.SpotifyScopeEnum.PLAYLIST_MODIFY_PUBLIC.Name);
        options.Scope.Add(DotNetStandardSpotifyWebApi.Authorization.SpotifyScopeEnum.PLAYLIST_READ_COLLABORATIVE.Name);
        options.Scope.Add(DotNetStandardSpotifyWebApi.Authorization.SpotifyScopeEnum.PLAYLIST_READ_PRIVATE.Name);
        options.Scope.Add(DotNetStandardSpotifyWebApi.Authorization.SpotifyScopeEnum.USER_LIBRARY_READ.Name);
}));
```

The scope additions are what this particular Spotify-API based application needs, which is the ability to:

* Read and write access to a user’s public playlists so that we may add songs
* Read and write access to a user’s collaborative playlists for the same reason
* Read and write access to a user’s private playlists, for the same reasons
* Read access to a user’s Library, so we can use it as a source

There are a handful of other permissions that we could request, but Lyricall doesn’t need them to work, so we do not have to request any extraneous permissions.

We also use the built-in ASP.NET identity module, which uses the Entity Framework to handle the database structure, serializing/deserializing, and migration creation with respect to Users:

```csharp
services.AddIdentity<ApplicationUser, IdentityRole>()
        .AddEntityFrameworkStores<ApplicationDbContext>()
        .AddDefaultTokenProviders();
```

The ApplicationDbContext contains the necessary information for the application to create the identity table structures. This comes as a freebie default by creating an ASP.NET identity application.

### Entity Framework vs Hand Crafted SQL

There’s a discrepancy which should be addressed at this point. We use Entity Framework to handle identity, but we constructed all the other relevant tables in the Lyricall database by hand. In fact, we never use Entity Framework, or any further ApplicationDbContexts at all beyond its one purpose. The reason for this is the embodiment of a long-running argument in the programming community about ORMs vs No ORMs. ORMs make it easy to do simple things like accessing one table with no dependencies on other tables, but performing joins or ensuring foreign key constraints quickly undoes the benefits of the ORM.

Additionally, ORM’s have a tendency to require that the code be mutilated to appease it - suddenly there are decorators everywhere, public methods, getter/setters on every field. Principles of least access and separation of concern are sacrificed to fit the code model that the ORM expects in order to function properly.

An ORM is not without its benefits - they make migrations dead simple, easily auditable, trivially reproducible - but for me, the benefits do not counter the sheer weight they add to the project.

Thus, lyricall is a mixed project, where the things that are handled well and by default by the ORM like Identity and Authorization, are allowed to do so, while the custom sections of the application are done by hand.

### Automatic Timed Services

Returning to `Startup.cs`, we have a number of hosted services:

```csharp
//These two singletons are responsible for populating the list of To-Scan items every 10 minutes
services.AddSingleton<UpcommingScansProvider>();
services.AddSingleton<IHostedService, ScansRefreshService>();
//These two singletons are responsible for actually dequeuing and scanning the items from the previous service
services.AddSingleton<ScannerProvider>();
services.AddSingleton<IHostedService, ScanProviderService>();
//These two singletons are responsible for resetting everyone's Scan Counts at midnight
services.AddSingleton<ScanCountResetProvider>();
services.AddSingleton<IHostedService, ScanCountResetService>();
```

The comments should be explanatory. These services run at specified intervals and are responsible for ensuring the continuing automatic operation of the server. This way, a user’s smart playlist can be updated without further input by the user.

### Services

The public API of the controllers is generally self contained, and strives to keep a separation between it and other parts of the application. When interoperability between application sections is required, travel through some of the static Service classes is encouraged.

For example, interaction with Spotify, via the `DotNetStandardSpotifyWebApi` library, is further abstracted out into the SpotiifyService class, where methods like `CreateSpotifyPlaylist()`, `FetchAudioFeatures()`, and `UploadSongs()` reside.

Interaction with the Database goes through the `DatabaseService` class. In specific, the `DatabaseService` class is split into two partial class sections - one which defines the actual database methods like `GetSmartPlaylistSources` and `SetSourceScanCrashPoint`, and another which contains private classes and structures needed, such as `PlaylistMetadata`, `FlattenedStagedListeners` as well as methods which specifically operate upon or with those classes.

Previously mentioned auto-timer services also reside under `Services/`.


### Models
* Models/
    * Domain/
        * Listener/
            * ErrorObject.cs
            * Listener.cs
            * RuleGroup.cs
            * Rule.cs
        * LyricallException.cs
        * LyricallCondition/
            * LyricallCondition.cs
            * StringCondition.cs
            * NumberCondition.cs
            * BooleanCondition.cs
        * LyricallObject/
            * LyricallObject.cs
            * AdditionalDataFlags.cs
            * LyricallMatchObject.cs
            * SmartPlaylist.cs
            * SimpleSmartPlaylist.cs
            * LyricallTrack.cs
            * LyricallPaging.cs
            * PremadeListeners.cs
        * LyricallProperty/
            * LyricallProperty.cs
            * TrackProperty.cs
            * AlbumProperty.cs
            * ArtistProperty.cs
            * AudioFeaturesProperty.cs
            * PlaylistProperty.cs
            * LibraryProperty.cs
            * Range.cs
            * LongRange.cs
            * IntNumberRange.cs
            * DoubleNumberRange.cs
            * StringRange.cs
            * BooleanRange.cs
        * ProgressObject/
            * NextScanTimes.cs
            * ProgressObject.cs
        * SpotifySource/
            * SpotifySource.cs
            * SpotifyPlaylist.cs
            * UserLibrary.cs
        * UserTokens.cs
    * Staged/
        * StagedListener/
            * StagedListener.cs
            * StagedRuleGroup.cs
            * StagedRule.cs
        * StagedSmartPlaylist.cs
        * ValidationResult.cs

Lyricall is focused around automatically updating Smart Playlists - and almost every class represented within are directly in support of that.

The core class is `SmartPlaylist`, which is structured, with simplifications, like this:

```csharp
public class SmartPlaylist {
        public const string Type = "SmartPlaylist";
        /// Spotify ID generated on submitting a Create Playlist request to Spotify
        public string PlaylistId { get; }
        /// Spotify ID of the user who owns this playlist. 
        /// In context of Smart Playlists, it is always the user who created it
        public string OwnerId { get; }
        /// Name of the Playlist - the User specifies its name.
        public string PlaylistName { get; }
        /// The timestamp of the last source scan this playlist underwent
        public DateTime LastFetched { get; }
        /// Timestamp of the next upcoming source scan this playlist will undergo
        public DateTime NextFetch { get; }
        /// The list of sources this Smart Playlist draws from
        public IReadOnlyList<SpotifySource> Sources { get; }
        /// The top level group to match on.
        /// May contain a single Rule, or RuleGroup, or any number of any combination
        public RuleGroup Listeners { get; }
        public JObject ToJson();
        internal static bool HasAtLeastOneRule(SmartPlaylist sp);
    }
```



All classes that get JSONified and sent to a client have two properties: a `const string Type` field which nominalizes the class for use in a JavaScript deserializer, and a `public JObject ToJson()` method, which does what it says on the tin, using the now-built-in `Newtonsoft.Json` library.

The Smart Playlist is the complex, fully constructed main functional unit of the application. It’s two most important aspects are the `Sources` field and the `Listeners` field.

`Sources` is the list of Spotify Sources that this playlist is designated to draw from - this can be a user’s Saved Songs, or any `Playlist` that they follow on Spotify. `Sources` are very simple classes, which implement the `SpotifySource` interface.

`Listeners` is the source of nearly all of Lyricall’s complexity - much effort has been put into attempting to compensate and work around the complexity of this field. Two aspects of the complexity are because listeners are arbitrarily nested trees of listeners which has implications for scanning/matching and database de/serialization, and also because there is a fairly broad amount of things that can be listened for, which are each narrowly defined in terms of their accepted values.

An easy but wrong way to counter the complexity would be to simply leave user-input unguided and unvalidated - but we’ve chosen to formalize what a listener is allowed to do, what accepted values are and what range they fall into. For example, a Track Property defines the fields that can be listened to when evaluating a specific track:

```csharp
public class TrackProperty : LyricallProperty {
        public static readonly TrackProperty TrackName = new TrackProperty(0, "Track Name", StringCondition.AllConditions, StringRange.GenericRange);
        public static readonly TrackProperty Markets = new TrackProperty(1, "Available Markets", StringCondition.AllConditions, StringRange.GenericRange);
        public static readonly TrackProperty DiscNumber = new TrackProperty(2, "Disc Number", NumberCondition.AllConditions, IntNumberRange.GenericRange);
        public static readonly TrackProperty Duration = new TrackProperty(3, "Duration", NumberCondition.AllConditions, IntNumberRange.DurationRange);
        public static readonly TrackProperty Explicit = new TrackProperty(4, "Explicit", BooleanCondition.AllConditions, BooleanRange.GenereicRange);
        public static readonly TrackProperty Popularity = new TrackProperty(5, "Popularity", NumberCondition.AllConditions, IntNumberRange.DurationRange);
        public static readonly TrackProperty TrackNumber = new TrackProperty(6, "Track Number", NumberCondition.AllConditions, IntNumberRange.GenericRange);
    }
```


The constructor and supporting fields are omitted for clarity’s sake, but they include a private static `Dictionary<int, TrackProperty>` for in-memory storage.

A `TrackProperty` can be a listener assigned to a few specific fields:

* Track Name
* Available Markets
* Disc Number
* Duration
* Explicit
* Popularity
* Track Number

Each of those fields has specific value types and value ranges they accept, and are specified by their third constructor argument. For example, `StringCondition.AllConditions` means the field accepts string values, and its allowed conditions includes

* is
* is not
* contains
* does not contain
* starts with
* does not start with
* ends with
* does not end with

Meanwhile, Duration is `NumberCondition.AllConditions`, meaning it accepts integers (as specified by the Spotify API, duration is an integer not a long), and its allowed conditions include:

* Less Than
* Less Than Or Equal To
* Greater Than
* Greater Than Or Equal To
* Equal To
* Not Equal To

### Validation

```csharp
public abstract class Listener: LyricallObject {
    public int Id { get; }
    public abstract AdditionalDataFlags AdditionalDataFlags { get; }
    public abstract bool Matches(LyricallMatchObject lmo);
}

public class RuleGroup : Listener {
    public string GroupName { get; }
    public EveryAny EveryAny { get; }
    public IReadOnlyList<Listener> Rules { get; }
    private AdditionalDataFlags _AdditionalDataFlags = AdditionalDataFlags.Unset;
}

 public class Rule : Listener {
    public LyricallProperty Property { get; }
    public LyricallCondition Condition { get; }
    private AdditionalDataFlags _AdditionalDataFlags = AdditionalDataFlags.Unset;
    public string Value { get; }
    private Func<LyricallMatchObject, bool> Matcher { get; }
 }
```

When a rule, which is a combination of a specific `LyricallProperty` like `Duration` or `Artist Name` or `Danceability`, a a specific `LyricallCondition` like `Starts With` or `Greater Than`, and a value, it is run through a validation process which checks that:


* The `Property` is a valid, existing property and wasn’t mal- or maliciously formed. i.e., `Coolness Level` is not a valid property.
* The `Condition` is valid and wasn’t also maliciously formed, and that it is correct for the `Property`. i.e., `Track Name Greater Than "hello"` is invalid.
* The value falls within the specified range of the field. For example, negative values don’t make any sense for some fields, meanwhile other fields are doubles between 0.0 and 1.0.

A supplied rule that violates any of these assumptions fails validation and the client is supplied with an error message representing the issue.

This validation happens using specific `Staged` classes found under `Models/Staged/`. These classes are deserialized from json and usually ignore supplied Id fields, and are only allowed to touch certain parts of the inner applications. This prevents malicious or malformed input from affecting the system improperly.

A similar validation check happens at every step where user input is supplied - supplied Spotify Sources are validated for both format and existence on Spotify. Edits to a SmartPlaylist not only ensure that the values, conditions and property combinations are valid, but also that the present user actually owns the SmartPlaylist they are attempting to edit, and that any rules don’t have their Id tampered with such that a rogue user can edit the rules of another user.

The User is an adversarial component, we do not trust that any of their inputs is legitimate or properly formatted. In a future update, we’d like to treat the Database as an adversarial component as well.

### Scanning

When a scan is requested, or when a scan is automatically triggered, an asynchronous scan is kicked off with the `NaiveScanner` class.

`NaiveScanner` is so named because future iterations are planned where playlists with similar sources will be batched together and matched at the same time, reducing our overall workload as well as stress on Spotify’s servers. At the moment of writing however, this optimization does not occur, hence it is a naïve scan.

The scanner first loads a `SmartPlaylist` from the database by its Id, counts its sources, and then queue them up for scanning.

Each source checks a number of conditions, like if there any songs in it, or if it crashed or otherwise failed to complete an earlier scan - if it did fail, then it attempts to pick back up from the spot it failed at. Otherwise, it starts from the beginning, keeping track of its offset. A crash in the scan will update the Database with its last known offset, and will continue automatically at a later time, until a certain number of scan failures occur.

Failures can include any number of things such as Spotify enabling rate-limiting on the account, network failures, or token revocations. All of these initiate the crash-failure protocol.

The scanner has some optimizations in place to reduce load in various places:


* If the user no longer follows the smart playlist on their Spotify account, the `SmartPlaylist` is deleted form the Lyricall database and the scan as a whole does not proceed.
* If a `source` has no songs, the scan for that `source` is marked as ‘complete’ and completes early.
* If a `source` hasn’t changed since the last scan on this `SmartPlaylist` was performed (through the `ETag` attribute, or the `SnapshotId` attribute), then the scan for that source is marked as ‘complete’ and completes early.
* If a `source` reaches all the way to end, where there is no longer a defined next page to request, the scan is marked as complete.
* If a `source` has changed since last time, we complete the scan for that source when we reach the last known position of the previous scan, preventing us from double-scanning sources and wasting api calls and bandwidth.

If the Smart Playlist has a rule that needs access to `AudioFeatures` or `AudioAnalysis` data, the Database cache is checked for presence of the data-heavy Audio object before asking Spotify for more data. Of course, the `GetMany` variant of the Spotify API call is used to minimize API rate limiting. If a call is necessary, we check against what is already in the cache, and only request the ones that we need. Although this does not affect our rate limit, it does lower the overall bandwidth required. New data returned is subsequently cached into the Database.

As a technical detail, we compile each track we see into a `LyricallMatchObject`, which rectifies the impedance mismatch between a `SavedTrack`, a `PlaylistTrackObject`, and a direct `Track`, which are all defined by Spotify, and are very similar but have slightly different semantics. This lets us scan over a user’s Saved Songs library, a Playlist or, later, an Album or Artist without significant deviation in methods. This is especially useful when passing the track down the chain for the Rule Matching process.

Each track is passed to the Rule Matcher, which is a huge switch statement that simply checks if the value of the rule matches the value of the field in the track we’re looking at.

Each matched rule returns a boolean, `true` for a successful match, `false` otherwise. Within a RuleGroup, we check, depending on the flag, whether we need to match all rules or any rule. The obvious optimizations apply: If all, then a single `false` returns `false` for the group. If any, then a single `true` returns `true` for the group.

If a song passes all its checks, then it gets added to an in-memory list which, upon source scan completion, will be transferred to the databases `StagedTracks` table.

When the scan as a whole completes, the `StagedTracks` is scheduled to upload as soon as possible, and the `NextScan` and `LastScanned` fields are updated appropriately.

# Hosting

## Digital Ocean
<img src="/lyricallarch/digitalocean.svg" height="150">
The Postgres instance resides on Digital Ocean. A number of other web services offer managed Postgres services, but they are often either expensive, confusing, or in beta. I looked at Heroku, but I was unsure on how to access the instance from outside the Heroku platform, and they constantly change the database credentials, meaning the lyricall.net server would require an additional Heroku library to properly interface with them to get the refreshed credentials. Since Heroku Postgres is designed to be used with other Heroku services and everything else seems secondary, I opted to not use them.

Azure was another choice, but a managed database requires a minimum service class of at least $39/month, which was out of scope for this project - in addition, managed Postgres is in beta on their platform.

So, back to Digital Ocean, my go-to default for whenever I need a cloud solution. Digital Ocean doesn’t offer any managed services, but all I needed was a cheap linux host that I could install Postgres on, so I just opted for a $5/month Ubuntu 16 VM.

### Security
Because it is a publically available computer, steps had to be taken to secure both the database and the computer.

An overview of the measures taken include:

* SSH only root login
* Non-default SSH port
* non-root account where any server actions are done
* SSH only remote login to that account
* Minimal other services running on machine
* System firewall (ufw) for only the SSH port and the Postgres port
* Randomized Postgres database name
* Randomized Postgres username
* Randomized Postgres password
* EnforceSSL only connections to Postgres, with one  authorized user on one database

Further security considerations include only allowing Postgres connections from the static IP of the ASP.NET server, or somehow putting it on a Private Network with that server.

### Backups
None are performed. This is an obvious gap in the system and will be remedied in the future.

### CI/CD
Unlike a managed solution, there is no quick way to deploy a new schema, and migrations must be done manually. This is another obvious gap.

## Microsoft Azure
<img src="/lyricallarch/azure.svg" height="150" width="150">
Unlike the digital ocean offering, the Azure instance is a fully managed platform. Although they do offer open do-it-yourself VMs, for this project, I went with a managed Web-App. Technically it’s using a windows server instance, but that’s an implementation detail and can be changed at a later date with minimal administrative effort and zero programming effort.

Using an Azure Web App, we deploy our .Net Core 2.0 project via a `git push azure master`. For most project dependencies, the .csproj file will specify what needs to be downloaded and the rest will handled by Azure’s deployment process. For the rest, such as `DotNetStandardSpotifyWebApi` and the unreleased ASP.NET Security branch, we bundle the projects directly with the release ourselves.

Combined with custom domain names purchased from NameCheap, we point our DNS to the Azure websites IP, and we have a functioning back end / front end / database client-server application.

### Backups
Given that the webapp on Azure is a managed service, backups happen automatically.

### CI/CD
Configuring the Azure Web-App to use a local git repository means that any commit to an upstream Azure branch will automatically compile and deploy the application. With respect to CI, a separate project is set up within VSTS, but it isn’t integrated into the deployment process yet.

# Let's Encrypt
<img src="/lyricallarch/letsencrypt.svg" height="150">
Security should never be an afterthought - the entire application from start to finish has been designed with security in mind, and the raw http connection is no different.

Let’s Encrypt has made it quick and (mostly) easy to get an SSL certificate, so there’s no reason not to anymore.

The Postgres server resides on an SSL-only connection from database to server with an LE certificate, although after obtaining the certificate it occurred to me that because the database is essentially a private network and I control both endpoints of the connection, that there’s no need for a third-party certificate authority to sign the certificate. In the future, I will self-sign a certificate and use that as the encryption for the connection, removing an unnecessary dependency on a third party.

For the Azure web site however, Let’s Encrypt is a godsend, if a huge hassle to set up. I followed Troy Hunt’s excellent, if complicated guide on loading a third-party certificate to Azure.

Thanks to Let’s Encrypt, there’s never a single insecure connection established in any step of the lyricall.net chain