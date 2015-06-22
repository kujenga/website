+++
date = "2015-06-20T22:23:41-04:00"
title = "Linking Dynamic C++ Libraries with Go"
description = "Creating a Go wrapper around a cross-platform build process for a dynamically built and linked C++ library"
categories = []
tags = []
+++

These days, I spend a lot of time working with, designing, and implementing APIs. Since [Meta](https://meta.sc) is a microservices based application, the contracts that those APIs provide are crucial to designing the interactions with them. Quickly, maintaining good documentation and client libraries becomes nearly as important of a part of the applications as the code itself. Each step forward in functionality must provide solid footing to keep on building.

A spectacular tool that we have been using is [Apiary](https://apiary.io), a service that provides API documentation through a super set of markdown that is fully parsable, providing mocked APIs and examples through a single set of documentation. The format of this markdown documentation is [API Blueprint](https://apiblueprint.org) format, for which the documentation and a rich set of parsing libraries and tooling has been released under the MIT license.

### A Confluence of Interests

The core parsing library for the API BLueprint format is called [Snow Crash](https://github.com/apiaryio/snowcrash) and is written in C++. Built on top of this library is a tool called [Drafter](https://github.com/apiaryio/drafter), also a C++ library, which provides a cleaner interface to interact with the primary purpose of Snow Crash, parsing human readable markdown into json.

There are two client libraries currently available for drafter. [Protagonist](https://github.com/apiaryio/protagonist) is written in Node.js, and [RedSnow](https://github.com/apiaryio/redsnow) is written in Ruby. I mostly am writing Go these days, so this seemed like a great opportunity to add a Go client library for the core Snow Crash parsing library.

Since the core library is written in C++, this means that it would also be a chance to work with [cgo](http://golang.org/cmd/cgo/), the Go language's too to interact with C code. This is something that's been on my want-to-do list for a while, but this seemed like the perfect opportunity to dive in.

## Experimenting with cgo
The Go blog has a great post to get started with C and Go called [C? Go? Cgo!](http://blog.golang.org/c-go-cgo) that I used to get initially up and running.

```go
package main

/*
#include <stdlib.h>
*/
import "C"
import (
    "fmt"
    "time"
)

func Random() int {
    return int(C.random())
}

func Seed(i int) {
    C.srandom(C.uint(i))
}

func main() {
    fmt.Printf("Deterministic random: %v\n", Random())
    Seed(int(time.Now().Unix()))
    fmt.Printf("Seeded random: %v\n", Random())
}
```

## Remembering C

The existing wrapper libraries use the Drafter source as a git submodule which is compiled into a shared library for use by the wrapper. Most of my experience with C/C++ is either with simple projects in a single folder with only standard library dependencies, or from within an IDE that handles most of the complexities of compilation for you. Since there would be a bigger manual component to this project, creating a simple proof of concept interface written in C seemed like a prudent first step.

I would be wrapping the [C-Interface](https://github.com/apiaryio/drafter/blob/master/README.md#c-interface) described in the project's README file, so getting the example code up and running seemed to be a good start.

#### Drafter C-based test code
```c
#include <stdio.h>
#include <stdlib.h>
#include "cdrafter.h"

int main(int argc, char const *argv[])
{
    const char* source = "# My API\n## GET /message\n + Response 200 (text/plain)\n\n        Hello World\n";
    char *result = NULL;
    int ret = drafter_c_parse(source, 0, &result);

    printf("Result: %s\n", ret == 0 ? "OK" : "ERROR");
    printf("Serialized JSON result:\n%s\n", result);

    free(result); /* we MUST release allocted memory for result */
}
```

We'll be doing a two step compilation process here to allow for proper linking between the C code and the shared library. With the above code snippet in a file called `ctest.c`, we can compile that into an object file using the following command:
```
gcc -Wall -c ctest.c -I./drafter/src/ -I./drafter/ext/snowcrash/src/
```

The `-I` flags add the specified directory to the include search path, allowing for the `cdrafter.h` file and the headers which it contains to be used in creating the object file.

After this command is executed, we end up with a file called `ctest.o`, which is the object file for the c code above. This `.o` file needs to be again compiled in order to properly link it to the dynamic library for drafter. This is the tricky part. A big help to me here was looking at the how the RedSnow library sets up ruby's FFI module to interact with Drafter's C interface. 

### Detour into Ruby
From looking at [binding](https://github.com/apiaryio/redsnow/blob/master/lib/redsnow/binding.rb) file for the RedSnow library, two things became clear. First, there were platform dependent aspects of this compilation process. These will be especially important in setting up CI for my library later on. The other element present here was that the dynamic library itself was not created by the build process described in Drafter's README. looking at the [`Rakefile`](https://github.com/apiaryio/redsnow/blob/master/Rakefile) for RedSnow, I found a special configuration option which prompted the creation of a shared library, a `--shared` flag on the build configuration for Drafter.

Still, there were a few more uncertainties. Being unfamiliar with the specifics of dynamic library compilation, there were a few interactions with Ruby's FFI library that I wanted to understand more. So, taking inspiration from Go's best practice of reading the source code, I dived into the [FFI source](https://github.com/ffi/ffi). The [`lib/ffi/platform.rb`](https://github.com/ffi/ffi/blob/master/lib/ffi/platform.rb) file contained most of what I was looking for. The definition of `LIBSUFFIX` and the way that platform tests were handled would be very useful later on. For now, I was that Mac dynamic libraries have a `.dylib` extension. That and the compilation configuration were just what I needed.

### Back to C
Armed with this knowledge of how the Ruby wrapper library handled setting up the C bindings, I hashed through getting my simple C example working.

The next step was to compile the shared library for Drafter. Using the `./configure --shared` and `make` commands that drafter comes with. Behind the scenes, Drafter and its dependencies use the [GYP](https://code.google.com/p/gyp/) build system to configure their compilation process. On Mac, that build process creates a `libdrafter.dylib` file.

Specifying the location of this file requires custom flags for the compiler command. With a bit of searching I was able to find the `-L` flag, which, similarly to the `-I` flag, specifies a search directory for the compilation process as a whole. By specifying both Drafter's build directory and dynamic library itself, we had a compiling C program!

```
gcc ctest.o -L./drafter/build/out/Release/ -ldrafter -o ctest
```

Unfortunately, a compiling C program doesn't always mean a running C program. I was getting an error of the form:

```
./ctest
dyld: Library not loaded: /usr/local/lib/libdrafter.dylib
  Referenced from: /Users/ataylor/go/src/github.com/kujenga/gosnow/./ctest
  Reason: image not found
make: *** [test] Trace/BPT trap: 5
```

After looking into the usage of `-rpath` or `@rpath`, which allows for the specification of runtime search paths within the binary, without much success, the simplest option that I came across was to put a soft link from the location of the custom compiled dynamic library for Drafter to the global system library location, `/usr/local/lib/` on Mac, effectively installing this library on my computer.

Finally, it worked! I just about jumped for joy. After hours of tweaks and research, I was calling into a custom compiled dynamic library, something I hadn't a clue about just a day earlier.

## Translating to Go
After successfully creating a C version of the basic functionality that I wanted to implement, and with a basic understanding of Go's interop with C, I started porting the example code to a Go version with the same functionality.

The [cgo documentation](https://golang.org/cmd/cgo/) specified a variety of pseudo directives that can be used for customizing the behavior of GCC as executed by Go. The two most relevant seemed to be `CFLAGS`, for the initial compilation of the C code, and `LDFLAGS`, for linking libraries with the compiled code.

I simply copied the options for the first compilation step for the C program as the value for `CFLAGS`, and for options for the second compilation step as the value for `LDFLAGS`, and to my great delight, it worked! The jump from C to Go had been the easiest part so far.

### Writing Tests
I got the code up and running as a single file using the command `go run main.go`, treating it as a single file. Since my goal was to have this be a wrapper library, my next logical step was to convert this into a package with some tests! Unfortunately, this change introduced another error.

```
duplicate symbol _main in:
    $WORK/github.com/kujenga/gosnow/_test/_obj_test/_cgo_main.o
    $WORK/github.com/kujenga/gosnow/_test/_obj_test/ctest.o
ld: 1 duplicate symbol for architecture x86_64
clang: error: linker command failed with exit code 1 (use -v to see invocation)
FAIL    github.com/kujenga/gosnow [build failed]
```

The issue here was that after changing the go code to be a package, the Go compiler was treating my unrelated C test program as part of the package, and since Go creates its own `main` method in tests, there was a duplicate main method. Moving the C file to a subdirectory got things back up and running.

## Continuous Integration
These days, it seems like any open source library or project worth its salt has a continuous integration setup and test coverage metrics proudly displayed at the top of its README file. This would require building the project on a Linux machine in the cloud. As I saw while digging into Ruby's FFI source code, there are a number of things to be aware of when compiling on Linux. I'm punting on Windows support for now, although theoretically it wouldn't be too difficult.

There are two differences in the compilation of the Drafter library to be aware of. The first is in the location of the compiled result. On Linux, it is a directory below where it is on Mac in a `lib.target/` folder. Secondly, it has an extension of `.so` rather than `.dylib`. Taking these into account, I was still having trouble providing the library to the Go code at runtime. The package could not be installed without the use of `sudo` in the CI configuration, which seemed like an ugly fix.

After experimenting manually on a Linux server, I found that the `LD_LIBRARY_PATH` environment variable, which I had run into earlier in my research but was unhelpful on the Mac, solved my problem quite nicely. By specifying the proper path as an environment variable in the CI setup, I was able to get a working build on [Travis-CI](https://travis-ci.org/kujenga/gosnow). To monitor test coverage of the library, I setup the Travis build to send reports to [Coveralls](https://coveralls.io/r/kujenga/gosnow) using the [goveralls](https://github.com/mattn/goveralls) library. With a link to the [godoc](https://godoc.org/github.com/kujenga/gosnow) for this project, things were looking good!

## Implementation
With the example code working, I began implementing functionality similar to that provided by the Ruby library, with structured, parsed versions of the JSON output from Drafter nicely formatted into Go structs. It's a rather complex data structure to represent, but I was able to replicate the elements of the abstract syntax tree, defined in the [`Blueprint.h`](https://github.com/apiaryio/snowcrash/blob/master/src/Blueprint.h) file within the Snow Crash library. My version was mostly a port of what is present in the RedSnow library currently. Still remaining is the task of providing struct-based representation of the sourcemap format, as specified in the [`BlueprintSourcemap.h`](https://github.com/apiaryio/snowcrash/blob/master/src/BlueprintSourcemap.h) file in the Snow Crash repository. I also wrote a series of tests utilizing the [fixtures]() from RedSnow as well as some of my own. I still have some work to do to ensure that there is complete parity between the structs I created and the syntax specification itself, but at the very least the code runs without errors.

### Improvements
There are a few things which could be improved about the installation and function of this library. Firstly, to encapsulate the behavior necessary to install this library, I created a makefile with the appropriate options for the various build environments that the code would be running in. Go is trying to move away from tooling that isn't endogenous to Go itself, so a better solution here is desired.

Additionally, in order to get cgo to compile properly for both Mac and the Linux CI server, I added both possible directories to the flags specified in my Go code. This works, but causes warnings at compile time which I would like to eliminate.

At its core, the frustration here is that the `go get` command, which generally provides a universal way to simply install a go library, does not accomplish what we want in this case. The best option here is to use the [pkg-config](http://www.freedesktop.org/wiki/Software/pkg-config/) specification to enumerate what must occur to install this library. This [blog post](http://www.goinggo.net/2013/08/using-cgo-with-pkg-config-and-custom.html) has a great example of doing just that which I plan to pursue in the future.

One concession that would have to be made in order to make this library "go gettable" is to vendor the Drafter library within the repository itself. As is documented by [Golang issue 7764](https://github.com/golang/go/issues/7764), git submodules, which I am currently using to keep track of Drafter, are not automatically retrieved by the `go get` tool, and it is uncertain whether they ever will be. I'll be keeping an eye on that issue.

### Future Work
I touched briefly on how defining APIs is crucial to my work at [Meta](https://meta.sc). My eventual goal with this library is to build off of it to use out existing documentation for our APIs to generate arbitrary other forms of output, including client libraries for our APIs, mock interfaces for testing our micro services, and even things like [Postman](https://www.getpostman.com) collections, all from a single API definition. Doing this through Go's built in [code generation](http://blog.golang.org/generate) functionality is my next goal, and will likely be the topic of a future blog post.

### The Code
My code is up on Github at [github.com/kujenga/gosnow](https://github.com/kujenga/gosnow). Check out the [godoc](https://godoc.org/github.com/kujenga/gosnow) for information on using the library. Like Drafter and most of the code underneath is, gosnow is MIT Licensed.

### References
- [The Go Blog - C? Go? Cgo!](http://blog.golang.org/c-go-cgo)
- [Going Go - Using C Dynamic Libraries In Go Programs](http://www.goinggo.net/2013/08/using-c-dynamic-libraries-in-go-programs.html)
- [Going Go - Using CGO with Pkg-Config And Custom Dynamic Library Locations](http://www.goinggo.net/2013/08/using-cgo-with-pkg-config-and-custom.html)

