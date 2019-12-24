package site

import (
	"fmt"
	"net/http"

	"go.uber.org/zap"
)

type Server struct {
	log       *zap.Logger
	port      int
	directory string
}

func NewServer(
	logger *zap.Logger,
	port int,
	directory string,
) *Server {
	return &Server{
		log:       logger,
		port:      port,
		directory: directory,
	}
}

func (s *Server) addr() string {
	return fmt.Sprintf(":%d", s.port)
}

func (s *Server) router() http.Handler {
	mux := http.NewServeMux()

	fs := http.FileServer(http.Dir(s.directory))
	mux.Handle("/", fs)

	return mux
}

func (s *Server) Serve() {
	s.log.Info("Serving HTTP requests",
		zap.Int("port", s.port),
		zap.String("dir", s.directory),
	)

	err := http.ListenAndServe(s.addr(), s.router())
	s.log.Fatal("error service http requests", zap.Error(err))
}
