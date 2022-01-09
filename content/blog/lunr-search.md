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

## Adding search to the UI

The basic structure I used for the search implementation is as follows:
1. Add a search query form to every page on the site. I chose to include it as
   part the navigation bar. You can see it on the top right of this page!
1. Add a search results page that users are redirected to when the results
   render. This is hosted at [`/search/`]({{< ref "/search" >}}?query=lunr).
1. Support for search-as-you-type when on the search results page.

The search query form is quite simple. It's written as a [Hugo
Partial][hugoPartial] that can be injected into anywhere we want on the site,
consisting of two basic elements, an input field and a submit button. For my
site, I'll by placing this partial [into the navigation
bar](https://github.com/kujenga/website/blob/53f159154f115a360277dab9104991feab4a3fd1/layouts/partials/nav.html#L42-L43).

{{< emgithub "https://github.com/kujenga/website/blob/53f159154f115a360277dab9104991feab4a3fd1/layouts/partials/search-form.html#L1-L21" >}}

Next, we need a page that this form will redirect the user two after a query is
submitted. The code snippet above references this new page in the `action` tag
of the form, where we use the `.RelPermalink` [page variable][hugoPageVar] to
specify the location of the redirect.

Creating a single root level page in Hugo can be done in a few different ways,
but the basic idea is that you need two files, a markdown file which is what
represents the existence of the page, and a layout template which corresponds
with that markdown file via the [template lookup order][hugoTmplLookup]. The
following to code snippets show those two files as they have been created for
this site.

The markdown file causes the page to be rendered. It is empty because there is
no particular content that we are rendering there by default, all the content is
in the layout file. In order to make this approach work, you need the `type =
"search"` line in the file so that the lookup order finds the corresponding
"single" template.

{{< emgithub "https://github.com/kujenga/website/blob/53f159154f115a360277dab9104991feab4a3fd1/content/search.md?plain=1#L1-L6" >}}

This template provides the basic scaffold for the results page. It is empty
because we will be rendering the main content with Javascript. The `<div
id="results"></div>` element provides the attachment point where the results
will be injected into the page. We'll cover that in detail in just a moment.

{{< emgithub "https://github.com/kujenga/website/blob/53f159154f115a360277dab9104991feab4a3fd1/layouts/search/single.html#L1-L16" >}}

For the basic page setup in Hugo, that's it! We can now start work on creating
the actual search index.

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
[hugoPartial]: https://gohugo.io/templates/partials/
[hugoPageVar]: https://gohugo.io/variables/page/
[hugoTmplLookup]: https://gohugo.io/templates/lookup-order/
[lunrHomepage]: https://lunrjs.com/
[preactSite]: https://preactjs.com/
[victoriaPost]: https://victoria.dev/blog/add-search-to-hugo-static-sites-with-lunr/
[ghHugoLunr]: https://github.com/dgrigg/hugo-lunr
[nodeBuildExample]: https://codewithhugo.com/hugo-lunrjs-search-index/
