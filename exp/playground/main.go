package main

import (
	"encoding/json"
	"html/template"
	"strings"
	"syscall/js"
)

func main() {
	// Render provides the ability to take in a template string and input
	// data and render the corresponding output.
	render := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		if len(args) != 2 {
			return "Must provide two arguments: inputTmpl, inputData"
		}
		inputTmpl := args[0].String()
		inputData := args[1].String()

		tmpl, err := template.New("").Parse(inputTmpl)
		if err != nil {
			return err.Error()
		}

		var data interface{}
		if err := json.Unmarshal([]byte(inputData), &data); err != nil {
			return err.Error()
		}

		var b strings.Builder
		if err := tmpl.Execute(&b, data); err != nil {
			return err.Error()
		}

		return b.String()
	})

	js.Global().Set("ExpRenderGoTemplate", render)

	// Wait forever
	<-make(chan bool)
}
