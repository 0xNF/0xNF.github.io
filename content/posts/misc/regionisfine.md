---
title: "#region Is Fine"
date: 2018-06-18T19:53:31-07:00
draft: false
description: "In which we discuss why using C#'s region/endregion feature in a big class is not a necessarily bad thing to do and why the haters are full of anti-hype."
categories: 
- csharp
---

[Occasionally](https://enterprisecraftsmanship.com/2015/12/08/c-regions-is-a-design-smell/) [you'll](https://www.quora.com/Is-it-bad-practice-to-use-region-in-c-to-sort-order-my-code) [encounter](https://marcduerst.com/2016/10/03/c-regions-are-evil/) [someone](https://softwareengineering.stackexchange.com/questions/53086/are-regions-an-antipattern-or-code-smell) [whining](https://extractmethod.wordpress.com/2008/02/29/just-say-no-to-c-regions/) [about](https://www.quora.com/Is-it-bad-practice-to-use-region-in-c-to-sort-order-my-code) [using](https://blog.codinghorror.com/the-problem-with-code-folding/) C#'s `#region / #endregion` feature in your code. 

The complaints always boil down to one thing: Overuse of regions is indicative of bad design because it promotes hiding flaws in class structure. Mostly they mean that the class is too big and should be split up.

That's not a necessarily bad observation on its face, but it's farcical to blame bad design on using regions. If you got rid of regions, your code would still be bad. As a side note, can we also stop using the term "code smell"? I find it grotesque. Anti-pattern is fine, even if it trades its grossness for the sound of conceit.  

Anyway, using regions is fine. Don't overuse them, and if you can avoid it don't nest them, but they can be a really good way of organizing a class, especially if you can't really do anything about it being big. 

For example, implementing the `OpenIdConnectServerProvider` class from the `AspNet.Security.OpenIdConnectServer` library to any significantly degree is going to give you a big class, and there are logical sections to the class that make sense to be able to collapse with regions. Any other solution you could implement to reduce the need for regions is only going to prove to be even more convoluted and weird than if you had just used regions in the first place.  

Or when using UWP's preferred MVVM pattern, the first half of any significant ViewModel class will be full of delegates, event listeners, and tons of backing-field variables which is a perfect use for using a `#region` to collapse all that stuff.

The main problem with region is that you'll hide bad design - but bad design will persist regardless. Be judicious when employing it, and don't fall for the anti-hype. They can be a really helpful tool for maintaining an understanding of a necessarily large class.

Also maybe don't use them in methods - that's legitimately strange.