---
title: "Swipr - Data Collection (Part 1 of 2)"
date: 2018-12-11T12:29:43-08:00
draft: false
description: "Part 3 of the Swipr series. In this post we cover the problem of data collection."
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
series_weight: 3
---

# Data Collection

In previous posts we laid out what we expect our end result to look like, but underlying all of that is of course the ML model making our auto-tinder more than just a simple always-swipe-right bot.

Like all deep learning projects, before we can consider training our model or even what our model architecture will be, we need to consider the problem of data. What, exactly do we need to collect?

Our domain is Tinder, and Tinder is a picture-first service. We will ignore the fact for now that a tinder profile is so much more than just a series of pictures, and that bios exist. We surely wouldn't be so crass and savage to only care about the pictures, would we?

Regardless, our domain is pictures, so we need pictures. The outstanding question is what kind of pictures do we need, and roughly how many?


## Images from Tinder
We have a few avenues available to us: We can download our Tinder history and use those pictures, and we can supplement them with the [People's Republic of Tinder](https://www.kaggle.com/chrisroths/peoples-republic-of-tinder-1) dataset, which separates images into `Dudes` and `Girls`. Although using our own tinder dataset would be perfect for informing the model of what our own specific tastes are, the PRoT dataset is less useful because we don't want to just blindly accept all eligible profiles, so we have to get more clever.

Even going by just our own dataset, it's too small to train on, consisting in our own specific case of about 2,000 images. We need more than that.

## Images from Instagram

One source of basically high quality/high signal images is Instagram. Our strategy for training the main model will be to mark all Tinder images as "No", and all images from Instagram as "Yes".

The idea is that Tinder images are low quality and low signal, and that we want to train the model on idealized conditions. We will compensate for this at the end by allowing for a relatively low threshold for what constitutes a "yes" when it comes to running the model in production.

Conversely, we will assume that images from Instagram are all idealized. This gives us the basis to start with.


# Instagram Profile Collection

## Which profiles?

Before we can think about downloading Instagram profiles, we should consider first what profiles to even download. 

Our first naïve approach was to assemble a list of regular names and collect all profiles with those names. This approach yielded an interesting phenomenon - given that we were going over an unbiased set of names, we ended up with a skew of people that roughly reflected the general population of Instagram.

That is, we had in our dataset people who were too old, people who were too young, and people with babies. Although this is not what we wanted, we kept all these profiles and categorized them appropriately as "too young", "too old", and "with baby".

To fix this, we decided to consult the U.S. Census for popular baby names in given years. we specified a general range of people born between 1998 and 1990. This 8 year range of people between the ages of 20 and 28 was a good general collection of people who were essentially the correct age and likely to still be unmarried or childless. 

This was done to try and keep the training dataset as pure as possible - the last thing in the world we wanted the model to learn was the face of a baby. 

Once we had the years set, we collected the top names of each year into a giant list, deduplicated it, and began searching Instagram, vetting each profile by hand.

For Americans, the list of names was the following:

    Jessica
    Ashley
    Emily
    Sarah
    Samantha
    Amanda
    Brittany
    Elizabeth
    Megan
    Hannah
<small>https://www.ssa.gov/oact/babynames/decades/names1990s.html</small>

We also did this for Japanese names:

    明日香  (asuna)
    美咲    (misaki)
    愛      (ai)
    萌      (moe)
    舞      (mai)
    茜      (asuka)
    美穂    (miho)
    愛彩    (aika)
<small>http://www.tonsuke.com/nebe1.html</small>


## Manual Vetting

Armed with a first round of names, we started typing each into Instagram's search and opening up every single result returned.

For each page, we quickly skimmed each profile and bucketed it into one of a few categories:

* Too old
* With baby
* Too young
* General No
* Ok

This may seem crass, but really, it's not any crasser than Tinder itself.

There is far too much data to vet each and every picture, but we consider each category to be essentially full of idealized images. Of course, pictures of beaches, food, and dogs are all common Instagram subjects, even on profiles of stereotypically self centered selfie-obsessed young twenties girls. We will come back to this point in detail later on, but for now let's assume that each profile is pure and ideal for its category.

With the Japanese girls we also realized we had a problem of purikura, which is a popular camera filter common to all phones in Japan that squishes the face and doubles the eye size of the photo subjects. The resulting photograph, while appealing to the Japanese aesthetic, falls somewhere between unattractive and grotesque to westerners such as ourselves.

We decided to make a special category for purikura in case we wanted to do something with them in the future. Crawling Instagram is surprisingly hard work, so better to categorize them now and than to be faced with the task again in the future.

Needless to say purikura will get lumped into the 'no' category later on, but you never know.

## Final Profile Count

After collecting the URLs of all the profiles and sorting them all into their appropriate buckets, we had a list of approximately 514 profiles.

### Why so few dudes?

You may wonder why we seem to be taking the risk of not gathering any dude profiles beyond those in the small PRoT set. We surely wouldn't want the bot to make an incorrect judgement on a guys profile. 

Although true, we can trust that Tinder will, for the most part, only show us people of the gender we're interested in. Sometimes Tinder messes up and throws a same-sex person in there, but the overwhelming majority of the time it gets it right. 

What this amounts to is that, statistically, the number of erroneous males in our queue will be irrelevant. But more importantly, our bot doesn't even need to learn what a guy is. Due to the sheer amount of pictures we're going to feed it, we can trust that it will be able to discern that the features of a male do not constitute a 'YES'.

# Moving On

In the next post, we'll discuss the logistics of collecting and transporting this massive sum of data from Instagram.


[Next Section - Data Collection (2 / 2)](/posts/ml/swipr04)