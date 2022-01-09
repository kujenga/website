package site

import (
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestDevServer(t *testing.T) {
	log, err := zap.NewDevelopment()
	require.NoError(t, err)
	s := NewServer(Config{
		Log:  log,
		Dev:  true,
		Port: 12345,
	})

	// Basic assertions
	assert.NotNil(t, s.l())
	assert.Equal(t, "127.0.0.1:12345", s.addr())

	h := s.router()
	assert.NotNil(t, h)

	t.Run("successful request", func(t *testing.T) {
		rw := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		h.ServeHTTP(rw, req)

		resp := rw.Result()
		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})

	t.Run("not found request", func(t *testing.T) {
		rw := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/nope/", nil)
		h.ServeHTTP(rw, req)

		resp := rw.Result()
		assert.Equal(t, http.StatusNotFound, resp.StatusCode)
	})
}

func TestProdServer(t *testing.T) {
	log, err := zap.NewDevelopment()
	require.NoError(t, err)
	s := NewServer(Config{
		Log:       log,
		Dev:       false,
		Port:      12345,
		Interface: "127.0.0.1",
	})

	// Basic assertions
	assert.NotNil(t, s.l())
	assert.Equal(t, "127.0.0.1:12345", s.addr())

	h := s.router()
	assert.NotNil(t, h)

	ts := httptest.NewServer(h)

	t.Run("unknown invalid host request", func(t *testing.T) {
		req, err := http.NewRequest(
			http.MethodGet, ts.URL, nil)
		require.NoError(t, err)
		req.Host = "hacker.com"
		resp, err := ts.Client().Do(req)
		require.NoError(t, err)

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
		b, err := io.ReadAll(resp.Body)
		assert.NoError(t, err)
		assert.Contains(t, string(b), "Bad Host")
	})

	t.Run("known invalid host redirect", func(t *testing.T) {
		req, err := http.NewRequest(
			http.MethodGet,
			ts.URL+"/example?k=v",
			nil)
		require.NoError(t, err)
		req.Host = "www.ataylor.io"
		c := ts.Client()
		// Disable redirects for this test so that we can validate the
		// 302 response and location header.
		c.CheckRedirect = func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		}
		resp, err := c.Do(req)
		require.NoError(t, err)

		assert.Equal(t, http.StatusFound, resp.StatusCode)
		b, err := io.ReadAll(resp.Body)
		assert.NoError(t, err)
		assert.Contains(t, string(b), "Found")
		assert.Equal(t,
			"//ataylor.io/example?k=v",
			resp.Header.Get("Location"),
		)
	})
}
