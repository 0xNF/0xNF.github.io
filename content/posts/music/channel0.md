---
title: "Music Channel Part 1 - Data"
date: 2019-03-25T18:17:32-07:00
draft: false
description: "Wherein I describe my initial steps on creating a music channel like Trap Nation and TheSoundYouNeed"
categories:
- music channel
tags:
- YouTube
- Branding
- Marketing
- Music
series:
- Music Channel
series_weight: 1
---

This is the first in a series of posts about analyzing YouTube music channels.

* Part 1 - Music Channel Introduction and Data Collection
* [Part 2 - Analysis of Channel Activity](/posts/music/channel1)  
* [Part 3 - Branding](/posts/music/channel2)  


# Background
I often listen to new music on YouTube because their discovery systems unearth some occasionally great finds. After a while of listening there however you begin to realize that there are only a handful of channels that get recommended to you, and they all seem to just upload songs and let the views roll in, not unlike a radio DJ. Sometimes these channels become so successful that artists will begin to sign with the channels for exclusive releases, in effect turning the channels into a de-facto label. Some of these channels have even turned into de-jure labels, such as Proximity.

I thought it would be a fun experiment to see if I could create a YouTube channel of my own doing the same thing these channels were doing. It seemed easy enough, just upload a few songs here and there. But before I began, I wanted to get a sense of what, exactly, these channels were doing, what their upload schedule was actually like, what were they like when they started out, how did they evolve, etc.

This series of posts describes just such an analysis of a selection of music channels on YouTube.

# Data Collection

First, I wanted to get a sense of how these channels upload songs, which would help inform me on how run my own channel. The questions that I wanted answers to before starting were: 

1. How many videos should we seed our channel with?
1. How often should we upload?
1. Should we upload more than video at once?
1. How long can we wait between uploads if something goes wrong?


## YT Tracker

To answer these questions, I had to get some data first. I wasn't about to scrape YouTube myself, so after some googling for some tools that could help me gather some channel stats, I came across the excellent [YT Tracker](https://chrome.google.com/webstore/detail/yt-tracker/nhebilhcolhlinfcpgbpbecjajeiiajc), an addon for Google Sheets that pulls all kinds of channel information for you.

