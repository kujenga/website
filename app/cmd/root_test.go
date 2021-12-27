package cmd

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Just basic checks that things initialize and do not error.
func TestRootCmd(t *testing.T) {
	assert.NotNil(t, rootCmd)

	initializeConfig()

	s, err := getSiteServer()
	require.NoError(t, err)
	assert.NotNil(t, s)
}
