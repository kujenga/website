+++
date = "2022-04-24T10:23:25-04:00"
title = "Building a Go template playground with Wasm"
description = """Creating an interactive live parser to experiment with the Go
templating language, built using WebAssembly and running the Go standard library
directly in your browser."""
categories = ['homepage']
tags = ['Go', 'Wasm', 'Templates']
images = [
]
toc = true
+++

This post walks through how I created the [Go Templates Playground][playground].
It pulls Go template rendering capabilities directly into your browser with
[WebAssembly][wasm] (Wasm). I was motivated to this after recently seeing the
utility of other similar environments out there for different programming
languages[^others]. The Go template language has relatively wide adoption in
projects like [Helm][helm] and [Hugo][hugo], which this tool can be used to
prototype and experiment for. I've also been interested in incorporating Wasm
into a deployed project, and this was a great opportunity for it, as well as
chance to play with alternate approaches to help bring what are traditionally
backend languages to the browser. It is built into my [personal site][ghRepo] to
simplify development and deployment.

**If you just want to jump over to the playground, check it out
[here][playground].**

As context for the approach I'll be walking through here, I decided to make the
Go side of this application as lightweight as possible, pairing it with a
single-page Javascript application built with [Preact][preact] that handles the
rendering layer, rather than trying to make rendering happen from within Go as
well. The result is a fully static page with no server-side logic. I'll mention
some alternatives near the end of the post.

## Turning Go into Wasm

As a first step, we setup a Go module for the functionality we want to expose
through Wasm. I did this as a separate Go module within the same repository as
the site itself, under [exp/go-templates][ghExpTemplates]. Within that file, we
utilize the standard library (but experimental) [syscall/js][goSyscallJS]
package to expose basic functionality that will compile a template and render it
with the input data.

As the Wasm support provided by Go is somewhat experimental and does not seem
not all that well documented, I found this webpage
[golangbot.com/webassembly-using-go/][golangbotWasm] to be a helpful guide,
walking through the fundamental steps needed to get things working.

In the below snippet we define a variable called `render` which is a function
wrapped with the [`syscall/js.FuncOf`][goSyscallJSFuncOf] function. In the last
line of the snippet, that variable is then set on the `global` object, making it
available globally on the page that this code is loaded into. You can click
through at the bottom of the snippet to see the full file.

The function itself is relatively straightforward, performing the following
steps:
1. Parse the template
1. Decode input data
1. Execute the template

For executing the template, we also optionally pull in the [sprig][sprigSite]
template function library, which is commonly used in projects that make use of
Go template to add a large suite of functions for common tasks. It is optional
to provide a toggle for whether or not it should be disabled/enabled.

Error handling is a bit "fast and loose" here. I opted to keep things simple by
returning a single string that will be rendered into the output in order to
display error messages directly to the user. That could be split out for a more
customized UI by returning a structured object for the result.

{{< emgithub "https://github.com/kujenga/website/blob/66789e78b4ab7bf3a9245e88fd6a272db1653330/exp/go-templates/main.go#L24-L60" >}}

With that code in place, we need to build it into the `.wasm` file that will be
executed within the browser environment. There are two pieces to that puzzle,
captured in these Makefile rules. First, the Wasm produced by Go is not be
directly interpretable by the browser. There is an intermediate layer in a file
called `wasm_exec.js` which provides several utilities for initialization. We'll
see how that's used in a moment, but for now we are just copying it into our
`TARGET` directory for inclusion with the site.

The next section here is for compiling the Wasm itself. That is achieved with
the standard `go build` command, merely by adding in `GOOS=js GOARCH=wasm` as
environment variables. The `$@` Makefile syntax reverences the name of the
current rule, producing a file called `go-templates.wasm` for us. The latter
portion of that rule which specifies `$(wildcard *.go **/*.go)` indicates that
this rule should re-run whenever those files change.

{{< emgithub "https://github.com/kujenga/website/blob/66789e78b4ab7bf3a9245e88fd6a272db1653330/exp/go-templates/Makefile#L9-L17" >}}

## Bringing Wasm into the UI

