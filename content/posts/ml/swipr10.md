---
title: "Swipr - Server"
date: 2018-12-13T17:01:51-08:00
draft: false
description: "Part 10 of the Swipr series. The last step in the odyssey of Swipr, where we describe the core of the Swipr Server, the swiping logic, calling our SwiprML model, and actually using LibSwipr."
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
series_weight: 10
---

Recall our arch diagram from the two chapters ago:

![Swipr Server Arch](/ml/swipr/SwiprServerArch.png)

The Database Service is a collection of methods opening and closing SQLite connections and, while important, is really exceedingly boring and furthermore, unsurprising. As such, we'll leave it out of the discussion. 

We'll also leave out building the Razor Pages and the views, dealing with identity, migrating our initial user tables with EF Core and other such minutiae of running an ASP.NET Core server.

We're going to keep our discussion to the Swipr Service and the two Queuing Services.

# Server Configurations

To make sure our server is configurable without recompiling, we have the notion of a `ServerConfig`, which is a class that stores some relevant values for the server, read in at start-up from various environment variables:

```csharp
public class ServerConfigs {
    // Location of the Swipr DB
    public string DBConnectionString { get; set; }
    // How often to dequeue users
    public TimeSpan TimeoutCheck { get; internal set; }
    // How long a Tinder user will be timed out from running out of Likes
    public TimeSpan LikeTimeout { get; internal set; } = TimeSpan.FromHours(12);
    // Where to store tinder pictures
    public string TinderPicturesDirectory { get; internal set; }
    // Location of SwiprML python script
    public string SwiprScript { get; internal set; }
}
```

# Services

## Threadsafe Queue

This was intended to be a more complicated class, but it turns out all we needed was a concurrent queue.

We use this ConcurrentQueue make sure that the Queue and Dequeue services are pushing and pulling from the same list and have the same view of that list.

```csharp
public static class ThreadSafe {
    public static ConcurrentQueue<SwiprConfig> EnabledUserConfigs = new ConcurrentQueue<SwiprConfig>();
}
```

## Config Queue Service

Our first relevant service is the Queue service - this is a hosted service that will, on a timer defined by the ServerConfigs, query the database to get any eligible Swipr Configs - an eligible Swipr Config is defined as being a configuration that the user hasn't manually disabled, one that isn't presently timed out due to Tinder Likes running out, and one that currently has no Facebook or Tinder token errors associated with it.

```csharp
    internal class ConfigQueueService : IHostedService, IDisposable {

        [...]

        public Task StartAsync(CancellationToken cancellationToken) {
            _logger.LogInformation("Launching Queue Service");

            _timer = new Timer(DoWork, null, TimeSpan.Zero,
                Constants.ServerConfig.TimeoutCheck);

            return Task.CompletedTask;
        }

        // This is the core method
        private async void DoWork(object state) {
            _logger.LogInformation("Checking for eligible profiles to queue up...");
            IList<SwiprConfig> configs = await DatabaseService.GetEligibleConfigs();
            foreach (SwiprConfig sc in configs) {
                if (sc.SwiprEnabled) {
                    ThreadSafe.EnabledUserConfigs.Enqueue(sc);
                }
            }
        }

        [...]
    }
```


## Config Dequeue Service

One of our more important classes is the Dequeue service, which pulls from the Concurrent Queue on the same timer as the QueueService.

We add a few extra fields and methods to this class in order to keep it from pulling from the queue while LibSwipr and SwiprML are going through a user's account, essentially adding a lock to it while it's in progress.

```csharp
private bool StillGoing = false;
...
private void CheckWorking(object state);
```

Instead of the timer tick calling the DoWork method directly, we have it call a method that checks to make sure a Dequeue isn't already in progress. 

