---
title: "Machine Levine Mk. I"
date: 2018-11-02T20:08:56-07:00
draft: false
description: "Part 2 of the Machine Levine series, in which we discuss how the original Matt Bot came to be."
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
series_weight: 2
---


This is a description of how the first of the Matt Bots came into existence. Few things in this document should be interpreted as the best or even a correct way to do anything - this bot is an academic exercise. That being said, here is how he was made.


# Data Collection

Like the [general post](/posts/ml/machinelevine) describes, the data used to train the Matt model was derived from Matt Levine's at-the-time 571-count archive of [Money Stuff](https://www.bloomberg.com/view/topics/money-stuff) articles.

The data was downloaded using a simple web scraper to collect the URLs of each article, which were then downloaded in a way which definitely tripped the Bloomberg anti-scraping mechanisms. 

## Data Cleanup

The cleanup script can be found at [html2taggedtext.py]().

Once all the articles had been downloaded, they were passed into a python script using [BeautifulSoup](https://www.crummy.com/software/BeautifulSoup/) to extract the meaningful pieces of information.

### Extraneous HTML
Before further processing, some of the HTML was transformed in various ways to facilitate data extraction. For example:


* Some of the downloaded html tags weren't meaningful, so I struck them from the html tree. Any `<aside>` tags, or `<div>` with any classes matching `hardwall`, `softwall`, `page-ad`, `trashling`, `disclaimer`, etc is removed without consideration.

* Any `<br>` tags are replaced with newlines `\n`. 

* Any links are replaced with their inline text.
```html
You can find the link <a href="www.someurl.com">here</a>.
```
becomes
```txt
You can find the link here.
```

### Tagging

We surround each sub-section of a given Money Stuff article with enclosing `<` and `>` tags. This hopefully allows the neural network to learn that what a section is.

### Mistakes


Due to an oversight, I forgot to include three pieces of information that would be really useful:

The title of the article, the subtitle, and the date the article was published.  

This means that any model created using the data that has been collected will be incapable of generating article titles and subtitles. As a workaround, I have a post-processing script that assembles article these things from generated section titles, but it is a less than perfect state of affairs. 


### Saving

Once the data from a given article has been cleaned to an acceptable extent, it is saved into a different folder as a bunch of raw text. A single cleaned article will look like:

`active-funds-and-hidden-commissions.html.txt`
and its contents will look like:
```txt
<Should active management be illegal?> Look, you know the things:The average active manager will underperform the average passive manager, because of fees.
[...]
```

# ML Setup

The details of the setup can be found under [MattAttempt.ipynb]().

## Validation and Test Sets

Although we failed to encode it in our data, the articles are actually time-dependent. Topics in one article may be referenced in a future article, and the language Matt uses may match that. In fact he does this very often. "We talked yesterday about ..." is a common refrain in Money Stuff. 

Because of this, we'll simply say that our validation set is the last `x%` of articles in our dataset.

The question to grapple with is what is our `x`? Jeremy of Fast.ai recommends 20% on any given dataset, which is an empirical number he finds to be generally useful. Unfortunately because I'm working with such a small dataset, I decided to halve that to 10%.

I also dedicated an additional 10% of articles to the Test set.

# Loading Data

## Concatenation

TorchText, which sits below FastAIs NLP APIs prefers to load all NLP data as a single big string, where each observation (in our case, a single article), is concatenated to the end of the previous observation.

Unfortunately the tagging phase for Mk. I didn't include any kind of article start or end information, so all the articles run together. This means that Mk. I will not be able to gain any sense of how long an article is, how many sections an article has, or how articles are typically ended. We leave this to Mk. II and beyond.

## Tokenization

For this first Matt Bot, we elect not to tokenize beyond simply creating a list of each output character. Rather than using a word-level output, Mk. 1 uses a character-level output, meaning that he will construct words character by character. With respect to tokenization, this just means that we only need a list of the ascii values. Enough to encode English words and punctuation.

## Frequency Counting

To avoid having the bot attempt to learn unpredictable and rare characters, we eliminate any characters that were seen below a certain frequency. For our experiments, we say that any character that occurs less than 3 times gets replaced by a character representing an unknown value. This way, the model can learn an average encoding for all words and apply it, rather than attempting to correctly weight rarely seen and likely misencoded data.


## Strings to Numbers
Of course a computer can't weight a character, so we create a mapping that moves the character to an integer representation, and another mapping that goes backwards.

This way we can hand the model a list of characters as input, and receive a list of characters as output.


# Model

## Architecture
Our actual PyTorch model that we used to train Mk. 1 looks like the following:

```python
class CharSeqStatefulLSTM(nn.Module):
    def __init__(self, vocab_size, emb_size, batch_size, num_layers):
        super().__init__()
        self.vocab_size,self.num_layers = vocab_size,num_layers
        self.e = nn.Embedding(vocab_size, emb_size)
        self.rnn = nn.LSTM(emb_size, num_hidden, num_layers, dropout=0.5)
        self.l_out = nn.Linear(num_hidden, vocab_size)
        self.init_hidden(batch_size)
        
    def forward(self, cs):
        batch_size = cs[0].size(0)
        if self.h[0].size(1) != batch_size: self.init_hidden(batch_size)
        outp,h = self.rnn(self.e(cs), self.h)
        self.h = repackage_var(h)
        return F.log_softmax(self.l_out(outp), dim=-1).view(-1, self.vocab_size)
    
    def init_hidden(self, batch_size):
        self.h = (V(torch.zeros(self.num_layers, batch_size, num_hidden)),
                  V(torch.zeros(self.num_layers, batch_size, num_hidden)))
```

What we've chosen to encode here is that we're going to have an embeddings matrix with `vocab_size` rows and `emb_size` columns, where vocab_size is how many unique tokens we found in our input text, and `emb_size` is a number chosen by us at our discretion.

This will operate like Word2Vec does, but rather that being the first and last step, will be simply the first block of our network.

Our second block will be a `num_hidden` size LSTM RNN, with an input size of `emb_hidden`, because it will be fed the output of the embeddings layer. We give it a dropout of 50% because dropout is an easy way to reduce overfitting and increase model performance. Why 50%? Why not. It works, basically.

Our final block is a simple linear layer going from `num_hidden` to `vocab_size`, where the output will be a `vocab_size` list of probabilities of the likeliest next character.

We take what is essentially the item with the highest probability from that list to construct our final output character. 

## Fitting

Our hyperparameters are setup as follows:

```python
batch_size=64
backprop=8
emb_size=42 
num_hidden = 512
num_layers = 2
```

We use the FastAI library to create a model data object, which is responsible for moving and loading our data and handing it to our model architecture as such:

```python
PATH = "path/to/text/files/to/load/"
TEXT = "path/to/pre-saved/tokens.npy"
md = LanguageModelData.from_text_files(PATH, TEXT, **FILES, bs=batch_size, bptt=backprop, min_freq=3)
```


We can then instantiate a model like so:

```python
m = CharSeqStatefulLSTM(num_tokens, emb_size, batch_size, num_layers).cuda()
lo = LayerOptimizer(optim.Adam, m, 1e-2, 1e-5)
```

Where `lo` is an object that manages our learning rate. We want it to use the `Adam` gradient descent optimizer, and use to anneal it's learning rate from a relatively high `0.01` to `0.0001`

Finally we can call `fit` with the following parameters:

```python
epochs=35
fit(m, md, epochs, lo.opt, F.nll_loss)
```

The key in all of this is picking the right hyperparameters, especially the learning rate. This is a game that falls somewhere between blind dart-throwing and intuition, so you just have to keep at it and try a bunch of different things, although keeping the learning rate really close to zero is usually a good idea.

After training for a few hours, we end up with training/validation losses of []

## Pulling data

We use the following methods to pull data out from our newly generated model:

```python
def get_next(inp):
    idxs = TEXT.numericalize(inp).cpu() # Comment to enable GPU computation. Be sure to also undo gpu stuff in Forward
    t = idxs.transpose(0,1)
    v = V(t)
    p = m(v)
    p = m(V(idxs.transpose(0,1)))
    r = torch.multinomial(p[-1].exp(), 1)
    return TEXT.vocab.itos[to_np(r)[0]]

def get_next_n(inp, n):
    res = inp
    for i in range(n):
        c = get_next(inp)
        res += c
        inp = inp[1:]+c
    return res
```

Let's see what we get with it.

```python
nt = get_next_n('goldman', 200)
```
```text
'goldman\'s craby floor 10\\)-2,000 insurann, and divorced by the deduction.>and the service point, the model. "economi soussip ipo.>you "i already momimiolist, because including, but i as new y-based coins. pa'
```

It's a bit gibberish, but it does kind of look a little like the finance-y writings of Matt.

As far as first foray into machine learning goes, I'm quite pleased with this as an introductory result!


## The Finished Product

You can see other articles generated by this Matt Bot, as well as generate your own articles using it, over here at [machinelevine.winetech.com](http://machinelevine.winetech.com/bots/ml1)