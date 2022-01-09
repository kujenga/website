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

## Building the search index

The next step in our process is to generate the index that we will be searching.
For this use case, I want to be able to search across the pages within the
website, which are written in Markdown before being rendered to HTML by Hugo.
Using Hugo templating, we can iterate over the pages directly and pull together
the data needed to construct the index.

### Gathering content from Hugo

First, we need to use Hugo to gather together all information we need about the
pages from within the website that we want to make searchable.

To execute this templating logic, I split out the index into a javascript file
with the name `index.tpl.js`. At build time, this file gets rendered into one
with the name format of `index.js` with the data in it all filled out from Hugo.
By splitting the templating logic out into a separate file from the search logic
we will be looking at shortly, we get some quality of life improvements by being
able to do things like disabling error linting for that file.

The templating logic within this file is fairly straightforward if you go line
by line. First, we create a `$store` template variable which will capture the
page content that we want, keyed on their URL to enable quick lookups of the
original entries later on. We then iterate over the pages of interest within the
site, which in my case uses the [`where` function][hugoWhereFunc] to walk
through the pages within the blog section. For each of those pages, we create an
object using the built in [`dict` function][hugoDictFunc], and then use the
[`merge` function][hugoMergeFunc] to add it to `$store`. So far, all this
has been happening inside of the internal template variable state, with nothing
being rendered out to the final JS file. As the last step, we take the store
that we have constructed and run it through the [`jsonify`
function][hugoJSONifyFunc] and store it globally as `window.store`, which we
will reference to build the actual search index with Lunr in a moment.

{{< emgithub "https://github.com/kujenga/website/blob/53f159154f115a360277dab9104991feab4a3fd1/assets/js/index.tpl.js#L1-L26" >}}

To get Hugo to actually execute this template, we need to leverage the
`resources.ExecuteAsTemplate` feature within Hugo Pipes. The following code
snippet shows how we do that for the `index.tpl.js` file and add it as a script
tag. The end result here is that we have the JSON object for `window.store` made
available throughout the page for use in building the actual search index
in-memory!

{{< emgithub "https://github.com/kujenga/website/blob/53f159154f115a360277dab9104991feab4a3fd1/layouts/partials/search-index.html#L8-L17" >}}

### Building the Lunr index

Now that we have the content available to us on `window.store`, we can reference
that in other Javascript files that are loaded into the page. The following code
snippet constructs a [`lunr.Index`][lunrIndex] customized to the content that we
are making searchable for this website. Fields are boosted according to relative
importance to the post. These numbers are mostly based on an intuitive sense of
what seems most important to a post, and have been tweaked a bit with
experimentation. We'll talk more about ranking later in the post as well, but
for now, we have a working index up and running!

{{< emgithub "https://github.com/kujenga/website/blob/f00a887a7ea86c3866c982efde55b9f91fa6e103/assets/js/search.jsx#L5-L32" >}}

If you want to learn more about Lunr and the options it offers straight from the
source, I recommend checking out their [getting started
guide][lunrGettingStarted] which walks through the fundamentals of a very simple
search implementation, as well as links to much more detailed resources on Lunr.

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
[hugoWhereFunc]: https://gohugo.io/functions/where/
[hugoDictFunc]: https://gohugo.io/functions/dict/
[hugoMergeFunc]: https://gohugo.io/functions/merge/
[hugoJSONifyFunc]: https://gohugo.io/functions/jsonify/
[lunrHomepage]: https://lunrjs.com/
[lunrGettingStarted]: https://lunrjs.com/guides/getting_started.html
[lunrIndex]: https://lunrjs.com/docs/index.html
[preactSite]: https://preactjs.com/
[victoriaPost]: https://victoria.dev/blog/add-search-to-hugo-static-sites-with-lunr/
[ghHugoLunr]: https://github.com/dgrigg/hugo-lunr
[nodeBuildExample]: https://codewithhugo.com/hugo-lunrjs-search-index/
