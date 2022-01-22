+++
date = 2022-01-08T23:19:59-05:00
title = "Building search for a static site with Lunr and Preact"
description = """
Leveraging the templating capabilities and Javascript rendering capabilities of
Hugo to generate a Lunr index, rendered with search as you type using Preact.
"""
categories = ['homepage']
tags = ['Information Retrieval', 'Hugo', 'Lunr', 'Preact', 'JavaScript']
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

{{< emgithub "https://github.com/kujenga/website/blob/1768cf384d54b7e7ec8c88a02dc0ec3819061fc5/layouts/partials/search-form.html#L1-L21" >}}

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

{{< emgithub "https://github.com/kujenga/website/blob/1768cf384d54b7e7ec8c88a02dc0ec3819061fc5/content/search.md?plain=1#L1-L6" >}}

This template provides the basic scaffold for the results page. It is empty
because we will be rendering the main content with Javascript. The `<div
id="results"></div>` element provides the attachment point where the results
will be injected into the page. We'll cover that in detail in just a moment.

{{< emgithub "https://github.com/kujenga/website/blob/1768cf384d54b7e7ec8c88a02dc0ec3819061fc5/layouts/search/single.html#L1-L16" >}}

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

{{< emgithub "https://github.com/kujenga/website/blob/1768cf384d54b7e7ec8c88a02dc0ec3819061fc5/assets/js/index.tpl.js#L1-L26" >}}

To get Hugo to actually execute this template, we need to leverage the
`resources.ExecuteAsTemplate` feature within Hugo Pipes. The following code
snippet shows how we do that for the `index.tpl.js` file and add it as a script
tag. The end result here is that we have the JSON object for `window.store` made
available throughout the page for use in building the actual search index
in-memory!

{{< emgithub "https://github.com/kujenga/website/blob/1768cf384d54b7e7ec8c88a02dc0ec3819061fc5/layouts/partials/search-index.html#L8-L17" >}}

### Building the Lunr index

Now that we have the content available to us on `window.store`, we can reference
that in other Javascript files that are loaded into the page. The following code
snippet constructs a [`lunr.Index`][lunrIndex] customized to the content that we
are making searchable for this website. Fields are boosted according to relative
importance. These numbers are mostly based on an intuitive sense of what seems
most important to a post, and have been tweaked a bit with experimentation,
which we will talk about a bit later on. We additionally enable an [undocumented
feature][lunrGHHighlighting] in Lunr to enable position information for use in
highlighting as a bit of extra credit, which we will look at in more detail
shortly. For now, we have a working index up and running!

{{< emgithub "https://github.com/kujenga/website/blob/1768cf384d54b7e7ec8c88a02dc0ec3819061fc5/assets/js/search.jsx#L7-L37" >}}

If you want to learn more about Lunr and the options it offers straight from the
source, I recommend checking out their [getting started
guide][lunrGettingStarted] which walks through the fundamentals of a very simple
search implementation, as well as links to much more detailed resources on Lunr.

## Executing searches

We now have an index, but we're not actually doing anything with it yet. In
order to interact with the index, we create a `getResults` function. To implement basic
search with Lunr, you can just call the `search` function on your index and pass
in your query string. Lunr also supports a variety of query syntax that uses
special characters. We check for the use of any of those with the
`lunrQueryChars` regex, and if so pass the query directly to Lunr.

For all other cases however, we will customize the default behavior a bit,
because I wanted to provide a "search as you type" functionality on the search
result page itself. For this to work well, we need to support prefix matching on
at least the last word in the query, which is what the parsing logic in the
latter portion of this code snippet does.

{{< emgithub "https://github.com/kujenga/website/blob/1768cf384d54b7e7ec8c88a02dc0ec3819061fc5/assets/js/search.jsx#L159-L202" >}}

## Rendering results with Preact

We now have a search index built and a function to retrieve results from it, so
our next step is to actually render the results into the page. We could do this
directly by creating HTML elements via basic Javascript, but I wanted to
experiment with integrating [Preact][preactSite] as a lightweight way to more
easily represent what the wanted behavior is. I'll continue to refer to Preact
throughout but these concepts would work with using React as well, and probably
would simplify the implementation a bit as various tooling works with React out
of the box, at the expense of a slightly larger resulting bundle.

The below snippet shows the `Result` [functional component][preactFuncComponent]
that renders a single search result, as well as the `ResultList` component that
renders a list of results. These elements will be the foundational pieces of our
search result interface.

