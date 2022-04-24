+++
date = "2022-04-24T10:23:25-04:00"
title = "Building a Go template language playground with WASM"
description = """Creating an interactive webpage to experiment with the Go
templating language, build using WASM to run the Go standard library directly
in your browser."""
categories = ['homepage']
tags = ['Go', 'WASM', 'Templates']
images = [
]
toc = true
+++

This post walks through how I created this webpage, which pulls Go template
rendering capabilities into the browser with WebAssembly (WASM), placing them
within a dynamic app built with Preact. I was motivated to this after recently
seeing the utility of other similar environments out there for different
programming languages[^others], but to my knowledge nothing exists of this
nature for Go, despite relatively wide adoption of the Go template language for
projects like [Helm][helm] and [Hugo][hugo]. Additionally, I've been interested
for a while in incorporating WASM into an actual deployed project, and this
seemed like a great opportunity for it, as well as chance to play with
alternate approaches to help bring what are traditionally backend languages to
the browser.

**If you just want to jump over to the playground, check it out
[here][playground].**

As context for the approach I'll be walking through here, I decided to make the
Go side of this application as lightweight as possible, pairing it with a
single-page Javascript application build with [Preact][preact] to handle the
rendering layer, rather than trying to make rendering happen from within Go as
well. I'll mention some alternatives near the end of the post.

## Turning Go into WASM

As a first step, we put in place a package for the functionality we want to
expose through WASM. I did this as a separate Go module within the same
repository, under [exp/go-templates][ghExpTemplates]. Within that file, we
utilize the standard library (but experimental) [syscall/js][goSyscallJS]
package to expose basic functionality that will compile a template and render it
against the input data.

As the WASM support provided by Go is somewhat experimental and not all that
well documented, I found this webpage
[golangbot.com/webassembly-using-go/][golangbotWASM] to be a helpful guide,
walking through the fundamental steps needed to get things working.

In the below snippet we define a variable called `render` which is a function
wrapped with the [`syscall/js.FuncOf`][goSyscallJSFuncOf] function. That
variable is then set on the global context, making it available to the page that
this code is loaded into.

The function itself is relatively straightforward:
1. Parse the template
1. Decode input data
1. Execute the template

Error handling is a bit "fast and loose" here, I opted to keep things simple by
returning a single string that will be rendered into the output in order to
display error messages directly to the user. That could be split out for a more
customized UI by returning a structured object for the result.

{{< emgithub "https://github.com/kujenga/website/blob/e1a4754c5964d0a3aa5e33236628f0d829d6508f/exp/go-templates/main.go#L16-L44" >}}

With that code in place, we need to build it into the `.wasm` file that will be
executed within the browser environment. There are two pieces to that puzzle.
First, the WASM produced by Go is not be directly interpretable by the browser.
There is an intermediate layer in a file called `wasm_exec.js` which provides
several utilities for initialization. We'll see how that's used in a moment, but
for now we are just copying it into our `TARGET` directory for inclusion with
the site.

The next section here is for compiling the WASM itself. That is achieved with
the standard `go build` command, merely by adding in `GOOS=js GOARCH=wasm` as
environment variables. The `$@` Makefile syntax reverences the name of the
current rule, producing a file called `go-templates.wasm` for us. The latter
portion of that rule which specifies `$(wildcard *.go **/*.go)` indicates that
this rule should re-run whenever those files change.

{{< emgithub "https://github.com/kujenga/website/blob/e1a4754c5964d0a3aa5e33236628f0d829d6508f/exp/go-templates/Makefile#L9-L17" >}}

## Bringing WASM into the UI

Now that we have our `wasm_exec.js` and `.wasm` files in hand, we need to pull
them into our browser application. We'll do this in both places using
[Hugo][hugo] templating logic, upon which this site is built. In the below
snippet, we can actually pull the reference to the WASM file into a Go template
variable within a comment (so that JS syntax highlighting/linting is
undisturbed) using [Hugo Pipes][hugoPipes], and then pass that link into our
[Preact][preact] component for use at initialization time. By using Hugo Pipes,
we can add a hash to the filename, allowing for longer duration caching in the
browser, which is particularly useful here since these the WASM files are
somewhat sizable.

{{< emgithub "https://github.com/kujenga/website/blob/e1a4754c5964d0a3aa5e33236628f0d829d6508f/assets/js/exp/go-templates.tpl.jsx#L10-L17" >}}

We then pull in Go's `wasm_exec.js` wrapper in similar fashion, using Hugo
Pipes, but in this case as it's a standard `.js` file we can put it directly
within a script tag, SRI hash and all.

{{< emgithub "https://github.com/kujenga/website/blob/e1a4754c5964d0a3aa5e33236628f0d829d6508f/layouts/partials/footer.html#L35-L40" >}}

