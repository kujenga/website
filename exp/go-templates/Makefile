
TARGET := ../../assets/js/exp/wasm
GOROOT := $(shell go env GOROOT)
WASM_EXEC_JS := $(or $(wildcard $(GOROOT)/lib/wasm/wasm_exec.js), $(GOROOT)/misc/wasm/wasm_exec.js)

.PHONY: all
all: \
	$(TARGET)/wasm_exec.js \
	$(TARGET)/go-templates.wasm

$(TARGET)/wasm_exec.js:
	mkdir -p $(dir $@)
	cp $(WASM_EXEC_JS) $@

$(TARGET)/go-templates.wasm: $(wildcard go.* *.go **/*.go)
	mkdir -p $(dir $@)
	GOOS=js GOARCH=wasm go build \
	     -o $@
	du -sh $@

.PHONY: dev
dev:
	$(MAKE) ARGS=--watch

.PHONY: clean
clean:
	rm -rf $(TARGET)