It's worth noting that at first glance this isn't the most [DRY][wikiDRY]
approach imaginable, as it does replicate the [Hugo content
view][hugoContentView] template we already have for rendering a `summary` view
of blog posts [here][siteBlogSummaryView]. However as these results need to be
built dynamically, and we are performing custom highlighting with the
`Highlight` component, there does not seem to be a clear way out of this, and we
will still leverage the same CSS to give consistency to the general styling here
and throughout the site.

{{< emgithub "https://github.com/kujenga/website/blob/1768cf384d54b7e7ec8c88a02dc0ec3819061fc5/assets/js/search.jsx#L104-L150" >}}

Diving a bit deeper into the implementation, this snippet shows how we highlight
the terms in the result content that match the query. We create a new
`Highlight` functional component that transforms text input into highlighted
snippets. Lunr has an [undocumented feature][lunrGHHighlighting] to provide
positional information as part of the returned matches, which we enabled at
indexing time above. What this provides to us is a pair of numbers, an offset
and length, for every term in the items that matches the input query. In this
component we re-construct the snippet text while inserting
[`mark`][mdnMarkElement] elements which provide us with highlighting, indicating
to the user what terms matched their query. After iterating through the whole
string in this manner, the resulting values are returned to be rendered into the
`Result` component to be rendered into the DOM as a contiguous block of text.

{{< emgithub "https://github.com/kujenga/website/blob/1768cf384d54b7e7ec8c88a02dc0ec3819061fc5/assets/js/search.jsx#L41-L79" >}}

One neat capability of Preact (and React itself) is that it can be integrated
within the context of an existing site that is not fully based on the framework,
which is exactly what we are doing here.

The below function shows the initialization procedure for the page which runs at
load time. First we parse any query out of the URL, and then we register the
logic to re-render the page to facilitate a "search as you type" experience.
Because this site is built around Bootstrap 4, we already have jQuery available to
us, so we use that to update the query rendering when the user types an update
to the query itself.

The reason we have to cobble the Preact logic into the site using jQuery (or
something similar) is that while Preact-type libraries have a fantastic ability
to manage the DOM directly under their control, they do not really have the
ability to monitor existing elements that they did not
create[^preactLimitations] (though if you know of a good way to do this I would
love to hear about it!). Filling that gap is where jQuery comes in. While native
Javascript could have done something similar, jQuery just makes our lives a bit
easier here.

{{< emgithub "https://github.com/kujenga/website/blob/1768cf384d54b7e7ec8c88a02dc0ec3819061fc5/assets/js/search.jsx#L220-L248" >}}

The `update` function referenced therein is fairly straightforward, taking in
the query from the result box if it changed, retrieving the corresponding
results and rendering them anew.

{{< emgithub "https://github.com/kujenga/website/blob/1768cf384d54b7e7ec8c88a02dc0ec3819061fc5/assets/js/search.jsx#L204-L218" >}}

### Compiling JSX with Preact and esbuild in Hugo

So we now have some javascript files that do all this neat stuff, but how do we
go about incorporating them into the website? We now look at the specifics of
how we leverage [Hugo Javascript pipes][hugoJSPipes] which utilizes the super
speedy [esbuild][esbuildSite] tool for compilation. I based my implementation
off a fantastic [example repo][preactHugoExample] that I found which connected a
lot of the docs here for me. This invocation does a few things:

1. Define the `NODE_ENV` environment for the javascript compilation.
1. Override the `JSXFactory` and `JSXFragment` options that are passed to
   esbuild to customize the compilation of JSX to work with Preact rather than
   vanilla React.
1. In development environments only, we enable inline source maps. These are
   disabled in production because they greatly increase bundle size when they
   are inserted inline. In the future if separate source maps files are
   supported, we can switch to that more and remove the conditional.
1. We then apply an SRI hash to the file and put it in a script tag!

With that, we have a fully operational [search page]({{< ref "/search"
>}}?query=lunr). Feel free to give it a try!

{{< emgithub "https://github.com/kujenga/website/blob/1768cf384d54b7e7ec8c88a02dc0ec3819061fc5/layouts/partials/search-index.html#L19-L38" >}}

## Tests

While we have made a lot of progress here, more code also means more things that
can wrong! In an effort to keep this site low-maintenance and stable, I wanted
to add tests to ensure that future iterations do not break things with the
search capability. I took a dual approach to this, first validating the search
functionality with unit testing, and then building on that with browser-based
testing.

To set up the unit tests, we mock out two key pieces of the website itself, the
DOM and the search index. I already had [jest][jestSite] set up, which we will
be using as our test runner. This will be integrated with testing based on
[jsdom][jsdomSite] which jest provides for us via the configuration seen in this
configuration file. This file also contains a few customizations for Preact
which mirror the configuration that we did for esbuild that facilitate JSX
parsing in the tests.