Now that we have our `wasm_exec.js` and `.wasm` files in hand, we need to pull
them into our webpage. We'll do this for both files using [Hugo][hugo]
templating logic, upon which this site is built. In the below snippet, we can
actually pull the reference to the Wasm file into a Go template variable within
a comment (so that JS syntax highlighting/linting is undisturbed) using [Hugo
Pipes][hugoPipes], and then pass that link into our [Preact][preact] component
for use at initialization time. By using Hugo Pipes, we can add a hash to the
filename, allowing for longer duration caching in the browser, which is
particularly useful here since these the Wasm files are somewhat sizable
(multiple MBs).

{{< emgithub "https://github.com/kujenga/website/blob/66789e78b4ab7bf3a9245e88fd6a272db1653330/assets/js/exp/go-templates.tpl.jsx#L10-L17" >}}

We then pull in Go's `wasm_exec.js` wrapper in similar fashion, using Hugo
Pipes, but in this case as it's a standard `.js` file we can put it directly
within a script tag, SRI hash and all.

{{< emgithub "https://github.com/kujenga/website/blob/66789e78b4ab7bf3a9245e88fd6a272db1653330/layouts/partials/footer.html#L35-L40" >}}

With those two pieces in place, we are now ready to initialize the Wasm-based
functionality. The following Javascript function is called from within our
main [Preact][preact] class for rendering the application, which is why there
are various function calls for updating application state.

There are two pieces of the WebAssembly puzzle here that are worth taking note
of. First is the call to `new Go()`, which activates the logic we brought in
with `wasm_exec.js` earlier. Second is the call to
[`WebAssembly.instantiateStreaming`][wasmInstantiateStreaming], which takes in a
stream from fetching the Wasm file that we got earlier via Hugo Pipes, and
instantiating it, as it is streaming in from the server. This is generally the
most efficient way to pull in Wasm code. We pass in `go.importObject` as the
`importObject` parameter to this function, which maps the Wasm assembly into our
running application in a useful way.

Once this is complete, we either mark it as successful in the promise, which
causes the application to perform it's first template rendering, or we mark the
error accordingly and display it to the user. The error display is useful here
in particular because Wasm is not well-supported on older browser environments.

{{< emgithub "https://github.com/kujenga/website/blob/66789e78b4ab7bf3a9245e88fd6a272db1653330/assets/js/exp/playground.jsx#L57-L82" >}}

The rest of the app is a relatively straightforward Preact (React-style)
application. It is somewhat monolithic as it is a relatively simple use case,
but gets the job done. You can see the file in it's entirety here:

