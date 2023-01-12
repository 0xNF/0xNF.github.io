---
title: "A system for approaching security questions"
date: 2018-10-17T11:11:18-07:00
draft: false
description: "Security questions are user hostile and advantage the attacker, but we are likely stuck with them. How best should an end-user approach them?"
categories:
- security
- web
tags:
- security question
---

- [Security questions are user hostile and advantage the attacker](#security-questions-are-user-hostile-and-advantage-the-attacker)
    - [Why security questions suck](#why-security-questions-suck)
        - [They're based on publicly available information.](#theyre-based-on-publicly-available-information)
        - [They're based on capricious and changing feelings](#theyre-based-on-capricious-and-changing-feelings)
        - [They're based on murky and easily misremembered factoids](#theyre-based-on-murky-and-easily-misremembered-factoids)
        - [They're based on certain assumptions of the world that are not universally true](#theyre-based-on-certain-assumptions-of-the-world-that-are-not-universally-true)
    - [What to do?](#what-to-do)
    - [Social Engineering](#social-engineering)
- [A system for security questions](#a-system-for-security-questions)
    - [System Requirements](#system-requirements)
    - [System #1 - Design Considerations](#system-1---design-considerations)
        - [The MUST-NOT Items](#the-must-not-items)
        - [The MAY Items](#the-may-items)
            - [Some Example System 1](#some-example-system-1)
    - [System #2 - Design Considerations](#system-2---design-considerations)
- [Conclusion](#conclusion)

# Security questions are user hostile and advantage the attacker

Security questions are a terrible concept and should be abolished. Unfortunately, they won't be, and even if they will be at some future point, they're here now and we're forced to participate.

Given that, how should you, the account holder forced into this system, craft your security questions to make them as least-bad and most-secure as possible?

# Why security questions suck

## Assuming organization-assigned security questions

First, what's wrong with security questions? Assuming that security questions are pre-selected by the organization and you cannot craft your own:

### They're based on publicly available information.

Questions like `What high school did you go to?` are available to almost anyone with an ounce of Google skills, or to anyone willing to pay $0.99 for a report from any of the major information dealers.

How is this a secret?

### They're based on capricious and changing feelings

`What is your favorite color?`

Who knows? A long time ago I would have said green, then for a time I would have said purple, now I'm not even sure I have a favorite color. 

I now have to remember how I felt when I was setting the account up, and that's going to be real hard for me, the legitimate user, to remember.

### They're based on murky and easily misremembered factoids

`What was the name of your first pet?`

Well, what is a pet, exactly? I started with a Pet Rock, but it's not strictly speaking, a "pet", and then I had two cats and a dog, and the first one was when I was 6 and his name was Mr. Paws, but... wait, maybe Fido was first? I know I had Fido when I was around 6 as well... Or was I 7?

And is all of this case-sensitive? 


All this to say, who knows what my first pet was? I sure don't.


### They're based on certain assumptions of the world that are not universally true

Referring back to the pet question, what if I never had a pet? Not everyone had pets.

Or things like "Who was your best friend in high school?". Some of my friends were homeschooled. They didn't go to high school, so how could they have a best friend there? Should they answer with who their best friend was during the time period of their life where someone would normally attend high school? Or what if they transferred between high schools, which one in specific are we talking about here?

Some banks ask you what make and model your first car was. I never had a car! I got away with my parents vehicles, public transit, and then Uber. How am I supposed to answer this question?

## Assuming self-chosen security questions

Don't get fooled into thinking that you should create a security question that mimics others you've seen before. Choose something that only you will know the answer to. 

```
Q: 42
A: rob
```

Maybe 42 has special meaning to you, and maybe that special meaning is rob. Get creative. 

Really though, we're not concerned with self-administered questions. They are uncommon and not the your greatest risk. What's risky is the organization that forces you to choose from a dropdown of curated questions. 


## What to do?

The problem with (curated) security questions is that they advantage an attacker and disadvantage the user, which is like Description Number One for any bad security system.

If we assume that some attacker has it out for you and is trying to break into your bank account, we can assume that they've done some research, both on you, and on the bank.

They know what kind of questions a bank is going to ask, and they'll have paid the information brokers and credit agencies for a small dossier on you. They'll be ready for the questions that come their way, and you won't be.

A common recommendation from some security minded people is to use a password generator to create a long string of gibberish to be used as a replacement for actually answering the question asked.

This transforms the question/answer from:

```
Q: What high school did you go to?
A: Local 6th Senior High
```

to:

```
Q: What high school did you go to?
A: TABgJ\k=_b`sG.g/D+Vy:~MEk!*
```

The main problem with this approach is that we've now entered into social engineering territory.

## Social Engineering

Taking our above example, lets say some attacker phones up support and pretending to be you. Support asks the attacker the security question, and says something like "Oh man, yeah. Actually it's just a bunch of gibberish, I ran my hand across the keyboard and it just came out to be a handful of numbers and letters."

And support will likely say "fantastic, yeah that makes sense who would actually write this as their security question lol".

And then the attacker is in.

Don't think that passphrases like those described in the [famous XKCD](https://xkcd.com/936/) will save you either. The attacker can just claim "oh you know I just brought out a dictionary and started choosing random words rofl".

Obviously some support at some organizations will be better than this, but as is a common refrain in security, humans are the weakest link. Don't count on the support staff to not fail on this.

# A system for security questions

So let's figure out what we should do to secure these systems, from our standpoint as an end-user.

## System Requirements

Our primary concern here is to make a security answer that is some combination of:

1. Easy to remember for the legit user
1. Hard to guess for the attacker
1. Resistant to social engineering
1. Maximally generalizable to every potential website

The other constraints we're dealing with are the standard set of user-hostile bullshit that websites will throw your way:

1. Character length limits or requirements
1. Special character restrictions
1. Unannounced length truncations

To ensure that whatever system we come up with is as generally applicable as possible, we should limit our answers to something that is restricted to:

1. Upper and lowercase A-Z, numerals 0-9.
1. 80 characters or less, a value empirically chosen.

And because no matter how many times we bring it up in the security community, SQL-injection will be a thing for a very long time, we're going to avoid the potential landmines of special characters like commas, semi-colons, and spaces. 

With respect to the attacker, what we're guarding against is an someone who:

1. Is targeting you
1. Knows, generally speaking, what questions will be asked
1. Has access to accurate, publicly available information on you
1. Is good at social engineering, in case of nonsensical answers

Note:
I'm making the assumption that the service in question offers ascii-based, Anglo-centric security questions. You might be dealing with a system where the questions are Japanese, Arabic, or with extended Latin characters. In which case  `¯\_(ツ)_/¯`.



## System #1 - Design Considerations

Our first assumption about our end system is that the user will not be using a password manager of any sort. We will consider what our final answer would look like if users can be expected to use a password manager in the next section.

The first conclusion to draw is that when designing answers to a security question, you should never actually answer the question - that makes it easy for the attacker.

The second is to avoid gibberish answers or something that is otherwise fungible to a human support staffer - this also makes it easy for the attacker.

The third, and perhaps most important aspect, is to make sure that if an attacker gets access to one or two answers from one service that they cannot easily figure out the system and use it against another service. Note that this is a limitation of not requiring a password manager or other kind of record keeping system.

<!-- The third, and perhaps most important aspect, is to make sure that if an attacker figures out the system, that your security answers will remain uncompromised. There must be some type of salting involved.  -->

So we need security answers that are unique per institution per question.

### The MUST-NOT Items

Because security questions are often presented during authentication-time out-of-order, that is, not the order that you answered them in at set-up, incorporating the position of the question during set-up in the answer is not acceptable.

Because companies may be re-branded or undergo name changes, incorporating the name of the product or company is not acceptable. (See: Microsoft Passport; Bank of America Merril Lynch)

Because companies or products may be acquired, incorporating the purpose of the product is not acceptable. (See: Twilio, a phone API, purchasing SendGrid, an email API)

Because security questions may be answered over the phone, and thus wont have upper or lowercasing information available, performing any kind of cryptographic hashing over, or otherwise incorporating casing or other such non-verbally communicated information is not acceptable.

### The MAY Items

Having never encountered a system where the security questions have changed their wording, we can assume that a security question, as presented, will be a word-for-word replica of the question we were presented with at set-up. Although see above for why we can't make an assumption at the character level.

On this assumption, incorporating the question into the answer is acceptable, and is probably the only real thing we have to work with.

Because during an attempted takeover attempt, a human on the phone will be the last line of defense for our account, we are allowed to craft messages for whoever is on the other end. Putting messages meant to be read by a human is acceptable.

Although hashing over a cased question is unacceptable, hashing over some normalized form of the question is acceptable. For example, lowercasing everything, replacing special characters with the empty string, and concatenating everything together is fine, assuming that you have some way to easily remembering your hashing algorithm.


#### Some Example System 1

1. Reverse the question
1. Remove all numbers, spaces, and special characters from the question
1. Lowercase the entire question
1. Add the salt to the beginning

For example:
```
Q: "Who was your best friend in high school?"
```

1. Reverse the question:
    * `?school high in friend best your was Who`
1. Remove all numbers, spaces, and special characters from the question:
    * `schoolhighinfriendbestyourwasWho`
1. Lowercase the question:
    * `schoolhighinfriendbestyourwaswho`
1. Add the salt to the beginning:
    * `force me to say schoolhighinfriendbestyourwaswho`


---
What boxes from our requirements does this method tick?

* Easy for you to remember, because there are few steps and each step is simple:
    * Reverse, Remove, Lower, Salt    
* Hard for an attacker with no knowledge of your scheme to guess, because your answer is not an answer to the content of the question.
* Resistant to social engineering because it's not just gibberish and contains a human phrase at the beginning. It's not "just the question backward", there's a salting in there too.

The problems with this approach are that, for one, is this algorithm actually easy to remember? Lowercase, no special is easy enough, but reversing might be tricky. And where do we place the salt-phrase? Is it at the start, or the end?

Additionally, how do you choose your salt? If your method is compromised, the only thing that's stopping an attacker from successfully impersonating you is the salt, which, because this system assumed that no recording of any information has taken place by the user, will likely be a static salt across all questions and sites. 

Finally, this method achieved uniqueness per question, but does not achieve uniqueness per question per institution. Any other organization that uses the same questions will have their questions compromised by the leak, or guessing, of this question, assuming that they are word-for-word matches.



## System #2 - Design Considerations

If we can assume that a user is willing to record information at set-up time, either with a notepad, or with a password manager, we can achieve a system that is both simpler, and more effective:

1. Generate a relatively short random sequence of characters and numbers that you are comfortable potentially reading out over the phone
1. Add a custom human-readable phrase to the front

For example:   
`force me to say f 12 g h 5 5 q w`


We take this system to be easy for a human to remember, because your password manager remembers the whole thing for you.

This system is hard for an attacker to guess because you have a random string in there.

And finally this system is resistant to social engineering because you've included a message directed at the human on the other end in the answer


# Conclusion

If you're unwilling or otherwise unable to use a password manager to store your security questions, I think a system like #1 is the best option, otherwise the second system is better. 

In either case, I think it's critical to include a short message aimed directly at some potential human support staff that, in effect, preps them to be on guard against social engineers who are going to try to fudge the answer. 

At the end of the day, the human is still the weakest link and will continue to get gamed, but a system like what we've come up with here works to reduce the room a human operator has for error. 