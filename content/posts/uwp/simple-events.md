---
title: "UWP: Simple Events"
date: 2018-07-19T15:31:28-07:00
draft: false
description: "Some problems are just made so much easier in XAML based apps if you use the Event pub/sub model. In this post we explore an easy way to create and subscribe to both typed and untyped events in UWP."
categories:
- UWP
tags:
- event routing
---

#### Notes
[07/19/2018] Note: This post refers to the library `Microsoft.NETCore.UniversalWindowsPlatform`, version `6.2.0-Preview1-26502-02`.

# Events

Some problems are just made so much easier in XAML based apps if you use the Event pub/sub model.

We'll structure our events the way the excellent Template10 does:

- One event  
- One EventRaised method

## Untyped Events
These events carry no information aside form the fact that it occurred. 

In the class that the event originates from:
```csharp
public class MyEventPublisherClass {

    /* This the event that will be subscribed to. */
    public event EventHandler MyEvent;

    /* This is a convenience function that calls the event. */
    void RaiseMyEvent() => MyEvent?.Invoke(this, new EventArgs { });
}
```

This is an untyped event, so we use the Event version of an empty constructor with the `new EventArgs {}` syntax. The base EventArgs class contains no other fields.

In the class that you wish to receive event notifications from:
```csharp
class MyEventSubscriberClass {

    public MyEventSubscriberClass() {
        /* Somewhere, usually in the constructor, we subscribe to the event*/
        MyEventPublisherClass.MyEvent += OnMyEventMethod;
    }

    /* This is the method that gets called when the event is triggerd */
    private void OnMyEventMethod(object sender, EventArgs e) {
        // Do Something
    }

}
```

## Typed Events
These events carry additional, arbitrary information of your choice. 

```csharp
public class MyTypedEventPublisherClass {

    public event EventHandler<string> MyTypedEvent;
    void RaiseMyTypedEvent(string value) => MyTypedEvent?.Invoke(this, value);
}

class MyTypedEventSubscriberClass {

    public MyTypedEventSubscriberClass  () {
        MyTypedEventPublisherClass.MyTypedEvent += OnMyTypedEventMethod;
    }

    private void OnMyTypedEventMethod(object sender,  string e) {
        // Do something
    }
}
```


