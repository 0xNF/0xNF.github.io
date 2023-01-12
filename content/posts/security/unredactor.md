---
title: "Unredactor"
date: 2018-08-26T15:54:28-07:00
draft: true
description: "Post Summary"
categories:
- defaultcategory
tags:
- defaulttag
---


Given an image of text, where some of that text is blacked out, attempt to fit a sequence of characters that lines up with the edges of that text.

1. Detect overall Skew (i.e., rotate -23 degrees in order to make it flat)
1. Detect (or be given) a Font
1. Detect (or be told) number of lines
1. Detect (or be told) where the line breaks are
1. Detect (or be told) the anchor points
    * Need at least one, and preferably two, ideally n-many anchor points around the redacted zone. These are used to detect if generated sequence matches well.
1. Be given a character set
    * alpha
    * numeric
    * special
    * upper
    * lower
    * foreignN
    * full-ascii
    * full-unicode
1. Be given heuristics:
    * names
        * [sub: *these* names]
    * numbers
        * [sub: *these* numbers]
    * Words
        * [sub: *these* words (Individual-1, US Person 2, etc)]
    * character count 
        * i.e, serial numbers are, lets say, 12 chars
    * document source, field type:
        * i.e, Best Buy uses Arial 12 point 17 char serial codes.
    * Whether document breaks on words, or on characters. 

Generate a potential combination. Upon generation, overlay text onto document, detect how far away by euclidian distance the new text is from the anchor points of the input text. Keep n-number of closest generations, show results to user.

## Manual Process:
1. Upload document
1. Assign Font
1. Assign char set
1. Assign custom heuristics
1. Add bounding boxes and anchor points
1. Run

## Automatic Process:
1. Upload document
1. Run

    
```csharp
public string DetectFont(Image i);

public double DetectFontSize(Image i);

public double DetectKerning(Image i);

public double DetectSkew(Image i);

public int DetectLines(Image i);

public List<Point> DetectLineBreaks(Image i);

public List<Point> DetectAnchorPoints(Image i);

public List<Point> TestOverlay(Image i, double tolerance, ImageOptions io, string text);


class ImageOptions {

    string Font;

    double FontSize;

    int Length;
    
    double Skew;

    double Kerning;

    List<Point> AnchorPoints;

    List<Point> LineBreaks;

    BreaksOn BreaksOn;

}

public enum BreaksOn {
    Words = 0,
    Chars = 1
}
```