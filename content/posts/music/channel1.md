---
title: "Music Channel Part 2 - Stats"
date: 2019-03-26T15:50:58-07:00
draft: false
description: "Wherein we finally answer some statistical questions that will guide our channels upload pattern"
categories:
- music channel
tags:
- YouTube
- Branding
- Marketing
- Music
series:
- Music Channel
series_weight: 2
---

This is the second in a series of posts about analyzing YouTube music channels.

* [Part 1 - Music Channel Introduction and Data Collection](/posts/music/channel0)
* Part 2 - Analysis of Channel Activity
* [Part 3 - Branding](/posts/music/channel2)

# Your Questions, Answered

We left off last time with a freshly created database full of information we could query. We sought to answer a few questions:

1. How many videos should we seed our channel with?
1. How often should we upload?
1. Should we upload more than video at once?
1. How long can we wait between uploads if something goes wrong?

## Channel Seeding?

We'll take the first upload date of each of our channels and see what their total upload count is:

```SQL
SELECT Channel, Count FROM ChannelPublish WHERE DaysSinceLastPublish=0 ORDER BY Count DESC
```

Which returns the following data:


Channel             | Count
------------------- | -------------
Majestic Casual     | 6
ChillNation         | 1
Eton Messy          | 1
MikuMusicNetwork    | 1
Monstercat: Uncaged | 1
MrSuicideSheep      | 1
TheSoundYouNeed     | 1


With the exception of Majestic Casual, no one seems to seed their channel. That makes things easy on us.

_Question:_   How many videos should we seed our channel with?  
_Answer:_     None

## Upload Pace?

```SQL
SELECT 
	cp.Channel,
	ROUND(avg(cp.DaysSinceLastPublish),2) AS AvgDaysBetweenPosts
	FROM ChannelPublish AS cp
	WHERE DaysSinceLastPublish > 0 
	GROUP BY cp.Channel
```

Channel             | Average Days Between Upload
------------------- | -------------
ChillNation         | 1.72
Eton Messy          | 3.50
Majestic Casual     | 1.52
MikuMusicNetwork    | 2.81
Monstercat: Uncaged | 2.04
MrSuicideSheep      | 1.34
TheSoundYouNeed     | 6.65

This might not tell the whole story though, so lets see if we can get some sense of upload pace vs channel popularity. 

We'll look at a channels lifetime views, along with the average number of views per song per channel. If we take all this information together, we'll get a stronger sense of where upload pace fits into the scene.

```sql
SELECT 
	cp.Channel,
	ROUND(avg(cp.DaysSinceLastPublish),2) AS AvgDaysBetweenPosts,
	(
		SELECT SUM(vs.Views) FROM VideoStats AS vs WHERE vs.Channel = cp.Channel 
	) AS TotalChannelViews,
	(
		SELECT CAST(AVG(vs.Views) AS INTEGER) FROM VideoStats AS vs WHERE vs.Channel = cp.Channel 
	) AS AvgViewsPerUpload
	
	FROM ChannelPublish AS cp
	WHERE DaysSinceLastPublish > 0 
	GROUP BY cp.Channel
	ORDER BY AvgViewsPerUpload DESC
```

Channel         | Average Days Between Upload | Total Channel Views | Average Views per Upload
----------------|-----------------------------|---------------------|-------------------------
TheSoundYouNeed	| 6.65			      | 1,965,150,738	    | 6,102,952
MrSuicideSheep	| 1.34			      | 3,912,749,521	    | 1,956,374
ChillNation	| 1.72			      | 1,731,630,505	    | 1,777,854
Monstercat: Uncaged | 2.04		      | 2,164,378,038	    | 1,592,625
Majestic Casual	| 1.52			      | 1,704,478,658	    | 893,801
Eton Messy	| 3.5			      | 113,665,075	    | 143,155
MikuMusicNetwork| 2.81			      | 12,827,204	    | 12,453

