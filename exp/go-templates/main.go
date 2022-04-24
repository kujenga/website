package main

import (
	"encoding/json"
	"fmt"
	"html/template"
	"strings"
	"syscall/js"

	"gopkg.in/yaml.v3"
)

func main() {
	// Render provides the ability to take in a template string and input
	// data and render the corresponding output.
	render := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		if len(args) < 2 {
			return "Must provide at least two arguments: inputTmpl, inputData, [dataFormat]"
		}
		inputTmpl := args[0].String()
		inputData := args[1].String()
		dataFmt := "JSON"
		if len(args) >= 3 {
			dataFmt = args[2].String()
		}

		tmpl, err := template.New("").Parse(inputTmpl)
		if err != nil {
			return fmt.Sprintf("error parsing template: %v", err)
		}

		data, err := decode(inputData, dataFmt)
		if err != nil {
			return fmt.Sprintf("error decoding from '%s': %v", dataFmt, err)
		}

		var b strings.Builder
		if err := tmpl.Execute(&b, data); err != nil {
			return fmt.Sprintf("error executing template: %v", err)
		}

		return b.String()
	})
	js.Global().Set("ExpRenderGoTemplate", render)

	convertData := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		if len(args) != 3 {
			return "Must provide three arguments: inputData, fromFormat, toFormat"
		}
		inputData := args[0].String()
		fromFmt := args[1].String()
		toFmt := args[2].String()

		data, err := decode(inputData, fromFmt)
		if err != nil {
			return fmt.Sprintf("Error decoding from '%s': %v", fromFmt, err)
		}
		output, err := encode(data, toFmt)
		if err != nil {
			return fmt.Sprintf("Error encoding to '%s': %v", toFmt, err)
		}
		return string(output)
	})
	js.Global().Set("ExpConvertData", convertData)

	// Wait forever
	<-make(chan bool)
}

func decode(inputData, dataFmt string) (data interface{}, err error) {
	switch dataFmt {
	case "JSON":
		if err := json.Unmarshal([]byte(inputData), &data); err != nil {
			return nil, err
		}
	case "YAML":
		if err := yaml.Unmarshal([]byte(inputData), &data); err != nil {
			return nil, err
		}
	default:
		return nil, fmt.Errorf("Unknown data format: '%s'", dataFmt)
	}
	return
}

func encode(input interface{}, dataFmt string) (output []byte, err error) {
	switch dataFmt {
	case "JSON":
		// Two spaces matches default in Javascript.
		return json.MarshalIndent(input, "", "  ")
	case "YAML":
		return yaml.Marshal(input)
	default:
		return nil, fmt.Errorf("Unknown data format: '%s'", dataFmt)
	}
}
