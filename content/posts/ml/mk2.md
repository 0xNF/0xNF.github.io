---
title: "Machine Levine Mk. II"
date: 2018-11-03T07:22:07-07:00
draft: false
description: "Part 3 of the Machine Levine series, in which we explore the inner workings of Machine Levine Mk. II, the second of the Matt Bots, and primary writer of Currency Things."
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
series_weight: 3
---


Machine Levine Mk. II is the second of the Matt Bots, and the first of which can produce any kind of coherent output. A brief description of his capabilities are described at his homepage over at http://machinelevine.winetech.com/bots/ml2, but we'll deal with some deeper ideas behind his creation and operation here.

# Data Collection

Mk. II uses the same initial corpus that Mk. I uses. For more details on data collection, refer to [Mk. I's Data Collection](/posts/mk2#data-collection) section.

## Data Cleanup

Although we use the same corpus as Mk. I and most of the same cleanup methods, Mk. II uses some different final pre-processing steps.

### Tagging

It is helpful to the neural network for text to be tagged with various tokens. This helps it learn what the beginning of a sentence looks like, what a section title is, etc. During the parsing of the html documents, I transformed relevant text to include start and end tokens for various features I wanted the model to learn.

A Money Stuff html article is divided into an arbitrary number of sections, and each section has the following structure:

1. A title
2. Some contents
3. Some blockquotes

Sections are enclosed with `XBS ...section... XBE`, where `...section...` is the contents of the section, and XBS/XBE indicate the start and end of a section. 

The title of a section is enclosed with `XCS ...title... XCE` where XCS/XCE indicate the start and end of a title.

Blockquotes, which are semantically described by the `<blockquote>` tags, are enclosed in XDS/XDE tags, which indicate the start and end of a blockquote.

The reason for tagging as opposed to leaving the html in place is that we don't want the model to learn how to generate html, we want it to generate Matt Levine sounding text. Any additional complexity can only make our model perform worse or in otherwise undesirable ways.

It is debatable whether or not an ending tag is necessary. Further revisions of the Matt Bots will explore not having ending tags except for block quotes, which are arbitrarily nested within any given section.

### Mistakes

Mk. II, like Mk. I, did not save date, title, or subtitle data for each article, and therefore, like Mk. I, has no ability to generate or use those pieces of information during training. See [Mk. I's Mistakes Section](/posts/ml/mk1#mistakes) for more details.

### Saving

Once the data from a given article has been cleaned to an acceptable extent, it is saved into a different folder as a bunch of raw text. A single cleaned article will look like:

`active-funds-and-hidden-commissions.html.txt`
and its contents will look like:
```txt
XAS XBS XCS Should active management be illegal? XCE Look, you know the things:The average active manager will underperform the average passive manager, because of fees.
[...]
```

# ML Setup

The details of the setup can be found under `Matt2 - Word Level.ipynb`.

## WikiText 103
Mk. I used a character level model to construct its input and output, meanwhile Mk. II uses a word-level output. We can take advantage of this different structure and use word weights from the [Wikitext103](https://einstein.ai/research/blog/the-wikitext-long-term-dependency-language-modeling-dataset) project. Stephen Merity of Salesforce scanned all "significant" articles of English Wikipedia and pre-calculated an embedding matrix for each of the words it came across. This is a significant dataset with many millions of times more data about each word than I could have assembled using Matt's Money Stuff corpus alone.

This means we can essentially shortcut the requirement of having a ton of data about our specific domain and springboard with pre-calibrated weights for the vocabulary in our corpus. This makes our models performance better, especially for smaller data sets like ours.

## Validation and Test Sets

The way we constructed our validation and test sets for Mk. II is identical to Mk. I. See [Mk. I's Validation and Test Set ](/posts/ml/mk1#validation-and-test-sets)section for more details. 

The tl;dr is that we set aside the last 20% of our articles for our validation and test sets.

# Loading Data

## Concatenation
TorchText, which sits below FastAIs NLP APIs prefers to load all NLP data as a single big string, where each observation (in our case, a single article), is concatenated to the end of the previous observation.

Unlike Mk. I, we had the forethought to adequately tag our data this time around.

One of the enclosing tags I had during the parsing phase was XAS/XAE, which indicated the start and end of an article, so this is really helpful here. This way the model can potentially learn where an article starts with respect to the previous article, while also conforming to the preferred way PyTorch wants to handle this type of data.

## Tokenizing
After concatenating, we run each Big String through [Spacy](https://spacy.io/models/en), which is what Fast AI prefers as its English language tokenizer. 

Tokenization is a complicated topic on its own, but it amounts to essentially splitting a sentence into its constituent components. Usually this means splitting into individual words, but sometimes it involves sub-word components. 

For example, 
```I don't want to go there!``` turns into `["I", "do", "nt", "want", "to", "go", "there", "!"]`. Notice the `do` and `nt` tokens.

Jeremy's Tokenizer library adds some additional aspects, like lowercasing everything, adding notation for when a given token is actually upper case, and adding repetition marks, so that '!!!' isn't necessarily distinct from '!'. In this case, `!!!` becomes something like `["rep", "3", "!"]`, implying that the third index (`!`), should be repeated by the amount of the second index (`3`). This way the model can attempt to learn the meaning of an exclamation point once, and not have to figure out what a double exclamation point means.

Fast Ai is full of nice quality of life improvements like this.


### Unknown token

We don't want to waste time on words that are so rare that we have no chance of learning the meaning of them, so we pick some arbitrary frequency threshold, in our case `2`, and we say that any token in our corpus that appears less than our threshold will be replaced with `_unk_`, which stands for `unknown`, and just indicates that we don't know the value. This helps our model by having it not waste effort on each unique unknown, and instead it uses its regular, pre-learned weights for it and moves on with its task.

## Token Mappings
Neural Nets don't operate on words, they operate on numbers. I'll spare the details, but to facilitate this we create a mapping of our tokens to their integer representation. We have the freedom to choose what that means so we'll just go with a simple `word : index of word in token list` mapping. If our entire token corpus is `["the", "quick", "brown", "fox", "jumped", "over", "the", "lazy", "dog"]`, then our first mapping, String-To-Int, or `stoi`, becomes:
```python
{
    {"the" : 0},
    {"quick", 1},
    {"brown", 2},
    {"fox", 3},
    {"jumps", 4},
    {"over", 5},
    {"lazy", 6},
    {"dog", 7}
}
```

and our reverse mapping, Int-To-String, or `stoi`, becomes:
```python
{
    {0, "the"},
    {1, "quick"},
    {2, "brown"},
    {3, "fox"},
    {4, "jumps"},
    {5, "over"},
    {6, "lazy"},
    {7, "dog"}
}
```

These mappings are useful when converting a document into machine readable formats, and from taking output of the model and converting it into human readable formats.


### Re-mapping to WikiText

Because we've opted to use WikiText's weights, we need to align our mappings to WikiText's, otherwise the embeddings will be all wrong and we'll get poorly trained gibberish.

WikiText includes a `itos_wt103.pkl` file, which contains the `itos` mapping they created. We can quickly re-map our mappings with something like
```python
itos2 = pickle.load((PRE_PATH/'itos_wt103.pkl').open('rb'))
stoi2 = collections.defaultdict(lambda:-1, {v:k for k,v in enumerate(itos2)})
```

# Weights

We're using the pre-calculated weights from WikiText, so we need to load those weights into our Model before we can continue adding our custom data on top of it.

We'll make a zero-filled 2-dimensional Numpy matrix of the size `(vs, em_sz)`, where `vs` is the number of distinct tokens in our corpus (our corpus, not the generic wikitext one), and `em_sz` is the dimensionality of the embeddings for each given token. WikiText uses an embeddings size of `456`, so our 2-dimensional weight matrix will be of the shape `(21480, 456)`. 

21480 is the number of all unique tokens that appeared more than twice in Matt's 571 articles.

Then we iterate through our re-mapped `itos` and replace the zero-filled 456-slot array for each word in our corpus that has a matching word in WikiText with the WikiText weights. This gives us a compact matrix where any extra WikiText data is discarded and only data for the words we know Matt to have written remains.

Of note is that for any word that doesn't exist, we give that word a default embedding array of `row_m`, where row_m is the `mean` of all the WikiText weights. We could choose to make it a 0-filled array, but that's very extreme. There is likely no word in existence that truly has zero meaning, while every word is much more likely to have a meaning closer to the average.

Of course, "meaning" here is an abstract term, and is defined along a 456-dimensional array. Even so, it makes more sense to give unknown words an average amount of "meaning" as opposed to "precisely zero meaning".

Finally we assign a few sub-fields of the weights matrix to be our re-mapped and pruned weights:

```python
wgts['0.encoder.weight'] = T(new_w)
wgts['0.encoder_with_dropout.embed.weight'] = T(np.copy(new_w))
wgts['1.decoder.weight'] = T(np.copy(new_w))
```

# Model Building

We're going to use an LSTM flavored RNN, but we don't have to deal with those technical details here. Using FastAI, we get a lot of stuff for free.

## Hyper Parameters

```python
wd = 1e-7 # Weight Decay
bptt = 70 # Back-Propagation-Through-Time
bs = 52 # Batch Size
opt_fn = partial(optim.Adam, betas=(0.8, 0.99)) # Optimization Function (separate from loss. This is our strategy for navigating gradient descent.)
```

## DataLoaders

Using FastAIs APIs, we create a DataModel, which handles the setup of a basic neural network appropriate for our task using information it infers from the data we hand it. In our case, we'll ask for a LanguageLearner, and give it a list of integers, corresponding to the `i` part of our `stoi` mappings.

We do this for both the Train model and the Validation model:
```python
trn_lm = np.array([[stoi[o] for o in p] for p in trainTokens])
val_lm = np.array([[stoi[o] for o in p] for p in validTokens])
```

```
trn_dl = LanguageModelLoader(np.concatenate(trn_lm), bs, bptt) #  Dataloader for 
val_dl = LanguageModelLoader(np.concatenate(val_lm), bs, bptt)
md = LanguageModelData(PATH, 1, vs, trn_dl, val_dl, bs=bs, bptt=bptt)
```

## Dropout

```python
drops = np.array([0.25, 0.1, 0.2, 0.02, 0.15])*0.7
```

## FastAI Learner Object

One of things the FastAI Library provides on top of PyTorch is what's called a `Learner` object. If you provide your data in the expected format, you gain a bunch of nice properties, such as being able to do some crazy things with the learning rates really easily, like using `lr_find`, or cosine annealing, or momentum, or any number of fancy good things. It is strongly recommended to at least start with a learner object before graduating into something more low level or specific.

```python
learner = md.get_model(opt_fn, em_sz, nh, nl, 
    dropouti=drops[0], dropout=drops[1], wdrop=drops[2], dropoute=drops[3], dropouth=drops[4])

learner.metrics = [accuracy] 
learner.freeze_to(-1) 
```

Next we load the weights from earlier directly into our learner. This sets up the architecture for us.

```python
learner.model.load_state_dict(wgts)
```

Next we set our Learning Rate. We choose 1e-3 as a good starting point. Why? Because.
```python
lr=1e-3 # Learning Rate
lrs = lr # Can be an array of learning rates for various 'layer groups'. You can read more on the docs.
```

## Fitting

```python
learner.fit(lrs/2, 1, wds=wd, use_clr=(32,2), cycle_len=1)
```

Once we've done a single epoch worth's of training, we can try to use the `lr_find` method to find an even better rate:

```python
learner.unfreeze() # so that we can train every single layer. This refines the WikiText weights.
learner.lr_find(start_lr=lrs/10, end_lr=lrs*10, linear=True)
```
Then we can plot.

```python
learner.sched.plot()
```

```python
learner.sched.plot_loss()
```

# Pulling Data

Once we have an adequately trained model, we can pull data out of it like so:

```python
def sample_model(m, s, l=50):
    s_toks = Tokenizer().proc_text(s)
    s_nums = [stoi[i] for i in s_toks]
    s_var = V(np.array(s_nums))[None]

    m[0].bs=1
    m.eval()
    m.reset()

    res, *_ = m(s_var)
    print('...', end='')

    for i in range(l):
        r = torch.multinomial(res[-1].exp(), 2)
        #r = torch.topk(res[-1].exp(), 2)[1]
        if r.data[0] == 0:
            r = r[1]
        else:
            r = r[0]
        
        word = itos[to_np(r)[0]]
        res, *_ = m(r[0].unsqueeze(0))
        print(word, end=' ')
    m[0].bs=bs
```

where `m` is the model we trained, `s` is a list of mapped tokens for it to run some predictions on, and `l` is the number of predictions we want back from it.

Usage looks like this:

```python
sample_model(learner.models.model, "goldman sachs group", 500)
```

And output looks like this:

```txt
xbs t_up xcs things happen . t_up xce us officials ask paul singer to pay $ gapper million for the elliott management . why the treasury currency has not been cool since independence . weekend of new york fed doubles down as leverage looms . closes door eyes open for restructuring programmes as u.s . tries to lure eu restructuring . avon tips from activists to fight for rights in puerto rico . danoff bonds fund comeback after struggling to return redemption pressure . america 's bond traders are being shake - ups : fed 's tight bond - trading banking system hangs over .
```

# Post-Processing

That output is great, but is not by itself sufficient as an imitation of Money Stuff.

Using a post-processing script, we take the various tokens and transform them.

`t_up xcs things happen .` becomes `XCS things happen.`, which tells us that a section title has started. 

We also try to attach periods properly, capitalize the starts of sentences, and handle quotes. We end up with an example that looks a lot like this:

```txt
Blockchain blockchain blockchain. 

Here's a bloomberg markets story about how " cryptocurrency " is actually a good word for " profit from early withheld ownership. " the basic means of 100 percent leveraged profits last quarter were basically yes. Long - term dollar returns will be inverse, without fully 25,000 of 10,000 yen worth of stock, so you can sell a percentage of the interest rate( you get your own ). Tunick and mae's short - termism push makes them the brokerage operators for long - term value - supplying businesses, as they do well in exchange for cash and government cash. But it can be very specialized, or at least probably motivated by rigid formulas( some small private companies can buy which stocks ). There not be more in the securities market, though: " lots of companies are rushing to short unthinkable's stock by requiring investment firms to buy stock, rather than returning it to shareholders. "
```

Like alluded to earlier, although Mk. II can generate section titles, (and he's very good at that), he can't generate overall article titles due to errors on my part during the data cleaning phase.

As a solution, I take a random sampling of all the section titles he generated and assemble them into a somewhat regular sounding overall article title. From an article where the generated sections are:

1.  Blockchain blockchain blockchain. 
1.  Blue apron. 
1.  fintech.
1.  Wal - mart. 
1.  Oh, wells fargo. 
1.  Ross chats. 
1.  philosophy. 
1.  What sex was settling? 
1.  Goldman sachs.

The selected article title became: "Goldman sachs, philosophy and ross chats", with a subtitle of "also, what sex was settling?, blue apron and wal - mart".

# The Future

Obviously I'd like to have future Matt Bots generate their own titles properly instead of relying on post-processing.
There are also post-processing errors like incorrect quote placement, and currently there is no support for blockquotes, despite them being generated. You can see left-over blockquote token artifacts by the occasional `XDS/XDE` pair in the text.

I'd also like to add new-lines and paragraph breaks back in, since his sections all run together in hard to penetrate walls of text.

His articles are also a little too long. I'd like to be able to trim them by a thousand words or so.

Ans finally, improving his coherence is the holiest of holy grails. Pursuing higher intelligences and greater understandings of English are the foremost goal of any Matt Bot.