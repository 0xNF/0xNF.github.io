---
title: "Swipr - Scope"
date: 2018-12-11T11:04:42-08:00
draft: false
description: "Part 2 of a series exploring machine learning + tinder. In this post we talk requirements project scope."
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
series_weight: 2
---

From the outset we wanted to have, at the most basic level, the ability to use a CPU-only machine to judge whether or not we should swipe right on a given photograph.

Additionally, it does us no good to just have a model that does this, it needs to be useful in some form beyond merely existing, meaning it has to exist as some kind of accessible application.

Finally, it would be preferable to have this system be accessible from anywhere. Binding it to our local machine is useful insofar as this being an academic exercise is concerned, but it'd be a lot nicer to turn it on and off as we see fit, when we see fit.

From this, we can piece together our main requirements:

1. We need to train a model on our preferences
1. We need a remote server capable of running that model. 
    * Because we are focused on fast.ai, we will concentrate on PyTorch here.
    * Because we are not made of money, we need these models to run on the CPU
1. We need a way to send and receive data to and from the pytorch model
1. We need an interface to turn this program on and off
1. To know what state our program is in, we need a datastore
1. We need to send and receive data from Tinder

Additionally, some nice-to-haves will be the following abilities:  

1. Handle multiple users and not just us developers
1. Fine-tune our tinder selection process before asking the model for a judgement
1. See the results of each match
1. Tell the server whether a given AI like/pass was appropriate (i.e., retrain the model)

# Implementation

To implement this, we'll be using the following technologies:

## Main Server
1. The server will run ASP.NET Core 2.1
1. The datastore will be SQLite
1. We will make a python script to communicate with our Model
1. We will install the `fast.ai cpu-only` Conda environment from their GitHub
1. We will use a fork of [Sharp-Tinder](https://github.com/0xNF/sharp-tinder) usable on .NET Core to interact with Tinder

## ML Server
Our model training server will use the standard model training server from our other ML experiments: Fast.ai's prebuilt paperspace GPU instance.

# Moving On

In the next post, we'll talk about how we approached the data collection aspect of training the model. Turns out, like most things, it's more complicated than one might think at the start.


[Next Section - Data Collection (1 / 2)](/posts/ml/swipr03)