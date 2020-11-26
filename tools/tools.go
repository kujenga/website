// +build tools

// Package tools container Go tooling dependencies for this repository.
//
// This file follows a discussed but unofficial pattern for "tool" dependencies management in Go. References:
// - https://github.com/golang/go/issues/25922
// - https://github.com/go-modules-by-example/index/blob/master/010_tools/README.md
package tools

import (
	_ "github.com/gohugoio/hugo"
)
