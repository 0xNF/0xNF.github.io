---
title: "Machine Levine Mk III"
date: 2018-10-18T09:45:48-07:00
draft: true
description: "Post Summary"
categories:
- Machine Learning
- NLP
- fast.ai
series:
- Machine Levine
series_weight: 4
tags:
- rnn
- parsing
- web scraping
- data cleanup
---

- [Data Collection](#data-collection)
    - [Data Cleanup](#data-cleanup)
        - [Tagging](#tagging)
        - [Mistakes](#mistakes)
        - [Saving](#saving)
- [ML Setup](#ml-setup)
    - [WikiText 103](#wikitext-103)
    - [Validation and Test Sets](#validation-and-test-sets)
- [Loading Data](#loading-data)
    - [Concatenation](#concatenation)
    - [Tokenizing](#tokenizing)


# Data Collection

Machine Levine Mk III aims to both remedy some of the data collection errors while also improving the title generating situation.

Data collection this time around involves a slightly different method:

We will crawl every page of Matt Levine articles available from Bloomberg via the API:

https://www.bloomberg.com/lineup/api/lazy_load_author_stories?slug=ARbTQlRLRjE/matthew-s-levine&authorType=opinion&page=0

The structure of the returned object is:
```TypeScript
interface ArticleList {
    html: string,
    done: boolean
}
```
Where we continue adding one to the page count until `done === True`.

We have to parse the supplied `html` field for all unique `href=`s.

This gives us what are essentially four different types of articles:

* Money Stuff articles
* News Articles
* Snippets
* Levine on Wall Street



#
All Tokens, but only using Embedding dataloader
	=> Final training = [trn/val/acc] = [2.95 / 4.39 / 0.28]

All tokens, after training on embeddings and using MoneyStuff
	=> 

...

Other Tokens only, training on Other
    =>     3.052371   3.96384    0.321008
Money Stuff Tokens 