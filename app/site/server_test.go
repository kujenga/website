package site

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFileServer(t *testing.T) {
	h, err := fileServer()
	require.NoError(t, err)

	rw := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	h.ServeHTTP(rw, req)

	resp := rw.Result()
	assert.Equal(t, http.StatusOK, resp.StatusCode)
}
