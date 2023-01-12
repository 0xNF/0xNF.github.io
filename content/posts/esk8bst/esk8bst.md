---
title: "ESK8BST -  Electric Skateboard Buy / Sell / Trade"
date: 2018-09-03T07:22:07-07:00
draft: false
description: "I wanted a better way to find people posting electric skateboards for sale, and I thought it would be nice to use the opportunity to learn some new technologies. The primary knowledge I came away with is that Serverless is pretty neat, and that Email is a god damned nightmare."
categories:
- .net core
- c#
tags:
- FAAS
- Serverless
- Lambda
- Email
- Mailgun
- SMTP
- typescript
- react
- Firebase
---

- [The Finished Product](#the-finished-product)
- [Raison D'etre](#raison-detre)
- [Structure](#structure)
    - [Front End](#front-end)
        - [React](#react)
            - [Components](#components)
            - [Pages](#pages)
        - [Services](#services)
            - [FindThread.ts](#findthreadts)
            - [GetNewestData.ts](#getnewestdatats)
            - [Determining BST Status](#determining-bst-status)
            - [Determining Price and Currency](#determining-price-and-currency)
            - [Determining Product and Company](#determining-product-and-company)
            - [Other Data](#other-data)
    - [Backend](#backend)
        - [.NET Core](#net-core)
    - [Database](#database)
        - [ScanData](#scandata)
        - [Subscribers](#subscribers)
        - [Preconfirmed](#preconfirmed)
- [Third-Party Services](#third-party-services)
    - [Netlify](#netlify)
    - [Firebase](#firebase)
    - [AWS Serverless / Lambda](#aws-serverless--lambda)
        - [Serverless Project](#serverless-project)
        - [Functions](#functions)
        - [Logging](#logging)
    - [MailGun](#mailgun)
        - [Types of Email](#types-of-email)
        - [Email Deliverability](#email-deliverability)
        - [Email Services](#email-services)
        - [Mailgun's Services](#mailgun-s-services)
            - [Double Opt-In + Unsubscribe](#double-opt-in-unsubscribe)
            - [Automated Security Scan](#automated-security-scan)
- [Privacy and Security](#privacy-and-security)
    - [Firebase Rules / Service Accounts](#firebase-rules-service-accounts)
    - [Reddit triggering Tracking Protection](#reddit-triggering-tracking-protection)

## The Finished Product

Available at https://esk8bst.com, the site is a simple display of all relevant posts from the monthly Buy/Sell/Trade thread. Items are presented in reverse chronological, meaning newest first. 

The display is meant to cut down on the chaos and present only the relevant information.

Available are some simple filtering mechanics, such as filtering for posts by people looking to Buy, or Sell, or Trade, or everything. You can also choose which specific brands you are interested in, as well as some sorting options. 

While the page is opened in the browser, it automatically refreshes every 60 seconds. One of the appeals of the application from a developer-standpoint is the lack of significant backend. If one is not using the email-subscription service, everything takes place locally in the browser.

The application handles querystrings well, so you can link to or bookmark a specific query and get relevant results even on a fresh load. 

Finally there's an email subscription option, which will email you new items found matching a given search criteria every 12 hours.

## Raison D'etre
I like electric skateboards, but they can be expensive, so I have yet to actually purchase my own. Combine that with living in a northeastern coastal city where blizzards rule for just under half the year makes indulging in fantasy and window-shopping more appealing. 

One of those fantasy indulgences is refreshing the monthly Buy/Sell/Trade thread on https://reddit.com/r/electricskateboards, where people occasionally put the crème de la crème up for sale, and sometimes in my own city. 

However there are a lot of problems with that thread - chief among them being that it is chaos. The reddit voting system means some posts float to the top, a lot of it is presented out of order, and even when it is in-order, the most recent posts are on the bottom. 

All of this makes it quite difficult to determine what new items have been posted or what is still for sale. Additionally, filtering is nearly impossible. I could ctrl-f for 'boosted' and get some results, but what if I was also interested in 'evolve' or 'raptor'. A regular web forum is not an ideal medium to do this kind of browsing. 

I thought it would be a nice intermission between some other projects to make a small application to make this kind of browsing easier. As is usual with these projects, it is also a convenient time to explore some concepts that I have heard about but haven't implemented in practice yet. 

In addition to keeping my TypeScript and React skills up, it was an opportunity to learn some AWS Serverless, as well as diving into some of the guts of the byzantine behemoth that is email. 

One of the initial goals of the project was to do as many things as possible freely. I was hoping to spend no money on the various aspects of infrastructure, but that goal fell apart relatively quickly as I encountered free-account limits at different stages of the process. For example, my email service of choice doesn't send email except to a handful of pre-registered authorized accounts on its free tier; AWS Serverless infrastructure, which was both an interesting intellectual pursuit and likely a cheaper way to do backend, requires at least a credit card to set up, and browsers really didn't like cross-origin API calls in some of the earlier incarnations, resulting in a purchase of a domain for the project.

Thankfully the costs have so bar been kept down quite a bit. Domain costs and Serverless costs thus far have totaled around $11.00, the majority of that being a $10.00 yearly domain fee. 

# Structure

The application is divided into three parts:

1. Front end (TypeScript + React)  
1. Backend (.NET Core)  
1. Database (Firebase) 

## Front End

The Typescript + React duo is turning out to be a real wombo-combo for web development for me. I no longer absolutely despise all things web development, and have now moved down into only having a strong distaste for it. 

TypeScript, especially its most recent 3.0 release which cleaned up the insane error messages, has successfully tamed the flaming wreck that is JavaScript and, although not as nice as C#, is still nice language to do work in. 

Meanwhile React, which continues to solidify its resounding victory in the web front end space over Angular and Ember, is basically an alright facsimile of the kinds of things I could do trivially in XAML or Forms. The type bindings between TypeScript and React also continue to improve, making the experience more and more acceptable.



### React

The core of the front end display can be found in either the `client/src/react/components/` folder or the `client/src/react/pages` folder. I've deviated a bit from other folder structures because I found that having a dedicated folder for entire views, as opposed to comingling views, which are essentially super-components, and regular components helps me think about the structure better. 

#### Components

There are only a handful of components. The most interesting of these are the `BSTComment` and `NotifyModal` components, which contain the layouts for each individual Buy/Sell/Traded item, as well as the layout for the email subscription menu. 

The `BSTComment` component renders only the most necessary of information from a given post in a quickly glanceable format: 

1. What product is for sale  
1. What company manufacturers it 
1. How much and in what currency  
1. When was it posted  
1. What is its BST Status? (Buy? Sell? Trade?)  
1. Who is selling  
1. A link to the post  
1. The raw text of the post itself  

The `NotifyModal` is pretty important too - it contains the structure necessary to compose a `Match` object, which will be used to find items that a user wants to be notified about, as well as a place to input your email. It also displays some other information depending on the various toggles, like how to unsubscribe, or what to do after a user has submitted their email. 

#### Pages

There are 3 pages, the primary page being `src/client/react/pages/Home/Home.tsx`.

This is the single largest item in the codebase because it contains all the logic that gets passed down as prop elements to its subcomponents, as well as service calls and data-generation. 

For example, the home page contains the calls to (but not the logic for) the reddit thread data services; the sorting logic for `FilterZone`; how to handle query strings from a fresh load; and then obviously how to render the page while loading, on error, and on okay.

This is an obvious candidate for refactoring into smaller chunks, but it works okay for now. 

There are two other pages, including an `about` page and a `changelog` page, which are self explanatory. Ideally, these pages would be moved outside of being React components. They are simple text with nothing else going on, and should render without scripts enabled. Unfortunately, I do not care enough to make this a reality.

### Services

Most of the front-end magic happens here. Originally this whole application was conceived as a client-side-only application, which means that some of these services are bit heavier than they would have been had I intended for there to be a backend from the start, but it works mostly well, with a few quirks, mostly around the cross-origin calls to reddit done in-browser.

Aside from some helper services located in `WindowService.ts`, `LambdaService.ts`, `GetCommonCompanies.ts`, `DisplayMapper.ts`, and `LoadVersion.ts`, the majority of the hard work is done by two services, located in `FindThread.ts`, and `GetNewestData.ts`.

#### FindThread.ts

The first of the main problems to overcome is where to find the thread to get the display data from. The subreddit posts a new Buy/Sell/Trade thread every month and stickies it to the top. It follows a standard naming convention to the effect of "MONTHLY BUY/SELL/TRADE STICKY" making it pretty simple to find. 

FindThread.ts is focused on scanning the first page of the subreddit and finding the first fuzzy-match for a thread of that title. Because it goes in thread-order, it is guaranteed to find stickied threads first, and it tries to be somewhat lenient with what it considers to be the canonical title of the thread, allowing for casing errors and out-of-order wording. As long as `buy`, `sell` `trade` and `monthly` are all present, it considers this a match. 

Because there is only one thread a month, and because we have a backing persistent database, it would theoretically be more efficient to store the url of the thread and query the database for it, but because threads are temporal and up to human whims, this method allows for a thread to be deleted and regenerated under a different url at any time as long as it matches.

Two months in, it has correctly automatically found new monthly threads without error, so this is a fine, working piece of code.

#### GetNewestData.ts

This is where most of the significant data processing lives. Assuming we successfully found a monthly Buy/Sell/Trade thread, we pass the url into this service and get back a list of `BSTComments`, which contain the information outlined above. No noise, no chaos, just the facts, as best as is possible to determine, which is often difficult.

The majority of this service is essentially composed of a bunch of Regexs strung together to pull out various relevant information. 

#### Determining BST Status

Because the posting process is so unstructured, this service attempts to be lenient with what it considers to be matches for its various fields of data. For example, an item for sale may be marked as either `wts`, `for sale`, `[sell]`, or `lts`. Typically these are enclosed in square brackets, but sometimes they're enclosed in parenthesis, or not at all. We attempt to match against all of the kinds of posts. 

We also do the same for determining if a post is still open for sale. Sometimes after a sale, the poster may go back and mark their post as `SOLD` or otherwise `not for sale`. We account for this too, although this information isn't currently available as a usable filter option.

#### Determining Price and Currency

This is one of the trickier aspects and is one of the frequent source of errors in the display. From what I have observed empirically, people have a completely non-uniform way of listing pricing data. 

1. Some people prefix their currency marker: `$400 raptor 2 lightly used`  
1. Some postfix it: `400$ raptor 2 lightly used`  
1. Some include different currency units: `USD 400 raptor 2 lightly used`  
1. Some include symbols and markers:　`¥JPY 40,000 raptor 2 lightly used`  
1. Some people create their own currency units: `400 $CND raptor 2 lightly used`  
    * they meant Canadian Dollars (CAD)  

There are a bunch of other variations and permutations of the above. 

An example of the regex that is used to match for Euros for instance looks like this:

```regex
(?:(?:eur|\\$eur|€)\\s*?\\$?\\s*?([0-9]{1,5}))|(?:\\$?\\s*?(?:([0-9]{2,5})\\s*?(?:eur|\\$eur|€)))
```

There are some obvious limits in there. The total price cannot exceed 5-digits, a lot of various permutations will be missed, etc. 

These regexs often have trouble when followed or immediately preceded by product models that include numbers in their name.

#### Determining Product and Company

Using a predetermined list of companies and products, pulled and lightly massaged from compare-skateboards.com, posts are scanned for anything that matches. Because product names are often so unique, priority is given to a scan that picks up a matching product name, even it matches another, maybe different, company name. This is because people often leave out of include the shortened name of the manufacturing company, while they tend to include the full name of the product. 

This does unfortunately lead to some misidentified products. For example, a post that describes a skateboard deck as being "carbon fiber" will be miscategorized as being an `Evolve Carbon GT` even if the poster then goes on to accurately list it as a `Boosted Mini X`.

The other major drawback is that non-standard products, anything that isn't an actual Electric Skateboard, will either be misidentified or omitted. Posts looking for `WowGo 2s Remotes` will be misidentified as being a full `WowGo 2s`, `Boosted Backpacks` will become `Boosted Boards`, and other peripherals like helmets, batteries, skateboard lights and accessories will all wind up somewhere between ignored or incorrect.

Generally speaking however, it works pretty well. 

#### Other Data

Each post is scanned for its poster, post-time, and permanent link to the post.

## Backend

Originally this entire project lived inside a single session within a web browser, with no backend required. The majority of the project can still be used that way, but because I decided that I wanted to add in email service, having a backend became necessary. 

### .NET Core

Essentially there exists under `esk8lambda/esk8lambda/` a reimplementation of the front-ends models and services code. 

The only thing special about the backend code is that it is structured around being an AWS Lambda deployment, interacts a bit with a small Firestore database, and sends API-based emails via Mailgun.

This is also the part of the application which actually has a fairly complete test-suite. 

The backend is divided into 4 projects:
  
1. Esk8Bst, which contains models and services  
1. Esk8BstLambda, which contains the Lambda deploy and top-layer logic  

Along with two xunit projects for testing each layer.

## Database

There is more to say about the actual selection, usage, and workings of the Database layer under the [Firebase](#firebase) section, but here we will describe the structure and usage patterns.

The point of this database is to keep track of when we last scanned the Reddit thread, who our subscribers are, and what they want to be notified of. 

Because this is a NoSQL database, tables and rows are not quite the right description of the layout, but we have used document collections have been used in fundamentally the same way.

There are 3 collections / document to be concerned with in this application: 

1. ScanData  
1. Subscribers  
1. Preconfirmed  

### ScanData
The ScanData collection contains a single document, `ScanData`, which in turn contains one field, `LastScanDate`. We use this field to do two things:

1. Limit how many items we have to parse into `BSTComment` items, because time is precious on AWS lambda and the fewer computations the better, and;  
1. Determine what items to send to subscribers. It would be useless and irritating to receive the same items every 12 hours, so we use this field to double as a last-seen date, which ensures that we only send newly seen matches to subscribers.  

### Subscribers

Each document in this collection has an Id corresponding to the lower-cased email of each subscriber. Contained within each document is a `Match` array, which is a list of the things they wish to be notified about. In theory, the architecture allows for infinitely many different types of matches, but in practice, the front end signup only allows for a single match per user. 

A match is an document describing the following:  

1. What products you are looking for  
1. What companies you are  looking for  
1. Are you looking for people buying, selling, trading, or all  
1. What is your minimum price you are willing to accept, or the maximum price you are willing to pay  

These match objects are pulled by the backend service and used to construct match objects against each scan of the reddit thread, are aggregated per user, and then sent out as a single email to each user who had a match. 


### Preconfirmed

This will be touched on more in the [Mailgun](#mailgun) section, but this table serves as a way to keep track of which users have already signed up for notifications, and therefore won't be asked to confirm if they subscribe again in the future after unsubscribing.

This is mostly in place because there is currently no good way to edit ones match object, meaning the current flow for editing what you are interested in is to unsubscribe, describe your match object, and re-subscribe.

And just for fun, each document in this collection is identified by a one-way sha256 hash of the users lowercased email, which prevents enumeration and reversing. 

# Third-Party Services

This project exists with as few self-operated services as possible. In addition to the goal of as-free-as-possible, another of the goals was to not have to start up a VM of my own to manage. No DigitalOcean droplets or EC2 instances.

## Netlify

Because the main application is entirely browser based, Netlify offered a very attractive hosting package. Free custom domain usage, fantastic git-deploy options including automatic branch deployment, automatic integration with Lets Encrypt for HTTPS, which as I've described [elsewhere](link) is still not quite set-and-forget, and a growing suite of other options like form submission and free Lambda credits, makes it a pretty unbeatable combination.

Due to the timed nature of the thread-scan function and their free-tier form submission limits, I was unable to take advantage of some of their more advanced features, but the rest of the package is incredible.

In fact I was so taken with Netlify that I ended up moving a few of my other domains to it immediately. 

## Firebase

Continuing the criteria of zero-dollars-spent services, Googles Firebase is a sufficient choice, though not without its own quirks. 

My familiarity with document-stores, as opposed to traditional RDBMSs was almost zero, and I still have trouble working with some of the concepts, but at any rate the result is a working product.

I first encountered Firebase when helping out on another esk8 project, the [Boosted Order Tracker ](https://boostedorders.ddns.net/). There, firebase is used directly in the browser to submit and retrieve orders, as well as anonymously authenticate users so they can edit their own submission. 

This is the route I went with originally, because the order tracker made for a decent example and jumping off point. I continued to use Firebase, but I ended up changing the usage patterns after I decided to go full in on having a backend in the form of the Lambda functions.

All the firebase information used to be stored in browser, but because its such a security risk, interaction with the database was moved to be in the lambda functions. 

Additionally, data validation was impossible when using browser access. Firebase Rules are not robust enough to check that incoming data is in the proper format before accepting it, meaning that I could only trust the data if it came from a trusted source, like a Lambda function the user doesn't have access to, which will check and sanitize the data itself.

The most perplexing part of the Firebase process was figuring out how to add authentication. We discuss this more in the [Privacy and Security](#privacy-and-security) section, but the crux of the thinking is service accounts only / rules = `allow read,write: false` for every object and collection in the database. 

## AWS Serverless / Lambda

I had heard about Lambda, Serverless, FAAS stuff for a while, and roughly understood its purpose and function, but I had not had a good chance to explore it. After realizing that I needed something to manage the backend system for sending emails, managing subscribers, and scanning, it seemed that Lambda would be a decent choice. 

At first I was excited to integrate with Netlify's free Lambda credits, but they didn't offer a way to schedule timers on a lambda function, instead offering only user-event driving lambdas. This is sufficient for a majority of functions like email subscription / unsubscription, but not sufficient for every-12-hour scans. 

I explored other services like Azure's FAAS platform, but they were expensive, and I had bad experiences with Azure in the past with some somewhat deceptive pricing practices. Amazon is of course no better, but I know what to look out for from them. Plus they offer an unlimited monthly lambda budget that doesn't expire after an account is 'no longer new'. This is relatively attractive, along with their somewhat recent adoption of .NET Core as a viable target platform. 

Plus, can't go wrong having AWS experience.

### Serverless Project

The main project is a `Serverless` project, which is an arbitrarily large collection of `Lambda` projects, where you describe your endpoints, their available http methods, along with the appropriate function to execute. Aside from the general instability and uncertainty that comes from learning a new platform, the serverless project setup was largely painless and efficient. 

Their Visual Studio deployment tools are top tier, and updating a Lambda or Serverless deployment is really easy. 

Their syntax and class objects from the AWS .NET library are a bit clunky and awkward, and unfortunately do not follow with the ASP.NET standards (they prefer raw ints to HTTPMethod enums, they don't return IAsyncResults, you can't have annotated endpoints, etc), but for the most part it works relatively seamlessly. 

They even provide an already-setup Test project, if you so desire. This was invaluable for distinguishing when my program was failing versus when I had gotten some AWS thing incorrect.

The only main problem I encountered, which is not specific to Lambda per se, was the tangled mess that is Amazon's IAM. The amount of time I had to go back and forth, googling, enumerating, and adding a different IAM permission nearly drove me insane.

In the end however, the lambdas were set up, deployed fine, and operate well.

They even offer a super easy Timer trigger for lambda functions, making the 12-hour scan function perfectly viable without having to operate my own server for it.

### Functions

There are 4 lambda functions in this serverless deployment:
  
1. `Subscribe`, which sends out an initial email to a user, or short circuits and adds a users match object if they are already preconfirmed.  
1. `ConfirmSubscribe`, which initiates when a user clicks on a confirmation email link and adds a users match object to the database  
1. `Unsubscribe`, which removes a user from the `Subscribers` collection in the database; and,  
1. `Scan`,  which does the heavy lifting described above. This function is also responsible for sending out any match emails to subscribers.  

The first three are triggered by user-input hitting live endpoints, and are candidates for being Netlify hosted. The last one is not available by endpoint, and only triggered via a timer configured on the AWS dashboard.

### Logging

AWS provides some really robust logging. I don't have much to say here except that it has really helped sort out of a lot of errors while running the system live.

## MailGun

### Types of Email

Getting email up and running has been by far the most frustrating and byzantine part of the process.

At first I thought that I could just sign up for MailChimp to send out emails, but I quickly became aware of the distinction between email types that the industry is aware of but that I was not.  

Generally speaking there are two types of email, transactional, and campaign.

Transactional email is the email equivalent of  1:1 entity relation. The sender constructs an email to send to a specific, or very tiny number of people. Ideally the number of people would fit within the bounds of an emails `To:`, `CC:`, and `BCC:` fields. 

Campaign emails are the 1:many relation. This is fundraiser emails, store sale notifications and other generic, not-really-addressed-to-you emails. 

MailChimp and a lot of other services specialize in campaign emails, and although it is theoretically possible to send a campaign email to a single person, it is the road of pain and agony.

### Email Deliverability

After discovering this and realizing that most services I knew about were campaign email focused, I entertained a brief interlude of thinking about running my own email server. Some quick research revealed [some](https://blog.codinghorror.com/so-youd-like-to-send-some-email-through-code/) [reasons](https://www.digitalocean.com/community/tutorials/why-you-may-not-want-to-run-your-own-mail-server) [not](https://www.geekwire.com/2015/why-you-shouldnt-try-to-host-your-own-email/) to do that. 

There are a bunch of well articulated reasons outlined in those links, but they all tend to boil down to the complexity of email deliverability.

Due to the tidal waves of spam being sent at every second of the day, the global email system has developed a bunch of heuristics and filters for determining if an email should be passed along to its destination. Additionally, because an email goes through so many different steps on its way from sender to destination, each link in the chain uses slightly different heuristics, meaning your email can get dropped at any point in the chain. Even if it ends up delivered to the inbox of a recipient, the end provider may place the email in spam or junk, effectively dropping delivery at the final stage.

The deliverability of an email comes down to what is effectively the reputation score of an email. This is a complex topic with no actual definition, but the systems in place that determine whether to deliver your email or not look at a hundred different possible factors to determine if an email is legit:


1. Does the senders email system implement the correct security schemes like DKIM, DMARC, or SPF?  
1. Has the sender being accused of sending spam before?  
1. Has the end provider seen this senders domain or IP before?  
1. Is the From address spoofed, or does it match the registered domain?  
1. Does it even have a registered domain?  
1. etc  

There are a million different ways to be dropped by the systems, and only a very few ways to succeed. 

### Email Services

Enter the myriad companies that offer email-as-a-service. These companies offer up their infrastructure and their good reputation and allow users to ride off that to send deliverable emails. Their main sales pitch is that your email deliverability vastly improves. Their secondary sales pitch tends to be about tracking and analytics.

Once I realized that "transactional email" was the keyword to search for, it became easier to find available services. 

I settled on Mailgun for a number of reasons:  

1. Their free tier allowed for sufficient trial experimentation  
1. Their pay-as-you-go tier allows me to send up to 10,000 emails per month without paying.  
1. Their documentation is absolutely ace  
1. Their service is solid  


### Mailgun's Services

Although MailGun has been fantastic, their service has been easy to use, my emails are delivered, there have been a few pain points.

#### Double Opt-In + Unsubscribe

While not strictly required, your customer reputation with Mailgun will take a big hit if you don't implement Double Opt-In for your emails. Because an email service like Mailgun's primary offering is their good email-reputation, a customers bad behavior will impact the company as a whole, so they make good customer behavior a priority.

Double Opt-in requires sending a confirmation email to someone who signed up, asking them to confirm that they did in fact sign up, and that they do in fact want to receive email communications.

Additionally, each email must provide an unsubscribe link.

Mailgun offers this themselves for any emails they send out, but presumably, if a user has to go to Mailgun to unsubscribe from your emails, your reputation as a Mailgun customer will suffer.

All of these are understandable and worthy of respect, and were already architected for implementation before I even found out about the requirements of these service providers, so no love lost here.

#### Automated Security Scan

Going back to the idea that Mailguns reputation among other email services is of paramount importance for them, they have implemented automated scans that look at huge swathes of the internet to see if their issued API keys have been compromised.

If your API key is detected to be have been compromised, your account is immediately disabled and you must open a ticket with support.

This doesn't sound like a very terrible thing, but there's a problem with how their scanning system operates.

The tl;dr is that even if an API key has been invalidated and regenerated, old API keys that the scan uncovers still instantly autolock your account. 

I had an incident where I accidentally checked in my original API key to the GitHub repo. I realized this seconds after it happened, and regenerated my key. Unfortunately, the system picked up on this and locked my account. I was not able to use the account for more than 12 hours. 

Even worse however is that even after having my account unlocked, a week later the scan picked up the same, no longer used API key in the same spot and locked my account again. 

I could solve this problem by adjusting the repo a bit, but this is a serious flaw in Mailguns scanning procedure.

Thankfully, their support is competent and helpful, so problems can get resolved fairly quickly.

Even so, be aware.

# Privacy and Security

As usual, I take the privacy and security of data seriously.

The cheapest way to obtain this is to simply require https between all routes. Every request from the browser to any of the services is https, as are any requests by the lambda services to any other outside resource.

No trackers or analytics are embedded[*](#reddit-triggering-tracking-protection), no information is sold, and in theory, no information is unduly exposed to any unprivileged service or actor.


## Firebase Rules / Service Accounts

In order to ensure that no one has access to any of the Firebase data, including emails, the access rules for all of the Firebase documents are set to `Read, Write: False`, which prevents any user from looking at the data.

Only a generated Service account is allowed to interact with the database, and the service account credentials are only accessed by the AWS Lambda function. They are not available in the GitHub repo.

Service accounts are exempt from Firebase Rules, and have super-admin access.

## Reddit triggering Tracking Protection

One blip with privacy protection is that browsers with Tracking Protection enabled block the in-browser requests to reddit for the monthly thread data on the basis of Reddit being a third-party tracker. I have no idea how true this is. I just disable Tracking Protection for the site to get it to work in my secure Firefox setup.

Other browsers like Edge, and presumably a regular Firefox install, behave fine by default.