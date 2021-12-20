package site

import (
	"embed"
	"io/fs"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/pkg/errors"
)

//go:embed public
var content embed.FS

// Constant matching the directory that we embed, for use in stripping that
// prefix from the file system.
const contentDirectory = "public"

// fileServer returns an http.FileServer handler serves static content loaded
// from the embedded public/ directory, serving static assets that are not
// handled by App Engine itself.
//
// The reason that we are motivated to do this is that App Engine strips away
// the modification timestamps from the files that are in the running container
// as described here:
// https://issuetracker.google.com/issues/168399701
// https://buildpacks.io/docs/features/reproducibility/#consequences-and-caveats
//
// To make matters worse, the "zeroing" uses a non-zero value such that the
// following function which is supposed to omit zero-valued times doesn't work:
// https://cs.opensource.google/go/go/+/refs/tags/go1.17.5:src/net/http/fs.go;l=524-527;drc=refs%2Ftags%2Fgo1.17.5
//
// By embedding the files into the binary at compilation time, we use the
// default behavior there where the file timestamps are set to the actual zero
// value by Go's definition. This causes the Last-Modified header to be
// ommitted. See this issue for more information:
// https://github.com/golang/go/issues/44854
func fileServer() (http.Handler, error) {
	// Trim the prefix from the directory in order to serve content as
	// though static files are at the root.
	servedDirectory, err := fs.Sub(content, contentDirectory)
	if err != nil {
		return nil, err
	}

	// Read in the BUILD_DATE file and parse the timestamp.
	raw, err := fs.ReadFile(servedDirectory, "BUILD_DATE")
	if err != nil {
		return nil, errors.Wrap(err, "error opening BUILD_DATE file")
	}
	buildDate, err := time.Parse(time.RFC3339, strings.TrimSpace((string)(raw)))
	if err != nil {
		return nil, errors.Wrap(err, "invalid format for BUILD_DATE file")
	}

	// Static file handler

	return http.FileServer(
		&staticFSWrapper{
			FileSystem:   http.FS(servedDirectory),
			FixedModTime: buildDate,
		},
	), nil
}

// These wrappers are based off of the workaround presented here to avoid the
// issue where the modifications times of the embedded file system are all set
// to a zero value. By specifying a statically fixed value, we give all the
// files the same more useful timestamp.
// https://github.com/golang/go/issues/44854#issuecomment-808906568

type staticFSWrapper struct {
	http.FileSystem
	FixedModTime time.Time
}

func (f *staticFSWrapper) Open(name string) (http.File, error) {
	file, err := f.FileSystem.Open(name)

	return &staticFileWrapper{File: file, fixedModTime: f.FixedModTime}, err
}

type staticFileWrapper struct {
	http.File
	fixedModTime time.Time
}

func (f *staticFileWrapper) Stat() (os.FileInfo, error) {

	fileInfo, err := f.File.Stat()

	return &staticFileInfoWrapper{
		FileInfo:     fileInfo,
		fixedModTime: f.fixedModTime,
	}, err
}

type staticFileInfoWrapper struct {
	os.FileInfo
	fixedModTime time.Time
}

func (f *staticFileInfoWrapper) ModTime() time.Time {
	return f.fixedModTime
}