```csharp
internal class ConfigDequeueService : IHostedService, IDisposable {

    [...]
    private bool StillGoing = false;

    [...]

    private void CheckWorking(object state) {
        if (!StillGoing) {
            StillGoing = true;
            DoWork(state);
        }
        else {
            _logger.LogInformation("Was called to do more dequeue, but a previous dequeue was stil in progress.");
        }
    }

    private async void DoWork(object state) {
        _logger.LogInformation("Launching new Dequeue while loop");
        int maxErrors = 10;
        int errorCount = 0;
        while (ThreadSafe.EnabledUserConfigs.Any()) {

            if(!ThreadSafe.EnabledUserConfigs.TryDequeue(out SwiprConfig sc)) {
                errorCount += 1;
                if(errorCount == maxErrors) {
                    _logger.LogCritical($"EnabledUserConfigs dequeue failed {errorCount} times, this run of the dequeue service will be terminated.");
                    StillGoing = false;
                    return;
                }
                _logger.LogCritical($"EnabledUserConfigs reports that it is not empty, but failed to dequeue a SwiprConfig. This is attempt number {errorCount}");
            }
            else {
                // check that the sc is still valid
                SwiprConfigStatus scs = await DatabaseService.CheckSwiprConfigStillValid(sc.UserId);
                if (!(scs.ConfigIsValid)) {
                    _logger.LogInformation($"User {sc.UserId} disabled their Swipr config between enqueue time and dequeue time. Passing on execution for this config.");
                    continue;
                }
                else {
                    try {
                        bool success = await SwiprService.DoSwipr(sc);
                        if (!success) {
                            _logger.LogWarning($"Failed to complete swipr task for user {sc.UserId}");
                        }
                        else{
                            _logger.LogInformation($"Successfully finished Swiping for user {sc.UserId}");
                        }
                    } catch(SwiprException se) {
                        _logger.LogCritical(se.Message);
                        continue;
                    } catch(Exception e) {
                        _logger.LogCritical(e.Message);
                        continue;
                    }
                }
            }
        }
        _logger.LogInformation("Finished dequeuing this batch of Swipr configs");
        StillGoing = false;
    }

    [...]
}
```

To keep us from getting stuck on one user too much, we keep track of the various errors that my occur and abandon this SwiprUser if they fail, for whatever reason, more than 10 times.

We do this because Swipr is essentially single-threaded and can only handle one Swipr user at a time, so we want to give the current Swipr user enough of a fair chance at getting their chance as possible, but we also don't want to hold up the whole queue by waiting forever on this one user. These problems would be diminished if Swipr could query for multiple Tinder users at once, and if SwiprML was a bit quicker.

One we have our eligible Swipr configuration, we make the critical call out to `SwiprService.DoSwipr()`, which will do the hard work of combining everything we've done so far.


# Swipr Service

## DoSwipr()

We start the method by requesting the tokens of the current Swipr User - remember that a Tinder token has a limited duration, so we'll need everything stored by the user to sign in again and get another token.

We also set up variables for break conditions and statistics. When the total number of `ThisSessionLikes` and `ThisSessionPasses` reaches our `SessionLimit`, we stop working on this user and move on to a new one.

```csharp
// Break condition variables
bool success = false;
int ThisSessionLikes = 0;
int ThisSessionPasses = 0;
int ThisSessionErrors = 0;
```

The first thing we do is check if the token we pulled from the Database is valid, and if not, run the sign-in process again to get a new one. The `Refresh` methods handles saving this new information back to the Database.

```csharp
// Checking status of tokens
if(!await Refresh(sc.UserId, at)) {
    throw new SwiprFacebookTokenException();
}
```

If we fail to sign in, we write the error to the `SwiprErrors` table and try with a different user. An error here requires that the user re-do the entire sign in process. They are disabled on Swipr until they fix this. Usually this is because we triggered Facebook's security and got their account locked out.

If we have a working token, we get whatever potential matches that Tinder has queued up for us via a call to LibSwipr.

```csharp
// Getting users
IList<User> matches = new List<User>();
matches = await TinderAPI.GetMatches(at.TinderAuthenticationToken);
if (!matches.Any()) {
    cont = false;
    success = true;
}
```

Once we have matches, we do a bunch of work for each Tinder User we got, including making sure it has entries in both our Database, and our filesystem so we can store pictures. Once we've ensured a user has been accounted for, we call out our profile evaluator, which in addition to containing the swipe logic and the call to SwiprML, also contains the callback to Tinder.

We switch on the result of our evaluator and record that result.