These stats are a bit wonky because each channel tends to have 3 or 4 super-outliers. For example, TheSoundYouNeed's [Tom Odell - Another Love (Zwette Edit)](https://www.youtube.com/watch?v=4ZHwu0uut3k) has 395 million views, which is a full 20% of that channels views. There's more statistical magic we could do involving outlier removal and standard deviations, but we're just going to leave it is and say that we should try to target one upload every one or two days.


_Question_   How often should we upload?  
_Answer:_     Every day, or every other day.

## Batch Uploads?

```SQL
SELECT Channel, Count AS BatchSize, COUNT(Count) AS TimesUploaded FROM ChannelPublish GROUP BY Channel, Count ORDER BY Channel, TimesUploaded DESC
```

Channel|Batch Size|Times Uploaded
-------|----------|---------------
ChillNation|1|914
ChillNation|2|30
Eton Messy|1|722
Eton Messy|2|30
Eton Messy|3|4
Majestic Casual|1|1318
Majestic Casual|2|159
Majestic Casual|3|38
Majestic Casual|4|18
Majestic Casual|5|7
Majestic Casual|6|3
Majestic Casual|7|2
Majestic Casual|9|2
MikuMusicNetwork|1|474
MikuMusicNetwork|2|269
MikuMusicNetwork|3|6
Monstercat: Uncaged|1|1247
Monstercat: Uncaged|2|56
MrSuicideSheep|1|1938
MrSuicideSheep|2|31
TheSoundYouNeed|1|302
TheSoundYouNeed|2|7
TheSoundYouNeed|3|2

As we can see, on days that a channel uploads, they only upload one song. There's a small amount of variation within most channels, and the MikuMusicNetwork is an outlier that uploads twice a day roughly a quarter of the time, but it seems with only some exceptions that once-per-upload-day is the norm.

_Question:_   Should we upload more than video at once?  
_Answer:_     No.


## Upload Gaps?

```SQL

SELECT 
	cp.Channel,
	Max(cp.DaysSinceLastPublish) AS MaxDaysBetweenPosts,
	ROUND(avg(cp.DaysSinceLastPublish),2) AS AvgDaysBetweenPosts,
	(
		SELECT SUM(vs.Views) FROM VideoStats AS vs WHERE vs.Channel = cp.Channel 
	) AS TotalChannelViews,
	(
		SELECT CAST(AVG(vs.Views) AS INTEGER) FROM VideoStats AS vs WHERE vs.Channel = cp.Channel 
	) AS AvgViewsPerUpload
	
	FROM ChannelPublish AS cp
	WHERE DaysSinceLastPublish > 0 
	GROUP BY cp.Channel
	ORDER BY AvgViewsPerUpload DESC

```

Channel|Max Upload Gap|Total Channel Views
-------|--------------|-------------------
ChillNation|149|1731630505
Eton Messy|178|113665075
Majestic Casual|13|1704478658
MikuMusicNetwork & Records|59|12827204
Monstercat: Uncaged|14|2164378038
MrSuicideSheep|36|3912749521
TheSoundYouNeed|56|1965150738

We'll quickly drop into SQLite DB Browser's ploting mode to graph Upload Gap (x) vs Views (y):

![Upload Gap Graph](/misc/musicchannel/sql4.png)

We see a correlation between fewer days between uploads and higher total view counts, but again this is basically raw data that has quirks like super-videos going uncompensated for.

Of course this basically fits with our impression of YouTube, right? Regular uploads are better than sporadic uploads.


_Question:_   How long can we wait between uploads if something goes wrong?  
_Answer:_     Try to keep it below 150 days, but don't sweat it.


# Summary

So in summary we're not going to seed our channel, and we'll aim to upload about 3 or 4 times a week to start off with. 

Now that we have a sense of what we need to be committing to regarding our upload pattern, we can move on to the more fun aspects of channel curation, such as picking out a name and a logo.

And once that is done, we'll start picking out our initial upload set.