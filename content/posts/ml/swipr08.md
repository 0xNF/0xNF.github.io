---
title: "Swipr - LibSwipr"
date: 2018-12-13T06:36:13-08:00
draft: false
description: "Part 8 of the Swipr series. Here we drop back to regular backend server stuff and build a server to engage with our model. In this post we discuss the creation of the backing library called LibSwipr"
categories:
- machine learning
- fast.ai
tags:
- CNN
- web scraping
- data collection
- architecture
series:
- Swipr
series_weight: 8
---

As a harness for our model, we'll create a server that serves as a centralized access point. This server provides the necessary facilities to register an account with it, interact with Tinder, and receive responses from the model. 

The general architecture for the server will go something like this:

![Swipr Server Arch](/ml/swipr/SwiprServerArch.png)

SwiprServer is the server, in our case, an ASP.NET Core 2 project, and LibSwipr is our custom tooling around all the other interactions.

# LibSwipr

## Models

First we need a way of interacting with Tinder - we'll use the [Sharp Tinder](https://github.com/cansik/sharp-tinder) library to do the heavy lifting there.

After that, we need to consider some data models:

First we consider the fundamental property of Tinder - to like, pass, and superlike. We represent these actions as an enum:

```csharp
[Flags]
public enum SwipeAction {
    PASSED = 0,
    NA = 1,
    LIKED = 2,
    SUPERLIKED = 3,
    All = PASSED | NA | LIKED | SUPERLIKED, // used for retrieving actioned users from db
}
```

We also consider when to use a SuperLike. We have a number of choices, such as "Don't", "Only when out of all regular likes", "when certain words in their bio match", and "when the model has very high confidence".
We encode these strategies into a series of singleton classes as such:

```csharp
public abstract class SuperLikeStrategy {
    public int Id;
    public string DisplayName;

    internal SuperLikeStrategy(int id, string displayname) {
        this.Id = id;
        this.DisplayName = displayname;
    }
}

class HighConfidenceStrat : SuperLikeStrategy {

    internal HighConfidenceStrat() : base(0, "High Confidence") {

    }
}

class SuperLikeWordMatchStrat : SuperLikeStrategy {
    internal SuperLikeWordMatchStrat() : base(1, "Bio Words Match") {

    }
}

class OutOfLikes : SuperLikeStrategy {
    internal OutOfLikes() : base(1, "Out of Likes") {

    }
}

class Dont : SuperLikeStrategy {
    internal Dont() : base(1, "Don't") {

    }
}

public static class SuperLikeStrategies {

    public static readonly SuperLikeStrategy Dont = new Dont();
    public static readonly SuperLikeStrategy OutOfLikes = new OutOfLikes();
    public static readonly SuperLikeStrategy WordMatch = new SuperLikeWordMatchStrat();
    public static readonly SuperLikeStrategy HighConfidence = new HighConfidenceStrat();

}

```

For storage and retrieval purposes, we have the concept of an `ActionedUser`, which is a Tinder User that has been seen by a Swipr User, and actioned upon one way or another:

```csharp
    public class ActionedUser {
        // Amount of times this user has been seen by a given Swipr user
        public int TimesSeen { get; }
        // A reference to the underlying Sharp Tinder user
        public TinderUser User { get; }
        // last seen at
        public DateTimeOffset DateSeen { get; }
        // Did we swipe right or left?
        public SwipeAction Action { get; }
        // What was the justification for the action we took?
        public string Reason { get; }
        // Did the swipr user disagree with the action?
        public string AdjustedReason { get; }
        // What is the location of their main picture
        public string Imgurl { get; set; }
    }
```

We keep an `AdjustedReason` field to allow the Swipr user an opportunity to disagree with an AI classification, allowing us to potentially retrain and fine-tune a user's Swipr model.


## Configurations

Because we are reliant upon actually signing into and authorizing with remote services, we need to store some tokens for those services:

```csharp
public class AuthTokens {
    public string FacebookId { get; set; }
    public string FacebookEmail { get; set; }
    public string FacebookAuthenticationToken { get; set; }
    public string TinderAuthenticationToken { get; set; }
    public string FacebookPassword { get; set; }
}
```

While interacting with Tinder, it is useful for us to know where we stand with respect to how many likes and superlikes we have. These are essentially only knowable at runtime after we query Tinder, but in the meantime, we have a structure to support it:

```csharp
public class TinderConfigs {
    public int MaxLikeCount { get; set; } = int.MaxValue;
    public int MaxSuperLikeCount { get; set; } = int.MaxValue;
    public TimeSpan LikeRefreshDuration { get; set; } = TimeSpan.FromHours(12);
    public TimeSpan SuperlikeRefreshDuration { get; set; } = TimeSpan.FromHours(24);
}
```


