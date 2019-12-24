package main

import (
	"flag"
	"fmt"
	"net/http"

	"go.uber.org/zap"
)

func main() {
	port := flag.Int("p", 8080, "port to listen on")
	directory := flag.String("d", "./public", "static file directory to host")
	flag.Parse()

	logger, err := zap.NewProduction()
	if err != nil {
		panic(err)
	}
	defer logger.Sync()

	(&server{
		log:       logger,
		port:      *port,
		directory: *directory,
	}).serve()
}

type server struct {
	log       *zap.Logger
	port      int
	directory string
}

func (s *server) addr() string {
	return fmt.Sprintf(":%d", s.port)
}

func (s *server) router() http.Handler {
	mux := http.NewServeMux()

	fs := http.FileServer(http.Dir(s.directory))
	mux.Handle("/", fs)

	return mux
}

func (s *server) serve() {
	s.log.Info("Serving HTTP requests",
		zap.Int("port", s.port),
		zap.String("dir", s.directory),
	)

	err := http.ListenAndServe(s.addr(), s.router())
	s.log.Fatal("error service http requests", zap.Error(err))
}
