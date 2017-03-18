---
layout: page
title: Setup
permalink: /setup/
---

## Getting Started
To get you started you can simply clone the [Columbus](https://github.com/tielitz/columbus) repository and install all its dependencies:

## Prerequisites

You need git to clone the [Columbus](https://github.com/tielitz/columbus) repository. You can get git from [http://git-scm.com/](http://git-scm.com/).

We also use a number of node.js tools to initialize and test [Columbus](https://github.com/tielitz/columbus). You must have [Node.js](https://nodejs.org/en/) and its package manager (npm) installed. You can get them from [http://nodejs.org/](http://nodejs.org/).

## Clone Columbus

Clone the [columbus](https://github.com/adrianhdezm/columbus)  repository using [git](http://git-scm.com/):

```
git clone https://github.com/adrianhdezm/columbus.git
cd columbus
```

If you just want to start a new project without the [Columbus](https://github.com/tielitz/columbus)  commit history then you can do:

```bash
git clone --depth=1 https://github.com/tielitz/columbus.git <your-project-name>
```

The `depth=1` tells git to only pull down one commit worth of historical data.

## Install Dependencies

We get the tools we depend upon via `npm`, the [node package manager](https://www.npmjs.com).

```
npm install
```


## Create a Bundle for the Application

This project use [Webpack](https://github.com/webpack/webpack) for creating a bundle of the application and its dependencies

We have pre-configured `npm` to automatically run `webpack` so we can simply do:

```
npm run build
```

Behind the scenes this will call `webpack --config webpack.config.js `.  After, you should find that you have one new folder in your project.

* `dist` - contains all the files of your application and their dependencies.

## Run the Application

We have preconfigured the project with a simple development web server.  The simplest way to start
this server is:

```
npm start
```

Now browse to the app at `http://localhost:8000/index.html`.