The last of our Config models will be the Swipr config, which controls how a user has elected to have Swipr interact to Tinder on their behalf. Swipr is more than just a way to auto-swipe on attractive profiles, it also offers some additional filtering services, all of which are modeled here:

```csharp
public class SwiprConfig {

    // SwiprUser this config belongs to
    public string UserId { get; set; } = "";

    // Whether their profile is active on Swipr or not
    public bool SwiprEnabled { get; set; } = false;

    // Whether any given Tinder User must have a non-empty bio to be considered
    public bool MustHaveBio { get; set; } = false;

    // If MustHaveBio is true, are there any words that should short-circuit the AI and be auto-liked?
    public List<string> BioLikeKeywords { get; set; } = new List<string>();
    // If MustHaveBio is true, are there any words that should short-circuit the AI and be super-liked?
    public List<string> BioSuperlikeKeywords { get; set; } = new List<string>();
    // If MustHaveBio is true, are there any words that should short circuit the AI and be auto-passed?
    public List<string> BioBannedKeywords { get; set; } = new List<string>();

    // Whether a given Tinder user needs to have a minimum or maximum age to be considered?
    // values of -1 mean "does not apply"
    public bool AgesEnabled { get; set; } = false;
    // if so, what should the minimum age be?
    public int MinimumAge { get; set; } = 18;
    // if so, what should the maximum age be?
    public int MaximumAge { get; set; } = -1;

    // Whether a given Tinder user needs to be within a certain distance to be consiered
    public bool DistanceEnabled { get; set; } = false;
    // If so, what should the max distance be?
    public double MinimumDistance { get; set; } = -1;
    // If so, what should the min distanc ebe?
    public double MaximumDistance { get; set; } = -1;

    // Does a user need pictures to be considered?
    // Seems silly, but some profiles are just a default Facebook image
    public bool PicturesEnabled { get; set; } = true;
    // If so, what is the minimum number of pictures a profile must possess to be considered?
    public int MinimumPictures { get; set; } = 1;

    // This is an important field
    // What is the minimum confidence that SwiprML should return on a "Yes" category to be 
    // actioned on as a real "Yes"?
    public int MinimumConfidence { get; set; } = 40;

    // If enabled, Swipr enters auto-swipe mode and just says yes to everything
    public bool AcceptAllMatches { get; set; } = false;

    // Another important field
    // Due to the way we queue/dequeue Swipr users,
    // this sets a per-dequeue limit on the number of profiles they get to see
    // before Swipr moves onto the next User in the queue
    // This helps us get around Plus and Gold users with infinite likes
    // This is primarily because Swipr is single-threaded and can only handle
    // One Swipr user at once.
    public int SessionLimit { get; set; } = 1000;

    // An ordered list of SuperLike strategies - for each Tinder user,
    // we check if we should super like them according to the hierarchy in this list
    public List<SuperLikeStrategy> SLStrats { get; set; } = new List<SuperLikeStrategy>() { SuperLikeStrategies.OutOfLikes };

}
```

Some of these seem like strange things to filter on, given that Tinder does this for us. But with Distance, for example, it is possible to get matches from people many thousands of miles away. This can happen even if you have strict distance settings inside Tinder itself. We provide additional filtering to make sure you don't waste your likes on people who are too far away.

## Services

Here we keep the methods that wrap and help us interact with Facebook and Tinder.

Why Facebook? Because the only way we can consistently keep an active Tinder token is by refreshing it with our Facebook token.

Sharp Tinder expects that you already know your Facebook ID and that you know how to get a Facebook token. As developers we can do this on an on-demand basis ourselves without too much trouble, but we're creating a solution that can be used by, in theory, anybody, and that's not a scalable way to approach the problem. 

### Facebook Service

To resolve this, we'll take a page out of a different Tinder API's book and copy their methods. For this we'll be basing our work on that of [this Python Tinder API library](https://github.com/fbessez/Tinder).

The core idea is that they fake an OAuth login and capture the forms. It's a far cry from "officially supported", but it works.

We also do this by pretending to be Tinder's iOS app:

```csharp
public const string MOBILE_USER_AGENT = "Tinder/7.5.3 (iPhone; iOS 10.3.2; Scale/2.00)";
public const string FB_AUTH = "https://www.Facebook.com/v2.8/dialog/oauth?redirect_uri=fb464891386855067%3A%2F%2Fauthorize%2F&display=touch&state=%7B%22challenge%22%3A%22IUUkEUqIGud332lfu%252BMJhxL4Wlc%253D%22%2C%220_auth_logger_id%22%3A%2230F06532-A1B9-4B10-BB28-B29956C71AB1%22%2C%22com.Facebook.sdk_client_state%22%3Atrue%2C%223_method%22%3A%22sfvc_auth%22%7D&scope=user_birthday%2Cuser_photos%2Cuser_education_history%2Cemail%2Cuser_relationship_details%2Cuser_friends%2Cuser_work_history%2Cuser_likes&response_type=token%2Csigned_request&default_audience=friends&return_scopes=true&auth_type=rerequest&client_id=464891386855067&ret=login&sdk=ios&logger_id=30F06532-A1B9-4B10-BB28-B29956C71AB1&ext=1470840777&hash=AeZqkIcf-NEW6vBd";

```
And then we login.

