---
title: "Mfsong"
date: 2018-10-01T07:39:47-07:00
draft: true
description: "Post Summary"
categories:
- defaultcategory
tags:
- defaulttag
---


# Data Collection

Using the Spotify API, we collect as many songs as possible, ideally from as diverse genres as possible. 

In our case, we collected my Library, which consists of about 2,000 songs, mostly of various EDM and American pop flavors. We also collected the nearly 6,000 song collection of my father, which is almost entirely country, bluegrass, and soft-rock.

Hopefully this spread of genres will be broad enough that any given model will not overfit into one particular genre.

# Data Tagging
Using Classy for Spotify, we classify as many songs as possible into a number of distinct categories:

1. Male
1. Female
1. Instrumental
1. Ambiguous

The categorizations are relatively complicated because some are mutually exclusive while others are not.  

For example, a song can be both Male and Female, indicating that it is a duet, or otherwise has multiple singers. Meanwhile, a song cannot be both Male and Instrumental for obvious reasons.

Ambiguous indicates that the song has neither a strong male or female vocal tint.



# Training and Validation Sets
Once we've classified a sufficent number songs this way, we use the export feature to assemble a CSV of songs and their associated tags. The CSV is in the format of:

```csv
Spotify Id, quality_a, quality_b, quality_c, etc
```

For example, 
```csv
Spotify Id,Androgynous,Instrumental,Female,Male
4L5XnD2PMJrc9A4Mcp1asi,,,,,Male
1V9KNH4YAyJ1JchUELTCUk,,Instrumental,,
0p0XWfIcOKZRhTIOrNF0kA,,,Female,Male
```

A blank space indicates that the quality was not found on the song.

For the validation set, we'll randomly take 20% of the ids and place them into a `/validation` folder. Because our data is discrete, i.e., no song has any relationship to any other song, we don't need to take any further precautions in constructing our set.

    why 20%? Because Jeremy says it's good. It is empirical, not scientific.


As optional step which we may revist depending on performance needs, a possible validation set improvement would be to graph the number of songs and their lengths, and make sure that our validation set contains a similar ratio of `short songs : average songs : long songs`. This would help the model not overfit to songs of a certain length.

# Input Data

With the data collected and tagged, we now consider what we'll actually hand into our model.

The Audio Analysis endpoint returns a massive JSON object for each song containing nearly every important piece of information about a song except for the raw audio itself. After reading [a]() [few]() [papers]() on the subject of gender identification in songs, it seems that the most important single determining factor is timbre, possibly followed by pitch.

Thankfully this endpoint, among other things, returns two arrays, one of pitches, and one of timbres. The number of entries in each array varies depending on the length of the song, but each array entry itself contains a 12-dimensional array of values.  The dimensions of each array are therefore `x * 12` where x is the number of 'beats' in the track. 

After trimming down the excess in each analysis object returned, the input data for a given track will amount to a `x * 12` array looking like this:

```csv
 [0.245, 0.192, 0.588, 0.134, 0.09, 0.1, 0.113, 0.223, 0.218, 1.0, 0.157, 0.086],
 [0.694, 0.05, 0.04, 0.033, 0.048, 0.088, 0.037, 0.093, 0.079, 1.0, 0.054, 0.075],
 [0.558, 0.327, 1.0, 0.094, 0.052, 0.072, 0.045, 0.073, 0.076, 0.419, 0.14, 0.071]
 ...
```

Each track has its own file of the form `$spotify_id.txt`, such as `4L5XnD2PMJrc9A4Mcp1asi.txt`, filled with the above array data.

n.b. for this first experiment we will just hand in the Timbres array.

# Setting up the Notebook

# Data Augmentation

Data augmentation is a great way to reduce the chances of overfitting. In the case of images, rotating at various angles, skewing a bit left to right, and zooming in a little are all ways to augment the data. The contents of the image, though a bit warped, remain the same. A cat at an angle remains a cat. 

Methods of augmenting images are known and understood. Augmenting other types of data is still an emerging subfield of ML.

## Augmentation 1 - Reverse Order
In the case of our data, which is a time-linear sequence of pitches, we can reverse the order of the array entries. Instead of reading our `x * 12` matrix from top to bottom, we can read it from bottom to top. Although we can reverse the order of the matrix rows, it is important that we _do not_ reverse the order of the matrix columns. The order of those 12 columns, which amounts to some kind of unknown (to us. Echo nest didn't leave Spotify with great documentation on their properties.) embeddings array is important.

## Augmentation 2 - Value Adjustment
Because the Timbres are on a scale of -infinity to +infinity, and tend to hover between -100 and +100, we can also slightly modify the timbres. Each entry is continuous, meaning the difference between 42 and 43 means only a slight nudge towards whatever the cell represents, and doesn't necessarily represent a rollover into a new category.

Given this, we could, within small bounds, add random positive or negative values to some cells. A song whose values have been augmented this way should by and large continue to represent the same song. 

Given that we do not know the exact nature of these embeddings however, this might be a risky strategy, since modiying one of these variables one way while modifying a different one another way may not make logical sense. There's now way to know though - there's no documentaion on them.

# Testing Accuracy vs 