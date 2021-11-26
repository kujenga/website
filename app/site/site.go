// Package site provides a server for serving a static site.
package site

import (
	"fmt"
	"net/http"

	"github.com/unrolled/secure"
	"go.uber.org/zap"
)

const csp = `default-src 'self' 'unsafe-inline' data: *.bootstrapcdn.com https://fonts.googleapis.com https://fonts.gstatic.com https://ajax.googleapis.com https://www.google-analytics.com js-agent.newrelic.com bam.nr-data.net;`

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

	fs := http.FileServer(http.Dir(s.c.Directory))
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
	s.l().Info("Serving HTTP requests",
		zap.String("addr", s.addr()),
		zap.String("dir", s.c.Directory),
	)

	err := http.ListenAndServe(s.addr(), s.router())
	s.l().Fatal("error service http requests", zap.Error(err))
}
