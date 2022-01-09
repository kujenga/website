+++
date = 2022-01-08T23:19:59-05:00
title = "Searching a static Hugo site with Lunr.js and Preact"
description = """
Leveraging the templating capabilities and Javascript rendering capabilities of
Hugo to generate a Lunr index, rendered with search as you type using Preact.
"""
draft = true
categories = []
tags = []
images = [
]
mathjax = false
toc = true
+++

The website you are reading this on is made up of a set of static assets
rendered with [Hugo][hugoSite]. This post walks through adding a basic search
feature to this site that runs locally in your browser. I wanted to build out
search in a way that aligned with the current statically generated approach,
avoiding any server-side logic and executing queries entirely within the
browser. Additionally, I wanted to keep the build process for the site simple,
so avoiding the addition of any special steps in the local development or
production build processes. This post walks through how I accomplished it for
this site and how you could do the same.

To make this work, we need to go through three basic steps:
1. Augment the site's static page structure to add pages and UI elements for the
   search feature. We can do this using Hugo native functionality.
1. Integrate a client-side javascript library with a process for indexing the
   site. I chose [Lunr][lunrHomepage] for this purpose. While there are other
   options out there I'll touch on at the end of the post, Lunr looked to have
   all the basic features I wanted and is at a stable point in it's development.
1. Implement the search result rendering layer to display results from the
   generated index. For this I chose to use [Preact][preactSite], which is a
   lighter-weight version of React that provides similar functionality.

There are a number of projects out there that have done this sort of
thing[^otherProjs] which I found incredibly useful as starting points and
inspiration. I wanted to build on those to more closely integrate with the
[JavaScript pipes][hugoJSPipes] functionality that Hugo provides, add a more
complex rendering layer.

## References


<!-- Footnotes -->
[^otherProjs]: This blog post
  [victoria.dev/blog/add-search-to-hugo-static-sites-with-lunr/][victoriaPost]
  in particular was hugely useful in getting started with this project and
  provided the inspiration for the overall approach. Other projects out there
  like [github.com/dgrigg/hugo-lunr][ghHugoLunr] and
  [codewithhugo.com/hugo-lunrjs-search-index/][nodeBuildExample] utilize a
  Javascript build step as part of their workflow, which does open up some
  possibilities in terms of how the index is generated, but was not how I wanted
  to approach this project as it adds complexity to the build process, and the
  opportunity for the search index generation to diverge from the way Hugo
  manages content, since it does not leverage Hugo in the build process at all.

<!-- Links -->
[hugoSite]: https://gohugo.io/
[hugoJSPipes]: https://gohugo.io/hugo-pipes/js/
[lunrHomepage]: https://lunrjs.com/
[preactSite]: https://preactjs.com/
[victoriaPost]: https://victoria.dev/blog/add-search-to-hugo-static-sites-with-lunr/
[ghHugoLunr]: https://github.com/dgrigg/hugo-lunr
[nodeBuildExample]: https://codewithhugo.com/hugo-lunrjs-search-index/
