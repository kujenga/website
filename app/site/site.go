// Package site provides a server for serving a static site.
package site

import (
	_ "embed"
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/pkg/errors"
	"github.com/unrolled/secure"
	"go.uber.org/zap"
)

//go:embed content-security-policy.txt
var csp string

// Server provides operations to encapsulate the functionality needed for
// operating a web server.
type Server struct {
	c Config
}

// Config provides configuration for the web server.
type Config struct {
	Log *zap.Logger
	Dev bool

	Port      int
	Interface string
	Directory string
}

// NewServer initializes the server with the given configuration.
func NewServer(c Config) *Server {
	return &Server{c: c}
}

func (s *Server) l() *zap.Logger {
	return s.c.Log
}

func (s *Server) addr() string {
	iface := s.c.Interface
	if iface == "" && s.c.Dev {
		// Default to localhost in dev to avoid warnings on macos
		iface = "127.0.0.1"
	}
	return fmt.Sprintf("%s:%d", iface, s.c.Port)
}

func (s *Server) router() http.Handler {
	mux := http.NewServeMux()

	fs := fileServer(http.Dir(s.c.Directory))
	mux.Handle("/", fs)

	// Setup middleware for adding desired security headers.
	secureMiddleware := secure.New(secure.Options{
		AllowedHosts: []string{
			`ataylor\.io`,
			`ataylor-io\.appspot\.com`,
			`.*-dot-ataylor-io\.appspot\.com`,
		},
		AllowedHostsAreRegex:  true,
		SSLRedirect:           true,
		SSLProxyHeaders:       map[string]string{"X-Forwarded-Proto": "https"},
		STSSeconds:            31536000,
		FrameDeny:             true,
		ContentTypeNosniff:    true,
		BrowserXssFilter:      true,
		ContentSecurityPolicy: csp,
		IsDevelopment:         s.c.Dev,
	})

	return secureMiddleware.Handler(mux)
}

// Serve blocks forever, starting the server on the configured address.
func (s *Server) Serve() {
	if err := s.updateLastModifiedTimes(); err != nil {
		s.l().Fatal("error updating file modification times", zap.Error(err))
	}

	s.l().Info("Serving HTTP requests",
		zap.String("addr", s.addr()),
		zap.String("dir", s.c.Directory),
	)

	err := http.ListenAndServe(s.addr(), s.router())
	s.l().Fatal("error service http requests", zap.Error(err))
}

// Updates the last modified times of the files on disk to match the values
// from the last-modified meta tag in the index file, treating all these files
// as having been modified at the same time. The reason for this is that values
// are set to 1980 by default as part of "zeroing" as described here:
// https://issuetracker.google.com/issues/168399701
// https://buildpacks.io/docs/features/reproducibility/#consequences-and-caveats
//
// To make matters worse, the "zeroing" uses a non-zero value such that the
// following function which is supposed to omit zero-valued times doesn't work:
// https://cs.opensource.google/go/go/+/refs/tags/go1.17.5:src/net/http/fs.go;l=524-527;drc=refs%2Ftags%2Fgo1.17.5
//
// By providing proper timestamps on files, the browser caching logic which
// uses them inside the http.FileServer can continue to work as expected.
func (s *Server) updateLastModifiedTimes() error {
	// Read in the BUILD_DATE file and parse the timestamp.
	raw, err := os.ReadFile(filepath.Join(s.c.Directory, "BUILD_DATE"))
	if err != nil {
		return errors.Wrap(err, "error opening BUILD_DATE file")
	}
	buildDate, err := time.Parse(time.RFC3339, strings.TrimSpace((string)(raw)))
	if err != nil {
		return errors.Wrap(err, "invalid format for BUILD_DATE file")
	}

	// Update all the timestamps on files on disk to be the BUILD_DATE.
	return filepath.WalkDir(s.c.Directory, func(
		path string,
		d fs.DirEntry,
		err error,
	) error {
		if d.IsDir() {
			return nil
		}
		return os.Chtimes(path, time.Now(), buildDate)
	})
}