{{< emgithub "https://github.com/kujenga/website/blob/1768cf384d54b7e7ec8c88a02dc0ec3819061fc5/jest.config.js#L16-L18" >}}

To set up the DOM environment, we first import the rendered HTML file from the
output of `hugo` (this means that the build step must be run for the tests to
work). We also want a bit of example search data that we can assert
deterministic results from. For this, I pulled in descriptions from a TV series
that I spent more time watching in my earlier days than I might care to admit.
This will mock out the index on the site itself, providing us with the ability
to assert various specific behaviors.

{{< emgithub "https://github.com/kujenga/website/blob/1768cf384d54b7e7ec8c88a02dc0ec3819061fc5/assets/js/search.test.jsx#L9-L42" >}}

With that in place, we can start writing tests. Here we import the search
functionality and provide basic assertions on the `getResults` function and then
the `update` function, the latter of which is where we start referencing the
DOM that is available to us through the injected jsdom.

{{< emgithub "https://github.com/kujenga/website/blob/1768cf384d54b7e7ec8c88a02dc0ec3819061fc5/assets/js/search.test.jsx#L44-L95" >}}

To round things off, we also add a test for the initialization and "search as
you type" functionality. One of the limitations of jsdom is that navigation is
not supported within it. To work around this, I found approach in [a blog
post][locationMockPost] covering how to mock the `window.location` object in
jest, which is utilized here. With that in place, we can set the URL query
parameter to emulate the search form submission on other site pages without
complaints from jsdom. The latter tests are then also able to verify that the
jQuery-based update mechanism properly re-renders results when the query is
updated, with a bit of a nudge to have the events within jsdom be properly
triggered.

{{< emgithub "https://github.com/kujenga/website/blob/1768cf384d54b7e7ec8c88a02dc0ec3819061fc5/assets/js/search.test.jsx#L97-L141" >}}

### Browser-based testing

While the above testing provides us with a pretty high level of confidence that
search is working as expected, as I already had browser-based testing through
puppeteer up and running for this site, it was straightforward enough to add an
additional test case there which asserts that when we submit the search form on
a page, we end up on a page that displays results, and that within those
results, there is a snippet from my prior post on [building a neural network
from scratch]({{< ref "/blog/go-mlp" >}}).

{{< emgithub "https://github.com/kujenga/website/blob/1768cf384d54b7e7ec8c88a02dc0ec3819061fc5/e2e/site.test.js#L17-L30" >}}

## Alternatives and future work

While the basic search functionality provided here is perfectly fine for the
amount of content in this site presently, there are plenty of ways that the
basic approach taken here could be implemented differently, or expanded and
further refined which I'll briefly mention here.

A precursor to any meaningful iterations on a search system is a way to evaluate
the quality of results. The "seriousness" of that evaluation can scale with the
importance of the application. For example, to refine the query building logic
above I used the test cases shown above as well as manual testing with various
queries against specific pages in my site I would expect to be returned. To
provide a more formal evaluation, we could augment the above test suites to
connect to the actual built index from the site and add various [offline
measures][wikiIREvalOffline] that assert quality characteristics above a certain
threshold and in a variety of different cases. This would require building out a
dataset of test cases for search queries and expected results that the site's
performance could be measured against. As this site has more content added, or
if your site already does, setting something like that up would be a great next
step!

Additionally, while Lunr has seemed to be a great off-the-shelf fit for the
capabilities we built out here, there are alternative search implementation that
could be used for similar effect which as also aimed at static sites.
[Fuse.js](fuseJSSite) is a similarly pure javascript fuzzy-search tool that
would provide a slightly different user experience more akin to an editor.
[Stork][storkSite] is another alternative which could provide richer
functionality with match highlights, written in Rust and compiling to
[WebAssembly][wasmSite]. The [tinysearch][tinysearchGH] project uses a similar
Rust/WebAssembly architecture, but has an interesting approach of bloom filters
for the index implementation. Experimenting with different search
implementations aimed at static sites like these would be an interesting next
step here, and if you're looking at adding search to your own site you may well
be interested in picking one of these others!

I mentioned highlighting as a feature of Stork above, and at the moment the
highlighting implementation we have here fairly basic. The highlighting
algorithm could be improved by more intelligently choosing snippets from within
the content of various results rather than just using the beginning of the text,
more reliably giving the user give the user information as to reason for
relevance of particular documents. This is a rich area with a fair amount of
research available on query-based text summarization which could be interesting
to experiment with for this application[^summarization].

