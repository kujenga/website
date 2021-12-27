package cmd

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

// Just basic checks that things initialize and do not error.
func TestRootCmd(t *testing.T) {
	assert.NotNil(t, rootCmd)

	s := getSiteServer()
	assert.NotNil(t, s)
}
