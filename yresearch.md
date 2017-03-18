---
# You don't need to edit this file, it's empty on purpose.
# Edit theme's home layout instead if you wanna make some changes
# See: https://jekyllrb.com/docs/themes/#overriding-theme-defaults
layout: page
title: Research
permalink: /research/
---

## Motivation
Reverse engineering tools exist for a variety of different layers. An already setup and running database can be reverse engineering with common ERM modelling tools or extensive UML modelling tools like Visual Paradigm. In the end, a comprehensive model of the whole database setup is produced. The same holds true for the presentation and business layer of an application.

With frontend applications gaining more and more popularity, it begs the question on how can a view model be extracted from an already existing application?
![Motivation](/columbus/assets/motivation.jpg)


## Foundation: UIML

A draft to achieve vendor- neutral and standardised representation of view models, called User Interface Modelling Language (UIML, [OAS08]), was designed by the Organization for the Advancement of Structured Information Standards (OASIS). The elements of the model in UIML are declared using XML. Figure 2.1 shows a visualisation of the general structure of an example UIML document. Structure, style, content and behaviour compose each interface definition. An interface can be presented in multiple ways depending on the execution environment. Each interface, is connected to elements that provide logic and connections to data sources.
![UIML basic structure](/columbus/assets/uiml1.jpg)
One of the goals of UIML is to provide a generic approach to defining user interfaces. Some of the supported functionality is unnecessary, overly complicated or not compatible with elements of a modern JavaScript component-based web application. The focus of UIML lies on supporting and describing a wide variety of interfaces. Concepts like reusable elements do not exist in the specification. Reused elements are redefined for each occurrence instead of referenced, for example. Due to those limitations, a more streamlined and simplified adoption of the standard was required.

## Reverse Engineering Process
The reverse engineering process can be described as a transformation function that translates JavaScript code into a view model. As part of the function, various steps change, analyse or filter the in- and output information.
![Process](/columbus/assets/process.jpg)

## References
* Hernandez-Mendez, Adrian and Tielitz, Andreas and Matthes, Forian (2017). *Columbus - A Tool for Discovering User Interface Models in Component-based Web Applications* [(WEBIST 2017)](http://www.webist.org/).
* Tielitz, Andreas (2016). *Automatically extracting view models from component-based web applications (master thesis)*. Found at [https://wwwmatthes.in.tum.de/pages/wb7crwpempcq/Master-s-Thesis-Andreas-Tielitz](https://wwwmatthes.in.tum.de/pages/wb7crwpempcq/Master-s-Thesis-Andreas-Tielitz)