We use the venerable [HTML Agility Pack](https://www.nuget.org/packages/HtmlAgilityPack.NetCore/) to help us parse the DOM tree for this step.

```csharp
public static async Task<string> GetFbAccessToken(string email, string password) {


    // local function because we need to call this code in two places
    // sometimes our first request brings us to stage 2, and this helps
    // us get out of that bind.
    async Task<string> ConfirmOAuth(HtmlNode hform, string action) {

        string baseurl = $"https://www.Facebook.com{action}";

        Uri hUri = new Uri(baseurl);

        List<KeyValuePair<string,string>> hformVariables = new List<KeyValuePair<string, string>>();

        HtmlNodeCollection hnodes = hform.SelectNodes("//input");
        foreach (HtmlNode n in hnodes) {
            string name = n.GetAttributeValue("name", "");
            string val = n.GetAttributeValue("value", "");
            if (name == "__CANCEL__") {
                continue;
            }
            hformVariables.Add(new KeyValuePair<string, string>(name, val));
        }
        var hformContent = new FormUrlEncodedContent(hformVariables);
        HttpResponseMessage hres = await hc.PostAsync(hUri, hformContent);


        string hresStr = Encoding.UTF8.GetString(await hres.Content.ReadAsByteArrayAsync());

        //WebBrowser

        Regex r = new Regex("access_token=([\\w\\d]+)");
        Match match = r.Match(hresStr);
        if (String.IsNullOrWhiteSpace(match.Value) || match.Groups.Count < 2) {
            return null;
        }
        else {
            return match.Groups[1].Value;
        }
    }

    // Real function

    // Step 1: Get the Login form from the FB_AUTH url
    hc.DefaultRequestHeaders.Add("User-Agent", MOBILE_USER_AGENT);
    HttpResponseMessage m =  await hc.GetAsync(FB_AUTH);
    string ResponseContent = await m.Content.ReadAsStringAsync();


    // Step 2: Parse the HTML
    HtmlDocument d = new HtmlDocument();
    d.LoadHtml(ResponseContent);
    HtmlNode form = d.DocumentNode.SelectSingleNode("//form");
    string actionValue = form.Attributes["action"]?.Value;

    if(actionValue == "/v2.8/dialog/oauth/confirm") {
        // Skip to Accept
        return await ConfirmOAuth(form, actionValue);
    }

    Uri uri = new Uri(HttpUtility.HtmlDecode(actionValue));

    var formVariables = new List<KeyValuePair<string, string>>();

    HtmlNodeCollection nodes = form.SelectNodes("//input");
    foreach(HtmlNode n in nodes) {
        string name = n.GetAttributeValue("name", "");
        string val = n.GetAttributeValue("value", "");
        if(name == "email" || name == "pass") {
            continue;
        }
        formVariables.Add(new KeyValuePair<string, string>(name, val));
    }


    // Step 3: Add the email and pass fields
    formVariables.Add(new KeyValuePair<string, string>("email", email));
    formVariables.Add(new KeyValuePair<string, string>("pass", password));
    var formContent = new FormUrlEncodedContent(formVariables);


    // Step 4: Send the login request
    HttpResponseMessage res = await hc.PostAsync(uri, formContent);
    string formHtml2 = await res.Content.ReadAsStringAsync();

    // Step 5: Retrieve the second returned form
    d.LoadHtml(formHtml2);
    form = d.DocumentNode.SelectSingleNode("//form");
    actionValue = form.Attributes["action"]?.Value;

    if (actionValue == "/v2.8/dialog/oauth/confirm") {
        // final accept
        return await ConfirmOAuth(form, actionValue);
    }

    return null;
}
```

Once we have successfully faked an OAuth login while pretending to be Tinder on iOS, we can request the other half of what is required for a Tinder token and get our Facebook ID by querying Facebook's GraphQL API.

Shoutout to Facebook for making this part easy and requiring that the token be sent as a URL parameter instead of some weird header nonsense:

```csharp
public static async Task<string> GetFbIdForUser(string fbAccessToken) {
    string fbid = null;
    string url = "https://graph.Facebook.com/me?access_token=" + fbAccessToken;
    HttpResponseMessage m = await hc.GetAsync(url);
    if (m.IsSuccessStatusCode) {
        string jparse = await m.Content.ReadAsStringAsync();
        JObject jobj = JObject.Parse(jparse);
        fbid = jobj["id"].Value<string>();
    }
    return fbid;
}
```

### Tinder Service

We also have to mock how we want to interact with Tinder, including logging in. Most of this is handled by the underlying Sharp Tinder library, but we want to impose Swipr's particular view of the Tinder world on top of it. Like most things, it's useful to wrap our libraries our own way.

The first thing we do is make some singletons:

```csharp
public static TinderConfigs Config { get; set; } = new TinderConfigs();
public static SwiprStats SwiprStats { get; set; } = new SwiprStats();
private static readonly TinderClient TC = new TinderClient(); // from SharpTinderr
```

Next we work to obtain a Tinder token. These are valid for an indeterminate amount of time before they must be refreshed. Obtaining these uses everything from our Facebook service above:

```csharp
public static async Task<string> GetTinderAuthToken(string fbUserId, string fbAccessToken) {
    try {
        bool success = await TC.Login(fbUserId, fbAccessToken);
        return TC.AuthToken;
    } catch (Exception e) {
        throw new SwiprTinderTokenException(e);
    }
}
```

It will be useful to have some kind of way of knowing whether or not our Tinder token has expired, so we request a `meta` object that just returns some Tinder stats for our user. If the request fails, we've been expired:

```csharp
public static async Task<bool> CheckTokenStillValid(string tinderAuthToken = null) {
    if (!String.IsNullOrWhiteSpace(tinderAuthToken)) {
        TC.AuthToken = tinderAuthToken;
    }
    try {
        TinderMeta success = await TC.GetMeta();
        return success != null;
    }
    catch (System.Net.WebException we) {
        throw new SwiprTinderTokenException(we);
    }
}
```

Now for our core methods of fetching, liking, passing and superliking users:

```csharp
public static async Task<IList<SharpTinder.Core.User>> GetMatches(string tinderAuthToken = null) {
    if (!String.IsNullOrWhiteSpace(tinderAuthToken)) {
        TC.AuthToken = tinderAuthToken;
    }
    try {
        SharpTinder.Core.TinderRecommendation recs = await TC.GetCoreRecommendations();
        if (recs == null) {
            throw new SwiprTinderTokenException();
        }
        else if (recs.Data == null) {
            throw new SwiprException("Retrieved recommendations had no valid data", -5);
        }
        IList<SharpTinder.Core.User> UserList = recs.Data.Results.Select(x => x.User).ToList();
        return UserList;
    } catch (System.Net.WebException we) {
        throw new SwiprTinderTokenException(we);
    }
}
```

Liking a user:

```csharp
public static async Task<bool> LikeUser(string userid, string tinderAuthToken = null) {
    if (!String.IsNullOrWhiteSpace(tinderAuthToken)) {
        TC.AuthToken = tinderAuthToken;
    }
    try {
        TinderMatchResult tmr = await TC.Like(userid);
        SwiprStats.LikesRemaining = tmr.LikesRemaining;
        if (tmr.Match) {
            return true;
        }
        else {
            return false;
        }
    }
    catch (System.Net.WebException we) {
        throw new SwiprTinderTokenException(we);
    }
}
```

Superliking a user:
```csharp
public static async Task<bool> SuperLikeUser(string userid, string tinderAuthToken = null) {
    if (!String.IsNullOrWhiteSpace(tinderAuthToken)) {
        TC.AuthToken = tinderAuthToken;
    }
    try {
        TinderMatchResult tmr = await TC.SuperLike(userid);
        SwiprStats.SuperLikesRemaining = tmr.LikesRemaining; // TODO does this return superlike count if we give it a superlike>?
        if (tmr.Match) {
            return true;
        }
        else {
            return false;
        }
    }
    catch (System.Net.WebException we) {
        throw new SwiprTinderTokenException(we);
    }
}
```

Passing a user:

```csharp
public static async Task PassUser(string userid, string tinderAuthToken = null) {
    if (!String.IsNullOrWhiteSpace(tinderAuthToken)) {
        TC.AuthToken = tinderAuthToken;
    }
    try {
        TinderMatchResult tmr = await TC.Pass(userid);
        SwiprStats.LikesRemaining = tmr.LikesRemaining;
    }
    catch (System.Net.WebException we) {
        throw new SwiprTinderTokenException(we);
    }
}
```

Important to note is that every call to Tinder here updates our `TinderConfig` with the relevant information. We said that the values contained in that class would be determined at runtime, and this is where that logic happens.

Also note that the Like and Superlike calls return a boolean value indicating whether or not the user in question matched with us. These return values are currently not relayed to the Swipr user, but the architecture supports it for the future. 

# Moving On

In our next post, we'll discuss the what our datastore looks like.


[Next Section - Datastore](/posts/ml/swipr09)