package site

import "net/http"

// fileServer returns a handler that wraps the http.FileServer, facilitating
// any wanted customizations.
func fileServer(root http.FileSystem) http.Handler {
	fs := http.FileServer(root)
	return &server{fileServer: fs}
}

type server struct {
	fileServer http.Handler
}

func (s *server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.fileServer.ServeHTTP(w, r)
}
