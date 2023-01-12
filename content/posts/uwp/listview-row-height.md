---
title: "UWP: ListView Row Height"
date: 2018-07-19T09:06:33-07:00
draft: false
description: "When dealing with ListViews in UWP, sometimes more information density is desired, and the quickest way to get that density is to adjust the row height of each item in the ListView."
categories:
- UWP
tags:
- xaml
---

#### Notes
[07/19/2018] Note: This post refers to the library `Microsoft.NETCore.UniversalWindowsPlatform`, version `6.2.0-Preview1-26502-02`.

# ListView Row Height
When dealing with ListViews in UWP, sometimes more information density is desired, and the quickest way to get that density is to adjust the row height of each item in the ListView.

By default in a new ListView, information density is low and look like this:

![Default List View Heights](/uwp/listview-row-height/defaultheights.png)

Any control that inherits from `ItemsPanel` in UWP Xaml must have their row heights adjusted by overriding the style parameter in the parent object:

{{< highlight xaml "linenostart=1, hl_lines=2-7" >}}
 <ListView>
    <ListView.ItemContainerStyle>
        <Style TargetType="ListViewItem">
            <Setter Property="MinHeight" Value="1"/>
            <Setter Property="Height" Value="15"/>
        </Style>
    </ListView.ItemContainerStyle>
    <ListView.ItemTemplate>
        <DataTemplate>
            <Grid>
                <TextBlock Text="Hello" FontSize="10"/>
            </Grid>
        </DataTemplate>
    </ListView.ItemTemplate>
</ListView>
{{< / highlight >}}

We effectively eliminate the minimum height, and then we give it the height we want. in our case `15`.

Trying to set the row heights any other way won't work.

After we've done, we have a nice, dense list display:

![Adjusted List View Heights](/uwp/listview-row-height/adjustedheights.png)