You can find its full functionality detailed [here](https://www.syncwithtech.org/track-youtube-videos-channels/). 

### Channel List

First I seeded YT Tracker with a list of 7 of the channels I either use or happen to come across often:

1. [TheSoundYouNeed](https://www.youtube.com/channel/UCudKvbd6gvbm5UCYRk5tZKA)
1. [MajesticCasual](https://www.youtube.com/channel/UCXIyz409s7bNWVcM-vjfdVA)
1. [MrSuicideSheep](https://www.youtube.com/channel/UC5nc_ZtjKW1htCVZVRxlQAQ)
1. [ChillNation](https://www.youtube.com/channel/UCM9KEEuzacwVlkt9JfJad7g)
1. [Eton Messy](https://www.youtube.com/channel/UCa1Q2ic8wDlT1WH7LSO_4Sg)
1. [MonsterCat](https://www.youtube.com/channel/UCJ6td3C9QlPO9O_J5dF4ZzA)
1. [MikuMusicNetwork](https://www.youtube.com/channel/UCjw0SX_9OGFI7buLG4-M0Fw)

As the developer of YT Tracker writes on his page, it can sometimes be tricky to extract the channel name from some pages. If you're on a page for a given video, the main uploader link in the video description will contain the channel name - this goes for accounts that are flagged as "user", as well for for "channel" accounts. This is important because YT Tracker only operates on channel ids.

### Adding to a YT Tracker Sheet

We add the channel ids to the first column:

![Channel Ids](/misc/musicchannel/YtTracker_ChannelIds.png)

YT Tracker takes care of filling in the rest of the data automatically. It's really quite magical.

### Grabbing Video Data

Next we want to grab video data from each channel. With the channel id cell of the channel we want to grab highlighted, we use the Add-Ons drop down menu to select YT Tracker and select `Fetch Channel Videos`, which will create a new sheet for us, populated with video upload data:

![Video Data](/misc/musicchannel/YtTracker_VideoData.png)

You have to do this highlight-menu-fetch process for each item in our list.

### Exporting

Next we'll take each sheet and Save-As `.csv` to some folder on our computer.

This is the first step to getting the data into a SQL-queryable format.

# Data Cleanup Part 1

Every project that involves data will require some form of cleanup process, this is no different.

## CSV Cleanup

### Adding Channel Id

Because we're going to end up putting all this data into SQLite, we need to do some work on the CSV files first. To make our data amenable, one of the things we'll do is add the channel name to each row of each CSV.

For example, we're going to turn:
```csv
Video Id,Title,Thumbnail,Publish On,Duration,# of Views,# of Likes,# of Dislikes,# of Comments
x8Y2iCSGSXI,Nora Van Elken - Best I Ever Had,,2018-10-11,3 : 02,"58,593","3,082",78,141
```

into 
```csv
Video Id,Title,Thumbnail,Publish On,Duration,# of Views,# of Likes,# of Dislikes,# of Comments
ChillNation,x8Y2iCSGSXI,Nora Van Elken - Best I Ever Had,,2018-10-11,3:02,"58,593","3,082",78,141
```

I did this with the following two regexs:
```
find: ^([0-9A-Za-z_-]*)?,
replace: ChillNation,$1,
```
where ChillNation is whatever channel you're actually working with.

Be sure to add the Column name of ChannelName before Video Id.

### Patching up Time
The timestamps are bit messy - consistent, but full of weird spaces that make parsing a bit of a pain. 

We want to turn
```
3 : 02
1 : 26 : 27
```
into 
```
3:02
1:26:27
```

We fix this with the following regex find/replaces:

```
find: ([0-9]{0,2})\s+:\s+([0-9]{0,2})
replace: $1:$2
```

Which we run twice to catch any hour+ long tracks with hh:mm:ss formatting.

### Changing Column Names

The exported named columns would make for some difficult SQL querying. To make our life easier, we'll change the names:

```
Channel,VID,Title,Thumbnail,Published,Duration,Views,Likes,Dislikes,Comments
```

## SQL Part 1

I like to do as much data processing and analysis in python and sqlite as possible. We'll do that here too, by importing all our exported files into a new Sqlite database.

I prefer to use [DB Browser for SQLite](http://sqlitebrowser.org/), which is a Windows GUI tool.

Using the `Import -> Table From CSV File` menu option, we add in all our exported csv files, saying okay to the `append to table?` warning. You can call the new table whatever you like, I've chosen `VideoStats`. 

![Import From CSV](/misc/musicchannel/newsqlite.png)

### Table

After this important, we end up with a table that looks something like this:

![Table Data](/misc/musicchannel/sql0.png)

While a good first step, I realized here that the data wasn't actually in the most useful form. Views, Likes, Dislikes, and Comments all have commas in their data, which makes them strings, not integers.

Additionally, Duration has colons in it, which makes it a string too. 

The exception is the Published field, which SQLite handles correctly as a date. 

### Adding a Duration_Ms Column

Although I want to fix the duration field, I think it might be useful to keep its original form around because its very human-readable. So we'll add another column to our table, `Duration_Ms`, which will represent the duration of the song in milliseconds:

![Duration MS](/misc/musicchannel/sql1.png)


## Python Cleanup Part 1

We'll use Python here to remedy these errors. This is python at its best - small scripts for data processing.


```python
import os,sys,sqlite3,pathlib
from dateutil.parser import parse as PDT
from datetime import datetime, timedelta

sqlfile = "./ytrackerstats/ytstats.db"

def fixDuration(dur):
    try:
        s = dur.split(':')
        s.reverse()
        TotalSeconds = 0
        for idx,num in enumerate(s):
            if num == '':
                num = 0
            multiplier = 60 ** idx
            number = int(num)
            seconds = number * multiplier
            TotalSeconds += seconds
        return TotalSeconds * 1000
    except ValueError:
        print(dur)
        raise Exception("???")
    
def fixCommaNumber(com):
    try:
        if type(com) is str:
            if com == "undefined":
                repl = "0"
            else:
                repl = com.replace(',', '')
            i = int(repl)
        elif type(com) is int or type(com) is float:
            i = com
        return i
    except ValueError as e:
        print(com)
        print(e)
        raise Exception("??")

def FetchAllFromVideoStats():
    connection = sqlite3.connect(sqlfile)
    c = connection.cursor()
    c.execute("SELECT VID,Duration,Views,Likes,Dislikes,Comments FROM VideoStats")
    newRs = []
    for row in c:
        vid = row[0]
        dur = row[1]
        view = row[2]
        like = row[3]
        disl = row[4]
        comm = row[5]
        fixed = (fixDuration(dur), fixCommaNumber(view), fixCommaNumber(like), fixCommaNumber(disl), fixCommaNumber(comm), vid)
        newRs.append(fixed)

    return newRs

def FixVids(tups):
    connection = sqlite3.connect(sqlfile)
    c = connection.cursor()
    q = "UPDATE VideoStats SET Duration_Ms=?, Views=?, Likes=?, Dislikes=?, Comments=? WHERE VID=?"
    c.executemany(q, tups)
    connection.commit()
    return

def test():
    duration = "03:01:46"
    assert fixDuration(duration) == 10906000
    comma1 = "5,600"
    assert fixCommaNumber(comma1) == 5600
    comma2 = "56"
    assert fixCommaNumber(comma2) == 56
    comma3 = 100
    assert fixCommaNumber(comma3) == 100


def main():
   test()
   vids = FetchAllFromVideoStats()
   FixVids(vids)

if __name__ == "__main__":
    main()
```

The summary of this script is that we remove commas from any numbers, and convert durations to their ms representation, which we update into the `Duration_Ms` field.

## SQL Part 2

Now that most of the data was in SQL, and in a good format, I started running some queries. For instance:

```SQL
SELECT Channel, Published, COUNT(Published) AS Uploaded FROM VideoStats GROUP BY Channel,Published ORDER BY Channel, Count(Published) DESC
```

Which returns the number of tracks uploaded per channel per day. This is a useful query - Do people typically upload more than one track per day? Who knows? Well now, you do! With the power of Group By.

### Another Table

The problem is that some of these queries started to get a bit cumbersome and unwieldly. Running multiple versions got tiring pretty quick. The soluton was another table. I called this one `ChannelPublish`.

I also wanted another piece of data, which would have otherwise been really difficult to extract using just plain SQL: Days since last publish.

It seemed important to know how many days had passed between consecutive uploads. This is information that can be derived from the data as it exists, but it'd be a lot nicer if we had a dedicated field for it. This process is known as Feature Engineering, and is common when working with tabular data.

![Channel Publish Table](/misc/musicchannel/sql2.png)

### Select Insert

To get data into our new table, we run the following query:

```SQL
INSERT INTO ChannelPublish2 (Channel, Published, Count) 
    SELECT Channel, Published, COUNT(Published) AS Uploaded
    FROM VideoStats 
    GROUP BY Channel,Published 
    ORDER BY Channel, Count(Published) DESC
```

Which gets us a table composed entirely of the previous group-by query results.


## Python Cleanup Part 2

Moving back to python, we'll update our script to calculate the number of days since the last upload:

```python

#! /usr/bin/python

import os,sys,sqlite3,pathlib
from dateutil.parser import parse as PDT
from datetime import datetime, timedelta

sqlfile = "./ytrackerstats/ytstats.db"


[... Edited for brevity ...]


def DateDiffRaw(prev, date):
    if prev == 0:
        prev = date
    diff = date - prev
    return diff.days

def FetchAddDaysSinceLastPublish():
    connection = sqlite3.connect(sqlfile)
    c = connection.cursor()
    q = "SELECT Id, Channel, Published FROM ChannelPublish ORDER BY Channel, Published ASC"
    prev = 0
    currentChannel = ""
    updates = []
    for row in c.execute(q):
        id = row[0]
        channel = row[1]
        if currentChannel != channel:
            currentChannel = channel
            # RESET!
            prev = 0
        date_raw = row[2]
        parsed = PDT(date_raw)
        diff = DateDiffRaw(prev, parsed)
        prev = parsed
        updates.append((diff, id))
    return updates

def UpdateDaysSinceLastPublish(tups):
    connection = sqlite3.connect(sqlfile)
    c = connection.cursor()
    q = "UPDATE ChannelPublish SET DaysSinceLastPublish=? WHERE Id=?"  
    c.executemany(q, tups)
    connection.commit()



def test():
    duration = "03:01:46"
    assert fixDuration(duration) == 10906000
    comma1 = "5,600"
    assert fixCommaNumber(comma1) == 5600
    comma2 = "56"
    assert fixCommaNumber(comma2) == 56
    comma3 = 100
    assert fixCommaNumber(comma3) == 100

    dateEarlier = "2018-10-09"
    dateLater = "2018-10-10"
    d1p = PDT(dateEarlier)
    d2p = PDT(dateLater)
    assert DateDiffRaw(d1p, d2p) == 1

def main():
   # test()
   # vids = FetchAllFromVideoStats()
   # FixVids(vids)
   dates = FetchAddDaysSinceLastPublish()
   UpdateDaysSinceLastPublish(dates)

if __name__ == "__main__":
    main()

```

## SQL Again

Now we have a table of very useful information:

![Useful Information](/misc/musicchannel/sql3.png)

Which lets us easily query for stuff like this:

```SQL
SELECT 
	Max(cp.DaysSinceLastPublish) AS MaxDaysBetweenPosts,
	CAST(avg(cp.DaysSinceLastPublish) AS FLOAT) AS AvgDaysBetweenPosts,
	cp.Channel FROM ChannelPublish AS cp
	WHERE DaysSinceLastPublish > 0 
	--AND Published > date("2018-01-01") 
	GROUP BY cp.Channel
```


# Summary

This first post covers the initial setup for being able to graph, chart and otherwise ask statistical questions about some YouTube channels that we're going to use as a basis for our own music channel.

We gathered our initial dataset, cleaned that data, and put it all into a SQLite file for use later.

Next time, we'll cover the channel setup, and answer the questions like:

1. How many videos should we seed our channel with?
1. How often should we upload?
1. Should we upload more than video at once?
1. How long can we wait between uploads if something goes wrong?

Once that information is covered, we'll create a list of songs to upload and check to see if our favorite channels have covered them already. The less channels a song appears on of course, the better for our channel. We're not just trying to be a mirror of the others, after all.

We'll also see what we can do about creating a Channel Icon, selecting some backgrounds, adding that must-have waveform pulse animation, and some initial channel curation. 

