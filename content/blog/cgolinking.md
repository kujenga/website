+++
date = "2015-06-20T22:23:41-04:00"
title = "Linking Dynamic C++ Libraries with Go"
description = "Creating a Go wrapper around a cross-platform build process for a dynamically built and linked C++ library"

draft = true
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

## Translating success to Go

## Next Steps

## The Code
[Github Repository](https://github.com/kujenga/gosnow)

### References
- [The Go Blog - C? Go? Cgo!](http://blog.golang.org/c-go-cgo)