[assets/js/exp/playground.jsx](https://github.com/kujenga/website/blob/66789e78b4ab7bf3a9245e88fd6a272db1653330/assets/js/exp/playground.jsx)

One interesting piece of that code is where the Wasm code is invoked. The
`newState` method shown here is a helper to produce the next version of the
Preact "state" that is used to render the application. This method is called at
various locations to add the newly rendered template state, using the
`ExpRenderGoTemplate` global function exposed from the Go Wasm, to the overall
Preact state.

{{< emgithub "https://github.com/kujenga/website/blob/66789e78b4ab7bf3a9245e88fd6a272db1653330/assets/js/exp/playground.jsx#L36-L55" >}}

To tie things off, I added a basic end to end test to ensure that the basic
functionality keeps working moving forward. These tests are written in puppeteer
and because I already had the puppeteer logic up and running for other areas of
the website, it was as simple as adding the test case we see here.

{{< emgithub "https://github.com/kujenga/website/blob/66789e78b4ab7bf3a9245e88fd6a272db1653330/e2e/site.test.js#L46-L66" >}}

## Odds and ends

It is definitely worth noting that there are other technologies out there that
could be used for this sort of thing, most notably [GopherJS][gopherjs]. Rather
than compiling to Wasm, GopherJS takes the approach of compiling into Javascript
code that can then run directly in the browser. This results in a standard
Javascript file that you can use like any other, avoiding the complexities of
instantiating WebAssembly and browser compatibility concerns. It also results in
a smaller file that the browser needs to load, as the entire Go runtime doesn't
need to be brought along. For these reasons, it's a solid option and all things
considered, may be the better choice here. However, Wasm is a really exciting
technology on the very near horizon[^noNeedForDocker], so I was biased towards
it going in.

If you are interested in GopherJS, one opportunity to be aware of is that you
can pair GopherJS itself with libraries like [gopherjs/jquery][gopherJSJquery]
that control the UI rendering layer directly, allowing you to put as much of
your rendering logic into the Go code as you might like. I experimented with
these options but ultimately decided that it would be more efficient and seem to
have a better end result to build the rendering layer directly with web-oriented
technologies, which is how I landed on the Preact-based approach.

One thorn in the side of this project was that I did need to modify my site's
`Content-Security-Policy` to get the WebAssembly to load in all browsers. I use
Firefox as my daily driver, where this all works just fine, but in order for it
to work in all of Safari, Chrome, and Edge I needed to add `unsafe-eval` to the
`script-src` directive, allowing the WebAssembly to be brought in directly. I
soon hope to swap this out for `wasm-unsafe-eval` which is a recent
replacement[^cspWasmIssue]. Going beyond that however, Wasm needs a mechanism to be
loaded in that is not termed "unsafe"[^wasmCSPProposal].

Another note for someone wading into these waters is that your editor by default
may not have its tooling setup to work with the `GOOS=js GOARCH=wasm` targets,
and is likely to have some errors in trying to perform normal operations on
files referencing `syscall/js`. To get around that, you can hopefully do some
sort of directory-specific customization, which is what I did here for my setup
of Vim with `gopls`.

{{< emgithub "https://github.com/kujenga/website/blob/66789e78b4ab7bf3a9245e88fd6a272db1653330/exp/go-templates/.vim/coc-settings.json#L3-L6" >}}

If you made it this far I hope that you enjoyed this post, and that you will get
some utility out of the templating playground itself! If you have any feedback
or questions, feel free to leave a comment or reach out. If you want to
experiment with the code locally, check out the [README][repoReadme] for the
repository to install, and you can play around with the files above.
Contributions or suggestions would be very welcome!

<!-- Citations -->
[^others]: One inspiration for this project was
  http://jinja.quantprogramming.com/ which provides similar functionality for
  the [jinja](https://github.com/pallets/jinja/) templating language. I used
  their overall visual UI layout as a starting point for this project.
[^noNeedForDocker]: There is a rather fun tweet from one of the creators
  of Docker: "If Wasm+WASI existed in 2008, we wouldn't have needed to created
  Docker": https://twitter.com/solomonstre/status/1111004913222324225
[^cspWasmIssue]: More details on this are captured here:
  https://github.com/kujenga/website/issues/60
[^wasmCSPProposal]: This GitHub repository seems to be the most recent proposal
  along these lines:
  https://github.com/WebAssembly/content-security-policy/blob/main/proposals/CSP.md
  with discussion happening in the issues:
  https://github.com/WebAssembly/content-security-policy/issues?q=is%3Aissue+sort%3Aupdated-desc

<!-- Links -->
[wasm]: https://webassembly.org/
[playground]: /exp/go-templates/
[ghRepo]: https://github.com/kujenga/website
[preact]: https://preactjs.com/
[helm]: https://helm.sh/
[hugo]: https://gohugo.io/
[ghExpTemplates]: https://github.com/kujenga/website/tree/main/exp/go-templates
[goSyscallJS]: https://pkg.go.dev/syscall/js
[golangbotWasm]: https://golangbot.com/webassembly-using-go/
[goSyscallJSFuncOf]: https://pkg.go.dev/syscall/js#FuncOf
[sprigSite]: https://github.com/Masterminds/sprig
[hugoPipes]: https://gohugo.io/hugo-pipes/introduction/#find-resources-in-assets
[wasmInstantiateStreaming]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WebAssembly/instantiateStreaming
[gopherjs]: https://github.com/gopherjs/gopherjs
[gopherJSJquery]: https://github.com/gopherjs/jquery
[repoReadme]: https://github.com/kujenga/website#development
