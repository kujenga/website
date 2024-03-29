// Package site provides a server for serving a static site.
package site

import (
	_ "embed"
	"fmt"
	"net/http"

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
		// Default to localhost in dev for a safer default
		// behavior and to avoid warnings on macos.
		iface = "127.0.0.1"
	}
	return fmt.Sprintf("%s:%d", iface, s.c.Port)
}

func (s *Server) router() http.Handler {
	mux := http.NewServeMux()

	fs, err := fileServer()
	if err != nil {
		s.l().Fatal("error initializing file server", zap.Error(err))
	}
	mux.Handle("/", fs)

	// Setup middleware for adding desired security headers.
	secureMiddleware := secure.New(secure.Options{
		AllowedHosts: []string{
			`ataylor\.io`,
			`ataylor-io\.appspot\.com`,
			`.*-dot-ataylor-io\.appspot\.com`,
			`.*-dot-ataylor-io\.uc\.r\.appspot\.com`,
		},
		AllowedHostsAreRegex: true,
		SSLRedirect:          true,
		SSLProxyHeaders: map[string]string{
			"X-Forwarded-Proto": "https",
		},
		STSSeconds:            31536000,
		FrameDeny:             true,
		ContentTypeNosniff:    true,
		BrowserXssFilter:      true,
		ContentSecurityPolicy: csp,
		IsDevelopment:         s.c.Dev,
	})
	secureMiddleware.SetBadHostHandler(
		(http.HandlerFunc)(s.handleBadHosts))

	return secureMiddleware.Handler(mux)
}

// Serve blocks forever, starting the server on the configured address.
func (s *Server) Serve() error {
	s.l().Info("Serving HTTP requests", zap.String("addr", s.addr()))

	return http.ListenAndServe(s.addr(), s.router())
}

// Default host to redirect to for known error cases.
const defaultHost = "ataylor.io"

// handleBadHosts provides an HTTP handler for better behavior for bad
// hostnames that are not the primary hostname the server is configured for.
func (s *Server) handleBadHosts(w http.ResponseWriter, r *http.Request) {
	switch r.Host {
	// For known hosts that are not explicitly "allowed", redirect
	// to the main site.
	case "www.ataylor.io", "aarontaylor.xyz", "www.aarontaylor.xyz":
		r.URL.Host = defaultHost
		http.Redirect(w, r, r.URL.String(), http.StatusFound)
	default:
		s.l().Info("Bad Host", zap.String("host", r.Host))
		// Returning a 4XX error as this is not something the server
		// itself did wrong.
		http.Error(w, "Bad Host", http.StatusBadRequest)
	}
}
