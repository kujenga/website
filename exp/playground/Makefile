
TARGET := ../../static/exp

.PHONY: all
all: \
	$(TARGET)/wasm_exec.js \
	$(TARGET)/playground.wasm

$(TARGET)/wasm_exec.js:
	mkdir -p $(dir $@)
	cp $(shell go env GOROOT)/misc/wasm/wasm_exec.js $@

$(TARGET)/playground.wasm: $(wildcard *.go **/*.go)
	mkdir -p $(dir $@)
	GOOS=js GOARCH=wasm go build \
	     -o $@
	du -sh $@

.PHONY: dev
dev:
	$(MAKE) ARGS=--watch
