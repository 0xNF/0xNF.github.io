---
title: "Fun With Generic First Class Functions"
date: 2021-09-17T16:32:12+09:00
draft: true
description: "Using generic functions with parameters that are also generic functions to simplify my life a little bit"
categories:
- misc
- programming 
tags:
- dart
---


Dart, like most modern languages worth using, has generics.

It actually has some pretty powerful generics.

Generic functions that take generic parameters which themselves are generic functions and then produce generic results. 

Sound confusing? It is. But it's also not that bad, and we can use them to do some really useful things.

## tl;dr
Fancy [schamncy functional generic](#solution-3) stuff for smoother re-authorization.
## The Problem

We have a client application that connects to a server to do some processing.  
That server requires an active login session in order to do anything.
We can log in, get our session token, and then do our processing and that works just fine. But login sessions aren't forever, so what happens when it expires and we get logged out?  

From the user's perspective, they're still logged in, and why wouldn't they be? After all, they never logged out. We can ask then to manually re-authenticate all the time, but that's pretty bad UX.

The right thing to do is to handle the reauth flow ourselves, silently from behind the scenes. 


### Solution 1

Our first attempt might involve taking each auth-required API call and wrapping it in some kind of `IsAuthoized()` check:


```dart
// App::page_device.dart
import 'package:LibServer/api.dart';

/// Fetches the users Device from the server
/// If successful, returns an Ok(device), if not, returns an Error
Future<Result<Device>> checkUserDevice() async {
    User user = getUser();
    Result<Device> res = await api.checkDevice(user);
    if (res.code == 401) {
        await api.reAuthorize(user);
        res = await api.checkDevice(user);
    }
    return res;
}
```

This works but has three problems:
1. Its a lot of extra boiler plate to add when we'd need to do this every time we call any of our APIs
2. we have to manually call the actual method twice

This works, but it's not very nice to use.

### Solution 2  
We could an add an application level indirection layer that performs the reauth without having to do it ourselves every time we call our function.

```dart
// App::page_device.dart
import 'package:App/api_intermediary.dart';

Future<Result<Device>> checkUserDevice() async {
    User user = getUser();
    return await api_intermediary.checkDevice(user);
}



// App::api_intermediary.dart
import 'package:LibServer/api.dart';

Future<Result<Device>> checkUserDevice(User user) async {
    Result<Device> res = await api.checkDevice(user);
    if (res.code == 401) {
        await api.reAuthorize(user);
        res = await api.checkDevice(user);
    }
    return res;
}
```

We've solved one problem from the previous example with this method. We no longer have to be worried about auth logic for every new call-site of the api. That's nice, but it's not nice enough because we still have plenty of remaining problems:

1. It's still a lot of boiler-plate
2. We still have to manually call our functions twice
3. We now have to essentially re-create the underlying API interface

The first two problems are the same as before, but the third one is its own special annoyance.  

Every time an API gets added to the underlying library, we have to add another wrapper function to our intermediary layer, which is just irritating. There are benefits to going through such an intermediary, but if we're only interested in adding an auth check, it seems like a disproportionate amount of work, not to mention the ongoing future maintenance burden it creates.


### Solution 3

We're trying to solve a problem in our application layer when this is actually a problem in our library layer. Why does our application need to be so explicitly concerned with a detail like session expiry? Its good to have some insight into that, but we shouldn't have to be stressing over it like we have been in the previous two examples.

Assuming it's possible to do so, lets move this problem to the library layer, where we won't have to re-create every single api call.

Here's the function we're working with, in it's unmodified state:

```dart
// LibServer::api.dart

Future<Result<Device>> checkDevice(User user) async {
    Client c = new Http.Client();
    Response r = await c.get(
        new Uri("api.example.com/v1/checkDevice"),
        headers: h["cookie"] = user.cookie,
    };
    if (r.statusCode >= 300) {
        if (r.statusCode == 401) {
            return Result.Err(r.statusCode, "gotta log back in");
        }
        throw Result.Err(r.statusCode, "¯\_(ツ)_/¯");
    }
    Map<String, Object?> jsonBody = convert.jsonDecode(r.body);
    Device d = Device.fromJson(jsonBody);
    Result.Ok(d);
}
```
Here's what we'll end up with once we finish: 

```dart
// LibServer::api.dart

Future<Result<Device>> checkDevice(User user) async {
    
    /* a Function Object, of the same signature, holding a lambda function which will execute the real logic */
    Future<Result<Device>> Function() functor = () async {
        Client c = new Http.Client();
        Response r = await c.get(
            new Uri("api.example.com/v1/checkDevice"),
            headers: h["cookie"] = user.cookie,
        };
        if (r.statusCode >= 300) {
            if (r.statusCode == 401) {
                return Result.Err(r.statusCode, "gotta log back in");
            }
            throw Result.Err(r.statusCode, "¯\_(ツ)_/¯");
        }
        Map<String, Object?> jsonBody = convert.jsonDecode(r.body);
        Device d = Device.fromJson(jsonBody);
        Result.Ok(d);
    }

    /* A call to some Generic Function wizardry that will take care of the details for us */
    return await _reauthorizer(functor, user);
}
```

Our strategy is going to be something like this:

1. Create a function that will try something once, check for a failure, and then do a potentially different something in response
2. Use that function to create a new function that uses (1) to explicitly handles authorization errors
3. Modify each API call to use (2) to automatically reauth and retry if necessary

```dart
// LibServer::api.dart

/// Any function which can take one input, and check if it is an error
typedef _ErrorChecker<T> = bool Function(T result);

/// Any function with no arguments which returns a Future<T> 
typedef _OnError<T> = Future<T> Function();

/// Any function with no arguments that returns a Future<T>
typedef _PrimaryFunctor = Future<T> Function();

/// Given a Function that returns a T, check if it's an error, and then do some error handling
Future<T> _redoer<T>(_PrimaryFunctor<T> tryThis, _ErrorChecker<T> isErrorChecker, _OnError<T> onError) {
    /* First, try the primary function */
    T res1 = await mainFunction();
    /* Test the result for some arbitrarily defined failure */    
    if (isErrorChecker(res1)) { 
         /* if it failed, run and return the onError function */
        T res2 = await onError(res1);
    }
    /* If there was no failure, return the initial result */
    return res1;
}
```

`_redoer` is our base generic function upon which the rest of the solution stands.

What is noteworthy here is that the `onError` and `tryThis` can be different functions if required. After all, just blindly redoing the first failure operation after changing nothing wouldn't get us very far. 



Next, lets create two methods that correspond to `onError` and `isErrorChecker` for our specific reauth usecase:

```dart
// LibServer::api.dart

/// a ServerFunction is any function with no arguments that produces an awaitable Result<T>
typedef ServerFunction<T> = Future<Result<T>> Function();

/// An auth error is defined as the result having a 401 error code. 
bool _isAuthError<T>(Result<T> result) {
    return result.code == 401;
}

/// Reauthenticate with the server, and then try the primaary method again if reauth was successful
Future<Result<T>> _onAuthError<T>(ServerFunction<T> tryThis, User user) async {
    Result<bool> authResult = await _reAuthenticate(user); /* we presume that the _reAuthenticate function stores a successful response somewhere by itself. */
    if (authResult.code >= 300) {
        return Result.Error(authResult)
    }
    Result<T> tryAgain = await tryThis;
    return tryAgain;
}
```

Now we have all the pieces we need to construct the last piece of the puzzle:

```dart
// LibServer::api.dart

/// Attempts to run `tryThis`, and if the server says our session is expired,
/// we re-authenticate, and then run `tryThis` a second time
Future<Result<T>> _reauthorizer(ServerFunction<T> tryThis, User user) async {
    Result<T> result = await _redoer(tryThis, _isAuthError, (_) => _onAuthError(tryThis, user));
}
```


## Summary

With this new redoer in place, we can leave it to our library to handle the gnarly details of whether a session is active or not, and a client application using that library doesn't have to care about sessions unless something really bad has happened, like a connection failure or a password change. 

Our application code can now look like we probably wanted it to look all along:

```dart
// App::page_device.dart
import 'package:LibServer/api.dart';

/// Fetches the users Device from the server
/// If successful, returns an Ok(device), if not, returns an Error
Future<Result<Device>> checkUserDevice() async {
    User user = getUser();
    return await api.checkDevice(user);
}

// We can also now do a bunch of other api calls too, without worrying about copious amounst of auth checks
Future<void> doLotsOfStuff(User u) async {
    Result<Device> devices = await api.checkDevice(user);
    Result<bool> updateName = await api.changeName(user, "fancy new name");
    Result<int> howManyThings = await apu.getThingCounter(user);
}
```

Is this a perfect solution? No, of course not. But it does address a number of problems:

1.  It's light on the boiler-plate. We don't have to write a bunch of redundant IsAuthed() logic everywhere
2.  It obviates the need for an unwanted middle layer of re-implemented API calls in our application logic

In return, we pay a price of some cognitive complexity. We've entered "Clever Code" territory, which is usually worth avoiding in favor of simplicity. In specific:

1. Aliasing function types (`typedef`), while valid and useful, isn't super common
2. A function whose parameters are entirely other functions can take some getting used to

It's always a trade-off, and here the additional cognitive load when reading this part of the library code migght very well be worth it for the reduction of boiler-plate elsewhere.





### p.s.

The `reAuthorize(User user)` method seems a bit suspect doesn't it? What kind of design must we have concocted to allow the library to perform reauthorization on its own? Does the library cache the login token / user credentials somewhere in its address space? Or perhaps even worse, is the information plainly available on the `User` object, hanging out in RAM all the time, possibly being written to and from disk and read by any kind of object that can see the User?

That's for another time, but the short answer is 'no', the library is not actually able to just casually reauthroize all by itself. We can address that particular item in a future post. 
















