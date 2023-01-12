---
title: "Git Change Tracking Causes VS Code Freezes"
date: 2018-10-19T15:22:42-07:00
draft: false
description: "Tracking an a lot of files in a given workspace will cause VS Code to slowdown or freeze intermittently."
categories:
- vscode
- git
- bugs
---


# Tracking lots of changes in git will freeze VS Code

**tl;dr: If you workspace is git tracked and you have many (1,000+) outstanding files being change-tracked, your VS Code windows may experience severe slowdowns or outright freezing.**


Like the tl;dr says, if you're tracking a ton of changes, you'll get window freezes. 

Try to keep tracked changes below 1,000, and try to not track so many different items. If it can't be helped, then try to commit the changes often enough for it to not be a problem.


Microsoft knows about this, but has decided that they're going to be hands off with respect to improving git performance, says [a guy on the VS Code IDE team](https://github.com/Microsoft/vscode/issues/35475#issuecomment-348916956).


    There is no fixing slow git on Windows, especially from us. 

The VS Code team seems to at least have attempted to mitigate this by turning off git refresh for over 5,000 items, but in my experience VS Code will start to come to a screeching halt at around 1,000+.

And just for completeness sake, here's the link to the comment that made me realize what the problem is:  
https://github.com/Microsoft/vscode/issues/35475#issuecomment-347547071

Thanks @jeffhoye, you saved me a huge amount of frustration.