On the performance front, one note about our implementation here is that the
index itself is being built at load time from the raw documents built into the
browser. We could alternatively be compiling the index at the time the site is
built, and then serving the pre-built index. Lunr provides documentation on
[pre-building indexes][lunrPrebuild] that we could follow to do this. A fancy
approach to integrate this with the site build could be to leverage
[experimental esbuild plugins][esbuildPlugins] but Hugo does not support them
yet and apparently [adding support is hard][hugoESBuildPlugins]. This would cut
out on compute time in the browser, however it comes at the expense of a larger
index file that needs to be served over the network (about 4x before compression
for my site at the time of this writing, though compression and bigger sites
likely yield a better ratio), which is what dissuaded me from doing this for my
implementation, as index build times take less than 50ms. While I do pay for
bandwidth, I do not pay for those few extra CPU cycles in your browser, thus
I've decided to stick with the current approach for now.

If others seem to agree with me that this is a good way to go about implementing
Lunr search into your Hugo site, this approach may be also worth listing in the
directory of search approaches listed here:
[gohugo.io/tools/search/](https://gohugo.io/tools/search/), perhaps in a
simplified form.

Either way, I would love to hear thoughts on this approach! Feel free to leave a
comment, question, or perhaps a complaint below.


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
[^preactLimitations]: Two features that seem like they might provide this sort
  of capability are [hooks][preactHooks] and [context][preactContext] which I
  did experiment with. However these both have the perspective that the Preact
  application is the centerpiece of your UI, and when you try calling those
  methods to access or modify state from outside of a particular component,
  errors are thrown. Even the section on [side-effects][preactHooksSideEffect]
  is talking about the other way around, triggering external side effects,
  rather than external operations having side effects on Preact components
  themselves.
[^summarization]: For further exploration of text summarization, this repository
  seems to provide a fantastic set of resources, if a bit overwhelming as a
  starting point: https://github.com/icoxfog417/awesome-text-summarization. I
  also came across this blog post that gives a helpful explanation of applying
  the TextRank algorithm to summarization:
  https://towardsdatascience.com/understanding-automatic-text-summarization-1-extractive-methods-8eb512b21ecc.

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
[hugoContentView]: https://gohugo.io/templates/views/
[lunrHomepage]: https://lunrjs.com/
[lunrGettingStarted]: https://lunrjs.com/guides/getting_started.html
[lunrIndex]: https://lunrjs.com/docs/index.html
[lunrGHHighlighting]: https://github.com/olivernn/lunr.js/issues/25#issuecomment-623267494
[lunrHighlightExample]: https://github.com/olivernn/moonwalkers/blob/6d5a6e976921490033681617e92ea42e3a80eed0/build-index#L23-L29
[lunrPrebuild]: https://lunrjs.com/guides/index_prebuilding.html
[preactSite]: https://preactjs.com/
[preactFuncComponent]: https://preactjs.com/guide/v10/components/#functional-components
[preactHooks]: https://preactjs.com/guide/v10/hooks
[preactContext]: https://preactjs.com/guide/v10/context/
[preactHooksSideEffect]: https://preactjs.com/guide/v10/hooks#side-effects
[victoriaPost]: https://victoria.dev/blog/add-search-to-hugo-static-sites-with-lunr/
[ghHugoLunr]: https://github.com/dgrigg/hugo-lunr
[nodeBuildExample]: https://codewithhugo.com/hugo-lunrjs-search-index/
[wikiDRY]: https://en.wikipedia.org/wiki/Don%27t_repeat_yourself
[siteBlogSummaryView]: https://github.com/kujenga/website/blob/9598cf4764057a6a21230243107549d4f6a6f26c/layouts/blog/summary.html
[esbuildSite]: https://esbuild.github.io/
[preactHugoExample]: https://github.com/shafiemukhre/preact-hugo-esbuild
[jestSite]: https://jestjs.io/
[jsdomSite]: https://github.com/jsdom/jsdom
[locationMockPost]: https://remarkablemark.org/blog/2018/11/17/mock-window-location/#update-for-jsdom-14
[wikiIREvalOffline]: https://en.wikipedia.org/wiki/Evaluation_measures_(information_retrieval)#Offline_metrics
[fuseJSSite]: https://fusejs.io/
[storkSite]: https://stork-search.net/
[tinysearchGH]: https://github.com/tinysearch/tinysearch
[wasmSite]: https://webassembly.org/
[esbuildPlugins]: https://esbuild.github.io/plugins/
[hugoESBuildPlugins]: https://github.com/gohugoio/hugo/issues/8928
[mdnMarkElement]: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/mark
