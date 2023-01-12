---
title: "Machine Levine"
date: 2018-11-01T19:08:56-07:00
draft: false
description: "Part 1 of the Machine Levine series, where we explore some Machine/Deep Learning. To that end, I have documented my pet problem of getting a machine to write articles like Matt Levine. What more noble goal is there than to increase the quantity of Money Stuff available to us?"
categories:
- Machine Learning
- NLP
- fast.ai
tags:
- rnn
- parsing
- web scraping
- data cleanup
series:
- Machine Levine
series_weight: 1
---

# The Goal

In order to better understand machine learning, I decided to see if I could get a neural network to write articles like Matt Levine. The original goal was to sort Spotify songs by male or female vocals, but I had been learning all of this stuff by following along with the [fast.ai](https://course.fast.ai/) courses, and that specific use case was a bit afield of the coursework and forum discussions happening in the MOOC. Fast.ai, great as is it, has a focus on image data and NLP applications. As a compromise, I decided to learn by creating a bot that writes just like [Matt Levine](https://www.bloomberg.com/opinion/authors/ARbTQlRLRjE/matthew-s-levine) of Bloomberg.

This new project would be much more within the course scope, and thus have a lot more material available if I ran into problems.


# The Finished Product

As I started playing around and getting some results with this project, I decided to turn it into something a little bigger. Now it is something akin to a bot zoo. Available at [machinelevine.winetech.com](http://machinelevine.winetech.com), you can see articles written by various generations of Matt Bots, as well as generate new ones written by the bot of your choosing. 

## The Bots
If you'd like to read about each bot, along with the specifics that went into them such as different tokenizations, variations in network structure, updated data techniques, etc., you find that at these links:

* [Machine Levine Mk I](/posts/ml/mk1)
* [Machine Levine Mk II](/posts/ml/mk2)
* [Machine Levine Mk III]()

# FastAI

The ace up the sleeve of anyone trying to teach themselves modern machine learning has got to be the free lectures by Jeremy Howard of [Fast.ai](https://www.fast.ai/). These courses are a top-down, practical approach, focused on getting you up and running with the tools and becoming productive as soon as possible. Once you have a taste for the various bits and functions of ML, they dive deeper and start teaching the concepts behind neural networks. 

I am extremely grateful to Jeremy for creating these works and making them freely available.

# Matt Bot

To create a bot like Matt Levine, we train a neural network on samples of [Money Stuff](https://www.bloomberg.com/view/topics/money-stuff), which is a daily financial newsletter the real matt writes. The final model of a given set of training data that produces some basically reasonable output is considered to be a Matt Bot. 

# Data Collection

As of June 28th 2018, Matt had 571 Money Stuff articles written for Bloomberg Opinion[*](#correction-1). These articles form the basis of the Matt Bot input data.

# Data Curation

Just using the raw html would have included far too much noise, so the html had to undergo a lot of curation in order to be in a format appropriate for training.

The first thing to do is figure out where in the actual html does Bloomberg store the article being presented. After identifying the main div, a python script, using the excellent if slightly cumbersome BeautifulSoup to extract the article contents. Additionally, we replace every `<a>`, `<strong>`, and `<p>` with the interior text.

Once this is done, we extract the text-only nodes and save them to a text file. Our input has gone from looking like 
```html
<div class="body-copy fence-body">\n            <p><strong>Radical truth.</strong></p><div class="hardwall" data-position="1"></div><div class="softwall" data-position="1"></div><p>"The hero comes back from this mysterious adventure with the power to bestow boons on his [...]
```

to

```txt
Radical truth. "The hero comes back from this mysterious adventure with the power to bestow boons on his [...]
```

Each article by Matt gets its own text file.

# Neural Network Structure

I used the default FastAI learner object, which dynamically selects the proper NN structure for the given input data. In this case, it's an LTSM-flavored RNN with an input size of `21,480`, an embedding size of `456`, some dropouts, and an output of `21,480`. This number of inputs and outputs is the cardinality of tokens, that is, all "word-like" things that exist in the input corpus.


# Productionizing

It does us no good to have a model available only on an expensive GPU machine, so I spent a bit of time getting everything ready to make sure the model runs on a low-budget CPU machine.

The easiest way to package a PyTorch model is to save all the weights and encodings in CPU format with the `.cpu()` call. PyTorch makes this super simple.

The more complicated aspects are making sure that some of the custom functions for sending data to and from the model are also in CPU format. This involves some fine tuning (read: guessing blindly) about what kinds of PyTorch data structures (Vectors? Tensors?) are GPU bound or not. Errors about incorrect arities of inputs can drive you berserk, but the answers are out there.

The biggest hurdle to getting all of the necessary parts onto a CPU machine is installing PyTorch, FastAI, and their dependencies on an ultra low-budget $5/month Digital Ocean server.

I spent many hours over multiple days fighting with the PyTorch installer, and specifically the Spacey tokenizer, to install in a low RAM environment.

The tl;dr is that you should increase the swapfile (https://www.digitalocean.com/community/tutorials/how-to-add-swap-space-on-ubuntu-16-04). An extra 1GB of swap space turns the problematic install into smooth sailing.

# Iceberg

As a fun experiment, I decided to ~~steal~~ borrow the html/css from Bloomberg Opinion, so that any generated ~~Money Stuff~~ Currency Things will look just like it came from Bloomberg.

I decided to call this respectful imitation Iceberg.

# Follow Ups

Each iteration of the Matt Bots has various tweaks and changes, not all of which are covered here. For example, MK I uses a simple character level model, Mk II uses a further curated dataset with added start/end tags for subsection titles, and Mk III uses a more refined dataset with titles and dates. Each bot is linked above, where you can read about their individual construction in more detail.


### Footnotes
###### Correction 1
<sub>* Due to a quirk of how Bloomberg's website displays article lists, the 571 number was an accidentally too-early cut-off point that didn't accurately reflect how much Matt had actually written. This was corrected for Matt Bots of Mk II and greater.</sub>