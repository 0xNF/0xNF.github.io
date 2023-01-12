---
title: "Swipr - Swipr Script Service"
date: 2018-12-12T12:25:48-08:00
draft: false
description: "Part 7 of the Swipr series. This post covers the construction of a service script to communicate with our trained model on a cpu-only server"
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
series_weight: 7
---

Now that we have a trained model, we need to consider how to interact with it. 

The full tech of the script can be found [here on GitHub](https://github.com/0xNF/swipr_gh/tree/master/SwiprScript) but we'll walk through it here too.

The overview of this step is that we have a python script acting as a local server where the client side of the script receives input and returns output to to external consumers, and the server side loads the PyTorch model and runs the computation.

Due to the computationally intensive exercise of setting up all the necessary PyTorch structures, loading the model, computing the result, and unloading the model for each request would be inadvisable - the local server architecture of the script allows us to keep the model loaded in memory at all times.

To accomplish this messaging service between client & server, we use a library called [ZeroMQ](http://zeromq.org/) to form a message queue between two forks of the process, and to keep the service alive at all times we add some extra infrastructure to make it an always-on systemd service.

# Architecture overview

the general architecture of this solution can be described by this chart:

![ssm architecture](/ml/swipr/SSM.png)

The script invocation has two parts:

The first launches the server and doesn't return anything by itself

```bash
python swiprscriptservice.py
```

the second launches the client, taking in a path to a valid image file and returning as output to stdout a comma separated tuple of float predictions:

```bash
python swiprscriptservice.py --compute /path/to/img.jpg
0.66,0.33
```

# Script Source

We have to load the script like we created it on our training machine. We could avoid doing it this way if we had bothered to save it properly as as a pickled object instead of just exporting the weights, but we didn't think of it at the time, so we have to do it the silly way, which involves bringing over a bunch of extra files like the val_idxs:

```python
def LoadLearner():
    print("loading learner")
    global learn, tfms_va
    label_csv = PATH/'test1.csv'
    val_idxs = torch.load(PATH/'val_idxs.pkl')
    sz=224
    arch=resnext50
    bs=24
    tfms_tr, tfms_va = tfms_from_model(arch, sz, aug_tfms=transforms_side_on, max_zoom=1.1)
    data = ImageClassifierData.from_csv('./', './', label_csv, val_idxs=val_idxs, tfms=(tfms_tr, tfms_va), bs=bs)
    learn = ConvLearner.pretrained(arch, data, precompute=False)
    learn.load(Swipr_ModelToUse)
    learn.model.cpu()
```

Next given a path to an image, we have to load it up in numpy and hand it to the model:

```python
def PredictOnImage(ipath):
    i = open_image(ipath)
    t = tfms_va(i)  
    preds = learn.predict_array(t[None])
    x = np.exp(preds)
    tup = (x[0][0], x[0][1])
    return tup
```

The rest of the script deals with using ZMQ and messaging between the client and server

One small aside if that we have a hardcoded killswitch built in if the server side of the process takes longer than 10 seconds to return:

```python
def Kill():
    os._exit(-5)

def main()
    ...
    t = threading.Timer(10.0, Kill)
    ....
    t.cancel()
```

This proved to be an occasional problem, so this is the workaround.


# Script Start Script

Because we need to launch this service with a few conditions, we have a shell script that handles a number of external factors for us:


```
#!/usr/bin/env bash
export PATH=/home/science/anaconda3/bin:$PATH
. /home/science/anaconda3/etc/profile.d/conda.sh
conda activate fastai-cpu
source ~/swipr/swiprvars.sh
python ./swiprsscriptserver.py > ./sss_logs.txt
```

It makes sure the appropriate conda binaries are available to the script, that we're in the appropriate conda environment, that the necessary environment variables for Swipr are set, and to start the server.

# Swipr Script Monitor

To install as systemd, we create a fairly typical service file describing our service:

```ini
[Unit]
Description="Swipr Script Monitor"
After=network.target
StartLimitInterval=200
StartLimitBurst=5

[Service]
User=science
Group=science
WorkingDirectory=/home/science/swipr/swiprscript
ExecStart=/home/science/swipr/swiprscript/sss_start.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

We have it try an automatic restart every 3 minutes, and set it to attempt to always be online and available.

# Moving On

In our next post, we'll discuss the SwiprServer and its components


[Next Section - LibSwipr](/posts/ml/swipr08)