```csharp
// Evaluating users
[...]
foreach(User u in matches){
    [...]
    EvaluationResult er = await EvaluateProfile(sc, u);
    switch (er.ActionTaken) {
        case SwipeAction.NA:
            logger.Error("Swipr couldn't classify this profile - an error ocurred");
            ThisSessionErrors += 1;
            break;
        case SwipeAction.LIKED:
            logger.Info($"Liked Tinder User {u.Id} for Swipr User {sc.UserId} because: {er.Reason}");
            ThisSessionLikes += 1;
            break;
        case SwipeAction.PASSED:
            ThisSessionPasses += 1;
            logger.Info($"Passed on Tinder User {u.Id} for Swipr User {sc.UserId} because: {er.Reason}");
            break;
        case SwipeAction.SUPERLIKED:
            ThisSessionLikes += 1;
            logger.Info($"Super-Liked Tinder User {u.Id} for Swipr User {sc.UserId} because: {er.Reason}");
            break;
        default:
            logger.Error("CRITICAL: Some uncategorized error ocurred. This should never happen.");
            ThisSessionErrors += 1;
            // TODO this is an error condition that should never happen.
            break;
    }
    [...]
}
```

## EvaluateProfile()

There is some nuance that is worth spending some time on in this method. Unlike Lyricall, we're not allowing infinite nesting and arbitrary ordering of the conditions to be met for a profile to be passed or failed upon, so the order as listed herein is important.

The order goes like this:

1. Does this User have any pictures?
    * if not, fail
1. Does our Swipr User have any Likes left to use?
    * Has user enabled the Out-Of-Likes SuperLike strategy?
        * if so, SuperLike if we have any left
    * fail otherwise
1. Are we blindly accepting all matches?
    * if so, like and move on
1. Are Ages enabled, and does the Tinder User fall within the range specified?
    * if not, fail
1. Is Distance enabled and does the Tinder User fall within the range specified?
    * if not fail
1. Is bio enabled, and if so does the user have an empty bio?
    * if so, fail
    * otherwise, check for Banned bio keywords
    * then, if SuperLike strategies has the WordMatch strat, check if bio has any SuperLike word.
        * if so, superlike and move on 
    * finally, check if Bio contains an auto-like keyword
        * if so, like and move on
1. Finally, call out to SwiprML

The last step has some nuance as well.

To make this easy on us, we have decided that as long as at least one picture from the given user's profile can pass a minimum confidence check from SwiprML, we consider the entire profile a pass. We considered having some percentage of available pictures be the deciding criterion, but in the end, a single passable picture is good enough for now.

There's some additional complicating logic within this particular step but it amount to the following code:

```csharp
SwiprMLResult smlr = await SendToSwiprML(tinderUserId, swiprUserId, pictureLocation);
if (smlr.Crashed) {
    perPic.Add(new EvaluationResult(SwipeAction.NA, "AI Crashed", WasAMatch, picfname));
} 
else if (smlr.ConfidenceLike < swiprConfig.MinimumConfidence) {
    perPic.Add(new EvaluationResult(SwipeAction.PASSED, "AI Says Pass", WasAMatch, picfname));
} 
else {
    // We immediately return the pass result
    await TinderAPI.LikeUser(u.Id);
    return new EvaluationResult(SwipeAction.LIKED, "AI Says OK", WasAMatch, picfname);
}
```

Where `SendToSwiprML()` downloads the picture and makes a call to the our SwiprServiceScript from a few parts ago to get a prediction. We also make sure to note if SwiprML crashed, which, while uncommon, is not unheard of. We take notes when it does.

Like said earlier, the moment any part of this big function comes to a conclusion on what action to take with respect to the supplied tinder user, we make the call to Tinder ourselves immediately and return back to looping through other users.


# Summary

There's a bit more to the SwiprServer than just what's shown. We support displaying results of the server to see who was passed over and why, we support changing your SwiprConfig from a web based UI, seeing errors in your profile on your settings page, etc.

You can see the full extent the implementation over at https://0xnf.github.com/swiprserver.

# Moving On

That concludes our tour of Swipr, where we wrap up another attempt to learn and utilize machine learning.