With those two pieces in place, we are now ready to initialize the WASM-based
functionality. The following Javascript function is called from within our
main [Preact][[preact] class for rendering the application, which is where the state
management here comes in.

There are two pieces of the WebAssembly puzzle here that are worth noting. First
is the call to `new Go()`, which activates the logic we brought in
`wasm_exec.js` earlier. Second is the call to
[`WebAssembly.instantiateStreaming`][wasmInstantiateStreaming], which uses the
path to the WASM file that we got earlier via Hugo Pipes, and starts pulling in
that WASM file and instantiating it as it is streaming in from the server. This
is generally the most efficient way to pull in WASM code. We pass in
`go.importObject` as the `importObject` parameter to this function, which maps
the WASM assembly into our running application in a useful way.

Once this is complete, we either mark it as successful, which causes the
application to perform it's first template rendering, or we mark the error
accordingly and display it to the user. The error display is useful here in
particular because WASM is not well-supported on older browser environments.

{{< emgithub "https://github.com/kujenga/website/blob/e1a4754c5964d0a3aa5e33236628f0d829d6508f/assets/js/exp/playground.jsx#L46-L71" >}}

The rest of the app is a relatively straightforward Preact (React-style)
application. It is somewhat monolithic as it is a relatively simple use case,
but gets the job done. You can see the file in it's entirety here:

[assets/js/exp/playground.jsx](https://github.com/kujenga/website/blob/e1a4754c5964d0a3aa5e33236628f0d829d6508f/assets/js/exp/playground.jsx)

One piece of interest is where the WASM code is invoked here. The `newState`
method is a helper to produce the next version of the Preact "state" that is
used to render the application in it's current form. This method is called at
various locations to add the newly rendered template state, using the
`ExpRenderGoTemplate` global function exposed from the Go WASM, to the overall
Preact state.

{{< emgithub "https://github.com/kujenga/website/blob/e1a4754c5964d0a3aa5e33236628f0d829d6508f/assets/js/exp/playground.jsx#L27-L44" >}}

To tie things off, I added a basic end to end test to ensure that the basic
functionality keeps working moving forward. These tests are written in puppeteer
and because I already had them up and running for other areas of the website, it
was as simple as adding the test case below.

{{< emgithub "https://github.com/kujenga/website/blob/e1a4754c5964d0a3aa5e33236628f0d829d6508f/e2e/site.test.js#L46-L66" >}}

## Odds and ends

It is definitely worth noting that there are other technologies out there that
could be used for this sort of thing, most notably [GopherJS][gopherjs]. Rather
than compiling to WASM, GopherJS takes the approach of compiling into Javascript
code that can then run directly in the browser. This results in a standard
Javascript file that you can use like any other, avoiding the complexities of
bundle size. It also results in a smaller file that the browser needs to load,
as the entire Go runtime doesn't need to be brought along. For these reasons,
it's a solid option and may be the better choice here. However, WASM is a really
exciting technology on the horizon[^noNeedForDocker], so I was biased towards it
going in, which swayed me in that direction.

One thorn in the side of this project was that I did need to modify my
`Content-Security-Policy` to get it to load in all browsers. I use Firefox as my
daily driver, where this all works just fine, but in order for it to work in all
of Safari, Chrome, and Edge I needed to add `unsafe-eval` to the `script-src`
directive, allowing the WebAssembly to be brought in directly. I soon hope to
swap this out for `wasm-unsafe-eval` which is a recent replacement[^cspWASM].
Further beyond that however, WASM needs a mechanism to be loaded in that is not
termed "unsafe".

vim editor settings needed tweaking to work with the file:
Another note for someone wading into these waters is that your editor by default
may not have its tooling setup to work with the `GOOS=js GOARCH=wasm` targets,
and is likely to have some errors in trying to perform normal operations on
files referencing `syscall/js`. To get around that, you can hopefully do some
sort of directory-specific customization, which is what I did here for my setup
of Vim with `gopls`.

{{< emgithub "https://github.com/kujenga/website/blob/e1a4754c5964d0a3aa5e33236628f0d829d6508f/exp/go-templates/.vim/coc-settings.json#L3-L6" >}}

Future work on this tool could extended the templating functions provided by the
standard library with additional ones, such as the
https://github.com/Masterminds/sprig functionality that is provided in Helm and Hugo.

<!-- Citations -->
[^others]: One inspiration for this project was
  http://jinja.quantprogramming.com/ which provides similar functionality for
  the [jinja](https://github.com/pallets/jinja/) templating language. I used
  their overall visual UI layout as a starting point for this project.
[^noNeedForDocker]: There is a rather fun tweet from one of the creators
  of Docker: "If WASM+WASI existed in 2008, we wouldn't have needed to created
  Docker": https://twitter.com/solomonstre/status/1111004913222324225
[^cspWASM]: More details on this are captured here:
  https://github.com/kujenga/website/issues/60

<!-- Links -->
[helm]: https://helm.sh/
[hugo]: https://gohugo.io/
[playground]: /exp/go-templates/
[ghExpTemplates]: https://github.com/kujenga/website/tree/main/exp/go-templates
[goSyscallJS]: https://pkg.go.dev/syscall/js
[golangbotWASM]: https://golangbot.com/webassembly-using-go/
[goSyscallJSFuncOf]: https://pkg.go.dev/syscall/js#FuncOf
[hugoPipes]: https://gohugo.io/hugo-pipes/introduction/#find-resources-in-assets
[wasmInstantiateStreaming]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WebAssembly/instantiateStreaming
[gopherjs]: https://github.com/gopherjs/gopherjs
