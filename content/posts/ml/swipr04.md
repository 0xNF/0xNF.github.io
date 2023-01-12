---
title: "Swipr - Data Collection (Part 2 of 2)"
date: 2018-12-11T13:29:43-08:00
draft: false
description: "Part 4 of the Swipr series. In which we discuss downloading 100 GB of pictures."
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
series_weight: 4
---

# Downloading from Instagram

There are a number of solutions for scraping Instagram, and it's mostly a pick-your-poison kind of affair. we picked the first well-supported google result for "Instagram scaper" and came up with [Instalooter](https://github.com/althonos/InstaLooter). It seemed to come with good documentation and sufficient automation facilities.


## Rate Limits 

We are told that prior to April 2018, downloading from Instagram was a much more lackadaisical affair. There was allegedly a generous rate limit for a given Instagram login token, upwards of 5,000 page requests per hour. This mythical time must have been the golden era for Instagram scraping.

Instagram has since dramatically reduced the limit to roughly 20 API calls per hour, where each call corresponds to about 50 images returned per request.

This severely increases the time it takes to download.

## Paging Limits 

Additionally due to the way Instagram does paging, no one involved with Instalooter knows how to jump to a specific page for any given user. The tl;dr here is that it is impossible to download any given user's complete post history provided they have more than 20 pages (1,000 pictures) of posts.

This is not that big a deal, because 1,000 pictures of one user is really more than good enough. we consider this and a few a few upcoming parts of the pipeline to be kind of like the UDP protocol. we don't need all of it, just enough of it to make sense.

## Instalooter Usability / ILM

Instalooter has a useful batch feature that takes in a structured file and attempts to download each profile. Unfortunately it is not, as the engineers would say, "robust to failure" and will stop execution the moment something fails even a little bit. The most common problem is encountering a timeout, but other errors can occur like an improperly formatted url string, an invalid username, or that the supplied profile might not be public.

In all of these cases, Instalooter's batch processing function will stop and not pick up.

This lead us to write a python script, a sort of framework that sits on top of and around Instalooter that manages and monitors Instalooter for errors during batch processing and can recover with as much grace as possible.

You can find more on the GitHub page for the project, called ILM, or [Instalooter Monitor](https://github.com/0xNF/ilm). 

The big idea behind ILM is that given a list of profiles to download, it will download until it errors out on a profile, wait for the expiration of a timeout if applicable, and continue downloading the list. It attempts to minimize user input, meaning you can let it run across  days unmonitored while it does its thing.

## Final Picture Count

After letting ILM run for about 10 days due to the low rate limits (curse you Instagram), we amassed 279,262 pictures totaling approximately 100 GB of data. This necessitated busting out an old 1TB hard drive we had in order to store everything.

Additionally, like we alluded to earlier, we supplemented our Instagram data with the data from the People's Republic of Tinder. This accounted for an additional 2GB of data, bringing our total to about 102GB of data.

# Transferring to Paperspace

An equally hard problem to downloading 100GB of data is uploading 100GB of data.

Between space requirements and network instability, transferring a raw 100GB with no plan for recovery would be absolute madness.

## tar.gz

To get around this, we'll divvy up our pictures into their main groupings. For each major category of image we turn each into a tarball with `tar -czf`. 

It only later occurred to us that `gzipping` each archive wasn't just a waste of time but actually harmful to some things we wanted to do later with respect to mitigating the constraints of the sizing on our remote hard drive.

JPEGs, especially of natural shapes like photographs of the real world are high entropy and are essentially as compressed as they can already be. Gzipping will at best shave off a few megabytes from the entire multi-gigabyte package, and at worse add a few given the overhead of adding a gzip header for each file. This was a bad idea, but by the time we realized that we was too far into the data transfer to back out.

Don't gzip your JPEGs, kids.


## split

Just gzipping gave us an archive file for each category-folder that still totaled  between 7GB and 60GB, which remains madness to attempt to transfer as-is.

To our rescue is the GNU tool `split`, which does what it says on the tin and cuts files into pieces specified by various command line arguments.

We settled on a sizable 350MB for each chunk, using the following command:

```
split -b 350MB -d ./inputfile
```

This gives us a variable number of 350MB chunks of data, giving us something much easier to upload. In the event of a network failure during transfer, we will only ever lose the work associated with a single chunk, allowing for graceful and economical recoveries.

## rsync

Continuing the thought process of mad ideas, it would be mad to attempt to use a simple protocol like `scp` to transfer the sheer amount of files. In comes the stalwart `rsync`, with such options like automatic retry, read-from-list capability, remove-completed-from-list functionality, and the ability to show progress bars.

For such a massive procedure like this, rsync is our saving grace.

Our go-to rsync command looked like this:

```
 rsync --files-from=./file_list.txt --remove-source-files --progress -avz . serverAddress:~/data/swipr/
 ```

  It took approximately 18 hours to upload all 102 GB of data.


## cat  

After the transfer of all this data was completed, we were able to finally use `cat` the way it was intended, concatenating files together at the bit level. Using `cat`, we re-created the tarballs that we split from before the transfer, and then untarballed everything to get back the 300,000 files.

# Moving On

In the next section, we'll discuss doing data cleanup with DFace.


[Next Section - Data Cleanup](/posts/ml/swipr05)